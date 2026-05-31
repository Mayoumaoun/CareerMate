import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { JobOfferEntity } from '../entities/job-offer.entity';

@Injectable()
export class JobOfferRepository extends Repository<JobOfferEntity> {
  private readonly logger = new Logger(JobOfferRepository.name);

  constructor(private dataSource: DataSource) {
    super(JobOfferEntity, dataSource.createEntityManager());
  }

  /**
   * Find similar jobs using pgvector cosine distance.
   * 
   * Prerequisites:
   *   CREATE EXTENSION IF NOT EXISTS vector;
   *   -- After initial data load:
   *   ALTER TABLE job_offer ADD COLUMN IF NOT EXISTS vector_col vector(384);
   *   UPDATE job_offer SET vector_col = vector::vector WHERE vector IS NOT NULL;
   *   CREATE INDEX IF NOT EXISTS idx_job_offer_vector ON job_offer USING ivfflat (vector_col vector_cosine_ops) WITH (lists = 100);
   *
   * If pgvector is not installed, falls back to a TypeORM-based fetch.
   */
  async findSimilarJobs(
    profileVector: number[],
    limit: number = 30,
  ): Promise<JobOfferEntity[]> {
    const vectorString = `[${profileVector.join(',')}]`;

    try {
      // Try pgvector cosine distance first
      const jobs = await this.query(
        `
        SELECT j.*
        FROM job_offer j
        WHERE j.vector IS NOT NULL
        ORDER BY j.vector::text::vector(384) <=> $1::vector(384)
        LIMIT $2;
        `,
        [vectorString, limit],
      );

      return jobs;
    } catch (error) {
      // Fallback: if pgvector extension is not available,
      // fetch recent active jobs and let the ranker handle scoring in-memory.
      this.logger.warn(
        'pgvector query failed, falling back to recent jobs fetch. ' +
        'Ensure pgvector extension is installed: CREATE EXTENSION vector;',
        error?.message,
      );

      return this.find({
        order: { postedAt: 'DESC' },
        take: limit,
      });
    }
  }

  /**
   * Find a job by its id (used for deduplication).
   */
  async findById(id: string): Promise<JobOfferEntity | null> {
    return this.findOne({ where: { id } });
  }

  /**
   * Upsert a job — insert if new, skip if id already exists.
   * Returns true if a new record was inserted.
   */
  async upsertJob(jobData: Partial<JobOfferEntity>): Promise<boolean> {
    const existing = await this.findById(jobData.id!);
    if (existing) {
      return false;
    }

    const entity = this.create(jobData);
    await this.save(entity);
    return true;
  }

  /**
   * Count active jobs by source.
   */
  async countBySource(): Promise<Record<string, number>> {
    const results = await this.createQueryBuilder('job')
      .select('job.source', 'source')
      .addSelect('COUNT(*)', 'count')
      .groupBy('job.source')
      .getRawMany();

    const counts: Record<string, number> = {};
    for (const row of results) {
      counts[row.source] = parseInt(row.count, 10);
    }
    return counts;
  }
}
