import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CandidatureEntity } from './candidature.entity';
import { CandidatureController } from './candidature.controller';
import { CandidatureService } from './candidature.service';
import { JobOfferEntity } from '../job-offer/job-offer.entity';
import { UserEntity } from '../../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CandidatureEntity, JobOfferEntity, UserEntity])],
  controllers: [CandidatureController],
  providers: [CandidatureService],
})
export class CandidatureModule {}
