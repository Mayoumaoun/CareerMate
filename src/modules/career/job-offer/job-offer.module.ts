import { Module } from '@nestjs/common';
import { JobOfferService } from './job-offer.service';
import { JobOfferController } from './job-offer.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobOfferEntity } from './job-offer.entity';
import { ProfileEntity } from '../../profile/entities/profile.entity';
import { JobMatchingModule } from './matching/job-matching.module';

@Module({
  controllers: [JobOfferController],
  providers: [JobOfferService],
  imports: [TypeOrmModule.forFeature([JobOfferEntity, ProfileEntity]), JobMatchingModule],
})
export class JobOfferModule {}

