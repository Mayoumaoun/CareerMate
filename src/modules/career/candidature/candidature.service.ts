import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CandidatureEntity, CandidatureStatus } from './candidature.entity';
import { JobOfferEntity } from '../job-offer/job-offer.entity';
import { UserEntity } from '../../user/entities/user.entity';

@Injectable()
export class CandidatureService {
  constructor(
    @InjectRepository(CandidatureEntity)
    private readonly candidatureRepository: Repository<CandidatureEntity>,
    @InjectRepository(JobOfferEntity)
    private readonly jobOfferRepository: Repository<JobOfferEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async apply(userId: string, jobOfferId: string): Promise<CandidatureEntity> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const jobOffer = await this.jobOfferRepository.findOne({ where: { id: jobOfferId } });
    if (!jobOffer) {
      throw new NotFoundException(`Job offer with id "${jobOfferId}" not found`);
    }

    const existing = await this.candidatureRepository.findOne({
      where: {
        user: { id: userId },
        relatedJobOffer: { id: jobOfferId },
      },
      relations: ['relatedJobOffer'],
    });

    if (existing) {
      throw new ConflictException('You have already applied to this job offer');
    }

    const now = new Date();
    const candidature = this.candidatureRepository.create({
      status: CandidatureStatus.DRAFT,
      appliedAt: now,
      updatedAt: now,
      deletedAt: null,
      notes: '',
      user,
      relatedJobOffer: jobOffer,
    });

    return this.candidatureRepository.save(candidature);
  }

  async listForUser(userId: string): Promise<CandidatureEntity[]> {
    return this.candidatureRepository.find({
      where: { user: { id: userId } },
      relations: ['relatedJobOffer'],
      order: { appliedAt: 'DESC' },
    });
  }
}
