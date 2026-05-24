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
import { AnswerEvaluatorService } from './answer-evaluator.service';
import { ReportGeneratorService } from './report-generator.service';
import { SpeechService } from './speech.service';
import { CreateEntretienDto } from '../dto/create-entretien.dto';
import { SubmitAnswerDto } from '../dto/submit-answer.dto';
import { SimulationMode } from '../entities/simulation.entity';
import { UserEntity } from 'src/modules/user/entities/user.entity';

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
  ) {}

  async start(userId: string, dto: CreateEntretienDto) {
    // 1. Récupérer le profil
    const profile = await this.profileRepo.findOne({
      where: { user: { id: userId } },
    });
      if (!profile) throw new NotFoundException('Profile not found');
    const user = await this.userRepo.findOne({
    where: { id: userId },
    });
    if (!user) throw new NotFoundException('User not found');

    // 2. Résoudre company + position + jobDescription
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

    // 3. Générer les questions
    const questions = await this.questionGenerator.generateQuestions(
      profile,
      company,
      position,
      entretienType,
      language,
      level,
      jobDescription,
    );

    // 4. Créer la session
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
      totalQuestions: questions.length,
      currentQuestion: questions[0],
      currentQuestionIndex: 0,
      status: entretien.status,
    };
  }

  // Récupérer la question courante en texte
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

  // Récupérer la question en audio (Edge TTS)
  async getCurrentQuestionAudio(id: string, userId: string): Promise<Buffer> {
    const entretien = await this.findOne(id, userId);
    const question = entretien.questions[entretien.currentQuestionIndex];
    return this.speechService.synthesize(question, entretien.language);
  }

  // Soumettre une réponse texte
  async submitAnswer(id: string, userId: string, dto: SubmitAnswerDto) {
    const entretien = await this.findOne(id, userId, ['answers']);

    if (entretien.status === EntretienStatus.COMPLETED) {
      throw new BadRequestException('Interview is already completed');
    }

    const currentQuestion = entretien.questions[entretien.currentQuestionIndex];

    // Évaluer la réponse
    const evaluation = await this.answerEvaluator.evaluate(
      currentQuestion,
      dto.answer,
      entretien.position,
      entretien.company,
      entretien.language,
    );

    // Sauvegarder la réponse
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
      // Générer le rapport final
      return this.complete(entretien);
    }

    // Passer à la question suivante
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

  // Soumettre une réponse audio
  async submitAudioAnswer(
    id: string,
    userId: string,
    audioBuffer: Buffer,
    durationSeconds?: number,
  ) {
    const entretien = await this.findOne(id, userId);

    // Transcrire l'audio
    const transcription = await this.speechService.transcribe(
      audioBuffer,
      entretien.language,
    );

    // Réutiliser submitAnswer avec la transcription
    return this.submitAnswer(id, userId, {
      answer: transcription,
      durationSeconds,
    });
  }

  // Compléter l'entretien et générer le rapport
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
    const entretien = await this.findOne(id, userId);
    await this.entretienRepo.remove(entretien);
    return { message: 'Deleted successfully' };
  }
}
