import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { JobSourceAdapter, RawJobOffer } from './job-source.adapter';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class ArbeitnowAdapter implements JobSourceAdapter {
  private readonly logger = new Logger(ArbeitnowAdapter.name);
  private static readonly BASE_URL = 'https://www.arbeitnow.com/api/job-board-api';
  private static readonly TIMEOUT_MS = 10_000;

  constructor(private readonly httpService: HttpService) { }

  async fetchJobs(queries: string[], location: string): Promise<RawJobOffer[]> {
    try {
      // Arbeitnow doesn't support per-query search; fetch remote jobs with visa sponsorship
      // and filter client-side against the user's queries.
      const response = await lastValueFrom(
        this.httpService.get(ArbeitnowAdapter.BASE_URL, {
          params: { remote: 'true', visa_sponsorship: 'true' },
          timeout: ArbeitnowAdapter.TIMEOUT_MS,
        }),
      );

      const data: any[] = response.data?.data ?? [];
      this.logger.debug(`Arbeitnow returned ${data.length} raw results`);

      // Normalize all jobs first
      const allJobs: RawJobOffer[] = data.map((job: any) => ({
        source: 'arbeitnow' as const,

        title: job.title ?? 'Untitled',
        company: job.company_name ?? 'Unknown',
        description: this.sanitizeDescription(job.description ?? ''),
        excerpt: null,   // not provided by Arbeitnow API

        // job_types already lowercase (e.g. "full-time") — matches our convention
        employmentType: job.job_types?.[0] ?? 'unspecified',

        workArrangement: job.remote === true
          ? 'remote'
          : job.location?.toLowerCase().includes('hybrid')
            ? 'hybrid'
            : 'on-site',

        seniorityLevel: null,   // not provided by Arbeitnow API
        jobFunction: null,   // not provided by Arbeitnow API

        // Keep raw location (e.g. "Berlin, Germany") when not just "Remote"
        location: job.remote === true && job.location?.toLowerCase() === 'remote'
          ? null
          : job.location ?? null,

        // Arbeitnow tags are the closest thing to skills
        skillsRequired: Array.isArray(job.tags) ? job.tags.filter(Boolean) : [],

        salaryMin: null,  // not provided by Arbeitnow API
        salaryMax: null,  // not provided by Arbeitnow API
        salaryCurrency: null,  // not provided by Arbeitnow API

        requiredExperienceYears: null, // not provided by Arbeitnow API
        educationRequired: null,   // not provided by Arbeitnow API

        postedAt: job.created_at ? new Date(job.created_at * 1000) : null,

        url: job.url ?? '',
      }));

      // Build search tokens from queries for local filtering
      const searchTokens = queries.flatMap(q =>
        q.toLowerCase().split(/\s+/).filter(token =>
          token.length > 2 && !['remote', 'tunisia', 'north', 'africa'].includes(token),
        ),
      );

      if (searchTokens.length === 0) {
        return allJobs.slice(0, 50); // No meaningful tokens, return top results
      }

      // Filter: job must match at least one meaningful token from the queries
      const filtered = allJobs.filter((job) => {
        const haystack = `${job.title} ${job.description} ${job.skillsRequired.join(' ')}`.toLowerCase();
        return searchTokens.some(token => haystack.includes(token));
      });

      this.logger.log(`Arbeitnow: matched ${filtered.length} of ${allJobs.length} jobs against ${searchTokens.length} search tokens`);
      return filtered;
    } catch (error) {
      this.logger.error(`Failed to fetch from Arbeitnow: ${error?.message}`);
      return [];
    }
  }

  private sanitizeDescription(desc: string): string {
    return desc.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
