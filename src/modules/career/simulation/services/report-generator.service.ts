import { Injectable } from '@nestjs/common';
import Groq from 'groq-sdk';
import { EntretienAnswerEntity } from '../entities/entretien-answer.entity';
import { EntretienLanguage } from '../entities/entretien.entity';

@Injectable()
export class ReportGeneratorService {
  private groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  async generateReport(
    answers: EntretienAnswerEntity[],
    position: string,
    company: string,
    language: EntretienLanguage,
  ): Promise<{ report: string; globalScore: number }> {
    const languageInstruction =
      language === EntretienLanguage.FR
        ? 'Write the entire report in French.'
        : 'Write the entire report in English.';

    const answersContext = answers
      .map(
        (a, i) => `
Q${i + 1}: ${a.question}
Answer: ${a.answer}
Score: ${a.score}/100
Feedback: ${a.feedback}
      `,
      )
      .join('\n---\n');

    const globalScore = Math.round(
      answers.reduce((sum, a) => sum + (a.score ?? 0), 0) / answers.length,
    );

    const prompt = `
You are an expert HR coach writing a post-interview report.
${languageInstruction}

Position: ${position} at ${company}
Global Score: ${globalScore}/100

INTERVIEW ANSWERS:
${answersContext}

Write a comprehensive interview report with these sections:

1. OVERALL ASSESSMENT (2-3 sentences summarizing the performance)
2. STRENGTHS (3 specific strong points with examples from the answers)
3. AREAS FOR IMPROVEMENT (3 specific points with concrete advice)
4. QUESTION-BY-QUESTION HIGHLIGHTS (brief notes on standout answers)
5. VERDICT: one of these exactly:
   - "Prêt pour l'entretien" / "Ready for the interview" (score >= 75)
   - "Encore du travail nécessaire" / "More preparation needed" (score 50-74)
   - "Préparation insuffisante" / "Insufficient preparation" (score < 50)
6. RECOMMENDED NEXT STEPS (3 concrete actions to improve)

Be constructive, specific and encouraging.
    `;

    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.4,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const report = (completion.choices[0].message.content ?? '')
      .replace(/<think>[\s\S]*?<\/think>/g, '')
      .trim();

    return { report, globalScore };
  }
}
