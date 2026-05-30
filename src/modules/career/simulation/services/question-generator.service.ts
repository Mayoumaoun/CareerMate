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

2. Technical overview: Warmly ask about their primary stack, tools, or engineering practices they use day-to-day.
   Target a SPECIFIC technology from their skill list — never ask generically.

3. Technical deep-dive: A precise question about ONE specific technology from their skill list.
   Focus on internals, algorithms, or design patterns. Be specific and curious, not interrogative.

4. Technical deep-dive: A DIFFERENT technology or concept than Q3 — architecture, system design, or patterns.
   Never repeat the same tech area as Q3.

5. Code or debugging scenario: A concrete problem framed warmly — "I'd love to hear how you'd approach...",
   "I'm curious — if you encountered X, how would you go about debugging it?"
   Must be grounded in the candidate's actual skill set.

6. Technical problem-solving: An open-ended engineering challenge relevant to the position.
   Frame it as a collaborative exploration, not an interrogation — "How would you think about...",
   "I'd be interested in your approach to..."

7. Situational technical: A "What would you do if..." scenario — production incident, performance regression,
   or conflicting technical requirements. Must feel like a real situation for this role.

8. Closing: Warmly invite them to ask questions about the tech stack, team, or culture.
   Vary the phrasing every session — never always say "Do you have any questions for us?"
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

2. Career motivation: Warmly ask why they want to join ${company} and what draws them to this specific role.
   Make it specific — reference something concrete about ${company}.

3. STAR behavioral: A specific past situation where they showed initiative or went beyond their role.
   Reference ONE skill from their profile. Use warm, curious framing:
   "I'd love to hear about a moment when...", "Could you walk me through a situation where...",
   "I'm curious — what's a good example of a time you..."

4. STAR behavioral: A time they had to navigate a conflict — with a teammate, manager, or stakeholder.
   Must target a DIFFERENT skill or context than Q3. Vary the opener warmly.

5. STAR behavioral: A situation where they worked under pressure, tight deadlines, or ambiguity.
   Must target a DIFFERENT context than Q3 and Q4. Vary the opener warmly.

6. STAR behavioral: A time they influenced a decision or drove change without formal authority.
   Must target a DIFFERENT context than Q3, Q4, and Q5. Vary the opener warmly.

7. Values & culture fit: A warm question about how they approach collaboration, feedback, or growth.
   Vary the angle every session — sometimes feedback, sometimes disagreement, sometimes learning.

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

2. Career motivation: Warmly ask why they want to join ${company} and what excites them about this position.
   Be specific — reference something concrete about ${company} or the role.

3. STAR behavioral: A past challenge directly related to ONE of their listed skills.
   Use warm, curious framing — not always "Tell me about a time when...".
   Try: "I'd love to hear about a situation where...", "I'm curious — could you walk me through a moment when...",
   "What's a good example of a time you faced..."

4. Technical deep-dive: A specific question targeting ONE technology from their skill list.
   Focus on internals, real-world usage, or design patterns. Be precise and curious, not interrogative.

5. STAR behavioral: A difficult situation — conflict, tight deadline, or unexpected obstacle.
   Must target a DIFFERENT skill or context than Q3. Vary the opener warmly.

6. Technical problem-solving: An architecture or design question relevant to the position.
   Must target a DIFFERENT technology or area than Q4.

7. Situational: A "What would you do if..." scenario blending soft skills and technical judgment.
   Must feel realistic and specific to this role at ${company}.

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
- Questions must sound warm, human, and conversational — like a real interviewer who genuinely cares
- Keep questions concise — avoid repeating the same idea twice in one question
- NEVER use commanding or abrupt language — replace "give me", "tell me", "list" with warm alternatives:
  "I'd love to hear...", "Could you walk me through...", "I'd be curious to know...", "I'm interested in..."
- NEVER start Q1 with "To kick things off", "give me an overview", or "tell me about yourself"
- Vary ALL openers — no two questions in the same session should start with the same phrase
- When referencing past experience, use neutral phrasing like "in a previous role" or "earlier in your career"
- Name SPECIFIC technologies (e.g. "React", "NestJS") instead of vague terms
- Do NOT number the questions
- Return ONLY a JSON array of strings, nothing else
- NEVER include the candidate's name inside a question
- Example: ["Question 1", "Question 2", ...]

PUNCTUATION RULES (critical for natural audio rendering):
- Use commas to create natural pauses within a question — "I'd love to hear, in your own words, how you..."
- Use a dash "—" instead of parentheses for asides — "your experience — especially with React —" not "(especially with React)"
- End every question with "?" — never with a period
- Break long questions into two shorter sentences rather than one long complex one
- NEVER use parentheses — they break TTS audio rendering
- Use "..." sparingly to indicate a thoughtful pause — "What would you do if... say, the API went down in production?"
- Prefer short, punchy sentences over long, nested clauses

VARIETY RULES:
- Never use the same question structure twice in the same session
- Never reuse the same opener across questions
- Each behavioral question must target a DIFFERENT skill from the candidate's list
- Each technical question must cover a DIFFERENT technology
- Avoid generic questions — every question must feel tailored to this specific candidate and role
- Banned phrases for Q1: "To kick things off", "Let's kick things off", "To start things off", 
  "give me an overview", "tell me about yourself", "Let's get started"
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
