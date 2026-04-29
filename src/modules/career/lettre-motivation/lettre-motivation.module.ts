import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LettreMotivationController } from './lettre-motivation.controller';
import { LettreMotivationService } from './lettre-motivation.service';
import { CompanyResearchService } from './company-research.service';
import { PromptBuilderService } from './prompt-builder.service';
import { LettreMotivationEntity } from './lettre-motivation.entity';
import { ProfileEntity } from '../../profile/entities/profile.entity';
import { JobOfferEntity } from '../job-offer/job-offer.entity';
import { PdfExportService } from './pdf-export.service';
import { ProfileModule } from 'src/modules/profile/profile.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      LettreMotivationEntity,
      ProfileEntity,
      JobOfferEntity,
    ]),
    ProfileModule,
  ],
  controllers: [LettreMotivationController],
  providers: [
    LettreMotivationService,
    CompanyResearchService,
    PromptBuilderService,
    PdfExportService,
  ],
})
export class LettreMotivationModule {}
