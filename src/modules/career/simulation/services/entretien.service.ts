import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EntretienEntity,
  EntretienStatus,
  EntretienType,
  EntretienLanguage,
  EntretienLevel,
} from '../entities/entretien.entity';
import { EntretienAnswerEntity } from '../entities/entretien-answer.entity';
import { JobOfferEntity } from '../../job-offer/job-offer.entity';
import { ProfileEntity } from '../../../profile/entities/profile.entity';
import { QuestionGeneratorService } from './question-generator.service';
import {
  AnswerEvaluatorService,
  QuestionType,
} from './answer-evaluator.service';
import { ReportGeneratorService } from './report-generator.service';
import { SpeechService } from './speech.service';
import { CreateEntretienDto } from '../dto/create-entretien.dto';
import { SubmitAnswerDto } from '../dto/submit-answer.dto';
import { SimulationMode } from '../entities/simulation.entity';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import { JobDescriptionCleanerService } from 'src/common/services/job-description-cleaner.service';

const questionTypeMaps: Record<EntretienType, Record<number, QuestionType>> = {
  [EntretienType.TECHNIQUE]: {
    0: 'ice-breaker',
    1: 'technical-overview',
    2: 'technical',
    3: 'technical',
    4: 'technical',
    5: 'technical',
    6: 'technical-scenario',
    7: 'closing',
  },
  [EntretienType.COMPORTEMENTAL]: {
    0: 'ice-breaker',
    1: 'motivation',
    2: 'behavioral',
    3: 'behavioral',
    4: 'behavioral',
    5: 'behavioral',
    6: 'culture-fit',
    7: 'closing',
  },
  [EntretienType.MIXTE]: {
    0: 'ice-breaker',
    1: 'motivation',
    2: 'behavioral',
    3: 'technical',
    4: 'behavioral',
    5: 'technical',
    6: 'situational',
    7: 'closing',
  },
};

@Injectable()
export class EntretienService {
  constructor(
    @InjectRepository(EntretienEntity)
    private entretienRepo: Repository<EntretienEntity>,

    @InjectRepository(EntretienAnswerEntity)
    private answerRepo: Repository<EntretienAnswerEntity>,

    @InjectRepository(JobOfferEntity)
    private jobOfferRepo: Repository<JobOfferEntity>,

    @InjectRepository(ProfileEntity)
    private profileRepo: Repository<ProfileEntity>,

    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,

    private questionGenerator: QuestionGeneratorService,
    private answerEvaluator: AnswerEvaluatorService,
    private reportGenerator: ReportGeneratorService,
    private speechService: SpeechService,
    private jobDescriptionCleaner: JobDescriptionCleanerService,
  ) { }

  async start(userId: string, dto: CreateEntretienDto) {
    const profile = await this.profileRepo.findOne({
      where: { user: { id: userId } },
    });
    if (!profile) throw new NotFoundException('Profile not found');
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('User not found');

    let company = dto.company;
    let position = dto.position;
    let jobDescription: string | undefined;

    if (dto.jobOfferId) {
      const jobOffer = await this.jobOfferRepo.findOne({
        where: { id: dto.jobOfferId },
      });
      if (!jobOffer) throw new NotFoundException('Job offer not found');
      company = jobOffer.company;
      position = jobOffer.title;
      jobDescription = jobOffer.description;
    }

    if (!company || !position) {
      throw new BadRequestException('company and position are required');
    }

    const language = dto.language ?? EntretienLanguage.FR;
    const level = dto.level ?? EntretienLevel.JUNIOR;
    const entretienType = dto.entretienType ?? EntretienType.MIXTE;
    const mode = dto.mode ?? SimulationMode.TEXT;
    if (jobDescription) {
      jobDescription = await this.jobDescriptionCleaner.clean(
        jobDescription,
        position,
      );
    }
    const questions = await this.questionGenerator.generateQuestions(
      profile,
      company,
      position,
      entretienType,
      language,
      level,
      jobDescription,
    );

    const entretien = await this.entretienRepo.save(
      this.entretienRepo.create({
        company,
        position,
        jobOfferId: dto.jobOfferId ?? null,
        entretienType,
        status: EntretienStatus.IN_PROGRESS,
        language,
        level,
        mode,
        questions,
        currentQuestionIndex: 0,
        score: null,
        report: null,
        completedAt: null,
        user: user,
      }),
    );

    return {
      id: entretien.id,
      company,
      position,
      mode,
      totalQuestions: questions.length,
      currentQuestion: questions[0],
      currentQuestionIndex: 0,
      status: entretien.status,
    };
  }

  async getCurrentQuestion(id: string, userId: string) {
    const entretien = await this.findOne(id, userId);

    if (entretien.status === EntretienStatus.COMPLETED) {
      throw new BadRequestException('Interview is already completed');
    }

    return {
      currentQuestionIndex: entretien.currentQuestionIndex,
      totalQuestions: entretien.questions.length,
      question: entretien.questions[entretien.currentQuestionIndex],
      isLastQuestion:
        entretien.currentQuestionIndex === entretien.questions.length - 1,
    };
  }

  async getCurrentQuestionAudio(id: string, userId: string): Promise<Buffer> {
    const entretien = await this.findOne(id, userId);
    const question = entretien.questions[entretien.currentQuestionIndex];
    return this.speechService.synthesize(question, entretien.language);
  }

  async submitAnswer(id: string, userId: string, dto: SubmitAnswerDto) {
    const entretien = await this.findOne(id, userId, ['answers']);

    if (entretien.status === EntretienStatus.COMPLETED) {
      throw new BadRequestException('Interview is already completed');
    }

    const currentQuestion = entretien.questions[entretien.currentQuestionIndex];

    // Résoudre le type de question selon le type d'entretien et l'index courant
    const questionType: QuestionType =
      questionTypeMaps[entretien.entretienType]?.[
        entretien.currentQuestionIndex
      ] ?? 'behavioral';

    const evaluation = await this.answerEvaluator.evaluate(
      currentQuestion,
      dto.answer,
      entretien.position,
      entretien.company,
      entretien.language,
      questionType,
    );

    await this.answerRepo.save(
      this.answerRepo.create({
        questionIndex: entretien.currentQuestionIndex,
        question: currentQuestion,
        answer: dto.answer,
        score: evaluation.score,
        feedback: evaluation.feedback,
        durationSeconds: dto.durationSeconds ?? null,
        entretien: { id: entretien.id },
      }),
    );

    const isLastQuestion =
      entretien.currentQuestionIndex >= entretien.questions.length - 1;

    if (isLastQuestion) {
      return this.complete(entretien);
    }

    await this.entretienRepo.update(id, {
      currentQuestionIndex: entretien.currentQuestionIndex + 1,
    });

    const nextQuestion =
      entretien.questions[entretien.currentQuestionIndex + 1];

    return {
      evaluated: true,
      score: evaluation.score,
      feedback: evaluation.feedback,
      followUp: evaluation.followUp,
      nextQuestion,
      nextQuestionIndex: entretien.currentQuestionIndex + 1,
      totalQuestions: entretien.questions.length,
      isCompleted: false,
    };
  }

  async submitAudioAnswer(
    id: string,
    userId: string,
    audioBuffer: Buffer,
    durationSeconds?: number,
  ) {
    const entretien = await this.findOne(id, userId);

    const transcription = await this.speechService.transcribe(
      audioBuffer,
      entretien.language,
    );

    return this.submitAnswer(id, userId, {
      answer: transcription,
      durationSeconds,
    });
  }

  private async complete(entretien: EntretienEntity) {
    const answers = await this.answerRepo.find({
      where: { entretien: { id: entretien.id } },
      order: { questionIndex: 'ASC' },
    });

    const { report, globalScore } = await this.reportGenerator.generateReport(
      answers,
      entretien.position,
      entretien.company,
      entretien.language,
    );

    await this.entretienRepo.update(entretien.id, {
      status: EntretienStatus.COMPLETED,
      score: globalScore,
      report,
      completedAt: new Date(),
    });

    return {
      isCompleted: true,
      globalScore,
      report,
      answers: answers.map((a) => ({
        question: a.question,
        answer: a.answer,
        score: a.score,
        feedback: a.feedback,
      })),
    };
  }

  async getReport(id: string, userId: string) {
    const entretien = await this.findOne(id, userId, ['answers']);

    if (entretien.status !== EntretienStatus.COMPLETED) {
      throw new BadRequestException('Interview is not completed yet');
    }

    return {
      id: entretien.id,
      company: entretien.company,
      position: entretien.position,
      globalScore: entretien.score,
      report: entretien.report,
      completedAt: entretien.completedAt,
      answers: entretien.answers?.map((a) => ({
        question: a.question,
        answer: a.answer,
        score: a.score,
        feedback: a.feedback,
        durationSeconds: a.durationSeconds,
      })),
    };
  }

  async findAll(userId: string) {
    return this.entretienRepo.find({
      where: { user: { id: userId } },
      order: { simulatedAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string, relations: string[] = []) {
    const entretien = await this.entretienRepo.findOne({
      where: { id, user: { id: userId } },
      relations,
    });
    if (!entretien) throw new NotFoundException('Entretien not found');
    return entretien;
  }

  async remove(id: string, userId: string) {
    const entretien = await this.findOne(id, userId, ['answers']);

    if (entretien.answers?.length) {
      await this.answerRepo.remove(entretien.answers);
    }

    await this.entretienRepo.remove(entretien);
    return { message: 'Deleted successfully' };
  }
}
