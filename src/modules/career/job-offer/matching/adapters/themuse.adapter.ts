import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { JobSourceAdapter, JobSourceQuery } from '../job-source.adapter';
import { CanonicalJobOffer } from '../job-matching.types';
import { stableHash, stripHtml } from '../job-matching.utils';

@Injectable()
export class TheMuseAdapter implements JobSourceAdapter {
  readonly source = 'themuse' as const;
  private readonly logger = new Logger(TheMuseAdapter.name);

  async fetchJobs(query: JobSourceQuery): Promise<CanonicalJobOffer[]> {
    const url = new URL('https://www.themuse.com/api/public/jobs');
    url.searchParams.set('page', '1');
    url.searchParams.set('descending', 'true');
    if (query.location) url.searchParams.set('location', query.location);

    try {
      const response = await fetch(url.toString());

      if (!response.ok) {
        this.logger.warn(`TheMuse API returned status ${response.status}: ${response.statusText}`);
        return [];
      }

      const payload = await response.json() as {
        results?: Array<Record<string, unknown>>;
      };
      const results = payload.results ?? [];

      this.logger.debug(`TheMuse returned ${results.length} results`);

      return results.slice(0, query.limit).map((item) => {
        const title = String(item.name ?? item.title ?? 'Unknown title');
        const company = String(
          (item.company as { name?: string })?.name ?? 'Unknown company',
        );
        const location = String(
          (item.locations as Array<{ name?: string }>)?.[0]?.name ??
            query.location ??
            'Remote',
        );
        const urlValue = String(
          (item.refs as { landing_page?: string } | undefined)?.landing_page ??
            item.url ??
            '',
        );
        const description = stripHtml(String(item.contents ?? item.description ?? ''));

        // item.categories is [{ name: string }, ...] — extract the name strings
        const rawCategories = item.categories as Array<{ name?: string }> | null | undefined;
        const categorySkills = (rawCategories ?? [])
          .map((c) => c?.name?.trim())
          .filter((name): name is string => !!name && name.length > 0);

        // Extract skills from description by checking which query keywords appear in the text
        const descriptionLower = description.toLowerCase();
        const keywordSkills = query.keywords.filter((kw) =>
          descriptionLower.includes(kw.toLowerCase()),
        );

        const skillsRequired = [
          ...categorySkills,
          ...keywordSkills,
        ].filter((v, i, arr) => arr.indexOf(v) === i);

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
          skillsRequired,
          postedAt:
            typeof item.publication_date === 'string'
              ? new Date(item.publication_date)
              : null,
          url: urlValue,
          source: this.source,
          sourceMetadata: item,
          vector: null,
          sourceHash: stableHash(`${title}|${company}|${urlValue}`),
        } satisfies CanonicalJobOffer;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error fetching from TheMuse: ${message}`);
      return [];
    }
  }
}