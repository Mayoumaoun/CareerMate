import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoadmapEntity } from './roadmap.entity';
import { RoadmapService } from './roadmap.service';
import { RoadmapController } from './roadmap.controller';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import { ProfileEntity } from 'src/modules/profile/entities/profile.entity';
import { JobOfferEntity } from 'src/modules/career/job-offer/job-offer.entity';
import { RedisModule } from 'src/common/redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoadmapEntity, UserEntity, ProfileEntity, JobOfferEntity]),
    RedisModule,
  ],
  controllers: [RoadmapController],
  providers: [RoadmapService],
  exports: [RoadmapService],
})
export class RoadmapModule {}
