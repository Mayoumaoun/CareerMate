import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  private readonly adapters: JobSourceAdapter[];

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ProfileEntity)
    private readonly profileRepository: Repository<ProfileEntity>,
    @InjectRepository(JobOfferEntity)
    private readonly jobOfferRepository: Repository<JobOfferEntity>,
    private readonly embeddingService: SimpleEmbeddingService,
    private readonly rerankerService: AIRerankerService,
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
    const location = input.location || [user.city, user.country].filter(Boolean).join(', ') || undefined;

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

    const jobs = (await this.jobOfferRepository.find({ order: { postedAt: 'DESC' } }))
      .filter((job) => !input.sources?.length || input.sources.includes(job.source as string))
      .map((job) => this.ensurePersistedVector(job));

    if (!jobs.length) {
      return {
        userId,
        scannedJobs: 0,
        shortlistedJobs: 0,
        aiEnabled: false,
        aiRankingsCount: 0,
        aiMatchedCount: 0,
        matches: [],
      };
    }

    const scoredJobs = jobs.map((job) => ({
      job,
      semanticScore: this.scoreJob(profileVector, job.vector ?? this.embeddingService.embedJob(this.toCanonical(job))),
    }));

    scoredJobs.sort((left, right) => right.semanticScore - left.semanticScore);

    const shortlistSize = Math.min(input.shortlistSize ?? 25, 25);
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
        missingSkills: aiMatch?.missingSkills ?? [],
        improvementTips: aiMatch?.improvementTips ?? [],
        confidenceLevel: aiMatch?.confidenceLevel ?? 'low',
        explanation: aiMatch?.explanation ?? fallbackExplanation,
      } satisfies RankedJobOffer;
    });

    matches.sort((left, right) => right.matchScore - left.matchScore);

    return {
      userId,
      scannedJobs: jobs.length,
      shortlistedJobs: shortlist.length,
      aiEnabled: aiMatchedJobIds.size > 0,
      aiRankingsCount: aiRankings.length,
      aiMatchedCount: aiMatchedJobIds.size,
      matches: matches.slice(0, input.limit ?? 15),
    };
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
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      bio: profile.bio ?? '',
      targetPosition,
      userLevel: profile.userLevel,
      experiences: JSON.stringify(profile.experiences ?? []),
      education: JSON.stringify(profile.education ?? []),
      languages: JSON.stringify(profile.languages ?? []),
      certifications: JSON.stringify(profile.certifications ?? []),
      projects,
      location: [user.city, user.country].filter(Boolean).join(', '),
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
}