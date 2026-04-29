import { Injectable } from '@nestjs/common';
import { tavily } from '@tavily/core';

@Injectable()
export class CompanyResearchService {
  private client = tavily({ apiKey: process.env.TAVILY_API_KEY });

  async research(company: string, position: string) {
    const [cultureRes, roleRes, techRes] = await Promise.all([
      this.client.search(`${company} company culture values work environment`, {
        maxResults: 3,
        searchDepth: 'advanced',
      }),
      this.client.search(`${company} ${position} team experience`, {
        maxResults: 3,
        searchDepth: 'advanced',
      }),
      this.client.search(`${company} mission product services`, {
        maxResults: 2,
        searchDepth: 'advanced',
      }),
    ]);

    const all = [...cultureRes.results, ...roleRes.results, ...techRes.results];

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
