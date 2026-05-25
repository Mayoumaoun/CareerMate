import { Injectable } from '@nestjs/common';

type CompanyResearchResult = {
  summary: string;
  sources: string[];
};

type TavilySearchResult = {
  content: string;
  url: string;
};

@Injectable()
export class CompanyResearchService {
  private async getClient() {
    const apiKey = process.env.TAVILY_API_KEY?.trim();
    if (!apiKey) {
      return null;
    }

    try {
      const { tavily } = await import('@tavily/core');
      return tavily({ apiKey });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Tavily error';
      console.warn(`[CompanyResearch] Tavily unavailable, skipping company research: ${message}`);
      return null;
    }
  }

  async research(company: string, position: string): Promise<CompanyResearchResult> {
    const client = await this.getClient();
    if (!client) {
      return {
        summary: '',
        sources: [],
      };
    }

    const [cultureRes, roleRes, techRes] = await Promise.all([
      client.search(`${company} company culture values work environment`, {
        maxResults: 3,
        searchDepth: 'advanced',
      }),
      client.search(`${company} ${position} team experience`, {
        maxResults: 3,
        searchDepth: 'advanced',
      }),
      client.search(`${company} mission product services`, {
        maxResults: 2,
        searchDepth: 'advanced',
      }),
    ]);

    const all = [...cultureRes.results, ...roleRes.results, ...techRes.results] as TavilySearchResult[];

    const filtered = all.filter(
      (r) =>
        !r.url.includes('CSR') &&
        !r.url.includes('csr') &&
        !r.url.includes('rapport') &&
        !r.url.includes('annual-report') &&
        !r.url.includes('sustainability'),
    );

    const results = filtered.length > 0 ? filtered : all;

    return {
      summary: results
        .map((r) => r.content)
        .join('\n\n')
        .slice(0, 3000),
      sources: results.map((r) => r.url),
    };
  }
}
