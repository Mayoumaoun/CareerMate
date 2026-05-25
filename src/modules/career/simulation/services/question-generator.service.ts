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

    const levelInstruction = {
      [EntretienLevel.JUNIOR]:
        'The candidate is junior (0-2 years). Ask foundational questions.',
      [EntretienLevel.MID]:
        'The candidate is mid-level (2-5 years). Ask intermediate questions.',
      [EntretienLevel.SENIOR]:
        'The candidate is senior (5+ years). Ask advanced architecture and leadership questions.',
    }[level];

    const questionStructure = {
      [EntretienType.TECHNIQUE]: `
Generate exactly 8 questions in this EXACT ORDER to simulate a real TECHNICAL interview:
1. Self-introduction: Ask the candidate to introduce themselves and walk through their technical background (e.g. "To kick things off, could you walk me through your technical background and the main stack you've worked with?")
2. Technical overview: Ask about their primary stack, tools, or engineering practices they use day-to-day
3. Technical deep-dive: A precise, specific question about one technology from their skill list (algorithms, internals, patterns)
4. Technical deep-dive: A different technology or concept — architecture, design patterns, or system design
5. Code or debugging scenario: "How would you approach..." or "What would you do if your code..." — a concrete problem to solve
6. Technical problem-solving: An open-ended engineering challenge relevant to the position (scalability, performance, data modeling)
7. Situational technical: "What would you do if..." — a real-world technical scenario (e.g. production incident, performance regression, conflicting requirements)
8. Closing: "Do you have any questions for us about the tech stack, team structure, or engineering culture?"
`,
      [EntretienType.COMPORTEMENTAL]: `
Generate exactly 8 questions in this EXACT ORDER to simulate a real BEHAVIORAL interview:
1. Self-introduction: Ask the candidate to introduce themselves and their career journey (e.g. "I'd love to hear about your background — could you walk me through your career story so far?")
2. Career motivation: Why they want to join ${company} and what draws them to this specific role
3. STAR behavioral: A specific past situation where they showed initiative or went beyond their role
4. STAR behavioral: A time they had to deal with a conflict — with a teammate, manager, or stakeholder
5. STAR behavioral: A situation where they had to work under pressure, tight deadlines, or ambiguity
6. STAR behavioral: A time they influenced a decision, led a process, or drove change without formal authority
7. Values & culture fit: A question about how they approach collaboration, feedback, or growth (e.g. "How do you typically handle receiving critical feedback?")
8. Closing: "Do you have any questions for us about the team culture or what success looks like in this role?"
`,
      [EntretienType.MIXTE]: `
Generate exactly 8 questions in this EXACT ORDER to simulate a real MIXED interview (behavioral + technical):
1. Self-introduction: Ask the candidate to introduce themselves and give an overview of their background (e.g. "Tell me about yourself and what led you to apply for this role")
2. Career motivation: Why they want to join ${company} and what excites them about this specific position
3. STAR behavioral: A past challenge directly related to one of their listed skills — how they handled it and what the outcome was
4. Technical deep-dive: A specific question targeting one technology from their skill list — internals, patterns, or real usage
5. STAR behavioral: A difficult situation — conflict, tight deadline, or unexpected obstacle — and how they navigated it
6. Technical problem-solving: An architecture or design question relevant to the position (scalability, data flow, system design)
7. Situational: "What would you do if..." — a scenario blending soft skills and technical judgment relevant to the role
8. Closing: "Do you have any questions for us?"
`,
    }[entretienType];

    const randomSeed = Math.floor(Math.random() * 10000);

    const prompt = `
Session ID: ${randomSeed} — use this to ensure question variety across sessions.

You are an expert HR recruiter and technical interviewer at ${company}.
You are preparing an interview for the position of ${position}.

${languageInstruction}
${levelInstruction}

CANDIDATE PROFILE:
- Name: ${profile.firstName} ${profile.lastName}
- Level: ${profile.userLevel}
- Skills: ${profile.skills.map((s) => s.name).join(', ')}
- Experience: ${profile.experiences.map((e) => `${e.title} at ${e.company}`).join(', ')}
- Goals: ${profile.shortTermGoals ?? 'Not specified'}

POSITION: ${position} at ${company}
${jobDescription ? `JOB DESCRIPTION:\n${jobDescription}` : ''}

${questionStructure}

STRICT RULES:
- Respect the order above — question 1 must always be the self-introduction
- Each question must have ONE clear focus — never bundle multiple questions into one
- Questions must sound warm and conversational, as if a real interviewer is speaking —
  add natural openers like "To kick things off,", "I'd love to hear...",
  "Let's dive into...", "I'm curious about..." to make questions feel less robotic
- Keep questions concise — avoid repeating the same idea twice in one question
- Vary question openers — avoid always starting with "Can you describe..."
- When referencing past experience, use neutral phrasing like "in a previous role" or "earlier in your career" — NEVER mention the candidate's past employers by name
- Name SPECIFIC technologies (e.g. "React", "NestJS") instead of vague terms like "Full Stack skills"
- Use the candidate's company names EXACTLY as provided — do NOT translate, paraphrase, or describe them (never replace a company name with "the startup" or "the Tunisian company")
- Do NOT number the questions
- Return ONLY a JSON array of strings, nothing else
- NEVER include the candidate's name inside a question — the interviewer already knows who they're talking to
- Example: ["Question 1", "Question 2", ...]

VARIETY RULES:
- Never use the same question structure twice (e.g. don't start two questions with "Tell me about a time when...")
- Each behavioral question must target a DIFFERENT skill or context from the candidate's profile
- Each technical question must cover a DIFFERENT technology
- Avoid generic questions that could apply to any candidate — every question must feel tailored
- If the candidate has multiple experiences, reference DIFFERENT periods/contexts for each question
    `;

    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.9,
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
      return raw
        .split('\n')
        .filter((line) => line.trim().startsWith('"'))
        .map((line) => line.replace(/[",]/g, '').trim());
    }
  }
}