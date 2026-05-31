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
    const scraperUrl = this.configService.get<string>('SCRAPER_URL', 'http://localhost:8000');
    const seenUrls = new Set<string>();

    try {
      this.logger.debug(`Triggering Keejobs scraper for ${queries.length} queries`);

      const response = await lastValueFrom(
        this.httpService.post(
          `${scraperUrl}/scrape/keejob`,
          { queries, location },
          { timeout: 120_000 },
        ),
      );

      const data: any[] = response.data?.jobs ?? [];
      this.logger.debug(`Keejobs scraper returned ${data.length} results`);

      for (const job of data) {
        const url = job.url ?? '';
        if (!url || seenUrls.has(url)) continue;
        seenUrls.add(url);

        allJobs.push({
          source: 'keejobs',

          title: job.title ?? 'Untitled',
          company: job.company ?? 'Unknown',

          description: this.sanitizeDescription(job.description ?? ''),
          excerpt: job.excerpt ?? null,

          employmentType: this.normalizeEmploymentType(job.contract_type),


          workArrangement: job.work_arrangement ?? 'on-site',

          seniorityLevel: job.seniority_level ?? null,
          jobFunction: job.job_function ?? null,

          location: job.location ?? location ?? null,

          skillsRequired: Array.isArray(job.skills) ? job.skills.filter(Boolean) : [],

          salaryMin: job.salary_min ?? null,
          salaryMax: job.salary_max ?? null,
          salaryCurrency: job.salary_currency ?? (job.salary_min != null ? 'TND' : null),

          requiredExperienceYears: job.required_experience_years ?? null,
          educationRequired: job.education_required ?? null,

          postedAt: this.parseDate(job.posted_at),

          url,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to run Keejobs scraper plugin: ${error?.message}`);
    }

    this.logger.log(`Keejobs: fetched ${allJobs.length} unique jobs`);
    return allJobs;
  }

  private normalizeEmploymentType(contractType: string | null | undefined): string {
    if (!contractType) return 'unspecified';
    switch (contractType.toUpperCase()) {
      case 'CDI': return 'full-time';
      case 'CDD': return 'contract';
      case 'SIVP':
      case 'CIVP':
      case 'STAGE': return 'internship';
      case 'FREELANCE': return 'freelance';
      default: return contractType.toLowerCase();
    }
  }

  private parseDate(dateStr: string | null | undefined): Date | null {
    if (!dateStr) return null;

    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      return new Date(`${dateStr}T00:00:00Z`);
    }

    const dmyMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dmyMatch) {
      const [, day, month, year] = dmyMatch;
      return new Date(
        `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00Z`,
      );
    }

    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  private sanitizeDescription(desc: string): string {
    return desc.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}