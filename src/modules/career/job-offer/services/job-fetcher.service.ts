import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HimalayasAdapter } from '../adapters/himalayas.adapter';
import { ArbeitnowAdapter } from '../adapters/arbeitnow.adapter';
import { JSearchAdapter } from '../adapters/jsearch.adapter';
import { TanitjobsAdapter } from '../adapters/tanitjobs.adapter';
import { RawJobOffer } from '../adapters/job-source.adapter';
import { JobNormalizerService } from './job-normalizer.service';

@Injectable()
export class JobFetcherService {
  private readonly logger = new Logger(JobFetcherService.name);

  constructor(
    private readonly himalayasAdapter: HimalayasAdapter,
    private readonly arbeitnowAdapter: ArbeitnowAdapter,
    private readonly jsearchAdapter: JSearchAdapter,
    private readonly tanitjobsAdapter: TanitjobsAdapter,
    private readonly jobNormalizerService: JobNormalizerService,
  ) {}

  /**
   * Used for fetching live data on user request (free APIs).
   * Does NOT use JSearch and Tanitjobs, per constraints.
   */
  async fetchLiveJobs(queries: string[], location: string): Promise<RawJobOffer[]> {
    const results = await Promise.allSettled([
      this.himalayasAdapter.fetchJobs(queries, location),
      this.arbeitnowAdapter.fetchJobs(queries, location),
    ]);

    const jobs: RawJobOffer[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        jobs.push(...result.value);
      } else {
        this.logger.error('Failed to fetch from live adapter', result.reason);
      }
    }

    return jobs;
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleJSearchCron() {
    this.logger.log('Running scheduled JSearch update...');
    // In a real app, these queries would come from a repository of all user targets
    // For demo constraints, we use hardcoded general queries for the DB
    const queries = ['Software Engineer Tunisia', 'Data Scientist Tunisia', 'Frontend remote Tunisia'];
    const jobs = await this.jsearchAdapter.fetchJobs(queries, 'Tunisia');
    await this.jobNormalizerService.normalizeAndPersist(jobs);
    this.logger.log(`JSearch update completed. Saved ${jobs.length} jobs.`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleTanitjobsCron() {
    this.logger.log('Running scheduled Tanitjobs update...');
    const queries = ['Software Engineer', 'React', 'Nodejs'];
    const jobs = await this.tanitjobsAdapter.fetchJobs(queries, 'Tunisia');
    await this.jobNormalizerService.normalizeAndPersist(jobs);
    this.logger.log(`Tanitjobs update completed. Saved ${jobs.length} jobs.`);
  }
}
