import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';
import { RawJobOffer } from '../adapters/job-source.adapter';
import { JobOfferRepository } from '../repositories/job-offer.repository';

const importTransformers = async () => eval('import("@xenova/transformers")');

@Injectable()
export class JobNormalizerService implements OnModuleInit {
  private readonly logger = new Logger(JobNormalizerService.name);
  private extractor: any = null;
  private isInitializing = false;

  constructor(private readonly jobOfferRepository: JobOfferRepository) { }

  async onModuleInit() {
    // Fire-and-forget initialization in background
    this.initModel().catch(err =>
      this.logger.error('Background model initialization failed:', err)
    );
  }

  private async initModel() {
    if (this.extractor || this.isInitializing) return;
    this.isInitializing = true;

    try {
      this.logger.log('Initializing local embedding model (all-MiniLM-L6-v2)...');
      const { pipeline, env } = await importTransformers();

      // Prevent downloading models to unexpected paths in production
      // env.localModelPath = './models';
      env.allowRemoteModels = true;

      this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      this.logger.log('Embedding model initialized successfully.');
    } catch (error) {
      this.logger.error('Failed to initialize embedding model:', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  private async getExtractor() {
    if (!this.extractor) {
      await this.initModel();
    }
    return this.extractor;
  }

  generateId(title: string, company: string): string {
    const data = `${title.toLowerCase().trim()}|${company.toLowerCase().trim()}`;
    return crypto.createHash('md5').update(data).digest('hex');
  }

  /**
   * Helper to truncate text to roughly fit inside MiniLM 512 token limit.
   * Assuming ~4 chars per token, 512 * 4 = 2048 chars max.
   */
  private prepareTextForEmbedding(job: RawJobOffer): string {
    const text = `${job.title} ${job.company} ${job.skillsRequired.join(' ')} ${job.description}`;
    return text.substring(0, 2000).replace(/\s+/g, ' ');
  }

  async normalizeAndPersist(rawJobs: RawJobOffer[]): Promise<void> {
    if (!rawJobs.length) return;

    const extractor = await this.getExtractor();

    // In-memory deduplication via Set
    const uniqueIds = new Set<string>();
    const uniqueJobs: RawJobOffer[] = [];

    for (const job of rawJobs) {
      const sourceHash = this.generateId(job.title, job.company);
      if (!uniqueIds.has(sourceHash)) {
        uniqueIds.add(sourceHash);
        (job as any).sourceHash = sourceHash;
        uniqueJobs.push(job);
      }
    }

    this.logger.log(`Normalizing & persisting ${uniqueJobs.length} unique jobs...`);
    let savedCount = 0;

    for (const job of uniqueJobs) {
      try {
        const sourceHash = (job as any).sourceHash;

        // Skip if already in DB
        const exists = await this.jobOfferRepository.findBySourceHash(sourceHash);
        if (exists) {
          continue;
        }

        // Generate embedding
        const textToEmbed = this.prepareTextForEmbedding(job);
        const output = await extractor(textToEmbed, { pooling: 'mean', normalize: true });
        const vector = Array.from(output.data) as number[];

        const isNew = await this.jobOfferRepository.upsertJob({
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
          sourceMetadata: job.sourceMetadata,
          sourceHash,
          vector,
        });

        if (isNew) savedCount++;
      } catch (error) {
        this.logger.warn(`Failed to normalize job "${job.title}": ${error.message}`);
      }
    }

    this.logger.log(`Successfully saved ${savedCount} new jobs to DB.`);
  }

  /**
   * For live fetch queries that need vectors before returning to Ranker.
   * Does NOT persist them.
   */
  async normalizeLiveJobs(rawJobs: RawJobOffer[]): Promise<any[]> {
    if (!rawJobs.length) return [];

    const extractor = await this.getExtractor();
    const uniqueIds = new Set<string>();
    const jobs = [];

    for (const job of rawJobs) {
      const sourceHash = this.generateId(job.title, job.company);
      if (!uniqueIds.has(sourceHash)) {
        uniqueIds.add(sourceHash);

        try {
          const textToEmbed = this.prepareTextForEmbedding(job);
          const output = await extractor(textToEmbed, { pooling: 'mean', normalize: true });
          const vector = Array.from(output.data) as number[];

          jobs.push({
            ...job,
            sourceHash,
            vector,
          });
        } catch (err) {
          this.logger.warn(`Failed to embed live job "${job.title}": ${err.message}`);
        }
      }
    }

    // Fire-and-forget background persistence to enrich the database
    this.normalizeAndPersist(rawJobs).catch(err =>
      this.logger.error(`Background persistence failed: ${err.message}`)
    );

    return jobs;
  }

  /**
   * Generates a vector embedding for a user profile based on its skills, roles, and experiences.
   */
  async embedProfile(profile: any): Promise<number[]> {
    const extractor = await this.getExtractor();

    // Extract textual data
    const skills = profile.skills?.map((s: any) => s.name).join(' ') || '';
    let roles = '';
    if (profile.targetPosition?.roles) {
      roles = profile.targetPosition.roles.join(' ');
    } else if (profile.targetProfile?.targetPositions) {
      roles = profile.targetProfile.targetPositions.join(' ');
    }
    const experiences = profile.experiences?.map((e: any) => `${e.title} ${e.description || ''}`).join(' ') || '';

    const textToEmbed = `${roles} ${skills} ${experiences}`.substring(0, 2000).replace(/\s+/g, ' ');

    try {
      const output = await extractor(textToEmbed, { pooling: 'mean', normalize: true });
      return Array.from(output.data) as number[];
    } catch (err) {
      this.logger.error(`Failed to embed profile: ${err.message}`);
      return [];
    }
  }
}
