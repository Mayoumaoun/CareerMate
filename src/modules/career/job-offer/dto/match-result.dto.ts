// match-result.dto.ts
export class MatchResultDto {
  jobId: string;
  title: string;
  company: string;
  companyLogo?: string;        // the colored company initial badge
  location: string;
  remote: boolean;
  experienceLevel: string;     // "Mid Level", "Senior", "Entry Level"
  salaryMin?: number;          // "$150k"
  salaryMax?: number;          // "$180k"
  description: string;
  url: string;
  skills: string[];            // the pill tags shown on card
  score: number;               // the % match shown top right
  matchedSkills: string[];     // for the progress bar color
  missingSkills: string[];     // for skill gap display
}