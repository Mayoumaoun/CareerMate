import { Injectable } from '@nestjs/common';
import { ProfileEntity } from '../../profile/entities/profile.entity';
import { LettreMotivationEntity } from './lettre-motivation.entity';
import { Tone } from './dto/generate-lettre-motivation.dto';

const TONE_INSTRUCTIONS = {
  professional: `
- Formal, polished and structured
- Precise vocabulary, no contractions
- Confident but measured — let achievements speak
- Avoid superlatives and empty enthusiasm
  `,
  friendly: `
- Warm, genuine and human
- Conversational but still professional
- Use "I" naturally, show personality
- Feel like a real person wrote this, not a robot
  `,
  enthusiastic: `
- High energy and authentic passion
- Start strong — grab attention immediately
- Use dynamic action verbs: built, launched, drove, scaled
- The reader should FEEL the excitement, not just read about it
- Still professional — enthusiasm does not mean informal
  `,
  confident: `
- Bold, direct and assertive
- Lead with impact and results
- No hedging phrases
- Every sentence should feel decisive
  `,
};

const GENDER_AGREEMENT = {
  female: `
- The candidate is a WOMAN. Use feminine grammatical agreement throughout the ENTIRE letter.
- Example: "convaincue", "prête", "motivée", "développeuse"
- NEVER accidentally use masculine forms like "convaincu", "prêt", "motivé"
  `,
  male: `
- The candidate is a MAN. Use masculine grammatical agreement throughout the ENTIRE letter.
- Example: "convaincu", "prêt", "motivé", "développeur"
- NEVER accidentally use feminine forms
  `,
  other: `- Use neutral or inclusive language throughout the letter.`,
  prefer_not_to_say: `- Use neutral or inclusive language throughout the letter.`,
};

@Injectable()
export class PromptBuilderService {
  build(
    profile: ProfileEntity,
    company: string,
    position: string,
    tone: Tone,
    companySummary: string,
    jobDescription?: string,
    previousFeedbacks?: LettreMotivationEntity[],
  ): string {
    const experiences = profile.experiences
      .map((e) => {
        const period = e.endDate
          ? `${e.startDate} - ${e.endDate}`
          : `${e.startDate} - Present`;
        return `- ${e.title} at ${e.company}, ${e.location} (${period}): ${e.description}`;
      })
      .join('\n');

    const skills = profile.skills.map((s) => s.name).join(', ');

    const education = profile.education
      .map((e) => {
        const period = e.endDate
          ? `${e.startDate} - ${e.endDate}`
          : `${e.startDate} - Present`;
        return `- ${e.degree} in ${e.field} at ${e.institution}, ${e.location} (${period})`;
      })
      .join('\n');

    const certifications = profile.certifications?.length
      ? profile.certifications
          .map(
            (c) => `- ${c.name} by ${c.organization} (${c.date}) — ${c.domain}`,
          )
          .join('\n')
      : null;

    const languages = profile.languages
      .map((l) => `${l.language} (${l.level})`)
      .join(', ');

    // Construire le contexte feedback
    const likedLetters =
      previousFeedbacks?.filter((l) => l.liked === true) ?? [];
    const dislikedLetters =
      previousFeedbacks?.filter((l) => l.liked === false) ?? [];

    const feedbackContext = previousFeedbacks?.length
      ? `
═══════════════════════════════════════
USER PREFERENCES — based on past feedback
═══════════════════════════════════════
This user has rated previous cover letters. Adapt your writing accordingly:

${
  likedLetters.length
    ? `LIKED (reproduce these qualities):
${likedLetters.map((l) => `✅ ${l.style} tone for ${l.company} — "${l.feedbackComment ?? 'liked it'}"`).join('\n')}`
    : ''
}

${
  dislikedLetters.length
    ? `DISLIKED (avoid these qualities):
${dislikedLetters.map((l) => `❌ ${l.style} tone for ${l.company} — "${l.feedbackComment ?? 'did not like it'}"`).join('\n')}`
    : ''
}
      `
      : '';

    // Détecter la langue selon la job description
    const isEnglish = jobDescription
      ? /[a-zA-Z]/.test(jobDescription) && jobDescription.split(' ').length > 5
      : false;

    const openingLine = isEnglish
      ? `Dear Hiring Manager,\n\nI am writing to express my interest in the ${position} role at ${company}.`
      : `Madame, Monsieur,\n\nJe me permets de vous adresser ma candidature au poste de ${position} au sein de ${company}.`;

    const closingLine = isEnglish
      ? `Thank you for considering my application.\n\nSincerely,\n${profile.firstName} ${profile.lastName}`
      : `Veuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées.\n\n${profile.firstName} ${profile.lastName}`;

    return `
You are a world-class cover letter writer.

⚠️ ABSOLUTE RULE #1 — NO INVENTED FACTS:
NEVER write any number, percentage, duration or quantity
that does not appear word-for-word in the candidate profile.
This means: no "40%", no "six mois", no "deux ans", no "500 entreprises".
If it is not explicitly written in the profile below, it does not exist.
This rule overrides everything else.

⚠️ ABSOLUTE RULE #2 — BANNED PHRASES:
NEVER write any of these under any circumstance:
- "je suis convaincue/convaincu"
- "je suis prête/prêt"
- "je serais ravie/ravi"
- "je serais enthousiaste"
- "valeur ajoutée"
- "je suis passionnée/passionné par"
- "I would be delighted"
- "I am convinced"
- "I am ready to"
- "I would be a great asset"
- Any phrase repeated more than once in the letter
✗ "I am confident that my skills and experience make me a suitable candidate"
✗ "I am confident that my background and experience make me a strong candidate"
✗ "I propose that we schedule a call"
✗ "I would like to discuss my application"
✗ "I look forward to the opportunity"
✗ "I am excited about the opportunity to join"
✗ "I believe that my skills and experience"
✗ Any sentence starting with "I am excited about"
✗ Any sentence starting with "I am confident that"

⚠️ ABSOLUTE RULE #3 — OUTPUT FORMAT:
Follow this EXACT structure — output ONLY the letter, nothing else:

START with this exact opening:
"${openingLine}"

Then write 3 more paragraphs following the structure below.

END with this exact closing:
"${closingLine}"

- No markdown, no bold text
- No checklist or verification notes
- No meta-commentary
- Just the raw letter text

⚠️ ABSOLUTE RULE #4 — LANGUAGE CONSISTENCY:
If writing in English, translate ALL profile information into English.
This includes job titles, company descriptions, degrees, and field names.
NEVER mix French and English in the same letter.
Examples:
- "développeur backend" → "Backend Developer"
- "stagiaire" → "intern"
- "génie logiciel" → "Software Engineering"
- "pipelines CI/CD" → "CI/CD pipelines"
⚠️ ABSOLUTE RULE #5 — PARAGRAPH 3 CONTENT:
NEVER mention ANY of these topics unless explicitly in the job description:
- CSR / Corporate Social Responsibility
- Sustainability / carbon / environment  
- Diversity / equal opportunity / inclusion
- Employee well-being / work-life balance
- Annual reports / certifications

Instead focus ONLY on:
- The company's PRODUCT or PLATFORM (what they build)
- The TECHNICAL challenges of the role
- The INDUSTRY domain (fintech, cloud, etc.)
- A specific thing from the job description

If you cannot find specific engineering facts, write something like:
"Working in fintech at [previous company] taught me X, 
which is exactly what [company]'s [product] requires."

═══════════════════════════════════════
GENDER AGREEMENT — CRITICAL
═══════════════════════════════════════
${GENDER_AGREEMENT[profile.gender]}
This applies to EVERY sentence without exception.

═══════════════════════════════════════
TONE & STYLE
═══════════════════════════════════════
${TONE_INSTRUCTIONS[tone]}

═══════════════════════════════════════
STRUCTURE — FOLLOW THIS EXACTLY
═══════════════════════════════════════

PARAGRAPH 1 — WHO I AM + WHY THIS ROLE (3-4 sentences)
  - Continue naturally from the opening line above
  - Introduce the candidate: their level, field and key strengths
  - Express genuine interest in THIS specific role at THIS company
  - Connect their background to the company's mission or needs
  - Tone: confident and direct

PARAGRAPH 2 — CONCRETE EXPERIENCE (4-5 sentences)
  - Focus on the most relevant experiences for this role
  - Be specific: what was built, what problem was solved
  - Use ONLY technologies and projects from the profile
  - NEVER add numbers or metrics not explicitly in the profile
  - Connect past work directly to what the job requires

PARAGRAPH 3 — WHY THIS COMPANY (3-4 sentences)
  - Use ONLY verified facts from the company research below
  - MANDATORY: connect ONE specific company value to ONE real candidate experience
  - Format: "[Company value] resonates with my experience [specific experience]"
  - Do NOT just list company values

PARAGRAPH 4 — CLOSING (2-3 sentences)
  - One sentence proposing next steps — natural and direct
  - NO banned phrases
  - EXAMPLES of good closings:
    ✓ "An interview would allow us to explore how my experience in [X] fits your team's needs."
    ✓ "I would welcome a conversation about how my background in [X] can contribute to [company]."
    ✓ "My experience in [X] is at your disposal — I am available at your convenience."
  - End with "Thank you for considering my application." as the final line
  - NEVER use "I propose that we schedule" or "I look forward to hearing from you"

═══════════════════════════════════════
CANDIDATE PROFILE
═══════════════════════════════════════
Name: ${profile.firstName} ${profile.lastName}
Gender: ${profile.gender}
Level: ${profile.userLevel}
Location: ${profile.city}, ${profile.country}
Bio: ${profile.bio}
Skills: ${skills}
Languages: ${languages}

EXPERIENCES:
${experiences}

EDUCATION:
${education}

${certifications ? `CERTIFICATIONS:\n${certifications}` : ''}
${profile.shortTermGoals ? `\nShort-term goals: ${profile.shortTermGoals}` : ''}
${profile.longTermGoals ? `\nLong-term goals: ${profile.longTermGoals}` : ''}
${profile.targetPosition ? `\nTarget: ${JSON.stringify(profile.targetPosition)}` : ''}

═══════════════════════════════════════
TARGET POSITION
═══════════════════════════════════════
Company: ${company}
Position: ${position}
${jobDescription ? `\nJob Description:\n${jobDescription}` : ''}

═══════════════════════════════════════
COMPANY RESEARCH — verified facts only
═══════════════════════════════════════
${companySummary || 'No specific company data found — stay authentic and general.'}

${feedbackContext}

Now write the cover letter following the EXACT format above.
Start with "${openingLine.split('\n')[0]}" and end with "Sincerely," or the French equivalent.
    `;
  }
}
