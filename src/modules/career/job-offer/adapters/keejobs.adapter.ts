import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { JobSourceAdapter, RawJobOffer } from './job-source.adapter';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class KeejobsAdapter implements JobSourceAdapter {
  private readonly logger = new Logger(KeejobsAdapter.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) { }

  async fetchJobs(queries: string[], location: string): Promise<RawJobOffer[]> {
    const allJobs: RawJobOffer[] = [];
    // Fallback to python microservice default port if not set
    const scraperUrl = this.configService.get<string>('SCRAPER_URL', 'http://localhost:8000');
    const seenUrls = new Set<string>();

    try {
      this.logger.debug(`Triggering Keejobs scraper for ${queries.length} queries`);
      // Send a single POST request to scrape all queries
      const response = await lastValueFrom(
        this.httpService.post(
          `${scraperUrl}/scrape/keejob`,
          { queries, location },
          { timeout: 60_000 } // Scrapers can be slow
        ),
      );

      const data: any[] = response.data?.jobs ?? [];
      this.logger.debug(`Keejobs scraper returned ${data.length} results`);

      for (const job of data) {
        const url = job.url ?? '';
        if (!url || seenUrls.has(url)) continue;
        seenUrls.add(url);

        allJobs.push({
          title: job.title ?? 'Untitled',
          company: job.company ?? 'Unknown',
          location: job.location ?? 'Tunisia',
          remote: job.remote === true || (job.location ?? '').toLowerCase().includes('remote'),
          salaryMin: null,
          salaryMax: null,
          contractType: job.contract_type ?? null,
          description: this.sanitizeDescription(job.description ?? ''),
          skillsRequired: Array.isArray(job.skills) ? job.skills.filter(Boolean) : [],
          postedAt: this.parseDate(job.posted_at),
          url,
          source: 'keejobs',
          sourceMetadata: job.sourceMetadata ?? {},
        });
      }
    } catch (error) {
      this.logger.error(`Failed to run Keejobs scraper plugin: ${error?.message}`);
    }

    this.logger.log(`Keejobs: fetched ${allJobs.length} unique jobs`);
    return allJobs;
  }

  private parseDate(dateStr: string): Date {
    if (!dateStr) return new Date();
    
    // Check if format is DD/MM/YYYY
    const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
      const [_, day, month, year] = match;
      return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00Z`);
    }
    
    // Fallback to standard JS date parsing
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  private sanitizeDescription(desc: string): string {
    return desc.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
