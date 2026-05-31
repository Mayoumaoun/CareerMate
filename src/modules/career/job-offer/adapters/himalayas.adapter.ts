import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { JobSourceAdapter, RawJobOffer } from './job-source.adapter';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class HimalayasAdapter implements JobSourceAdapter {
  private readonly logger = new Logger(HimalayasAdapter.name);
  private static readonly BASE_URL = 'https://himalayas.app/jobs/api';
  private static readonly TIMEOUT_MS = 10_000;

  constructor(private readonly httpService: HttpService) { }

  async fetchJobs(queries: string[], location: string): Promise<RawJobOffer[]> {
    const allJobs: RawJobOffer[] = [];
    const seenUrls = new Set<string>();

    for (const query of queries) {
      try {
        const response = await lastValueFrom(
          this.httpService.get(`${HimalayasAdapter.BASE_URL}/search`, {
            params: { q: query, limit: 25 },
            timeout: HimalayasAdapter.TIMEOUT_MS,
          }),
        );

        const data = response.data?.jobs ?? [];
        this.logger.debug(`Himalayas query "${query}" returned ${data.length} results`);

        for (const job of data) {
          const url = job.applicationLink ?? job.jobUrl ?? '';
          if (!url || seenUrls.has(url)) continue;
          seenUrls.add(url);

          allJobs.push({
            source: 'himalayas',

            title: job.title ?? 'Untitled',
            company: job.companyName ?? 'Unknown',
            description: this.sanitizeDescription(job.description ?? ''),
            excerpt: job.excerpt ?? null,

            employmentType: job.employmentType
              ? job.employmentType.toLowerCase().replace(' ', '-')
              : 'unspecified',

            workArrangement: job.locationRestrictions?.length
              ? 'remote'
              : 'remote',

            seniorityLevel: null,
            jobFunction: job.category?.[0] ?? null,

            location: job.locationRestrictions?.join(', ') ?? null,

            skillsRequired: this.extractSkills(job),

            salaryMin: job.minSalary ?? null,
            salaryMax: job.maxSalary ?? null,
            salaryCurrency: job.currency ?? null,

            requiredExperienceYears: null,
            educationRequired: null,

            postedAt: job.pubDate ? new Date(job.pubDate * 1000) : null,

            url: job.applicationLink ?? '',

          });
        }
      } catch (error) {
        this.logger.error(`Failed to fetch from Himalayas for query "${query}": ${error?.message}`);
      }
    }

    this.logger.log(`Himalayas: fetched ${allJobs.length} unique jobs from ${queries.length} queries`);
    return allJobs;
  }

  private extractSkills(job: any): string[] {
    const skills: string[] = [];
    if (Array.isArray(job.categories)) {
      skills.push(...job.categories);
    }
    if (Array.isArray(job.tags)) {
      skills.push(...job.tags);
    }
    // Deduplicate
    return [...new Set(skills.map(s => s.trim()).filter(Boolean))];
  }

  private parseSalary(_currency: string | undefined, value: any): number | null {
    if (value == null) return null;
    const num = typeof value === 'number' ? value : parseInt(value, 10);
    return isNaN(num) ? null : num;
  }

  private sanitizeDescription(desc: string): string {
    // Strip HTML tags if present
    return desc.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
