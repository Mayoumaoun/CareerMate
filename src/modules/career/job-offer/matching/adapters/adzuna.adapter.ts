import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { JobSourceAdapter, JobSourceQuery } from '../job-source.adapter';
import { CanonicalJobOffer } from '../job-matching.types';
import { sanitizeArray, stableHash } from '../job-matching.utils';

@Injectable()
export class AdzunaAdapter implements JobSourceAdapter {
  readonly source = 'adzuna' as const;

  constructor(private readonly configService: ConfigService) {}

  async fetchJobs(query: JobSourceQuery): Promise<CanonicalJobOffer[]> {
    const appId = this.configService.get<string>('ADZUNA_APP_ID');
    const appKey = this.configService.get<string>('ADZUNA_APP_KEY');
    if (!appId || !appKey) {
      return [];
    }

    const country = this.configService.get<string>('ADZUNA_COUNTRY') ?? 'gb';
    const keywords = query.keywords.join(' ');
    const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/1`);
    url.searchParams.set('app_id', appId);
    url.searchParams.set('app_key', appKey);
    url.searchParams.set('results_per_page', String(query.limit));
    if (keywords) {
      url.searchParams.set('what', keywords);
    }
    if (query.location) {
      url.searchParams.set('where', query.location);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      return [];
    }

    const payload = await response.json() as { results?: Array<Record<string, unknown>> };
    return (payload.results ?? []).slice(0, query.limit).map((item) => {
      const title = String(item.title ?? 'Unknown title');
      const company = String((item.company as { display_name?: string })?.display_name ?? 'Unknown company');
      const location = String((item.location as { display_name?: string })?.display_name ?? query.location ?? 'Remote');
      const description = String(item.description ?? '');
      const urlValue = String(item.redirect_url ?? item.url ?? '');
      const skillsRequired = sanitizeArray(item.category ? [String(item.category)] : []);

      return {
        id: randomUUID(),
        title,
        company,
        location,
        remote: /remote/i.test(`${location} ${description}`),
        salaryMin: typeof item.salary_min === 'number' ? item.salary_min : null,
        salaryMax: typeof item.salary_max === 'number' ? item.salary_max : null,
        contractType: typeof item.contract_type === 'string' ? item.contract_type : null,
        description,
        skillsRequired,
        postedAt: typeof item.created === 'string' ? new Date(item.created) : null,
        url: urlValue,
        source: this.source,
        sourceMetadata: item,
        vector: null,
        sourceHash: stableHash(`${title}|${company}|${urlValue}`),
      } satisfies CanonicalJobOffer;
    });
  }
}