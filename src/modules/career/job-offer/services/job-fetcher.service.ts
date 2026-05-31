import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileEntity } from '../../../profile/entities/profile.entity';
import { QueryGeneratorService } from './query-generator.service';
import { HimalayasAdapter } from '../adapters/himalayas.adapter';
import { ArbeitnowAdapter } from '../adapters/arbeitnow.adapter';
import { JSearchAdapter } from '../adapters/jsearch.adapter';
import { KeejobsAdapter } from '../adapters/keejobs.adapter';
import { RawJobOffer } from '../adapters/job-source.adapter';
import { JobNormalizerService } from './job-normalizer.service';

@Injectable()
export class JobFetcherService {
  private readonly logger = new Logger(JobFetcherService.name);

  constructor(
    private readonly himalayasAdapter: HimalayasAdapter,
    private readonly arbeitnowAdapter: ArbeitnowAdapter,
    private readonly jsearchAdapter: JSearchAdapter,
    private readonly keejobsAdapter: KeejobsAdapter,
    private readonly jobNormalizerService: JobNormalizerService,
    @InjectRepository(ProfileEntity)
    private readonly profileRepository: Repository<ProfileEntity>,
    private readonly queryGeneratorService: QueryGeneratorService,
  ) { }

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

  private async getDynamicQueries(): Promise<string[]> {
    const profiles = await this.profileRepository.find();
    const allQueries = new Set<string>();

    for (const profile of profiles) {
      const profileQueries = this.queryGeneratorService.buildQueries(profile);
      profileQueries.forEach((q) => allQueries.add(q));
    }

    const queriesArray = Array.from(allQueries);
    if (queriesArray.length === 0) {
      return ['Software Engineer Tunisia', 'Data Scientist Tunisia', 'Frontend remote Tunisia'];
    }

    // Pick top 15 distinct queries to prevent overloading APIs
    return queriesArray.slice(0, 15);
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleJSearchCron() {
    this.logger.log('Running scheduled JSearch update...');
    const queries = await this.getDynamicQueries();
    this.logger.log(`Using ${queries.length} dynamic queries: ${queries.join(', ')}`);
    const jobs = await this.jsearchAdapter.fetchJobs(queries, 'Tunisia');
    await this.jobNormalizerService.normalizeAndPersist(jobs);
    this.logger.log(`JSearch update completed. Saved ${jobs.length} jobs.`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleKeejobsCron() {
    this.logger.log('Running scheduled Keejobs update...');
    const queries = await this.getDynamicQueries();
    this.logger.log(`Using ${queries.length} dynamic queries: ${queries.join(', ')}`);
    const jobs = await this.keejobsAdapter.fetchJobs(queries, 'Tunisia');
    await this.jobNormalizerService.normalizeAndPersist(jobs);
    this.logger.log(`Keejobs update completed. Saved ${jobs.length} jobs.`);
  }
}
