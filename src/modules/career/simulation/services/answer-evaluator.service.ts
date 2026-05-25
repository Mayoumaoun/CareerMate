import { Injectable } from '@nestjs/common';
import Groq from 'groq-sdk';
import { EntretienLanguage } from '../entities/entretien.entity';

export type QuestionType =
  | 'ice-breaker'
  | 'motivation'
  | 'behavioral'
  | 'technical'
  | 'technical-overview'
  | 'technical-scenario'
  | 'situational'
  | 'culture-fit'
  | 'closing';

interface EvaluationResult {
  score: number;
  feedback: string;
  followUp: string | null;
}

@Injectable()
export class AnswerEvaluatorService {
  private groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  async evaluate(
    question: string,
    answer: string,
    position: string,
    company: string,
    language: EntretienLanguage,
    questionType: QuestionType = 'behavioral',
  ): Promise<EvaluationResult> {
    if (!answer || answer.trim().length < 5) {
      return {
        score: 0,
        feedback:
          language === EntretienLanguage.FR
            ? 'Aucune réponse fournie.'
            : 'No answer provided.',
        followUp: null,
      };
    }

    const languageInstruction =
      language === EntretienLanguage.FR
        ? 'Respond entirely in French.'
        : 'Respond entirely in English.';

    const scoringCriteria: Record<QuestionType, string> = {
      'ice-breaker':
        'Evaluate clarity, structure, and relevance to the position. Do NOT penalize for lack of technical depth. Reward a clear and confident self-presentation.',
      motivation:
        'Evaluate authenticity, alignment with the company and role, and clarity of goals. Reward specific reasons for applying.',
      behavioral:
        'Evaluate using the STAR method — did the candidate describe a Situation, Task, Action, and Result with specific examples? Penalize vague or generic answers.',
      technical:
        'Evaluate technical accuracy, depth of knowledge, and use of concrete examples. Penalize incorrect information or purely theoretical answers with no hands-on experience.',
      'technical-overview':
        'Evaluate breadth of technical knowledge, clarity about their primary stack, and ability to articulate engineering choices. Reward specificity and hands-on experience over vague buzzwords.',
      'technical-scenario':
        'Evaluate both technical judgment AND communication or soft skills. The candidate should demonstrate a structured approach while considering team or stakeholder impact. Penalize answers that are purely technical with no awareness of human or process factors.',
      situational:
        'Evaluate problem-solving approach, reasoning clarity, and practicality of the proposed solution.',
      'culture-fit':
        'Evaluate self-awareness, openness to feedback, and alignment with collaborative work values. Reward honest and reflective answers. Penalize rehearsed or overly polished non-answers.',
      closing:
        'Evaluate the relevance and quality of questions asked. Award 70+ if at least one meaningful question was asked. Award 90+ for insightful, role-specific questions.',
    };

    const prompt = `
You are an expert HR recruiter evaluating a candidate's answer during a job interview.

Position: ${position} at ${company}
Question type: ${questionType}
${languageInstruction}

QUESTION: ${question}
CANDIDATE ANSWER: ${answer}

SCORING CRITERIA FOR THIS QUESTION TYPE (${questionType}):
${scoringCriteria[questionType]}

GENERAL SCORING SCALE:
- 80-100: Excellent — clear, structured, specific examples, highly relevant
- 60-79: Good — correct but missing some details or concrete examples
- 40-59: Average — partial answer, lacks structure or specifics
- 0-39: Poor — off-topic, too vague, or incorrect

Evaluate the answer and return ONLY a JSON object with this exact structure:
{
  "score": <number 0-100>,
  "feedback": "<constructive feedback explaining the score>",
  "followUp": "<a follow-up question if the answer was incomplete or vague, or null if the answer was complete>"
}

Return ONLY the JSON object, nothing else.
    `;

    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = completion.choices[0].message.content ?? '{}';

    try {
      const clean = raw
        .replace(/<think>[\s\S]*?<\/think>/g, '')
        .replace(/```json|```/g, '')
        .trim();
      return JSON.parse(clean);
    } catch {
      return {
        score: 50,
        feedback:
          language === EntretienLanguage.FR
            ? 'Réponse reçue mais impossible à évaluer automatiquement.'
            : 'Answer received but could not be automatically evaluated.',
        followUp: null,
      };
    }
  }
}