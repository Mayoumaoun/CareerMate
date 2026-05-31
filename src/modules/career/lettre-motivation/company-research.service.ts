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
      const message =
        error instanceof Error ? error.message : 'Unknown Tavily error';
      console.warn(
        `[CompanyResearch] Tavily unavailable, skipping company research: ${message}`,
      );
      return null;
    }
  }

  private cleanSummary(summary: string): string {
    const lines = summary.split('\n');

    const bannedKeywords = [
      'inclusive by design',
      'underrepresented',
      'diversity',
      'donate',
      'donation',
      'community organization',
      'DEI',
      'equal opportunity',
      'discrimination',
      'bias',
      'Discord',
      'Likes:',
      'Comments:',
      'DM me',
      'Google form',
      'waitlist',
      'Luma',
      'IWD',
      'well-being',
      'work-life balance',
      'sustainability',
      'carbon',
      'environment',
      'annual report',
      'CSR',
      'job seeking',
      'Join our community',
      'Join the community',
      'How to get involved',
      'As an Employer',
      'qualified diverse',
      'underserved',
      'marginalized',
    ];

    // Mots-clés qui indiquent un contenu utile (technique/produit)
    const usefulKeywords = [
      'platform',
      'product',
      'technology',
      'engineering',
      'software',
      'infrastructure',
      'API',
      'cloud',
      'stack',
      'architecture',
      'team',
      'mission',
      'founded',
      'headquartered',
      'industry',
      'solution',
    ];

    const cleaned = lines
      .filter(
        (line) =>
          line.trim().length > 20 &&
          !bannedKeywords.some((keyword) =>
            line.toLowerCase().includes(keyword.toLowerCase()),
          ),
      )
      .join('\n')
      .trim();

    // Vérifier que le contenu restant est vraiment utile
    const hasUsefulContent = usefulKeywords.some((keyword) =>
      cleaned.toLowerCase().includes(keyword.toLowerCase()),
    );

    // Si pas de contenu utile → retourner vide
    // Le prompt utilisera "No specific company data found"
    if (!hasUsefulContent || cleaned.length < 100) {
      return '';
    }

    return cleaned;
  }

  async research(
    company: string,
    position: string,
  ): Promise<CompanyResearchResult> {
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

    const all = [
      ...cultureRes.results,
      ...roleRes.results,
      ...techRes.results,
    ] as TavilySearchResult[];

    // Filtrage niveau URL — sources RSE et rapports
    const filtered = all.filter(
      (r) =>
        !r.url.includes('CSR') &&
        !r.url.includes('csr') &&
        !r.url.includes('rapport') &&
        !r.url.includes('annual-report') &&
        !r.url.includes('sustainability'),
    );

    const results = filtered.length > 0 ? filtered : all;

    // Filtrage niveau contenu — mots-clés RSE et bruit social
    const rawSummary = results
      .map((r) => r.content)
      .join('\n\n')
      .slice(0, 3000);

    const cleanedSummary = this.cleanSummary(rawSummary);

    return {
      summary: cleanedSummary,
      sources: results.map((r) => r.url),
    };
  }
}
