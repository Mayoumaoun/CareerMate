import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { RedisService } from '../../../common/redis/redis.service';
import { ProfileEntity } from '../../profile/entities/profile.entity';
import { QueryGeneratorService } from './services/query-generator.service';
import { JobFetcherService } from './services/job-fetcher.service';
import { JobNormalizerService } from './services/job-normalizer.service';
import { JobRankerService } from './services/job-ranker.service';
import { MatchExplainerService } from './services/match-explainer.service';
import { JobSearchResponseDto, RankedJobDto } from './dto/job.dto';
import { JobOfferRepository } from './repositories/job-offer.repository';

export interface JobSearchFilters {
  skills?: string[];
  location?: string[];
  experienceLevel?: string[];
  salaryMin?: number;
  salaryMax?: number;
}

@Injectable()
export class JobOfferService {
  private readonly logger = new Logger(JobOfferService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly queryGenerator: QueryGeneratorService,
    private readonly jobFetcher: JobFetcherService,
    private readonly jobNormalizer: JobNormalizerService,
    private readonly jobRanker: JobRankerService,
    private readonly matchExplainer: MatchExplainerService,
    private readonly jobOfferRepository: JobOfferRepository,
    @InjectRepository(ProfileEntity)
    private readonly profileRepository: Repository<ProfileEntity>,
  ) {}

  async getAllOffers(): Promise<any[]> {
    return this.jobOfferRepository.find({
      order: { postedAt: 'DESC' },
      take: 100,
    });
  }

  async searchJobsForProfile(profile: ProfileEntity, filters?: JobSearchFilters): Promise<JobSearchResponseDto> {
    const queries = this.queryGenerator.buildQueries(profile);
    const filterHash = filters ? JSON.stringify(filters) : '{}';
    const queryHash = crypto.createHash('md5').update(queries.join('|') + filterHash).digest('hex');
    const userId = profile.user?.id || profile.id;
    const cacheKey = `jobs:${userId}:${queryHash}`;

    let isCached = true;

    // Check if profile has a vector. If not, generate and save it.
    if (!profile.profileVector || profile.profileVector.length === 0) {
      this.logger.log(`Generating missing vector for profile ${profile.id}...`);
      const newVector = await this.jobNormalizer.embedProfile(profile);
      if (newVector && newVector.length > 0) {
        profile.profileVector = newVector;
        await this.profileRepository.update(profile.id, { profileVector: newVector });
        this.logger.log(`Profile ${profile.id} vector generated and saved.`);
      }
    }

    const rankedJobs = await this.redisService.getOrSet(cacheKey, async () => {
      isCached = false;
      this.logger.log(`Fetching live jobs for profile ${profile.id} with queries: `, queries);
      
      const location = profile.country || 'Tunisia';
      
      // Step 1: Fetch live jobs
      const rawLiveJobs = await this.jobFetcher.fetchLiveJobs(queries, location);
      
      // Step 2: Normalize and extract vectors for live jobs
      const normalizedLiveJobs = await this.jobNormalizer.normalizeLiveJobs(rawLiveJobs);
      
      // Step 3: Rank combining DB results with live jobs
      const ranked = await this.jobRanker.rankJobs(profile, normalizedLiveJobs);
      
      // Step 4: Apply optional frontend filters
      return this.applyFilters(ranked, filters);
    }, 5 * 60 * 1000); // 5 minutes caching

    return {
      jobs: rankedJobs,
      totalCandidates: rankedJobs.length,
      cached: isCached,
    };
  }

  async getMatchExplanation(profile: ProfileEntity, jobId: string): Promise<any> {
    return this.matchExplainer.explainMatch(profile, jobId);
  }

  private applyFilters(jobs: RankedJobDto[], filters?: JobSearchFilters): RankedJobDto[] {
    if (!filters || Object.keys(filters).length === 0) return jobs;

    return jobs.filter(job => {
      // Salary filters
      if (filters.salaryMin && job.salaryMin !== null && job.salaryMin < filters.salaryMin) return false;
      if (filters.salaryMax && job.salaryMax !== null && job.salaryMax > filters.salaryMax) return false;

      // Location filters
      if (filters.location && filters.location.length > 0) {
        const jobLoc = (job.location || '').toLowerCase();
        const locMatch = filters.location.some(l => 
          (l.toLowerCase() === 'remote' && job.workArrangement?.toLowerCase() === 'remote') || 
          jobLoc.includes(l.toLowerCase())
        );
        if (!locMatch) return false;
      }

      // Experience level filters
      if (filters.experienceLevel && filters.experienceLevel.length > 0) {
        const desc = (job.description || '').toLowerCase();
        const expMatch = filters.experienceLevel.some(lvl => {
          const l = lvl.toLowerCase();
          if (l.includes('entry') || l.includes('junior')) return desc.includes('junior') || desc.includes('entry');
          if (l.includes('mid')) return desc.includes('mid-level') || desc.includes('intermediate');
          if (l.includes('senior') || l.includes('lead')) return desc.includes('senior') || desc.includes('lead') || desc.includes('principal');
          return false;
        });
        if (!expMatch) return false;
      }

      // Skills filter (must have at least one required skill matching the filter)
      if (filters.skills && filters.skills.length > 0) {
        const reqSkills = (job.skillsRequired || []).map(s => s.toLowerCase());
        const skillMatch = filters.skills.some(s => reqSkills.includes(s.toLowerCase()));
        if (!skillMatch) return false;
      }

      return true;
    });
  }
}
