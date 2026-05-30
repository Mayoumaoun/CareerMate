/**
 * Raw job offer structure returned by source adapters before normalization.
 */
export interface RawJobOffer {
  id?: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  salaryMin?: number | null;
  salaryMax?: number | null;
  contractType?: string;
  description: string;
  skillsRequired: string[];
  postedAt: Date;
  url: string;
  source: 'himalayas' | 'arbeitnow' | 'jsearch' | 'keejobs';
  sourceMetadata: Record<string, unknown>;
}

/**
 * Common interface for all job source adapters.
 * Each adapter maps a specific external API/scraper to the RawJobOffer format.
 */
export interface JobSourceAdapter {
  /** Fetch jobs from the source, filtered by the given search queries and location. */
  fetchJobs(queries: string[], location: string): Promise<RawJobOffer[]>;
}
