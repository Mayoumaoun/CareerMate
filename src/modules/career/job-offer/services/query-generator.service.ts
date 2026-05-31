import { Injectable } from '@nestjs/common';
import { ProfileEntity } from '../../../profile/entities/profile.entity';

@Injectable()
export class QueryGeneratorService {
  /**
   * Generates deterministic search queries for job APIs based on the user's profile.
   * Utilizes target profile, past experiences, and skills to personalize the search.
   */
  buildQueries(profile: ProfileEntity): string[] {
    const queries = new Set<string>();

    const roles: string[] = [];
    if (profile.targetProfile?.targetPositions && Array.isArray(profile.targetProfile.targetPositions)) {
      roles.push(...profile.targetProfile.targetPositions);
    }
    if (profile.targetPosition?.roles) {
      roles.push(...profile.targetPosition.roles);
    }
    if (profile.experiences && profile.experiences.length > 0) {
      roles.push(profile.experiences[0].title);
    }
    if (roles.length === 0) {
      roles.push('Developer');
    }

    const distinctRoles = Array.from(new Set(roles.map(r => r.toLowerCase().trim()))).slice(0, 2);

    let topSkills = profile.skills?.filter(s => s.level !== 'beginner').map(s => s.name) || [];
    if (topSkills.length === 0) {
      topSkills = profile.skills?.map(s => s.name) || [];
    }
    const locations: string[] = [];
    if (profile.targetProfile?.targetCities && Array.isArray(profile.targetProfile.targetCities)) {
      locations.push(...profile.targetProfile.targetCities);
    }
    locations.push('Tunisia'); // Fallback / broad search
    const distinctLocations = Array.from(new Set(locations)).slice(0, 2);

    let contractType = '';
    if (profile.targetProfile?.contractTypes && Array.isArray(profile.targetProfile.contractTypes)) {
      const preferred = profile.targetProfile.contractTypes.find((c: any) => c.preferred);
      if (preferred) {
        if (preferred.type === 'stage') contractType = 'internship';
        else if (preferred.type === 'freelance') contractType = 'freelance';
      }
    }

    // Add standalone top skills to catch jobs where the title might not match perfectly
    for (const skill of topSkills.slice(0, 3)) {
      queries.add(skill);
    }

    for (const role of distinctRoles) {
      queries.add(role);

      if (topSkills.length > 0) {
        queries.add(`${role} ${topSkills[0]}`);
      }

      for (const loc of distinctLocations) {
        if (loc.toLowerCase() !== 'tunisia') {
          queries.add(`${role} ${loc}`);
        }
      }

      const remotePref = profile.targetProfile?.remotePreference?.type;
      if (remotePref === 'remote' || remotePref === 'hybrid') {
        queries.add(`${role} remote`);
      }

      if (contractType) {
        queries.add(`${role} ${contractType}`);
      }
    }

    // Limit the number of generated queries
    return Array.from(queries).slice(0, 6);
  }
}
