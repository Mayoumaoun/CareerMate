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
      q.includes('walk me through your background') ||
      q.includes('walk me through your journey') ||
      q.includes('walk me through your experience') ||
      q.includes('your technical background') ||
      q.includes('your career journey') ||
      q.includes('your career path') ||
      q.includes('your career story') ||
      q.includes('how did you get to where you are') ||
      q.includes('what brought you to this point') ||
      q.includes('what brought you here') ||
      q.includes('tell me a bit about yourself') ||
      q.includes('hearing a bit about your') ||
      q.includes('get to know your background') ||
      q.includes('présente-toi') ||
      q.includes('parle-moi de toi') ||
      q.includes('parle-moi de ton parcours') ||
      q.includes('ton background') ||
      q.includes('ton parcours')
    )
      return 'ice-breaker';

    if (
      (q.includes('why') &&
        (q.includes('join') ||
          q.includes('company') ||
          q.includes('role') ||
          q.includes('position') ||
          q.includes('apply'))) ||
      q.includes('what draws you') ||
      q.includes('what excites you') ||
      q.includes('what motivated') ||
      q.includes('motivation') ||
      (q.includes('pourquoi') &&
        (q.includes('entreprise') ||
          q.includes('poste') ||
          q.includes('rejoindre')))
    )
      return 'motivation';

    if (
      q.includes('walk me through your stack') ||
      q.includes('your primary stack') ||
      q.includes('your main technologies') ||
      q.includes('your day-to-day') ||
      q.includes('engineering practices') ||
      q.includes('ton stack') ||
      q.includes('tes technologies principales') ||
      q.includes('ton quotidien')
    )
      return 'technical-overview';

    if (
      q.includes('what would you do if') &&
      (q.includes('production') ||
        q.includes('incident') ||
        q.includes('crashes') ||
        q.includes('performance') ||
        q.includes('regression') ||
        q.includes('conflicting'))
    )
      return 'technical-scenario';

    if (
      q.includes('how would you implement') ||
      q.includes('how would you design') ||
      q.includes('explain how') ||
      q.includes('how does') ||
      q.includes('architecture') ||
      q.includes('scalab') ||
      q.includes('debug') ||
      q.includes('internals') ||
      q.includes('design pattern') ||
      q.includes('comment implémenter') ||
      q.includes('comment concevoir') ||
      q.includes('expliquer comment')
    )
      return 'technical';

    if (
      q.includes('tell me about a time') ||
      q.includes('describe a situation') ||
      q.includes('give me an example') ||
      q.includes('walk me through a situation') ||
      q.includes("i'd love to hear about a moment") ||
      q.includes("i'm curious — could you walk me through a moment") ||
      q.includes("what's a good example of a time") ||
      q.includes("parle-moi d'une fois") ||
      q.includes('décris une situation') ||
      q.includes('donne-moi un exemple')
    )
      return 'behavioral';

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
      q.includes('how do you approach') ||
      q.includes('how do you handle') ||
      q.includes('retour') ||
      q.includes('critique') ||
      q.includes('collaborer') ||
      q.includes("culture d'équipe")
    )
      return 'culture-fit';

    if (
      q.includes('any questions for us') ||
      q.includes('questions for the team') ||
      q.includes('questions about the') ||
      q.includes('des questions pour nous') ||
      q.includes("des questions pour l'équipe") ||
      q.includes('des questions sur')
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

IMPORTANT: The global score is already calculated and is ${globalScore}/100.
Do NOT recalculate it. Use this exact number in the verdict and assessment.

INTERVIEW ANSWERS:
${answersContext}

Write a comprehensive interview report with these exact sections:

1. OVERALL ASSESSMENT (2-3 sentences summarizing the overall performance)
2. STRENGTHS (3 specific strong points with references to actual answers)
3. AREAS FOR IMPROVEMENT (3 specific points with concrete and actionable advice)
4. QUESTION-BY-QUESTION HIGHLIGHTS (brief notes on every question — reference them as Q1, Q2, Q3... matching the order above, and take into account the question type shown in brackets when evaluating each answer)
5. ${verdictInstruction}
6. RECOMMENDED NEXT STEPS (3 concrete actions the candidate should take to improve)

STRICT RULES:
- Write everything in the same language specified above — do NOT mix languages
- In section 4, reference ALL questions as Q1, Q2... Q${answers.length} in order
- Weight your overall assessment accordingly: technical and behavioral questions matter more than ice-breakers or closing questions
- Use the exact global score of ${globalScore}/100 — never invent a different number
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
