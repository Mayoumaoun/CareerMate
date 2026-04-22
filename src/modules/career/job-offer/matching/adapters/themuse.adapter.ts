import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { JobSourceAdapter, JobSourceQuery } from '../job-source.adapter';
import { CanonicalJobOffer } from '../job-matching.types';
import { sanitizeArray, stableHash } from '../job-matching.utils';

@Injectable()
export class TheMuseAdapter implements JobSourceAdapter {
  readonly source = 'themuse' as const;

  async fetchJobs(query: JobSourceQuery): Promise<CanonicalJobOffer[]> {
    const url = new URL('https://www.themuse.com/api/public/jobs');
    url.searchParams.set('page', '1');
    url.searchParams.set('descending', 'true');

    if (query.location) {
      url.searchParams.set('location', query.location);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      return [];
    }

    const payload = await response.json() as { results?: Array<Record<string, unknown>> };
    return (payload.results ?? []).slice(0, query.limit).map((item) => {
      const title = String(item.name ?? item.title ?? 'Unknown title');
      const company = String((item.company as { name?: string })?.name ?? 'Unknown company');
      const location = String((item.locations as Array<{ name?: string }>)?.[0]?.name ?? query.location ?? 'Remote');
      const urlValue = String((item.refs as { landing_page?: string } | undefined)?.landing_page ?? item.url ?? '');
      const description = String(item.contents ?? item.description ?? '');

      return {
        id: randomUUID(),
        title,
        company,
        location,
        remote: /remote/i.test(`${location} ${description}`),
        salaryMin: null,
        salaryMax: null,
        contractType: typeof item.type === 'string' ? item.type : null,
        description,
        skillsRequired: sanitizeArray(item.categories),
        postedAt: typeof item.publication_date === 'string' ? new Date(item.publication_date) : null,
        url: urlValue,
        source: this.source,
        sourceMetadata: item,
        vector: null,
        sourceHash: stableHash(`${title}|${company}|${urlValue}`),
      } satisfies CanonicalJobOffer;
    });
  }
}