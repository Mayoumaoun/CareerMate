export interface RawJobOffer {
  id?: string;

  source: string;

  title: string;
  company: string;
  description: string;
  excerpt?: string | null;

  employmentType: string;

  workArrangement: string;

  seniorityLevel?: string | null;
  jobFunction?: string | null;
  location?: string | null;

  skillsRequired: string[];

  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;

  requiredExperienceYears?: number | null;
  educationRequired?: { level: string; field: string } | null;

  postedAt?: Date | null;
  url: string;
}

export interface JobSourceAdapter {
  fetchJobs(queries: string[], location: string): Promise<RawJobOffer[]>;
}