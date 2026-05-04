import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RankedJobOffer } from './job-matching.types';

interface AIRankingInput {
  profileText: string;
  shortlist: Array<{
    jobId: string;
    title: string;
    company: string;
    location: string;
    remote: boolean;
    contractType: string | null;
    url: string;
    description: string;
    skillsRequired: string[];
    semanticScore: number;
  }>;
}

interface LLMRuntimeConfig {
  baseUrl: string;
  endpoint: string;
  model: string;
  apiKey?: string;
  apiKeyHeader: string;
  apiKeyPrefix: string;
}

interface PromptBudgetConfig {
  maxInputTokens: number;
  maxJobs: number;
  maxProfileChars: number;
  maxJobDescriptionChars: number;
}

type AIRankResult = Pick<
  RankedJobOffer,
  | 'jobId'
  | 'matchScore'
  | 'missingSkills'
  | 'improvementTips'
  | 'confidenceLevel'
  | 'explanation'
>;

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

@Injectable()
export class AIRerankerService {
  private readonly logger = new Logger(AIRerankerService.name);
  private static readonly APPROX_CHARS_PER_TOKEN = 4;
  private static readonly MIN_JOB_COUNT = 3;

  constructor(private readonly configService: ConfigService) { }

  async rerank(input: AIRankingInput): Promise<AIRankResult[]> {
    const llmConfig = this.getRuntimeConfig();
    const prompt = this.buildBudgetedPrompt(input);

    let text = '';

    try {
      text = await this.callChatCompletions(prompt, llmConfig);
    } catch (error) {
      if (this.isContextLengthError(error)) {
        this.logger.warn(
          'LLM prompt exceeded context window. Retrying with aggressive compression.',
        );
        try {
          const fallbackPrompt = this.buildBudgetedPrompt(input, true);
          text = await this.callChatCompletions(fallbackPrompt, llmConfig);
        } catch (retryError) {
          this.logger.warn(
            `LLM rerank failed after compression retry: ${(retryError as Error).message}`,
          );
          return [];
        }
      } else {
        this.logger.warn(`LLM rerank failed: ${(error as Error).message}`);
        return [];
      }
    }

    const parsedDirect = this.tryParseAndNormalizeResults(text);
    if (parsedDirect.length > 0) {
      return parsedDirect;
    }

    const repaired = await this.repairMalformedJson(text, llmConfig);
    if (!repaired) {
      return [];
    }

    const repairedParsed = this.tryParseAndNormalizeResults(repaired);
    if (repairedParsed.length === 0) {
      this.logger.warn(
        'LLM rerank JSON repair returned no valid ranking rows.',
      );
    }

    return repairedParsed;
  }

  private getRuntimeConfig(): LLMRuntimeConfig {
    const baseUrl =
      this.configService.get<string>('LLM_BASE_URL')?.trim() ||
      'https://api.openai.com/v1';
    const endpoint =
      this.configService.get<string>('LLM_ENDPOINT')?.trim() ||
      '/chat/completions';
    const model =
      this.configService.get<string>('LLM_MODEL')?.trim() || 'openai/gpt-oss-20b:free';
    const apiKey = this.configService.get<string>('LLM_API_KEY')?.trim();
    const apiKeyHeader =
      this.configService.get<string>('LLM_API_KEY_HEADER')?.trim() ||
      'Authorization';
    const apiKeyPrefix =
      this.configService.get<string>('LLM_API_KEY_PREFIX')?.trim() || 'Bearer';

    if (!apiKey) {
      this.logger.warn(
        'LLM_API_KEY is empty. Continuing without an auth header.',
      );
    }

    return {
      baseUrl,
      endpoint,
      model,
      apiKey,
      apiKeyHeader,
      apiKeyPrefix,
    };
  }

  private getPromptBudgetConfig(aggressive = false): PromptBudgetConfig {
    const maxInputTokens =
      this.configService.get<number>('LLM_MAX_INPUT_TOKENS') ??
      (aggressive ? 12000 : 22000);
    const maxJobs =
      this.configService.get<number>('LLM_MAX_RERANK_JOBS') ??
      (aggressive ? 8 : 20);
    const maxProfileChars =
      this.configService.get<number>('LLM_MAX_PROFILE_CHARS') ??
      (aggressive ? 2000 : 5000);
    const maxJobDescriptionChars =
      this.configService.get<number>('LLM_MAX_JOB_DESCRIPTION_CHARS') ??
      (aggressive ? 400 : 1200);

    return {
      maxInputTokens: Math.max(2000, maxInputTokens),
      maxJobs: Math.max(AIRerankerService.MIN_JOB_COUNT, maxJobs),
      maxProfileChars: Math.max(500, maxProfileChars),
      maxJobDescriptionChars: Math.max(150, maxJobDescriptionChars),
    };
  }

  private async callChatCompletions(
    prompt: string,
    llmConfig: LLMRuntimeConfig,
  ): Promise<string> {
    return this.callChatCompletionsWithMessages(
      [
        {
          role: 'system',
          content:
            'You are a strict JSON generator. Return only valid JSON with no markdown, no prose, and no code fences. Ensure all string quotes are escaped correctly.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      llmConfig,
      0.2,
    );
  }

  private async callChatCompletionsWithMessages(
    messages: ChatMessage[],
    llmConfig: LLMRuntimeConfig,
    temperature: number,
  ): Promise<string> {
    const endpointPath = llmConfig.endpoint.startsWith('/')
      ? llmConfig.endpoint
      : `/${llmConfig.endpoint}`;
    const endpoint = `${llmConfig.baseUrl.replace(/\/$/, '')}${endpointPath}`;
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };

    if (llmConfig.apiKey) {
      const value = llmConfig.apiKeyPrefix
        ? `${llmConfig.apiKeyPrefix} ${llmConfig.apiKey}`
        : llmConfig.apiKey;
      headers[llmConfig.apiKeyHeader] = value;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: llmConfig.model,
        temperature,
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string | Array<{ type?: string; text?: string }>;
        };
      }>;
    };
    const content = payload.choices?.[0]?.message?.content;

    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      return content.map((part) => part.text ?? '').join('');
    }

    return '';
  }

  private async repairMalformedJson(
    rawText: string,
    llmConfig: LLMRuntimeConfig,
  ): Promise<string | null> {
    this.logger.warn(
      'LLM rerank JSON parse failed. Retrying with structured JSON repair pass.',
    );

    try {
      const repairPrompt = [
        'Convert the following content to a strict valid JSON array only.',
        'Expected item shape:',
        '{ "jobId": string, "matchScore": number, "missingSkills": string[], "improvementTips": string[], "confidenceLevel": "high" | "medium" | "low", "explanation": string }',
        'Rules:',
        '- Output only a JSON array.',
        '- Do not include markdown or code fences.',
        '- Preserve original item ordering where possible.',
        '- If an item is irrecoverable, drop it.',
        '',
        'Content to repair:',
        rawText,
      ].join('\n');

      return await this.callChatCompletionsWithMessages(
        [
          {
            role: 'system',
            content:
              'You repair malformed JSON. Return only strict JSON and never include prose.',
          },
          {
            role: 'user',
            content: repairPrompt,
          },
        ],
        llmConfig,
        0,
      );
    } catch (error) {
      this.logger.warn(
        `LLM rerank JSON repair failed: ${(error as Error).message}`,
      );
      return null;
    }
  }

  private buildBudgetedPrompt(
    input: AIRankingInput,
    aggressive = false,
  ): string {
    const budget = this.getPromptBudgetConfig(aggressive);
    const maxPromptChars =
      budget.maxInputTokens * AIRerankerService.APPROX_CHARS_PER_TOKEN;

    const compactProfile = this.truncateText(
      input.profileText,
      budget.maxProfileChars,
    );
    const shortlist = input.shortlist.slice(0, budget.maxJobs);

    let currentJobCount = shortlist.length;
    let currentDescriptionLimit = budget.maxJobDescriptionChars;
    let currentProfile = compactProfile;

    let compactJobs = this.compactJobsForPrompt(
      shortlist.slice(0, currentJobCount),
      currentDescriptionLimit,
    );
    let prompt = this.buildPrompt(currentProfile, compactJobs);

    while (
      prompt.length > maxPromptChars &&
      currentJobCount > AIRerankerService.MIN_JOB_COUNT
    ) {
      currentJobCount = Math.max(
        AIRerankerService.MIN_JOB_COUNT,
        currentJobCount - 2,
      );
      currentDescriptionLimit = Math.max(
        150,
        Math.floor(currentDescriptionLimit * 0.8),
      );
      compactJobs = this.compactJobsForPrompt(
        shortlist.slice(0, currentJobCount),
        currentDescriptionLimit,
      );
      prompt = this.buildPrompt(currentProfile, compactJobs);
    }

    while (prompt.length > maxPromptChars && currentDescriptionLimit > 150) {
      currentDescriptionLimit = Math.max(
        150,
        Math.floor(currentDescriptionLimit * 0.8),
      );
      compactJobs = this.compactJobsForPrompt(
        shortlist.slice(0, currentJobCount),
        currentDescriptionLimit,
      );
      prompt = this.buildPrompt(currentProfile, compactJobs);
    }

    while (prompt.length > maxPromptChars && currentProfile.length > 500) {
      currentProfile = this.truncateText(
        currentProfile,
        Math.floor(currentProfile.length * 0.8),
      );
      prompt = this.buildPrompt(currentProfile, compactJobs);
    }

    if (prompt.length > maxPromptChars) {
      prompt = this.truncateText(prompt, maxPromptChars);
    }

    const originalPromptLength = this.buildPrompt(
      input.profileText,
      input.shortlist,
    ).length;
    if (prompt.length < originalPromptLength) {
      this.logger.log(
        `Compressed rerank prompt from ${originalPromptLength} to ${prompt.length} chars (jobs: ${input.shortlist.length} -> ${currentJobCount}, descLimit: ${currentDescriptionLimit}, aggressive: ${aggressive}).`,
      );
    }

    return prompt;
  }

  private compactJobsForPrompt(
    shortlist: AIRankingInput['shortlist'],
    maxDescriptionChars: number,
  ): AIRankingInput['shortlist'] {
    return shortlist.map((job) => ({
      ...job,
      title: this.truncateText(job.title, 120),
      company: this.truncateText(job.company, 120),
      location: this.truncateText(job.location, 120),
      description: this.truncateText(job.description, maxDescriptionChars),
      skillsRequired: (job.skillsRequired ?? [])
        .slice(0, 12)
        .map((skill) => this.truncateText(skill, 40)),
    }));
  }

  private buildPrompt(
    profileText: string,
    shortlist: AIRankingInput['shortlist'],
  ): string {
    return [
      'You are ranking jobs for a candidate. Return only a valid JSON array and nothing else.',
      'Each array item must use this exact shape:',
      '{ jobId: string, matchScore: number, missingSkills: string[], improvementTips: string[], confidenceLevel: "high" | "medium" | "low", explanation: string }',
      'Do not add markdown, code fences, or any extra text.',
      '',
      'Candidate profile:',
      profileText,
      '',
      'Jobs to rank:',
      JSON.stringify(shortlist),
      '',
      'Scoring rules:',
      '- Reward direct skill overlap, relevant projects, matching seniority, location fit, and contract fit.',
      '- Penalize missing must-have skills and weak domain fit.',
      '- Keep explanations short and human-readable.',
    ].join('\n');
  }

  private truncateText(value: string, maxChars: number): string {
    if (!value || value.length <= maxChars) {
      return value;
    }

    return `${value.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`;
  }

  private isContextLengthError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return /maximum context length|requested about|context window|too many tokens/i.test(
      message,
    );
  }

  private extractJsonArray(text: string): string | null {
    const trimmed = text
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '');
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      return trimmed;
    }

    const match = trimmed.match(/\[[\s\S]*\]/);
    return match ? match[0] : null;
  }

  private tryParseAndNormalizeResults(text: string): AIRankResult[] {
    const jsonText = this.extractJsonArray(text);

    if (!jsonText) {
      this.logger.warn('LLM rerank returned no JSON array payload.');
      return [];
    }

    try {
      const parsed = JSON.parse(jsonText) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .map((item) => this.normalizeResultItem(item))
        .filter((item): item is AIRankResult => item !== null);
    } catch (error) {
      this.logger.warn(
        `LLM rerank JSON parse failed: ${(error as Error).message}`,
      );
      return [];
    }
  }

  private normalizeResultItem(value: unknown): AIRankResult | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const item = value as Partial<Record<keyof AIRankResult, unknown>>;
    if (typeof item.jobId !== 'string' || !item.jobId.trim()) {
      return null;
    }

    const rawScore =
      typeof item.matchScore === 'number'
        ? item.matchScore
        : Number(item.matchScore);
    const boundedScore = Number.isFinite(rawScore)
      ? Math.max(0, Math.min(100, rawScore))
      : 0;

    const confidenceLevel =
      item.confidenceLevel === 'high' ||
        item.confidenceLevel === 'medium' ||
        item.confidenceLevel === 'low'
        ? item.confidenceLevel
        : 'low';

    return {
      jobId: item.jobId,
      matchScore: Number(boundedScore.toFixed(2)),
      missingSkills: Array.isArray(item.missingSkills)
        ? item.missingSkills
          .filter((entry): entry is string => typeof entry === 'string')
          .slice(0, 20)
        : [],
      improvementTips: Array.isArray(item.improvementTips)
        ? item.improvementTips
          .filter((entry): entry is string => typeof entry === 'string')
          .slice(0, 20)
        : [],
      confidenceLevel,
      explanation: typeof item.explanation === 'string' ? item.explanation : '',
    };
  }
}
