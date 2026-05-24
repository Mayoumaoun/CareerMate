import { Module } from '@nestjs/common';
import { JobOfferService } from './job-offer.service';
import { JobOfferController } from './job-offer.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobOffer } from './entities/job-offer.entity';
import { ProfileEntity } from '../../profile/entities/profile.entity';

@Module({
  controllers: [JobOfferController],
  providers: [JobOfferService],
  imports: [TypeOrmModule.forFeature([JobOffer, ProfileEntity])],
})
export class JobOfferModule {}

