import { Injectable } from '@nestjs/common';
import Groq from 'groq-sdk';
import { ProfileEntity } from '../../../profile/entities/profile.entity';
import {
  EntretienType,
  EntretienLanguage,
  EntretienLevel,
} from '../entities/entretien.entity';

@Injectable()
export class QuestionGeneratorService {
  private groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  async generateQuestions(
    profile: ProfileEntity,
    company: string,
    position: string,
    entretienType: EntretienType,
    language: EntretienLanguage,
    level: EntretienLevel,
    jobDescription?: string,
  ): Promise<string[]> {
    const languageInstruction =
      language === EntretienLanguage.FR
        ? 'Generate ALL questions in French.'
        : 'Generate ALL questions in English.';

    const typeInstruction = {
      [EntretienType.TECHNIQUE]:
        'Focus on technical skills, problem-solving and code-related questions.',
      [EntretienType.COMPORTEMENTAL]:
        'Focus on behavioral questions using the STAR method (Situation, Task, Action, Result).',
      [EntretienType.MIXTE]:
        'Mix behavioral questions (STAR method), technical questions, and motivation/fit questions.',
    }[entretienType];

    const levelInstruction = {
      [EntretienLevel.JUNIOR]:
        'The candidate is junior (0-2 years). Ask foundational questions.',
      [EntretienLevel.MID]:
        'The candidate is mid-level (2-5 years). Ask intermediate questions.',
      [EntretienLevel.SENIOR]:
        'The candidate is senior (5+ years). Ask advanced architecture and leadership questions.',
    }[level];

    const prompt = `
You are an expert HR recruiter and technical interviewer at ${company}.
You are preparing an interview for the position of ${position}.

${languageInstruction}
${typeInstruction}
${levelInstruction}

CANDIDATE PROFILE:
- Name: ${profile.firstName} ${profile.lastName}
- Level: ${profile.userLevel}
- Skills: ${profile.skills.map((s) => s.name).join(', ')}
- Experience: ${profile.experiences.map((e) => `${e.title} at ${e.company}`).join(', ')}
- Goals: ${profile.shortTermGoals ?? 'Not specified'}

POSITION: ${position} at ${company}
${jobDescription ? `JOB DESCRIPTION:\n${jobDescription}` : ''}

Generate exactly 8 interview questions following this distribution:
- 2 behavioral questions (STAR method) related to the candidate's experience
- 2 technical questions specific to the required skills
- 2 situational questions ("What would you do if...")
- 1 motivation question ("Why do you want to join ${company}?")
- 1 final question ("Do you have any questions for us?")

RULES:
- Each question must be specific to the candidate's profile and the position
- Do NOT number the questions
- Return ONLY a JSON array of strings, nothing else
- Example: ["Question 1", "Question 2", ...]
    `;

    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = completion.choices[0].message.content ?? '[]';

    try {
      const clean = raw
        .replace(/<think>[\s\S]*?<\/think>/g, '')
        .replace(/```json|```/g, '')
        .trim();
      return JSON.parse(clean);
    } catch {
      // Fallback si le parsing échoue
      return raw
        .split('\n')
        .filter((line) => line.trim().startsWith('"'))
        .map((line) => line.replace(/[",]/g, '').trim());
    }
  }
}
