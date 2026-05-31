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


  /**
   * Generate a clean, sentence-boundary-aware excerpt from description text.
   */
  private generateExcerpt(description: string, maxLength = 300): string {
    if (!description) return '';
    const text = description.replace(/\s+/g, ' ').trim();
    const sentences = text.split(/(?<=[.!?])\s+/);
    let excerpt = '';
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;
      if (excerpt.length + trimmed.length + 1 > maxLength) break;
      excerpt += (excerpt ? ' ' : '') + trimmed;
    }
    return excerpt || text.substring(0, maxLength).replace(/\s+\S*$/, '') + '…';
  }

  /**
   * Detect seniority level from text, with fallback to experience years.
   */
  private detectSeniority(text: string, experienceYears?: number | null): string | null {
    const patterns: [string, RegExp][] = [
      ['junior', /\b(junior|débutant|entry.?level|stagiaire)\b/i],
      ['mid', /\b(confirmé|intermédiaire|mid.?level)\b/i],
      ['senior', /\b(senior|expérimenté|lead|principal|chef|directeur|head\s+of)\b/i],
    ];
    for (const [level, regex] of patterns) {
      if (regex.test(text)) return level;
    }
    if (experienceYears != null) {
      if (experienceYears <= 2) return 'junior';
      if (experienceYears <= 5) return 'mid';
      return 'senior';
    }
    return null;
  }

  /**
   * Detect job function/department from title and description.
   */
  private detectJobFunction(title: string, description: string): string | null {
    const functions: [string, RegExp][] = [
      ['Engineering', /\b(développ|engineer|software|backend|frontend|fullstack|full.?stack|devops|sre|cloud|programmeur|développeur)\b/i],
      ['Data', /\b(data\s*(scientist|engineer|analyst)|machine\s*learning|big\s*data|analytics|business\s*intelligence|ia\b|ai\b)\b/i],
      ['Design', /\b(ui\/?ux|design|graphi[sc]|figma|creative|webdesign)\b/i],
      ['Marketing', /\b(marketing|seo|sem|growth|brand|community\s*manager|social\s*media|content\s*manager)\b/i],
      ['Sales', /\b(vente|commercial|sales|account\s*manager|business\s*develop)\b/i],
      ['Finance', /\b(financ|compta|accounting|audit|contrôle\s*de\s*gestion)\b/i],
      ['HR', /\b(ressources\s*humaines|rh\b|human\s*resources|hr\b|recrutement|talent)\b/i],
      ['Operations', /\b(opérations?|logistics?|supply\s*chain|procurement)\b/i],
      ['Support', /\b(support|helpdesk|service\s*client|customer\s*success)\b/i],
      ['QA', /\b(qa\b|quality\s*assurance|test(ing|eur)?|assurance\s*qualité)\b/i],
      ['Project Mgmt', /\b(chef\s*de\s*projet|project\s*manage|scrum\s*master|product\s*owner|agile)\b/i],
      ['Security', /\b(cyber|sécurité|security|soc\b|pentest|infosec)\b/i],
      ['Network/Sys', /\b(réseau|network|système|system\s*admin|sysadmin|infrastructure)\b/i],
    ];
    // Title first (higher signal)
    for (const [fn, regex] of functions) {
      if (regex.test(title)) return fn;
    }
    for (const [fn, regex] of functions) {
      if (regex.test(description)) return fn;
    }
    return null;
  }

  /**
   * Extract required years of experience from text.
   */
  private parseExperienceYears(text: string): number | null {
    const patterns = [
      /(\d+)\s*(?:\+\s*)?ans?\s*d[''\u2019]expérience/i,
      /expérience\s*(?:de\s*)?(?:minimum\s*)?(?:au\s*moins\s*)?(\d+)\s*(?:\+\s*)?ans?/i,
      /minimum\s*(\d+)\s*ans?/i,
      /au\s*moins\s*(\d+)\s*ans?/i,
      /(\d+)\s*(?:à|-)\s*\d+\s*ans?\s*d[''\u2019]expérience/i,
      /(\d+)\s*\+?\s*years?\s*(?:of\s*)?experience/i,
      /experience\s*(?:of\s*)?(\d+)\s*\+?\s*years?/i,
      /at\s*least\s*(\d+)\s*years?/i,
    ];
    for (const regex of patterns) {
      const match = text.match(regex);
      if (match) {
        const years = parseInt(match[1], 10);
        if (years >= 0 && years <= 30) return years;
      }
    }
    return null;
  }

  /**
   * Detect education requirements (level + field) from text.
   */
  private detectEducation(text: string): { level: string; field: string } | null {
    const levelPatterns: [RegExp, string][] = [
      [/bac\s*\+\s*5|master|ingénieur|mastère|diplôme\s*d.ingénieur/i, 'Master'],
      [/bac\s*\+\s*3|licence|bachelor/i, 'Bachelor'],
      [/bac\s*\+\s*2|bts|dut|technicien\s*supérieur/i, 'Associate'],
      [/doctorat|phd|thèse/i, 'PhD'],
      [/master'?s?\s*degree/i, 'Master'],
      [/bachelor'?s?\s*degree/i, 'Bachelor'],
    ];
    const fieldPatterns: [RegExp, string][] = [
      [/\b(informatique|computer\s*science|génie\s*logiciel|software\s*engineering)\b/i, 'Computer Science'],
      [/\b(gestion|management|business|commerce)\b/i, 'Business'],
      [/\b(électrique|electrical|électronique|electronic)\b/i, 'Electrical Engineering'],
      [/\b(mathématiques?|mathematics?|statistiques?)\b/i, 'Mathematics'],
      [/\b(télécom|telecom)\b/i, 'Telecommunications'],
      [/\b(mécanique|mechanical)\b/i, 'Mechanical Engineering'],
      [/\b(comptabilité|finance)\b/i, 'Finance'],
    ];

    let level: string | null = null;
    for (const [regex, lvl] of levelPatterns) {
      if (regex.test(text)) { level = lvl; break; }
    }
    if (!level) return null;

    let field = 'General';
    for (const [regex, f] of fieldPatterns) {
      if (regex.test(text)) { field = f; break; }
    }
    return { level, field };
  }

  /**
   * Enrich a job with metadata extracted from its title/description.
   * Acts as a safety net — only fills in fields that are still null.
   */
  private enrichJobMetadata(job: RawJobOffer): RawJobOffer {
    const text = `${job.title} ${job.description}`;

    if (!job.requiredExperienceYears) {
      job.requiredExperienceYears = this.parseExperienceYears(text);
    }
    if (!job.seniorityLevel) {
      job.seniorityLevel = this.detectSeniority(text, job.requiredExperienceYears);
    }
    if (!job.jobFunction) {
      job.jobFunction = this.detectJobFunction(job.title, job.description);
    }
    if (!job.educationRequired) {
      job.educationRequired = this.detectEducation(text);
    }
    if (!job.excerpt) {
      job.excerpt = this.generateExcerpt(job.description);
    }
    return job;
  }

  async normalizeAndPersist(rawJobs: RawJobOffer[]): Promise<void> {
    if (!rawJobs.length) return;

    const extractor = await this.getExtractor();

    // In-memory deduplication via Set
    const uniqueIds = new Set<string>();
    const uniqueJobs: RawJobOffer[] = [];

    for (const job of rawJobs) {
      const id = this.generateId(job.title, job.company);
      if (!uniqueIds.has(id)) {
        uniqueIds.add(id);
        (job as any).id = id;
        uniqueJobs.push(job);
      }
    }

    this.logger.log(`Normalizing & persisting ${uniqueJobs.length} unique jobs...`);
    let savedCount = 0;

    for (const job of uniqueJobs) {
      try {
        const id = (job as any).id;

        // Skip if already in DB
        const exists = await this.jobOfferRepository.findById(id);
        if (exists) {
          continue;
        }

        // Enrich metadata from description text (safety net for all sources)
        this.enrichJobMetadata(job);

        // Generate embedding
        const textToEmbed = this.prepareTextForEmbedding(job);
        const output = await extractor(textToEmbed, { pooling: 'mean', normalize: true });
        const vector = Array.from(output.data) as number[];

        const isNew = await this.jobOfferRepository.upsertJob({
          id,
          source: job.source,
          title: job.title,
          company: job.company,
          description: job.description,
          excerpt: job.excerpt ?? null,
          employmentType: job.employmentType,
          workArrangement: job.workArrangement,
          seniorityLevel: job.seniorityLevel ?? null,
          jobFunction: job.jobFunction ?? null,
          location: job.location ?? null,
          skillsRequired: job.skillsRequired,
          salaryMin: job.salaryMin ?? null,
          salaryMax: job.salaryMax ?? null,
          salaryCurrency: job.salaryCurrency ?? null,
          requiredExperienceYears: job.requiredExperienceYears ?? null,
          educationRequired: job.educationRequired ?? null,
          postedAt: job.postedAt ?? null,
          url: job.url,
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
      const id = this.generateId(job.title, job.company);
      if (!uniqueIds.has(id)) {
        uniqueIds.add(id);

        try {
          // Enrich metadata from description text (safety net for all sources)
          this.enrichJobMetadata(job);

          const textToEmbed = this.prepareTextForEmbedding(job);
          const output = await extractor(textToEmbed, { pooling: 'mean', normalize: true });
          const vector = Array.from(output.data) as number[];

          jobs.push({
            ...job,
            id,
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