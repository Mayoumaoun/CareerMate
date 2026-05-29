import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { JobSourceAdapter, RawJobOffer } from './job-source.adapter';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class ArbeitnowAdapter implements JobSourceAdapter {
  private readonly logger = new Logger(ArbeitnowAdapter.name);
  private static readonly BASE_URL = 'https://www.arbeitnow.com/api/job-board-api';
  private static readonly TIMEOUT_MS = 10_000;

  constructor(private readonly httpService: HttpService) {}

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
        title: job.title ?? 'Untitled',
        company: job.company_name ?? 'Unknown',
        location: job.location ?? 'Remote',
        remote: job.remote === true,
        salaryMin: null,
        salaryMax: null,
        contractType: null,
        description: this.sanitizeDescription(job.description ?? ''),
        skillsRequired: Array.isArray(job.tags) ? job.tags.filter(Boolean) : [],
        postedAt: job.created_at ? new Date(job.created_at * 1000) : new Date(),
        url: job.url ?? '',
        source: 'arbeitnow' as const,
        sourceMetadata: {
          slug: job.slug,
          visa_sponsorship: job.visa_sponsorship,
        },
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
