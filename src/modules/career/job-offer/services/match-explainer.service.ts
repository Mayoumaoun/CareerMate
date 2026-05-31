import { Injectable, Logger } from '@nestjs/common';
import Groq from 'groq-sdk';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../../common/redis/redis.service';
import { ProfileEntity } from '../../../profile/entities/profile.entity';
import { JobOfferRepository } from '../repositories/job-offer.repository';

@Injectable()
export class MatchExplainerService {
  private readonly logger = new Logger(MatchExplainerService.name);
  private groq: Groq | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly jobOfferRepository: JobOfferRepository,
  ) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY') || '';
    if (apiKey) {
      this.groq = new Groq({ apiKey });
    } else {
      this.logger.warn(
        'GROQ_API_KEY is not defined. Match explanations will fallback to rule-based analysis.',
      );
    }
  }

  async explainMatch(profile: ProfileEntity, jobId: string): Promise<any> {
    const userId = profile.user?.id || profile.id;
    const cacheKey = `match:${userId}:${jobId}`;

    return this.redisService.getOrSet(
      cacheKey,
      async () => {
        const job = await this.jobOfferRepository.findOne({ where: { id: jobId } });

        if (!job) {
          throw new Error(
            'Job not found in database. Live jobs without an ID cannot be explained yet.',
          );
        }

        if (!this.groq) {
          return this.fallbackExplain(profile, job);
        }

        return this.explainWithGroq(profile, job);
      },
      5 * 60 * 1000,
    );
  }

  private async explainWithGroq(profile: ProfileEntity, job: any): Promise<any> {
    const prompt = `You are a career advisor. Given a job and a candidate profile, explain the match.
    Job: ${job.title} at ${job.company}
    Required skills: ${job.skillsRequired.join(', ')}
    Candidate skills: ${profile.skills.map((s) => s.name).join(', ')}
    Candidate level: ${profile.userLevel}
    Target position: ${profile.targetPosition?.roles?.[0] || 'Unknown'}

    Respond ONLY with a valid JSON object using this exact structure:
    { "matched": ["skill1"], "missing": ["skill2"], "advice": "your concise advice" }`;

    try {
      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 512,
      });

      const content = completion.choices[0]?.message?.content;

      if (!content) {
        throw new Error('Empty response from Groq');
      }

      return JSON.parse(content);
    } catch (error) {
      this.logger.error(`Failed to explain match with Groq: ${error.message}`);
      return this.fallbackExplain(profile, job);
    }
  }

  private fallbackExplain(profile: ProfileEntity, job: any): any {
    const profileSkills = profile.skills.map((s) => s.name.toLowerCase());
    const matched: string[] = [];
    const missing: string[] = [];

    for (const reqSkill of job.skillsRequired || []) {
      if (profileSkills.includes(reqSkill.toLowerCase())) {
        matched.push(reqSkill);
      } else {
        missing.push(reqSkill);
      }
    }

    return {
      matched,
      missing,
      advice: `Based on your profile, you match ${matched.length} out of ${job.skillsRequired?.length || 0
        } required skills. Consider learning ${missing.slice(0, 3).join(', ')} to improve your chances.`,
    };
  }
}