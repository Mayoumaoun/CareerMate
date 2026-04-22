export type JobSource = 'adzuna' | 'themuse';

export type MatchConfidence = 'high' | 'medium' | 'low';

export interface CanonicalJobOffer {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  contractType: string | null;
  description: string;
  skillsRequired: string[];
  postedAt: Date | null;
  url: string;
  source: JobSource;
  sourceMetadata: Record<string, unknown>;
  vector: number[] | null;
  sourceHash: string;
}

export interface RankedJobOffer {
  jobId: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  contractType: string | null;
  url: string;
  source: JobSource;
  semanticScore: number;
  matchScore: number;
  missingSkills: string[];
  improvementTips: string[];
  confidenceLevel: MatchConfidence;
  explanation: string;
}

export interface ProfileSnapshot {
  userId: string;
  fullName: string;
  bio: string;
  targetPosition: string;
  userLevel: string;
  experiences: string;
  education: string;
  languages: string;
  certifications: string;
  projects: string;
  location: string;
  skills: string[];
  profileVector: number[] | null;
}

export interface MatchResponse {
  userId: string;
  scannedJobs: number;
  shortlistedJobs: number;
  aiEnabled: boolean;
  aiRankingsCount: number;
  aiMatchedCount: number;
  matches: RankedJobOffer[];
}