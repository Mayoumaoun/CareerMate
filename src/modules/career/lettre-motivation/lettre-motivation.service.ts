import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import Groq from 'groq-sdk';
import { JobOfferEntity } from '../job-offer/job-offer.entity';
import { LettreMotivationEntity } from './lettre-motivation.entity';
import { CompanyResearchService } from './company-research.service';
import { PromptBuilderService } from './prompt-builder.service';
import {
  FeedbackDto,
  GenerateLettreMotivationDto,
} from './dto/generate-lettre-motivation.dto';
import { ProfileService } from 'src/modules/profile/profile.service';

@Injectable()
export class LettreMotivationService {
  private groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  constructor(
    @InjectRepository(LettreMotivationEntity)
    private lettreRepo: Repository<LettreMotivationEntity>,

    private profileService: ProfileService,

    @InjectRepository(JobOfferEntity)
    private jobOfferRepo: Repository<JobOfferEntity>,

    private companyResearch: CompanyResearchService,
    private promptBuilder: PromptBuilderService,
  ) {}

  async generate(userId: string, dto: GenerateLettreMotivationDto) {
    
    const profile = await this.profileService.getProfile(userId);
    if (!profile) throw new NotFoundException('Profile not found');

    let company = dto.company;
    let position = dto.position;
    let jobDescription = dto.jobDescription;

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

    const previousFeedbacks = await this.lettreRepo.find({
      where: {
        user: { id: userId },
        liked: Not(IsNull()),
      },
      order: { createdAt: 'DESC' },
      take: 5,
    });

    const { summary, sources } = await this.companyResearch.research(
      company,
      position,
    );

    const prompt = this.promptBuilder.build(
      profile,
      company,
      position,
      dto.tone,
      summary,
      jobDescription,
      previousFeedbacks,
    );
    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 2048,
      messages: [
        {
          role: 'system',
          content: `You are a world-class cover letter writer.
        Follow ALL instructions precisely.
        NEVER use banned phrases.
        NEVER invent facts or metrics.
        NEVER break gender agreement.`,
        },
        { role: 'user', content: prompt },
      ],
    });

    const raw = completion.choices[0].message.content ?? '';
    const letter = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    const saved = await this.lettreRepo.save(
      this.lettreRepo.create({
        content: letter,
        style: dto.tone,
        company,
        position,
        liked: null,
        user: { id: userId },
      }),
    );

    return {
      id: saved.id,
      letter,
      company,
      position,
      sources,
      createdAt: saved.createdAt,
    };
  }

  async addFeedback(id: string, userId: string, dto: FeedbackDto) {
    const lettre = await this.lettreRepo.findOne({
      where: { id, user: { id: userId } },
    });
    if (!lettre) throw new NotFoundException('Lettre not found');

    lettre.liked = dto.liked ?? null;
    lettre.feedbackComment = dto.feedbackComment ?? null;

    await this.lettreRepo.save(lettre);
    return { message: 'Feedback saved', id };
  }

  async findAll(userId: string) {
    return this.lettreRepo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string) {
    const lettre = await this.lettreRepo.findOne({
      where: { id, user: { id: userId } },
    });
    if (!lettre) throw new NotFoundException('Lettre not found');
    return lettre;
  }

  async remove(id: string, userId: string) {
    const lettre = await this.findOne(id, userId);
    await this.lettreRepo.softDelete(lettre.id);
    return { message: 'Deleted successfully' };
  }

  async getProfile(userId: string) {
    const profile = await this.profileService.getProfile(userId);
    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }
}
