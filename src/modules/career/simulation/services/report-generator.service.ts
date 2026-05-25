import { Injectable } from '@nestjs/common';
import Groq from 'groq-sdk';
import { EntretienAnswerEntity } from '../entities/entretien-answer.entity';
import { EntretienLanguage } from '../entities/entretien.entity';
import { QuestionType } from './answer-evaluator.service';

@Injectable()
export class ReportGeneratorService {
  private groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  private inferQuestionType(question: string): QuestionType {
    const q = question.toLowerCase();

    if (
      q.includes('introduce yourself') ||
      q.includes('tell me about yourself') ||
      q.includes('walk me through your background') ||
      q.includes('présente-toi') ||
      q.includes('parle-moi de toi') ||
      q.includes('parle-moi de ton parcours')
    )
      return 'ice-breaker';

    if (
      (q.includes('why') &&
        (q.includes('company') ||
          q.includes('role') ||
          q.includes('position') ||
          q.includes('join'))) ||
      (q.includes('pourquoi') &&
        (q.includes('entreprise') ||
          q.includes('poste') ||
          q.includes('rejoindre')))
    )
      return 'motivation';

    if (
      q.includes('tell me about a time') ||
      q.includes('describe a situation') ||
      q.includes('give me an example') ||
      q.includes("parle-moi d'une fois") ||
      q.includes('décris une situation') ||
      q.includes('donne-moi un exemple')
    )
      return 'behavioral';

    if (
      q.includes('walk me through your stack') ||
      q.includes('your primary stack') ||
      q.includes('your main technologies') ||
      q.includes('your day-to-day') ||
      q.includes('ton stack') ||
      q.includes('tes technologies principales') ||
      q.includes('ton quotidien')
    )
      return 'technical-overview';

    if (
      q.includes('what would you do if') ||
      q.includes('que ferais-tu si') ||
      q.includes('production incident') ||
      q.includes('system crashes') ||
      q.includes('performance regression') ||
      (q.includes('imagine') && q.includes('technical'))
    )
      return 'technical-scenario';

    if (
      q.includes('how would you implement') ||
      q.includes('how would you design') ||
      q.includes('explain how') ||
      q.includes('what is') ||
      q.includes('architecture') ||
      q.includes('scalab') ||
      q.includes('comment implémenter') ||
      q.includes('comment concevoir') ||
      q.includes('explique comment')
    )
      return 'technical';

    if (
      q.includes('what would you do if') ||
      q.includes('que ferais-tu si') ||
      q.includes('imagine you') ||
      q.includes('suppose que')
    )
      return 'situational';

    if (
      q.includes('feedback') ||
      q.includes('criticism') ||
      q.includes('collaborate') ||
      q.includes('team culture') ||
      q.includes('retour') ||
      q.includes('critique') ||
      q.includes('collaborer') ||
      q.includes("culture d'équipe")
    )
      return 'culture-fit';

    if (
      q.includes('any questions for us') ||
      q.includes('questions for the team') ||
      q.includes('des questions pour nous') ||
      q.includes("des questions pour l'équipe")
    )
      return 'closing';

    return 'behavioral';
  }

  async generateReport(
    answers: EntretienAnswerEntity[],
    position: string,
    company: string,
    language: EntretienLanguage,
  ): Promise<{ report: string; globalScore: number }> {
    const languageInstruction =
      language === EntretienLanguage.FR
        ? 'Write the ENTIRE report in French. Every single word must be in French, including the verdict.'
        : 'Write the ENTIRE report in English. Every single word must be in English, including the verdict.';

    const weights: Record<QuestionType, number> = {
      'ice-breaker': 0.5,
      closing: 0.5,
      motivation: 1,
      'culture-fit': 1,
      'technical-overview': 1,
      situational: 1,
      behavioral: 1.5,
      technical: 1.5,
      'technical-scenario': 1.5,
    };

    const { weightedSum, totalWeight } = answers.reduce(
      (acc, a) => {
        const type = this.inferQuestionType(a.question);
        const w = weights[type] ?? 1;
        return {
          weightedSum: acc.weightedSum + (a.score ?? 0) * w,
          totalWeight: acc.totalWeight + w,
        };
      },
      { weightedSum: 0, totalWeight: 0 },
    );

    const globalScore = Math.round(weightedSum / totalWeight);

    const answersContext = answers
      .map(
        (a, i) => `
Q${i + 1} [${this.inferQuestionType(a.question)}]: ${a.question}
Answer: ${a.answer}
Score: ${a.score}/100
Feedback: ${a.feedback}
      `,
      )
      .join('\n---\n');

    const verdictInstruction =
      language === EntretienLanguage.FR
        ? `VERDICT: choose exactly one:
   - "Prêt pour l'entretien" (score >= 75)
   - "Encore du travail nécessaire" (score 50-74)
   - "Préparation insuffisante" (score < 50)`
        : `VERDICT: choose exactly one:
   - "Ready for the interview" (score >= 75)
   - "More preparation needed" (score 50-74)
   - "Insufficient preparation" (score < 50)`;

    const prompt = `
You are an expert HR coach writing a post-interview report.
${languageInstruction}

Position: ${position} at ${company}
Global Score: ${globalScore}/100

INTERVIEW ANSWERS:
${answersContext}

Write a comprehensive interview report with these exact sections:

1. OVERALL ASSESSMENT (2-3 sentences summarizing the overall performance)
2. STRENGTHS (3 specific strong points with references to actual answers)
3. AREAS FOR IMPROVEMENT (3 specific points with concrete and actionable advice)
4. QUESTION-BY-QUESTION HIGHLIGHTS (brief notes on every question, not just standout ones — reference them as Q1, Q2, Q3... matching the order above, and take into account the question type shown in brackets when evaluating each answer)
5. ${verdictInstruction}
6. RECOMMENDED NEXT STEPS (3 concrete actions the candidate should take to improve)

STRICT RULES:
- Write everything in the same language specified above — do NOT mix languages
- In section 4, reference ALL questions as Q1, Q2... Q${answers.length} in order
- Weight your overall assessment accordingly: technical and behavioral questions matter more than ice-breakers or closing questions
- Be constructive, specific, and encouraging
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
