import {BadRequestException,Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { RoadmapEntity } from './roadmap.entity';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import { ProfileEntity } from 'src/modules/profile/entities/profile.entity';
import { JobOfferEntity } from '../job-offer/job-offer.entity';
import { RedisService } from 'src/common/redis/redis.service';
import { RoadmapMode, RoadmapStatus, StepStatus } from './roadmap.enums';
import { GenerationParams, RoadmapStep } from './roadmap.types';
import { RoadmapPromptBuilder } from './roadmap.prompt-builder';
import Groq from 'groq-sdk';
import { ConfigService } from '@nestjs/config';
import { CreateRoadmapDto } from './dto/CreateRoadmap.dto';
import { UpdateStepDto } from './dto/UpdateStep.dto';
import { CreateTargetJobRoadmapDto } from './dto/CreateTargetJobRoadmap.dto';
import { CreateJobOfferRoadmapDto } from './dto/CreateJobOfferRoadmap.dto';
import { CreateGenericRoadmapDto } from './dto/CreateGenericRoadmap.dto';


@Injectable()
export class RoadmapService {
  private readonly groq : Groq;
  private readonly CACHE_TTL = 60 * 60; 

  constructor(
    @InjectRepository(RoadmapEntity)
    private readonly roadmapRepository: Repository<RoadmapEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ProfileEntity)
    private readonly profileRepository: Repository<ProfileEntity>,
    @InjectRepository(JobOfferEntity)
    private readonly jobOfferRepository: Repository<JobOfferEntity>,
    private readonly redis: RedisService,
    private readonly config: ConfigService
  ) {
    this.groq = new Groq({ apiKey : config.get<string>('GROQ_API_KEY')})
  }


  async getAllRoadmaps(userId: string): Promise<RoadmapEntity[]> {
    return this.roadmapRepository.find({
      where: { user: { id: userId }, isDeleted: false },
      order: { createdAt: 'DESC' },
    });
  }

  async getRoadmapsByStatus(userId: string, status: RoadmapStatus): Promise<RoadmapEntity[]> {
    return this.roadmapRepository.find({
      where: { user: { id: userId }, status, isDeleted: false },
      order: { updatedAt: 'DESC' },
    });
  }


  async getRoadmap(userId: string, roadmapId: string): Promise<RoadmapEntity> {
    const cacheKey = `user:${userId}:roadmap:${roadmapId}`;
    const cached = await this.redis.get<RoadmapEntity>(cacheKey).catch(() => null);
    if (cached) return cached;

    const roadmap = await this.roadmapRepository.findOne({
      where: { id: roadmapId, user: { id: userId }, isDeleted: false },
    });

    if (!roadmap) throw new NotFoundException('Roadmap not found');

    await this.redis.set(cacheKey, roadmap, this.CACHE_TTL);
    return roadmap;
  }


  async getActiveSteps(userId: string, roadmapId: string): Promise<RoadmapStep[]> {
    const roadmap = await this.getRoadmap(userId, roadmapId);

    if (roadmap.status !== RoadmapStatus.ACTIVE) {
      return [];
    }

    const startDate = roadmap.startDate
      ? new Date(roadmap.startDate)
      : roadmap.createdAt;

    const now = new Date();
    const weekElapsed = Math.floor(
      (now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000),
    );
    const currentWeek = weekElapsed + 1; 

    return roadmap.steps.filter(
      (step) =>
        step.weekNumber === currentWeek &&
        step.status !== StepStatus.COMPLETED &&
        step.status !== StepStatus.SKIPPED,
    );
  }


  async getRoadmapStats(userId: string, roadmapId: string) {
    const roadmap = await this.getRoadmap(userId, roadmapId);
    const steps = roadmap.steps;
    const total = steps.length;
    const completed = steps.filter((s) => s.status === StepStatus.COMPLETED).length;
    const inProgress = steps.filter((s) => s.status === StepStatus.IN_PROGRESS).length;
    const skipped = steps.filter((s) => s.status === StepStatus.SKIPPED).length;

    const startDate = roadmap.startDate ? new Date(roadmap.startDate) : null;
    const endDate = roadmap.endDate ? new Date(roadmap.endDate) : null;
    const daysRemaining =
      endDate
        ? Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : null;

    return {
      roadmapId,
      total,
      completed,
      inProgress,
      skipped,
      pending: total - completed - inProgress - skipped,
      completionPercent: total ? Math.round((completed / total) * 100) : 0,
      daysRemaining,
      isOnTrack: this.computeOnTrack(roadmap),
    };
  }


  async generatePreview(userId: string, dto: CreateRoadmapDto): Promise<{ targetJob: string; steps: RoadmapStep[] }> {
    const { steps, targetJob } = await this.generate(userId, dto);
    return { targetJob, steps };
  }


  async createRoadmap(userId: string, dto: CreateRoadmapDto ): Promise<RoadmapEntity> {
    const { steps, targetJob, generationParams, profileSnapshotHash } =
      await this.generate(userId, dto);

    const roadmap = this.roadmapRepository.create({
      title: (dto as any).title ?? `My path to ${targetJob}`,
      targetJob,
      mode: dto.mode,
      status: RoadmapStatus.DRAFT,
      steps,
      generationParams,
      profileSnapshotHash,
      startDate: null,
      endDate: generationParams.durationWeeks
        ? this.computeEndDate(generationParams.durationWeeks)
        : null,
      isDeleted: false,
      deletedAt: null,
      user: { id: userId } as UserEntity,
    });

    return this.roadmapRepository.save(roadmap);
  }


  async regenerateRoadmap(
    userId: string,
    roadmapId: string,
  ): Promise<RoadmapEntity> {
    const roadmap = await this.getRoadmap(userId, roadmapId);

    if (!roadmap.generationParams) {
      throw new BadRequestException(
        'Cannot regenerate — original generation params missing',
      );
    }

    const dto = this.paramsToDto(roadmap.mode, roadmap.targetJob, roadmap.generationParams);
    const { steps, profileSnapshotHash } = await this.generate(userId, dto);

    const completedIds = new Set(
      roadmap.steps
        .filter((s) => s.status === StepStatus.COMPLETED)
        .map((s) => s.weekNumber),
    );

    const mergedSteps = steps.map((step) =>
      completedIds.has(step.weekNumber)
        ? { ...step, status: StepStatus.COMPLETED }
        : step,
    );

    roadmap.steps = mergedSteps;
    roadmap.profileSnapshotHash = profileSnapshotHash;
    roadmap.updatedAt = new Date();

    await this.invalidateCache(userId, roadmapId);
    return this.roadmapRepository.save(roadmap);
  }


  async duplicateRoadmap(userId: string, roadmapId: string): Promise<RoadmapEntity> {
    const original = await this.getRoadmap(userId, roadmapId);

    const copy = this.roadmapRepository.create({
      ...original,
      id: undefined,                                      
      title: `${original.title ?? original.targetJob} (copy)`,
      status: RoadmapStatus.DRAFT,
      startDate: null,
      endDate: null,
      isDeleted: false,
      deletedAt: null,
      steps: original.steps.map((step) => ({
        ...step,
        id: uuidv4(),
        status: StepStatus.PENDING,
        completedAt: null,
        notes: null,
      })),
      user: { id: userId } as UserEntity,
    });

    return this.roadmapRepository.save(copy);
  }


  async updateRoadmapStatus(userId: string, roadmapId: string, status: RoadmapStatus): Promise<RoadmapEntity> {
    const roadmap = await this.getRoadmap(userId, roadmapId);

    roadmap.status = status;

    if (status === RoadmapStatus.ACTIVE && !roadmap.startDate) {
      roadmap.startDate = new Date();
      if (roadmap.generationParams?.durationWeeks && !roadmap.endDate) {
        roadmap.endDate = this.computeEndDate(roadmap.generationParams.durationWeeks);
      }
    }

    await this.invalidateCache(userId, roadmapId);
    return this.roadmapRepository.save(roadmap);
  }


  async updateStep(userId: string, roadmapId: string, stepId: string, dto: UpdateStepDto): Promise<RoadmapEntity> {
    const roadmap = await this.getRoadmap(userId, roadmapId);

    const stepIndex = roadmap.steps.findIndex((s) => s.id === stepId);
    if (stepIndex === -1) throw new NotFoundException('Step not found');

    roadmap.steps[stepIndex] = {
      ...roadmap.steps[stepIndex],
      status: dto.status,
      notes: dto.notes ?? roadmap.steps[stepIndex].notes,
      completedAt:
        dto.status === StepStatus.COMPLETED
          ? new Date()
          : roadmap.steps[stepIndex].completedAt,
    };

    const allDone = roadmap.steps.every(
      (s) => s.status === StepStatus.COMPLETED || s.status === StepStatus.SKIPPED,
    );
    if (allDone) roadmap.status = RoadmapStatus.COMPLETED;

    await this.invalidateCache(userId, roadmapId);
    return this.roadmapRepository.save(roadmap);
  }


  async updateRoadmapSteps(userId: string, roadmapId: string, steps: RoadmapStep[]): Promise<RoadmapEntity> {
    const roadmap = await this.getRoadmap(userId, roadmapId);
    roadmap.steps = steps;
    await this.invalidateCache(userId, roadmapId);
    return this.roadmapRepository.save(roadmap);
  }


  async deleteRoadmap(userId: string, roadmapId: string): Promise<void> {
    const roadmap = await this.getRoadmap(userId, roadmapId);
    roadmap.isDeleted = true;
    roadmap.deletedAt = new Date();
    await this.roadmapRepository.save(roadmap);
    await this.invalidateCache(userId, roadmapId);
  }


  private async generate(userId: string, dto: CreateRoadmapDto) {
    const profile = await this.profileRepository.findOne({
      where: { user: { id: userId } },
      relations: ['projects'],
    });

    let jobDescription: string | undefined;
    let targetJob: string;
    let generationParams: GenerationParams;

    switch (dto.mode) {
      case RoadmapMode.TARGET_JOB: {
        const d = dto as CreateTargetJobRoadmapDto;
        targetJob = d.targetJob;
        generationParams = {
          durationWeeks: d.durationWeeks,
          intensity: d.intensity,
          depth: d.depth,
          focusAreas: d.focusAreas,
          currentSkillsOverride: d.currentSkillsOverride,
        };
        break;
      }

      case RoadmapMode.JOB_OFFER: {
        const d = dto as CreateJobOfferRoadmapDto;
        generationParams = {
          durationWeeks: d.durationWeeks,
          intensity: d.intensity,
          depth: d.depth,
          jobOfferId: d.jobOfferId,
          jobDescriptionRaw: d.jobDescriptionRaw,
        };

        if (d.jobOfferId) {
          const offer = await this.jobOfferRepository.findOne({
            where: { id: d.jobOfferId },
          });
          if (!offer) throw new NotFoundException('Job offer not found');
          targetJob = offer.title;
          jobDescription = `Title: ${offer.title}\nCompany: ${offer.company}\nRequired skills: ${offer.skillsRequired.join(', ')}\n\n${offer.description}`;
        } else if (d.jobDescriptionRaw) {
          targetJob = this.extractJobTitleFromDescription(d.jobDescriptionRaw);
          jobDescription = d.jobDescriptionRaw;
        } else {
          throw new BadRequestException('Provide either jobOfferId or jobDescriptionRaw');
        }
        break;
      }

      case RoadmapMode.GENERIC: {
        const d = dto as CreateGenericRoadmapDto;
        targetJob = d.topic;
        generationParams = {
          durationWeeks: d.durationWeeks,
          intensity: d.intensity,
          depth: d.depth,
          topic: d.topic,
        };
        break;
      }

      default:
        throw new BadRequestException('Invalid roadmap mode');
    }

    const profileContext =
      profile && dto.mode !== RoadmapMode.GENERIC
        ? this.buildProfileContext(profile, dto as CreateTargetJobRoadmapDto)
        : undefined;

    const prompt = RoadmapPromptBuilder.build({
      mode: dto.mode,
      targetJob,
      params: generationParams,
      profile: profileContext,
      jobDescription,
    });

    const steps = await this.callLlm(prompt);
    const profileSnapshotHash = profile
      ? this.hashProfileSnapshot(profile)
      : null;

    return { steps, targetJob, generationParams, profileSnapshotHash };
  }

  private async callLlm(prompt: string): Promise<RoadmapStep[]> {
    const response = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.choices[0].message.content ?? '[]';

    try {
      const clean = text.replace(/```json|```/g, '').trim();
      const steps: RoadmapStep[] = JSON.parse(clean);

      return steps.map((step) => ({
        ...step,
        id: step.id ?? uuidv4(),
      }));
    } catch {
      throw new BadRequestException(
        'AI returned malformed roadmap data. Please try again.',
      );
    }
  }


  private buildProfileContext(profile: ProfileEntity, dto: CreateTargetJobRoadmapDto) {
    const skills =
      dto.currentSkillsOverride?.length
        ? dto.currentSkillsOverride
        : (profile.skills ?? []).map((s: any) =>
            typeof s === 'string' ? s : s.name,
          );

    return {
      skills,
      experiences: JSON.stringify(profile.experiences ?? []),
      education: JSON.stringify(profile.education ?? []),
      projects: (profile.projects ?? []).map((p: any) => `${p.title}: ${p.description}`).join('\n'),
      userLevel: profile.userLevel ?? 'Junior',
      targetPosition:
        typeof profile.targetPosition === 'object'? (profile.targetPosition as any)?.roles?.join(', ') : String(profile.targetPosition ?? ''),
    };
  }

  private extractJobTitleFromDescription(raw: string): string {
    const firstLine = raw.split('\n')[0].trim();
    return firstLine.length < 80 ? firstLine : 'Target Role';
  }

  private hashProfileSnapshot(profile: ProfileEntity): string {
    const snapshot = JSON.stringify({
      skills: profile.skills,
      experiences: profile.experiences,
      education: profile.education,
      userLevel: profile.userLevel,
    });
    let hash = 0;
    for (let i = 0; i < snapshot.length; i++) {
      hash = (hash << 5) - hash + snapshot.charCodeAt(i);
      hash |= 0;
    }
    return String(hash);
  }

  private paramsToDto(mode: RoadmapMode, targetJob: string, params: GenerationParams): CreateRoadmapDto {
    switch (mode) {
      case RoadmapMode.TARGET_JOB:
        return { mode, targetJob, ...params } as CreateTargetJobRoadmapDto;
      case RoadmapMode.JOB_OFFER:
        return { mode, jobOfferId: params.jobOfferId, jobDescriptionRaw: params.jobDescriptionRaw, ...params } as CreateJobOfferRoadmapDto;
      case RoadmapMode.GENERIC:
        return { mode, topic: params.topic ?? targetJob, ...params } as CreateGenericRoadmapDto;
    }
  }

  private computeEndDate(durationWeeks: number): Date {
    const end = new Date();
    end.setDate(end.getDate() + durationWeeks * 7);
    return end;
  }

  private computeOnTrack(roadmap: RoadmapEntity): boolean | null {
    if (!roadmap.startDate || roadmap.status !== RoadmapStatus.ACTIVE) return null;

    const start = new Date(roadmap.startDate);
    const weeksElapsed = Math.floor(
      (Date.now() - start.getTime()) / (7 * 24 * 60 * 60 * 1000),
    );
    const expectedCompleted = weeksElapsed;
    const actualCompleted = roadmap.steps.filter(
      (s) => s.status === StepStatus.COMPLETED,
    ).length;

    return actualCompleted >= expectedCompleted;
  }

  private async invalidateCache(userId: string, roadmapId: string): Promise<void> {
    await this.redis.del(`user:${userId}:roadmap:${roadmapId}`).catch(() => null);
  }
}
