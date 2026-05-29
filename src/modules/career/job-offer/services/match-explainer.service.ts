import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../../common/redis/redis.service';
import { ProfileEntity } from '../../../profile/entities/profile.entity';
import { JobOfferRepository } from '../repositories/job-offer.repository';

@Injectable()
export class MatchExplainerService {
  private readonly logger = new Logger(MatchExplainerService.name);
  private genAI: GoogleGenerativeAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly jobOfferRepository: JobOfferRepository,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    } else {
      this.logger.warn('GEMINI_API_KEY is not defined. Match explanations will fallback to rule-based analysis.');
    }
  }

  async explainMatch(profile: ProfileEntity, jobId: string): Promise<any> {
    const userId = profile.user?.id || profile.id;
    const cacheKey = `match:${userId}:${jobId}`;
    
    // Check Cache first
    return this.redisService.getOrSet(cacheKey, async () => {
      // Fetch Job from DB
      const job = await this.jobOfferRepository.findOne({ where: { id: jobId } });
      
      if (!job) {
        throw new Error('Job not found in database. Live jobs without an ID cannot be explained yet.');
      }

      if (!this.genAI) {
        // Fallback if API key is missing
        return this.fallbackExplain(profile, job);
      }

      const prompt = `
You are a career advisor. Given a job and a candidate profile, explain the match.
Job: ${job.title} at ${job.company}
Required skills: ${job.skillsRequired.join(', ')}
Candidate skills: ${profile.skills.map(s => s.name).join(', ')}
Candidate level: ${profile.userLevel}
Target position: ${profile.targetPosition?.roles?.[0] || 'Unknown'}

Respond ONLY in valid JSON (no preamble, no markdown formatting) using this exact structure:
{ "matched": ["skill1"], "missing": ["skill2"], "advice": "your concise advice" }`;

      try {
        const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(prompt);
        // Clean up markdown in case the model wraps the response in ```json ... ```
        const text = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();
        return JSON.parse(text);
      } catch (error) {
        this.logger.error(`Failed to explain match with LLM: ${error.message}`);
        return this.fallbackExplain(profile, job);
      }
    }, 24 * 3600 * 1000); // 24 hours caching
  }

  private fallbackExplain(profile: ProfileEntity, job: any): any {
    const profileSkills = profile.skills.map(s => s.name.toLowerCase());
    const matched = [];
    const missing = [];
    
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
      advice: `Based on your profile, you match ${matched.length} out of ${job.skillsRequired.length || 0} required skills. Consider learning ${missing.slice(0, 3).join(', ')} to improve your chances.`,
    };
  }
}
