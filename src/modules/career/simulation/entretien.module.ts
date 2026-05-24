import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { EntretienController } from './entretien.controller';
import { EntretienService } from './services/entretien.service';
import { QuestionGeneratorService } from './services/question-generator.service';
import { AnswerEvaluatorService } from './services/answer-evaluator.service';
import { ReportGeneratorService } from './services/report-generator.service';
import { SpeechService } from './services/speech.service';
import { EntretienEntity } from './entities/entretien.entity';
import { EntretienAnswerEntity } from './entities/entretien-answer.entity';
import { Simulation } from './entities/simulation.entity';
import { JobOfferEntity } from '../job-offer/job-offer.entity';
import { ProfileEntity } from '../../profile/entities/profile.entity';
import { UserEntity } from 'src/modules/user/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Simulation,
      EntretienEntity,
      EntretienAnswerEntity,
      JobOfferEntity,
        ProfileEntity,
      UserEntity
    ]),
    MulterModule.register({ limits: { fileSize: 25 * 1024 * 1024 } }), // 25MB max
  ],
  controllers: [EntretienController],
  providers: [
    EntretienService,
    QuestionGeneratorService,
    AnswerEvaluatorService,
    ReportGeneratorService,
    SpeechService,
  ],
})
export class SimulationModule {}
