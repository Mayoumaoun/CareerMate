import { Injectable } from '@nestjs/common';
import { ProfileEntity } from '../../../profile/entities/profile.entity';

@Injectable()
export class QueryGeneratorService {
  /**
   * Generates deterministic search queries for job APIs based on the user's profile.
   * Biased towards Tunisia and Remote jobs as per constraints.
   */
  buildQueries(profile: ProfileEntity): string[] {
    const targetPosition = profile.targetPosition?.roles?.[0] ?? '';
    const skills = profile.skills?.map((s) => s.name).slice(0, 3) ?? [];

    const base = [targetPosition, ...skills].filter(Boolean).join(' ').trim();
    
    if (!base) {
      return ['Software Engineer remote Tunisia']; // safe fallback
    }

    // Return a variety of queries to maximize coverage
    return [
      `${base} remote`,
      `${base} Tunisia`,
      `${base} North Africa remote`,
      `${base}`,
    ];
  }
}
