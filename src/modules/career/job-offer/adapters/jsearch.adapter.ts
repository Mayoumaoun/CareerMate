import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { JobSourceAdapter, RawJobOffer } from './job-source.adapter';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class JSearchAdapter implements JobSourceAdapter {
  private readonly logger = new Logger(JSearchAdapter.name);
  private static readonly BASE_URL = 'https://jsearch.p.rapidapi.com/search';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) { }

  async fetchJobs(queries: string[], location: string): Promise<RawJobOffer[]> {
    const allJobs: RawJobOffer[] = [];
    const apiKey = this.configService.get<string>('RAPIDAPI_KEY');

    if (!apiKey) {
      this.logger.warn('RAPIDAPI_KEY is not defined. Skipping JSearch fetch.');
      return [];
    }

    const seenUrls = new Set<string>();

    for (const query of queries) {
      try {
        const response = await lastValueFrom(
          this.httpService.get(JSearchAdapter.BASE_URL, {
            headers: {
              'X-RapidAPI-Key': apiKey,
              'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
            },
            params: {
              query: `${query} ${location}`, // Combine query and location for JSearch
              page: '1',
              num_pages: '1',
              date_posted: 'month',
            },
            timeout: 15_000,
          }),
        );

        const data: any[] = response.data?.data ?? [];
        this.logger.debug(`JSearch query "${query}" returned ${data.length} results`);

        for (const job of data) {
          const url = job.job_apply_link ?? job.job_google_link ?? '';
          if (!url || seenUrls.has(url)) continue;
          seenUrls.add(url);

          allJobs.push({
            source: 'jsearch',

            title: job.job_title ?? 'Untitled',
            company: job.employer_name ?? 'Unknown',
            description: this.sanitizeDescription(job.job_description ?? ''),
            excerpt: job.job_highlights?.Responsibilities?.[0]
              ?? job.job_highlights?.Qualifications?.[0]
              ?? null,

            employmentType: (job.job_employment_type ?? job.job_employment_types?.[0] ?? 'unspecified').toLowerCase(),

            workArrangement: job.work_arrangement
              ?? (job.job_is_remote === true ? 'remote' : 'on-site'),

            seniorityLevel: job.seniority_level ?? null,
            jobFunction: job.job_function ?? null,

            location:
              (
                job.job_location ??
                [job.job_city, job.job_state, job.job_country]
                  .filter(Boolean)
                  .join(', ')
              ) || null,

            skillsRequired: job.required_technologies?.filter(Boolean).length
              ? job.required_technologies.filter(Boolean)
              : [],


            salaryMin: job.job_min_salary ?? null,
            salaryMax: job.job_max_salary ?? null,

            salaryCurrency: job.job_salary_currency ?? (job.job_min_salary ? 'USD' : null),

            requiredExperienceYears: job.required_experience_years ?? null,
            educationRequired: job.education_required
              ? {
                level: job.education_required.level,
                field: job.education_required.field,
              }
              : null,

            postedAt: job.job_posted_at_datetime_utc
              ? new Date(job.job_posted_at_datetime_utc)
              : null,

            url: job.job_apply_link ?? job.job_google_link ?? '',
          });
        }
      } catch (error) {
        this.logger.error(`Failed to fetch from JSearch for query "${query}": ${error?.message}`);
      }
    }

    this.logger.log(`JSearch: fetched ${allJobs.length} unique jobs from ${queries.length} queries`);
    return allJobs;
  }

  private sanitizeDescription(desc: string): string {
    return desc.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}