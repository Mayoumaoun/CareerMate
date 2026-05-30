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
            timeout: 45_000,
          }),
        );

        const data: any[] = response.data?.data ?? [];
        this.logger.debug(`JSearch query "${query}" returned ${data.length} results`);

        for (const job of data) {
          const url = job.job_apply_link ?? job.job_google_link ?? '';
          if (!url || seenUrls.has(url)) continue;
          seenUrls.add(url);

          let jobLocation = job.job_city ? `${job.job_city}, ${job.job_country}` : (job.job_country ?? location);

          allJobs.push({
            title: job.job_title ?? 'Untitled',
            company: job.employer_name ?? 'Unknown',
            location: jobLocation,
            remote: job.job_is_remote === true,
            salaryMin: job.job_min_salary ?? null,
            salaryMax: job.job_max_salary ?? null,
            contractType: job.job_employment_type ?? null,
            description: this.sanitizeDescription(job.job_description ?? ''),
            skillsRequired: Array.isArray(job.job_required_skills) ? job.job_required_skills.filter(Boolean) : [],
            postedAt: job.job_posted_at_datetime_utc ? new Date(job.job_posted_at_datetime_utc) : new Date(),
            url,
            source: 'jsearch',
            sourceMetadata: {
              jsearchId: job.job_id,
              employerWebsite: job.employer_website,
              employerLogo: job.employer_logo,
            },
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
