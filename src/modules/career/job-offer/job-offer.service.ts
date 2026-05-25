import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateJobOfferDto } from './dto/create-job-offer.dto';
import { UpdateJobOfferDto } from './dto/update-job-offer.dto';
import { MatchQueryDto } from './dto/match-query.dto';
import { MatchResultDto } from './dto/match-result.dto';
import { JobOfferEntity } from './job-offer.entity';
import { ProfileEntity } from '../../profile/entities/profile.entity';
import { JobMatchingService } from './matching/job-matching.service';

@Injectable()
export class JobOfferService {
  private readonly logger = new Logger(JobOfferService.name);
  private static readonly DEFAULT_SYNC_KEYWORDS = [
    'software engineer',
    'frontend developer',
    'backend developer',
    'full stack developer',
  ];

  constructor(
    @InjectRepository(JobOfferEntity)
    private readonly jobOfferRepository: Repository<JobOfferEntity>,
    @InjectRepository(ProfileEntity)
    private readonly profileRepository: Repository<ProfileEntity>,
    private readonly jobMatchingService: JobMatchingService,
  ) {}

  async create(createJobOfferDto: CreateJobOfferDto) {
    const jobOffer = this.jobOfferRepository.create(createJobOfferDto as Partial<JobOfferEntity>);
    return this.jobOfferRepository.save(jobOffer);
  }

  async findAll(filters: MatchQueryDto = {}): Promise<MatchResultDto[]> {
    await this.ensureOffersAvailable(undefined, filters);
    const offers = await this.jobOfferRepository.find({
      order: {
        postedAt: 'DESC',
        createdAt: 'DESC',
      },
    });

    const results = offers.map((offer) => this.toMatchResult(offer, []));
    return this.applyFilters(results, filters);
  }

  async matchForProfile(
    profileId: string,
    filters: MatchQueryDto,
  ): Promise<MatchResultDto[]> {
    const profile = await this.profileRepository.findOne({
      where: { id: profileId },
      relations: ['user'],
    });

    if (!profile) {
      throw new NotFoundException(`Profile with id "${profileId}" not found`);
    }

    await this.ensureOffersAvailable(profile, filters);

    const profileSkills = (profile.skills ?? []).map((skill) => skill.name.toLowerCase());
    const offers = await this.jobOfferRepository.find({
      order: {
        postedAt: 'DESC',
        createdAt: 'DESC',
      },
    });
    const results = offers
      .map((offer) => this.toMatchResult(offer, profileSkills))
      .sort((a, b) => b.score - a.score);

    return this.applyFilters(results, filters);
  }

  async update(id: string, updateJobOfferDto: UpdateJobOfferDto) {
    const existing = await this.jobOfferRepository.findOne({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Job offer with id "${id}" not found`);
    }

    const updated = this.jobOfferRepository.merge(existing, updateJobOfferDto);
    return this.jobOfferRepository.save(updated);
  }

  async remove(id: string) {
    const existing = await this.jobOfferRepository.findOne({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Job offer with id "${id}" not found`);
    }

    await this.jobOfferRepository.remove(existing);
    return { deleted: true, id };
  }

  private async ensureOffersAvailable(
    profile?: ProfileEntity,
    filters?: MatchQueryDto,
  ): Promise<void> {
    const existingCount = await this.jobOfferRepository.count();
    if (existingCount > 0) {
      this.logger.debug(`Found ${existingCount} existing job offers in database`);
      return;
    }

    this.logger.log('No job offers found in database. Starting auto-sync from external sources...');

    const location = filters?.location?.[0];
    const keywords = filters?.skills?.length
      ? filters.skills
      : filters?.search
        ? [filters.search]
        : JobOfferService.DEFAULT_SYNC_KEYWORDS;

    this.logger.debug(`Syncing jobs with keywords: ${keywords.join(', ')}, location: ${location || 'not specified'}`);

    try {
      let syncResult;
      if (profile?.user?.id) {
        this.logger.debug(`Syncing jobs for user ${profile.user.id}`);
        syncResult = await this.jobMatchingService.syncJobSources({
          userId: profile.user.id,
          keywords,
          location,
          limitPerSource: 12,
        });
      } else {
        this.logger.debug('Syncing jobs without user profile');
        syncResult = await this.jobMatchingService.syncJobSources({
          keywords,
          location,
          limitPerSource: 12,
        });
      }

      this.logger.log(`Job sync completed: fetched=${syncResult.fetched}, inserted=${syncResult.inserted}`);
      
      if (syncResult.inserted === 0 && syncResult.fetched === 0) {
        this.logger.warn('Job sync returned 0 results. Check adapter credentials and network connectivity.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown sync error';
      const stack = error instanceof Error ? error.stack : '';
      this.logger.error(`Unable to auto-sync job offers: ${message}`, stack);
    }
  }

  private toMatchResult(offer: JobOfferEntity, profileSkills: string[]): MatchResultDto {
    const jobSkills = this.extractJobSkills(offer);
    const jobSkillsLower = jobSkills.map((skill) => skill.toLowerCase());

    const matchedSkills = jobSkills.filter((skill) =>
      profileSkills.includes(skill.toLowerCase()),
    );
    
    const missingSkills = jobSkills.filter(
      (skill) => !profileSkills.includes(skill.toLowerCase()),
    );

    const score = jobSkillsLower.length
      ? Math.round((matchedSkills.length / jobSkillsLower.length) * 100)
      : 0;

    return {
      jobId: offer.id,
      title: offer.title,
      company: offer.company ?? '',
      location: offer.location ?? '',
      remote: offer.remote,
      experienceLevel: this.inferExperienceLevel(offer),
      salaryMin: offer.salaryMin ?? undefined,
      salaryMax: offer.salaryMax ?? undefined,
      description: offer.description ?? '',
      url: offer.url,
      skills: jobSkills,
      score,
      matchedSkills,
      missingSkills,
    };
  }

  private applyFilters(
    results: MatchResultDto[],
    filters: MatchQueryDto,
  ): MatchResultDto[] {
    const normalizedSearch = filters.search?.trim().toLowerCase();

    return results
      .filter((result) => {
        if (!normalizedSearch) {
          return true;
        }

        return this.buildSearchableText(result).includes(normalizedSearch);
      })
      .filter(
        (result) =>
          !filters.skills?.length ||
          filters.skills.some((skill) =>
            result.skills.some((jobSkill) => jobSkill.toLowerCase() === skill.toLowerCase()) ||
            this.buildSearchableText(result).includes(skill.toLowerCase()),
          ),
      )
      .filter((result) => {
        if (!filters.location?.length) {
          return true;
        }

        const locationText = result.location.toLowerCase();
        return filters.location.some((location) => {
          const normalizedLocation = location.toLowerCase();
          if (normalizedLocation === 'remote') {
            return result.remote || locationText.includes('remote');
          }

          return locationText.includes(normalizedLocation);
        });
      })
      .filter(
        (result) =>
          !filters.experienceLevel?.length ||
          filters.experienceLevel.some(
            (level) => level.toLowerCase() === result.experienceLevel.toLowerCase(),
          ),
      )
      .filter(
        (result) =>
          filters.salaryMin === undefined ||
          (result.salaryMax !== undefined && result.salaryMax >= filters.salaryMin),
      )
      .filter(
        (result) =>
          filters.salaryMax === undefined ||
          (result.salaryMin !== undefined && result.salaryMin <= filters.salaryMax),
      );
  }

  private extractJobSkills(offer: JobOfferEntity): string[] {
    return (offer.skillsRequired ?? [])
      .map((skill) => String(skill).trim())
      .filter((skill) => skill.length > 0);
  }

  private inferExperienceLevel(offer: JobOfferEntity): string {
    const text = `${offer.title} ${offer.description}`.toLowerCase();

    if (/(intern|internship|junior|entry|graduate|trainee)/i.test(text)) {
      return 'Entry Level';
    }
    if (/(lead|principal|staff|architect|manager|head)/i.test(text)) {
      return 'Lead';
    }
    if (/(senior|sr\\.?)/i.test(text)) {
      return 'Senior';
    }

    return 'Mid Level';
  }

  private buildSearchableText(result: MatchResultDto): string {
    return [
      result.title,
      result.company,
      result.location,
      result.experienceLevel,
      result.description,
      result.skills.join(' '),
      result.remote ? 'remote' : '',
    ]
      .join(' ')
      .toLowerCase();
  }

  async getDebugStatus() {
    const totalJobsInDb = await this.jobOfferRepository.count();
    const jobsBySource = await this.jobOfferRepository
      .createQueryBuilder('job')
      .select('job.source', 'source')
      .addSelect('COUNT(*)', 'count')
      .groupBy('job.source')
      .getRawMany();

    return {
      timestamp: new Date().toISOString(),
      totalJobsInDatabase: totalJobsInDb,
      jobsBySource: jobsBySource.map((row) => ({
        source: row.source,
        count: parseInt(row.count),
      })),
      recentJobs: await this.jobOfferRepository.find({
        take: 5,
        order: { createdAt: 'DESC' },
        select: ['id', 'title', 'company', 'source', 'createdAt'],
      }),
    };
  }
}
