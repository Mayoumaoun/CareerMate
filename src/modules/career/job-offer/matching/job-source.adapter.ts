import { CanonicalJobOffer } from './job-matching.types';

export interface JobSourceQuery {
  keywords: string[];
  location?: string;
  limit: number;
}

export interface JobSourceAdapter {
  readonly source: CanonicalJobOffer['source'];
  fetchJobs(query: JobSourceQuery): Promise<CanonicalJobOffer[]>;
}