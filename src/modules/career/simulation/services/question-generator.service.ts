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
1. Self-introduction: Warmly invite the candidate to introduce themselves and walk through their technical background.
   CRITICAL: Vary the opener every session — NEVER reuse the same phrasing. Rotate between warm, inviting openers like:
   "I'd love to start by hearing a bit about your technical background — could you walk me through your journey so far?",
   "Before we dive into the technical side, I'd be curious to hear how you got into this field.",
   "Let's begin with you — I'd love to hear about your background and the stack you've been working with.",
   "Could you give me a sense of your technical journey and the technologies you feel most at home with?",
   "I'd love to get to know your background a little better — could you walk me through your experience so far?".
   All openers must feel warm and inviting — never commanding or abrupt.
   NEVER use "To kick things off", "give me an overview", or "tell me about yourself" — these are banned.

2. Technical overview: Ask about their primary stack and day-to-day engineering practices.
   Target a SPECIFIC technology from their skill list. Keep it short and direct.

3. Technical deep-dive: Ask ONE precise question about a specific technology from their skill list.
   Focus on internals, algorithms, or design patterns. One idea only — no sub-questions.

4. Technical deep-dive: A DIFFERENT technology or concept than Q3.
   Never repeat the same tech area as Q3. One idea only.

5. Code or debugging scenario: A concrete, short problem statement.
   "How would you approach..." or "Walk me through how you'd debug..." — one scenario, one question.

6. Technical problem-solving: One open-ended engineering challenge relevant to the position.
   Short and direct — no stacking of multiple sub-questions.

7. Situational technical: A short "What would you do if..." scenario.
   One realistic situation — production incident, performance issue, or conflicting requirements.

8. Closing: Warmly invite them to ask questions about the tech stack, team, or culture.
   Vary the phrasing every session.
`,
      [EntretienType.COMPORTEMENTAL]: `
Generate exactly 8 questions in this EXACT ORDER to simulate a real BEHAVIORAL interview:
1. Self-introduction: Warmly invite the candidate to introduce themselves and share their career journey.
   CRITICAL: Vary the opener every session — NEVER reuse the same phrasing. Rotate between warm, inviting openers like:
   "I'd love to start by hearing a bit about your journey — how did you get to where you are today?",
   "Before anything else, I'd be curious to hear your story — what brought you to this point in your career?",
   "Could you give me a sense of your background and what's shaped your career path so far?",
   "I'd love to get to know you a little better — could you walk me through your experience and what you're looking for?",
   "Let's start with you — I'd be curious to hear about your career journey and what draws you to this kind of role.".
   All openers must feel warm and conversational — never commanding or impersonal.
   NEVER use "To kick things off", "give me an overview", or "tell me about yourself" — these are banned.

2. Career motivation: Why they want to join ${company} and what draws them to this specific role.
   One focused question — short and specific to ${company}.

3. STAR behavioral: A specific past situation where they showed initiative or went beyond their role.
   Reference ONE skill. Short framing — one scenario, no sub-questions.

4. STAR behavioral: A time they navigated a conflict with a teammate, manager, or stakeholder.
   Different skill or context than Q3. One question only.

5. STAR behavioral: A situation under pressure, tight deadline, or ambiguity.
   Different context than Q3 and Q4. One question only.

6. STAR behavioral: A time they influenced a decision or drove change without formal authority.
   Different context than Q3, Q4, Q5. One question only.

7. Values & culture fit: One short question about how they approach collaboration, feedback, or growth.
   Vary the angle every session.

8. Closing: Warmly invite them to ask questions about the team culture or success in this role.
   Vary the phrasing every session.
`,
      [EntretienType.MIXTE]: `
Generate exactly 8 questions in this EXACT ORDER to simulate a real MIXED interview (behavioral + technical):
1. Self-introduction: Warmly invite the candidate to introduce themselves and give an overview of their background.
   CRITICAL: Vary the opener every session — NEVER reuse the same phrasing. Rotate between warm, inviting openers like:
   "I'd love to start by hearing a bit about your background — could you walk me through your journey so far?",
   "Before we get into the details, I'd be curious to hear your story and what brought you here.",
   "Could you give me a sense of who you are professionally and what you're looking for in your next role?",
   "I'd love to get to know your background a little — could you walk me through your experience and what led you to apply?",
   "Let's start with you — I'd love to hear about your journey and what excites you about this kind of role.".
   All openers must feel warm and inviting — never commanding, abrupt, or impersonal.
   NEVER use "To kick things off", "give me an overview", or "tell me about yourself" — these are banned.

2. Career motivation: Why they want to join ${company} and what excites them about this position.
   One focused question — short and specific to ${company} or the role.

3. STAR behavioral: A past challenge directly related to ONE of their listed skills.
   Short framing — one scenario, no sub-questions.

4. Technical deep-dive: ONE precise question targeting a specific technology from their skill list.
   Internals, real-world usage, or design patterns. Short and direct.

5. STAR behavioral: A difficult situation — conflict, tight deadline, or unexpected obstacle.
   Different skill or context than Q3. One question only.

6. Technical problem-solving: One architecture or design question relevant to the position.
   Different technology or area than Q4. Short and direct.

7. Situational: One short "What would you do if..." scenario blending soft skills and technical judgment.
   Realistic and specific to this role at ${company}.

8. Closing: Warmly invite them to ask any questions they have.
   Vary the phrasing every session.
`,
    }[entretienType];

    const randomSeed = Math.floor(Math.random() * 10000);

    const prompt = `
Session ID: ${randomSeed} — use this seed to ensure maximum variety across sessions.
Each session must feel like a completely different interview from the previous one.

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
- Keep each question under 30 words — if it needs more, split into two short sentences
- Warm does NOT mean verbose — one idea per question, stated simply and directly
- NEVER stack sub-questions: avoid "what X... and how Y... and ensure Z" patterns
- NEVER use commanding or abrupt language — prefer warm but concise phrasing
- NEVER start Q1 with "To kick things off", "give me an overview", or "tell me about yourself"
- Vary ALL openers — no two questions in the same session should start with the same phrase
- When referencing past experience, use neutral phrasing like "in a previous role" or "earlier in your career"
- Name SPECIFIC technologies (e.g. "React", "NestJS") instead of vague terms
- Do NOT number the questions
- Return ONLY a JSON array of strings, nothing else
- NEVER include the candidate's name inside a question
- Example: ["Question 1", "Question 2", ...]

PUNCTUATION RULES (critical for natural audio rendering):
- Use commas to create natural pauses within a question
- Use a dash "—" instead of parentheses for asides
- End every question with "?" — never with a period
- NEVER use parentheses — they break TTS audio rendering
- Use "..." sparingly to indicate a thoughtful pause
- Prefer short, punchy sentences over long nested clauses

VARIETY RULES:
- Never use the same question structure twice in the same session
- Never reuse the same opener across questions
- Each behavioral question must target a DIFFERENT skill from the candidate's list
- Each technical question must cover a DIFFERENT technology
- Avoid generic questions — every question must feel tailored to this specific candidate and role
- Banned phrases for Q1: "To kick things off", "Let's kick things off", "To start things off",
  "give me an overview", "tell me about yourself", "Let's get started"

CONCISENESS EXAMPLES — follow this style:
BAD:  "Can you help me understand — if you were designing a RESTful API using Python, what principles would guide your architecture, and how would you ensure it's maintainable?"
GOOD: "If you were designing a RESTful API in Python — what architectural principles would you prioritize?"

BAD:  "I'd be curious to know — how have you handled a difficult situation, say, a tight deadline or an unexpected obstacle, in a previous role — especially with a team?"
GOOD: "Walk me through a time you navigated a tight deadline with your team — what happened?"

BAD:  "I'd love to open the floor — are there any questions you have about this role, or any aspects of the company culture and values that you're eager to learn more about?"
GOOD: "Do you have any questions about the role or the team?"
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
