// match-query.dto.ts
export class MatchQueryDto {
  skills?: string[];
  location?: string[];         // "Remote", "San Francisco", etc.
  experienceLevel?: string[];  // "Entry Level", "Mid Level", "Senior", "Lead"
  salaryMin?: number;
  salaryMax?: number;
}