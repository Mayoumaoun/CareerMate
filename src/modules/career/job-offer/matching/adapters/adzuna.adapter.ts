import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { JobSourceAdapter, JobSourceQuery } from '../job-source.adapter';
import { CanonicalJobOffer } from '../job-matching.types';
import { stableHash, stripHtml } from '../job-matching.utils';


@Injectable()
export class AdzunaAdapter implements JobSourceAdapter {
  readonly source = 'adzuna' as const;
  private readonly logger = new Logger(AdzunaAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  async fetchJobs(query: JobSourceQuery): Promise<CanonicalJobOffer[]> {
    const appId = this.configService.get<string>('ADZUNA_APP_ID');
    const appKey = this.configService.get<string>('ADZUNA_APP_KEY');

    if (!appId || !appKey) {
      this.logger.warn('Adzuna credentials not configured (ADZUNA_APP_ID or ADZUNA_APP_KEY missing)');
      return [];
    }

    const country = this.configService.get<string>('ADZUNA_COUNTRY') ?? 'gb';
    const keywords = query.keywords.join(' ');
    const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/1`);
    url.searchParams.set('app_id', appId);
    url.searchParams.set('app_key', appKey);
    url.searchParams.set('results_per_page', String(query.limit));
    if (keywords) url.searchParams.set('what', keywords);
    if (query.location) url.searchParams.set('where', query.location);

    this.logger.debug(`Fetching jobs from Adzuna: ${url.toString().replace(appKey, '***')}`);

    try {
      const response = await fetch(url.toString());

      if (!response.ok) {
        this.logger.warn(
          `Adzuna API returned status ${response.status}: ${response.statusText} for keywords="${keywords}", location="${query.location || 'any'}"`,
        );
        return [];
      }

      const payload = await response.json() as {
        results?: Array<Record<string, unknown>>;
        count?: number;
      };
      const results = payload.results ?? [];

      this.logger.debug(`Adzuna returned ${results.length} results for keywords="${keywords}"`);

      return results.slice(0, query.limit).map((item) => {
        const title = String(item.title ?? 'Unknown title');
        const company = String(
          (item.company as { display_name?: string })?.display_name ?? 'Unknown company',
        );
        const location = String(
          (item.location as { display_name?: string })?.display_name ??
            query.location ??
            'Remote',
        );
        const description = stripHtml(String(item.description ?? ''));
        const urlValue = String(item.redirect_url ?? item.url ?? '');

        // Extract category label — item.category is { tag: string; label: string }
        const category = item.category as { tag?: string; label?: string } | null | undefined;
        const categoryLabel =
          category?.label?.trim() ??
          category?.tag?.replace(/-/g, ' ')?.trim();

        // Extract skills from description by checking which query keywords appear in the text
        const descriptionLower = description.toLowerCase();
        const keywordSkills = query.keywords.filter((kw) =>
          descriptionLower.includes(kw.toLowerCase()),
        );

        const skillsRequired = [
          ...(categoryLabel ? [categoryLabel] : []),
          ...keywordSkills,
        ].filter((v, i, arr) => arr.indexOf(v) === i);

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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error fetching from Adzuna for keywords="${keywords}": ${message}`);
      return [];
    }
  }
}