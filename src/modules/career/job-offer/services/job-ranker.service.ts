import { Injectable, Logger } from '@nestjs/common';
import { ProfileEntity } from '../../../profile/entities/profile.entity';
import { JobOfferEntity } from '../entities/job-offer.entity';
import { JobOfferRepository } from '../repositories/job-offer.repository';
import { RankedJobDto } from '../dto/job.dto';

interface RankedCandidate {
  job: any; // Can be Entity or raw live job
  score: number;
  skillOverlap: number;
  matchedSkills: string[];
  missingSkills: string[];
}

@Injectable()
export class JobRankerService {
  private readonly logger = new Logger(JobRankerService.name);

  constructor(private readonly jobOfferRepository: JobOfferRepository) { }

  async rankJobs(profile: ProfileEntity, liveJobs: any[]): Promise<RankedJobDto[]> {
    const profileVector = profile.profileVector;
    let dbJobs: JobOfferEntity[] = [];

    // Stage 1: Vector matching from DB (Top 30 candidates)
    if (profileVector && profileVector.length > 0) {
      this.logger.debug('Fetching top candidates from DB via pgvector...');
      dbJobs = await this.jobOfferRepository.findSimilarJobs(profileVector, 30);
    } else {
      this.logger.debug('Profile has no vector, skipping DB vector search.');
    }

    // Merge candidates
    const allCandidates = this.mergeAndFilterCandidates(dbJobs, liveJobs);

    if (allCandidates.length === 0) {
      return [];
    }

    const profileSkills = profile.skills?.map(s => s.name.toLowerCase().trim()) || [];

    // Stage 2: Rule-based ranking
    const rankedCandidates: RankedCandidate[] = allCandidates.map(job => {
      return this.calculateRuleScore(job, profile, profileVector, profileSkills);
    });

    // Sort descending by score
    rankedCandidates.sort((a, b) => b.score - a.score);

    // Map top 20 to DTO
    return rankedCandidates.slice(0, 20).map(c => this.mapToDto(c));
  }

  private mergeAndFilterCandidates(dbJobs: any[], liveJobs: any[]): any[] {
    const map = new Map<string, any>();

    for (const job of dbJobs) {
      if (job.id) map.set(job.id, job);
    }

    for (const job of liveJobs) {
      if (job.id && !map.has(job.id)) {
        map.set(job.id, job);
      }
    }

    return Array.from(map.values());
  }

  private calculateRuleScore(
    job: any,
    profile: ProfileEntity,
    profileVector: number[] | null,
    profileSkills: string[]
  ): RankedCandidate {
    let score = 0;

    // 1. Vector Similarity (base, max ~1.0)
    if (profileVector && job.vector) {
      const sim = this.cosineSimilarity(profileVector, job.vector);
      // sim is between -1 and 1. We scale it up if it's positive.
      score += Math.max(0, sim);
    }

    // 2. Skill overlap
    const jobSkills = job.skillsRequired || [];
    let overlapRatio = 0;
    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];

    if (jobSkills.length > 0) {
      for (const reqSkill of jobSkills) {
        if (profileSkills.includes(reqSkill.toLowerCase().trim())) {
          matchedSkills.push(reqSkill);
        } else {
          missingSkills.push(reqSkill);
        }
      }
      overlapRatio = matchedSkills.length / jobSkills.length;
      score += overlapRatio; // Up to 1.0
    }

    // 3. Seniority match (up to 0.2)
    const desc = (job.description || '').toLowerCase();
    const isJunior = desc.includes('junior') || desc.includes('entry') || desc.includes('intern');
    const isSenior = desc.includes('senior') || desc.includes('lead') || desc.includes('principal');
    const userLvl = profile.userLevel;

    if (userLvl === 'Senior' && isSenior) score += 0.2;
    if (userLvl === 'Junior' && isJunior) score += 0.2;
    if (userLvl === 'Student' && isJunior) score += 0.1;

    // 4. Location boost (up to 0.15)
    const loc = (job.location || '').toLowerCase();
    if (loc.includes('tunisia') || loc.includes('tn')) {
      score += 0.15;
    } else if (job.remote === true || loc.includes('remote')) {
      score += 0.10;
    }

    // 5. Freshness decay
    if (job.postedAt) {
      const daysOld = (Date.now() - new Date(job.postedAt).getTime()) / (1000 * 3600 * 24);
      if (daysOld <= 7) {
        score += 0.1; // full score for fresh jobs
      } else {
        score += Math.max(0, 0.1 - (daysOld * 0.005)); // slow decay
      }
    }

    // Normalize score to 0-100% format (max theoretical score is ~2.45, so we divide by 2.45 to normalize)
    // Actually, letting it be a percentage of max expected score is better for frontend visualization.
    const normalizedScore = Math.min(100, Math.round((score / 2.45) * 100));

    return {
      job,
      score: normalizedScore,
      skillOverlap: overlapRatio,
      matchedSkills,
      missingSkills,
    };
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private mapToDto(candidate: RankedCandidate): RankedJobDto {
    const job = candidate.job;
    return {
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      remote: job.remote,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      contractType: job.contractType,
      description: job.description,
      skillsRequired: job.skillsRequired,
      postedAt: job.postedAt,
      url: job.url,
      source: job.source,
      score: candidate.score,
      skillOverlap: candidate.skillOverlap,
      matchedSkills: candidate.matchedSkills,
      missingSkills: candidate.missingSkills,
    };
  }
}