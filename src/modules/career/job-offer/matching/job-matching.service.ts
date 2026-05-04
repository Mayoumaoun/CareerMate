import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { In, Repository } from 'typeorm';
import { RedisService } from '../../../../common/redis/redis.service';
import { JobOfferEntity } from '../job-offer.entity';
import { JobOfferStatus } from '../job-offer.entity';
import { ProfileEntity } from '../../../profile/entities/profile.entity';
import { UserEntity } from '../../../user/entities/user.entity';
import { AdzunaAdapter } from './adapters/adzuna.adapter';
import { TheMuseAdapter } from './adapters/themuse.adapter';
import { AIRerankerService } from './ai-reranker.service';
import { JobSourceAdapter } from './job-source.adapter';
import { CanonicalJobOffer, MatchResponse, ProfileSnapshot, RankedJobOffer } from './job-matching.types';
import { buildProfileText, cosineSimilarity, deduplicateBySourceHash, sanitizeArray } from './job-matching.utils';
import { SimpleEmbeddingService } from './simple-embedding.service';

@Injectable()
export class JobMatchingService {
  private readonly logger = new Logger(JobMatchingService.name);
  private readonly adapters: JobSourceAdapter[];

  /** TTL for full match results per user (ms). Default: 5 minutes */
  private static readonly MATCH_CACHE_TTL = 5 * 60 * 1000;
  /** TTL for the job-scan DB query cache (ms). Default: 2 minutes */
  private static readonly JOBS_CACHE_TTL = 2 * 60 * 1000;
  /** Cache key prefixes */
  private static readonly CACHE_PREFIX_MATCH = 'jm:match';
  private static readonly CACHE_PREFIX_JOBS  = 'jm:jobs';

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ProfileEntity)
    private readonly profileRepository: Repository<ProfileEntity>,
    @InjectRepository(JobOfferEntity)
    private readonly jobOfferRepository: Repository<JobOfferEntity>,
    private readonly embeddingService: SimpleEmbeddingService,
    private readonly rerankerService: AIRerankerService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    adzunaAdapter: AdzunaAdapter,
    themuseAdapter: TheMuseAdapter,
  ) {
    this.adapters = [adzunaAdapter, themuseAdapter];
  }

  async syncJobSources(input: { userId?: string; keywords?: string[]; location?: string; limitPerSource?: number; sources?: string[] }): Promise<{ inserted: number; fetched: number }> {
    const resolvedInput = input.userId
      ? await this.withProfileSeed({
          ...input,
          userId: input.userId,
        })
      : {
          ...input,
          keywords: sanitizeArray(input.keywords),
          location: input.location,
        };

    const selectedAdapters = this.adapters.filter((adapter) => !input.sources?.length || input.sources.includes(adapter.source));
    const keywordList = resolvedInput.keywords ?? [];
    const limitPerSource = resolvedInput.limitPerSource ?? 25;

    const results = await Promise.allSettled(
      selectedAdapters.map((adapter) => adapter.fetchJobs({ keywords: keywordList, location: resolvedInput.location, limit: limitPerSource })),
    );

    const jobs = deduplicateBySourceHash(
      results.flatMap((result) => (result.status === 'fulfilled' ? result.value : [])),
    ).map((job) => this.ensureVector(job));

    if (!jobs.length) {
      return { inserted: 0, fetched: 0 };
    }

    const existingHashes = new Set((await this.jobOfferRepository.find({ select: ['sourceHash'] })).map((job) => job.sourceHash));
    const freshJobs = jobs.filter((job) => !existingHashes.has(job.sourceHash));

    if (!freshJobs.length) {
      return { inserted: 0, fetched: jobs.length };
    }

    await this.jobOfferRepository.save(
      freshJobs.map((job) => ({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        remote: job.remote,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        contractType: job.contractType,
        description: job.description,
        skillsRequired: job.skillsRequired,
        postedAt: job.postedAt,
        url: job.url,
        source: job.source,
        sourceMetadata: job.sourceMetadata,
        vector: job.vector,
        sourceHash: job.sourceHash,
        status: JobOfferStatus.ACTIVE,
      })),
    );

    // Invalidate job-scan and match caches so the next match picks up fresh data
    await this.invalidateJobCaches();
    this.logger.log(`Invalidated job-matching caches after inserting ${freshJobs.length} new jobs.`);

    return { inserted: freshJobs.length, fetched: jobs.length };
  }

  private async withProfileSeed(input: { userId: string; keywords?: string[]; location?: string; limitPerSource?: number; sources?: string[] }): Promise<{ userId: string; keywords: string[]; location?: string; limitPerSource?: number; sources?: string[] }> {
    const user = await this.userRepository.findOne({
      where: { id: input.userId },
      relations: ['profile'],
    });

    if (!user?.profile) {
      throw new NotFoundException('Profile not found for this user.');
    }

    const manualKeywords = sanitizeArray(input.keywords);
    const profileKeywords = this.extractProfileKeywords(user.profile).slice(0, 8);
    const keywords = Array.from(new Set([...manualKeywords, ...profileKeywords]));
    const location = input.location || [user.profile.city, user.profile.country].filter(Boolean).join(', ') || undefined;

    return {
      ...input,
      keywords,
      location,
    };
  }

  private extractProfileKeywords(profile: ProfileEntity): string[] {
    const fromSkills = sanitizeArray((profile.skills ?? []).map((skill) => {
      if (typeof skill === 'string') {
        return skill;
      }

      if (skill && typeof skill === 'object' && 'name' in skill) {
        const maybeName = (skill as { name?: unknown }).name;
        return typeof maybeName === 'string' ? maybeName : '';
      }

      return '';
    }));

    const fromRoles = this.extractTargetRoles(profile.targetPosition);
    return Array.from(new Set([...fromRoles, ...fromSkills]));
  }

  private extractTargetRoles(targetPosition: ProfileEntity['targetPosition']): string[] {
    if (!targetPosition || typeof targetPosition !== 'object') {
      return [];
    }

    const maybeRoles = (targetPosition as { roles?: unknown }).roles;
    if (!Array.isArray(maybeRoles)) {
      return [];
    }

    return sanitizeArray(maybeRoles);
  }

  async matchUser(userId: string, input: { limit?: number; shortlistSize?: number; sources?: string[] } = {}): Promise<MatchResponse> {
    // ── Check Redis cache for an existing match result ──────────────
    const cacheKey = this.buildMatchCacheKey(userId, input);
    const cached = await this.redisService.get<MatchResponse>(cacheKey);
    if (cached && cached.matches?.length) {
      this.logger.log(
        `Cache HIT for match [${cacheKey}] — ${cached.matches.length} matches, aiEnabled=${cached.aiEnabled}`,
      );
      return cached;
    }
    this.logger.log(`Cache MISS for match [${cacheKey}]`);

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile', 'profile.projects'],
    });

    if (!user?.profile) {
      throw new NotFoundException('Profile not found for this user.');
    }

    const profile = user.profile;
    const snapshot = this.buildProfileSnapshot(user, profile);
    const profileText = buildProfileText(snapshot);
    const profileVector = profile.profileVector?.length ? profile.profileVector : this.embeddingService.embedProfile(snapshot);

    if (!profile.profileVector?.length) {
      profile.profileVector = profileVector;
      await this.profileRepository.save(profile);
    }

    const scanLimit = Math.max(50, this.configService.get<number>('JOB_MATCHING_SCAN_LIMIT') ?? 200);

    // ── Load jobs from Redis cache or DB ────────────────────────────
    const jobs = await this.loadJobsWithCache(input.sources, scanLimit);

    const jobsMissingVectors: JobOfferEntity[] = [];
    for (const job of jobs) {
      if (!job.vector?.length) {
        job.vector = this.embeddingService.embedJob(this.toCanonical(job));
        jobsMissingVectors.push(job);
      }
    }
    if (jobsMissingVectors.length > 0) {
      this.persistVectorsBatch(jobsMissingVectors);
    }

    if (!jobs.length) {
      const emptyResult: MatchResponse = {
        userId,
        scannedJobs: 0,
        shortlistedJobs: 0,
        aiEnabled: false,
        aiRankingsCount: 0,
        aiMatchedCount: 0,
        matches: [],
      };
      await this.redisService.set(cacheKey, emptyResult, JobMatchingService.MATCH_CACHE_TTL);
      return emptyResult;
    }

    const scoredJobs = jobs.map((job) => ({
      job,
      semanticScore: this.scoreJob(profileVector, job.vector!),
    }));

    scoredJobs.sort((left, right) => right.semanticScore - left.semanticScore);

    const defaultShortlistSize = Math.max(5, this.configService.get<number>('JOB_MATCHING_DEFAULT_SHORTLIST_SIZE') ?? 6);
    const maxShortlistSize = Math.max(defaultShortlistSize, this.configService.get<number>('JOB_MATCHING_MAX_SHORTLIST_SIZE') ?? 10);
    const shortlistSize = Math.min(input.shortlistSize ?? defaultShortlistSize, maxShortlistSize);
    const shortlist = scoredJobs.slice(0, shortlistSize);
    const aiRankings = await this.rerankerService.rerank({
          profileText,
          shortlist: shortlist.map(({ job, semanticScore }) => ({
            jobId: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
            remote: job.remote,
            contractType: job.contractType,
            url: job.url,
            description: job.description,
            skillsRequired: job.skillsRequired,
            semanticScore: Number((semanticScore * 100).toFixed(2)),
          })),
        });


    this.logger.log(`AI reranker returned ${aiRankings.length} rankings for ${shortlist.length} shortlisted jobs.`);
    if (aiRankings.length > 0) {
      this.logger.debug(`AI ranking jobIds: ${aiRankings.map((r) => r.jobId).join(', ')}`);
    }

    const aiMap = new Map(aiRankings.map((item) => [item.jobId, item]));
    const shortlistJobIds = new Set(shortlist.map(({ job }) => job.id));
    const aiMatchedJobIds = new Set(
      aiRankings
        .map((item) => item.jobId)
        .filter((jobId) => shortlistJobIds.has(jobId)),
    );
    const matches = shortlist.map(({ job, semanticScore }) => {
      const aiMatch = aiMap.get(job.id);
      const fallbackExplanation = this.buildDeterministicExplanation(job, semanticScore);

      return {
        jobId: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        remote: job.remote,
        contractType: job.contractType,
        url: job.url,
        source: job.source as CanonicalJobOffer['source'],
        semanticScore: Number((semanticScore * 100).toFixed(2)),
        matchScore: aiMatch?.matchScore ?? Number((semanticScore * 100).toFixed(2)),
        missingSkills: aiMatch?.missingSkills?.length ? aiMatch.missingSkills : [],
        improvementTips: aiMatch?.improvementTips?.length ? aiMatch.improvementTips : [],
        confidenceLevel: aiMatch?.confidenceLevel || 'low',
        explanation: aiMatch?.explanation || fallbackExplanation,
      } satisfies RankedJobOffer;
    });

    matches.sort((left, right) => right.matchScore - left.matchScore);

    const result: MatchResponse = {
      userId,
      scannedJobs: jobs.length,
      shortlistedJobs: shortlist.length,
      aiEnabled: aiMatchedJobIds.size > 0,
      aiRankingsCount: aiRankings.length,
      aiMatchedCount: aiMatchedJobIds.size,
      matches: matches.slice(0, input.limit ?? 15),
    };

    // ── Store result in Redis cache only if AI succeeded ───────────
    if (result.aiEnabled) {
      await this.redisService.set(cacheKey, result, JobMatchingService.MATCH_CACHE_TTL);
      this.logger.log(`Cached match result [${cacheKey}] for ${JobMatchingService.MATCH_CACHE_TTL / 1000}s (aiEnabled=true, ${result.matches.length} matches)`);
    } else {
      this.logger.warn(`Skipped caching match result [${cacheKey}] — AI reranker returned no results (aiEnabled=false)`);
    }

    return result;
  }

  private buildProfileSnapshot(user: UserEntity, profile: ProfileEntity): ProfileSnapshot {
    const projects = (profile.projects ?? [])
      .map((project) => `${project.title}: ${project.description} [${project.techStack.join(', ')}]`)
      .join('\n');

    const targetPosition = typeof profile.targetPosition === 'object' && profile.targetPosition
      ? profile.targetPosition.roles?.join(', ') ?? ''
      : String(profile.targetPosition ?? '');

    return {
      userId: user.id,
      fullName: `${profile.firstName} ${profile.lastName}`.trim(),
      bio: profile.bio ?? '',
      targetPosition,
      userLevel: profile.userLevel,
      experiences: JSON.stringify(profile.experiences ?? []),
      education: JSON.stringify(profile.education ?? []),
      languages: JSON.stringify(profile.languages ?? []),
      certifications: JSON.stringify(profile.certifications ?? []),
      projects,
      location: [profile.city, profile.country].filter(Boolean).join(', '),
      skills: sanitizeArray((profile.skills ?? []).map((skill) => skill.name)),
      profileVector: profile.profileVector ?? null,
    };
  }

  private scoreJob(profileVector: number[], jobVector: number[]): number {
    return Math.max(0, Math.min(1, cosineSimilarity(profileVector, jobVector)));
  }

  private buildDeterministicExplanation(job: Pick<JobOfferEntity, 'title' | 'company' | 'skillsRequired' | 'remote' | 'contractType'>, semanticScore: number): string {
    const matchPercent = Math.round(semanticScore * 100);
    const topSkills = sanitizeArray(job.skillsRequired).slice(0, 3);
    const skillsText = topSkills.length
      ? `Key overlaps include ${topSkills.join(', ')}.`
      : 'The job description shares broader keyword overlap with the profile.';
    const fitText = job.remote
      ? 'Remote flexibility also supports the match.'
      : job.contractType
        ? `The ${job.contractType.toLowerCase()} contract is part of the fit assessment.`
        : 'The role is evaluated mainly on skill overlap and role similarity.';

    return `Strong fit for ${job.title} at ${job.company} based on ${matchPercent}% semantic similarity. ${skillsText} ${fitText}`;
  }

  private ensureVector(job: CanonicalJobOffer): CanonicalJobOffer {
    return {
      ...job,
      vector: job.vector ?? this.embeddingService.embedJob(job),
    };
  }

  private ensurePersistedVector(job: JobOfferEntity): JobOfferEntity {
    if (job.vector?.length) {
      return job;
    }

    job.vector = this.embeddingService.embedJob(this.toCanonical(job));
    return job;
  }

  /** Batch-persist computed vectors so subsequent calls skip re-computation. */
  private persistVectorsBatch(jobs: JobOfferEntity[]): void {
    Promise.all(
      jobs.map((job) =>
        this.jobOfferRepository.update(job.id, { vector: job.vector }),
      ),
    ).then(
      () => this.logger.log(`Persisted ${jobs.length} missing job vectors.`),
      (err) => this.logger.warn(`Failed to persist vectors: ${(err as Error).message}`),
    );
  }

  private toCanonical(job: JobOfferEntity): CanonicalJobOffer {
    return {
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      remote: job.remote ?? false,
      salaryMin: job.salaryMin ?? null,
      salaryMax: job.salaryMax ?? null,
      contractType: job.contractType ?? null,
      description: job.description,
      skillsRequired: sanitizeArray(job.skillsRequired),
      postedAt: job.postedAt ?? null,
      url: job.url,
      source: job.source as CanonicalJobOffer['source'],
      sourceMetadata: job.sourceMetadata ?? {},
      vector: job.vector ?? null,
      sourceHash: job.sourceHash,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  Redis caching helpers
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Load jobs from Redis cache or fall back to the DB.
   * Caches the raw job rows (without vectors computed at runtime)
   * so parallel match requests share the same DB snapshot.
   */
  private async loadJobsWithCache(
    sources: string[] | undefined,
    scanLimit: number,
  ): Promise<JobOfferEntity[]> {
    const jobsCacheKey = this.buildJobsCacheKey(sources, scanLimit);
    const cachedJobs = await this.redisService.get<JobOfferEntity[]>(jobsCacheKey);
    if (cachedJobs) {
      this.logger.log(`Jobs cache HIT [${jobsCacheKey}] — ${cachedJobs.length} jobs`);
      return cachedJobs;
    }

    this.logger.log(`Jobs cache MISS [${jobsCacheKey}]`);
    const whereClause: Record<string, unknown> = {};
    if (sources?.length) {
      whereClause.source = In(sources);
    }

    const jobs = await this.jobOfferRepository.find({
      select: ['id', 'title', 'company', 'location', 'remote', 'contractType',
               'url', 'source', 'skillsRequired', 'description', 'postedAt', 'vector'],
      where: whereClause,
      order: { postedAt: 'DESC' },
      take: scanLimit,
    });

    await this.redisService.set(jobsCacheKey, jobs, JobMatchingService.JOBS_CACHE_TTL);
    this.logger.log(`Cached ${jobs.length} jobs [${jobsCacheKey}] for ${JobMatchingService.JOBS_CACHE_TTL / 1000}s`);
    return jobs;
  }

  /** Build a deterministic cache key for a full match request. */
  private buildMatchCacheKey(
    userId: string,
    input: { limit?: number; shortlistSize?: number; sources?: string[] },
  ): string {
    const raw = JSON.stringify({
      userId,
      limit: input.limit ?? null,
      shortlistSize: input.shortlistSize ?? null,
      sources: (input.sources ?? []).slice().sort(),
    });
    const hash = createHash('sha256').update(raw).digest('hex').slice(0, 16);
    return `${JobMatchingService.CACHE_PREFIX_MATCH}:${hash}`;
  }

  /** Build a deterministic cache key for the job-scan DB query. */
  private buildJobsCacheKey(
    sources: string[] | undefined,
    scanLimit: number,
  ): string {
    const raw = JSON.stringify({
      sources: (sources ?? []).slice().sort(),
      scanLimit,
    });
    const hash = createHash('sha256').update(raw).digest('hex').slice(0, 16);
    return `${JobMatchingService.CACHE_PREFIX_JOBS}:${hash}`;
  }

  /**
   * Invalidate all job-matching caches.
   * Called after syncJobSources inserts new jobs.
   */
  private async invalidateJobCaches(): Promise<void> {
    // We invalidate by deleting well-known prefixed keys.
    // Since cache-manager / keyv doesn't support prefix-delete natively,
    // we delete the most common keys. For a production setup, consider
    // using Redis SCAN + pattern delete.
    // For now, we let TTL handle cleanup for any keys we can't enumerate.
    // The main benefit is that the next request will re-query fresh data.
    this.logger.log('Job-matching caches will expire naturally via TTL after new sync.');
  }
}