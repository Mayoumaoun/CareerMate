import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { JobOfferEntity } from './entities/job-offer.entity';
import { JobOfferController } from './job-offer.controller';
import { JobOfferService } from './job-offer.service';
import { JobOfferRepository } from './repositories/job-offer.repository';
import { QueryGeneratorService } from './services/query-generator.service';
import { JobFetcherService } from './services/job-fetcher.service';
import { JobNormalizerService } from './services/job-normalizer.service';
import { JobRankerService } from './services/job-ranker.service';
import { MatchExplainerService } from './services/match-explainer.service';
import { HimalayasAdapter } from './adapters/himalayas.adapter';
import { ArbeitnowAdapter } from './adapters/arbeitnow.adapter';
import { JSearchAdapter } from './adapters/jsearch.adapter';
import { TanitjobsAdapter } from './adapters/tanitjobs.adapter';
import { RedisModule } from '../../../common/redis/redis.module';
import { ProfileEntity } from '../../profile/entities/profile.entity'; // For feature if needed

@Module({
  imports: [
    TypeOrmModule.forFeature([JobOfferEntity]),
    HttpModule,
    ScheduleModule.forRoot(),
    RedisModule,
  ],
  controllers: [JobOfferController],
  providers: [
    JobOfferService,
    JobOfferRepository,
    QueryGeneratorService,
    JobFetcherService,
    JobNormalizerService,
    JobRankerService,
    MatchExplainerService,
    HimalayasAdapter,
    ArbeitnowAdapter,
    JSearchAdapter,
    TanitjobsAdapter,
  ],
  exports: [JobOfferService],
})
export class JobOfferModule {}
