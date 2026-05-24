import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateJobOfferDto } from './dto/create-job-offer.dto';
import { UpdateJobOfferDto } from './dto/update-job-offer.dto';
import { MatchQueryDto } from './dto/match-query.dto';
import { MatchResultDto } from './dto/match-result.dto';
import { JobOffer } from './entities/job-offer.entity';
import { ProfileEntity } from '../../profile/entities/profile.entity';

@Injectable()
export class JobOfferService {
  constructor(
    @InjectRepository(JobOffer)
    private readonly jobOfferRepository: Repository<JobOffer>,
    @InjectRepository(ProfileEntity)
    private readonly profileRepository: Repository<ProfileEntity>,
  ) {}

  async create(createJobOfferDto: CreateJobOfferDto) {
    const jobOffer = this.jobOfferRepository.create(createJobOfferDto as Partial<JobOffer>);
    return this.jobOfferRepository.save(jobOffer);
  }

  async findAll() {
    return this.jobOfferRepository.find();
  }

  async matchForProfile(
    profileId: string,
    filters: MatchQueryDto,
  ): Promise<MatchResultDto[]> {
    const profile = await this.profileRepository.findOne({
      where: { id: profileId },
    });

    if (!profile) {
      throw new NotFoundException(`Profile with id "${profileId}" not found`);
    }

    const profileSkills = (profile.skills ?? []).map((skill) => skill.name.toLowerCase());
    const offers = await this.jobOfferRepository.find();
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

  private toMatchResult(offer: JobOffer, profileSkills: string[]): MatchResultDto {
    const jobSkills = (offer.extractedSkills ?? []).map((skill) => skill.skill_name);
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
      experienceLevel: offer.experienceLevel ?? '',
      salaryMin: offer.salaryMin ?? undefined,
      salaryMax: offer.salaryMax ?? undefined,
      description: offer.description ?? '',
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
    return results
      .filter((result) => !filters.location?.length || filters.location.includes(result.location))
      .filter(
        (result) =>
          !filters.experienceLevel?.length ||
          filters.experienceLevel.includes(result.experienceLevel),
      )
      .filter(
        (result) => filters.salaryMin === undefined || (result.salaryMin ?? 0) >= filters.salaryMin,
      )
      .filter(
        (result) => filters.salaryMax === undefined || (result.salaryMax ?? 0) <= filters.salaryMax,
      );
  }
}
