import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobOfferEntity } from '../job-offer.entity';
import { ProfileEntity } from '../../../profile/entities/profile.entity';
import { UserEntity } from '../../../user/entities/user.entity';
import { AdzunaAdapter } from './adapters/adzuna.adapter';
import { TheMuseAdapter } from './adapters/themuse.adapter';
import { AIRerankerService } from './ai-reranker.service';
import { JobMatchingController } from './job-matching.controller';
import { JobMatchingService } from './job-matching.service';
import { SimpleEmbeddingService } from './simple-embedding.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, ProfileEntity, JobOfferEntity])],
  controllers: [JobMatchingController],
  providers: [AdzunaAdapter, TheMuseAdapter, AIRerankerService, JobMatchingService, SimpleEmbeddingService],
})
export class JobMatchingModule {}