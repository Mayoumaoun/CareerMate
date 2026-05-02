import { Injectable } from '@nestjs/common';
import Groq from 'groq-sdk';
import { EntretienLanguage } from '../entities/entretien.entity';

interface EvaluationResult {
  score: number; // 0-100
  feedback: string; // feedback détaillé
  followUp: string | null; // question de relance si nécessaire
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
  ): Promise<EvaluationResult> {
    const languageInstruction =
      language === EntretienLanguage.FR
        ? 'Respond in French.'
        : 'Respond in English.';

    const prompt = `
You are an expert HR recruiter evaluating a candidate's answer during an interview.

Position: ${position} at ${company}
${languageInstruction}

QUESTION: ${question}
CANDIDATE ANSWER: ${answer}

Evaluate the answer and return ONLY a JSON object with this exact structure:
{
  "score": <number 0-100>,
  "feedback": "<constructive feedback explaining the score>",
  "followUp": "<follow-up question if the answer was incomplete, or null if complete>"
}

SCORING CRITERIA:
- 80-100: Excellent — clear, structured, specific examples, relevant
- 60-79: Good — correct but missing some details or examples
- 40-59: Average — partial answer, lacks structure or specifics
- 0-39: Poor — off-topic, too vague, or incorrect

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
