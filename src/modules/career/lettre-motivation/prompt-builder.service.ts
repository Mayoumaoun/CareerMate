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

    const isEnglish = jobDescription
      ? /[a-zA-Z]/.test(jobDescription) && jobDescription.split(' ').length > 5
      : false;

    const openingLine = isEnglish
      ? `Dear Hiring Manager,\n\nI am writing to express my interest in the ${position} role at ${company}.`
      : `Madame, Monsieur,\n\nJe me permets de vous adresser ma candidature au poste de ${position} au sein de ${company}.`;

    const closingLine = isEnglish
      ? `Thank you for considering my application.\n\nSincerely,\n${profile.firstName} ${profile.lastName}`
      : `Veuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées.\n\n${profile.firstName} ${profile.lastName}`;

    // Paragraph 3 adaptatif selon disponibilité des données entreprise
    const paragraph3Instruction = companySummary
      ? `
PARAGRAPH 3 — WHY THIS COMPANY (3-4 sentences)
  - Use ONLY verified facts from the company research below
  - MANDATORY: connect ONE specific company value to ONE real candidate experience
  - Format: "[Company value] resonates with my experience [specific experience]"
  - Do NOT just list company values
  - NEVER mention CSR, diversity, donations, community organizations,
    inclusive hiring, or any DEI-related content even if it appears in the research
  - NEVER mention percentages or statistics about team demographics
      `
      : `
PARAGRAPH 3 — PROFESSIONAL ALIGNMENT (3-4 sentences)
  - No company research data is available — DO NOT invent or assume anything about the company
  - DO NOT write generic statements about the company's "focus" or "vision" 
  - Instead, focus on how this SPECIFIC ROLE aligns with the candidate's career goals
  - Connect the technical requirements of the job to the candidate's short-term or long-term goals
  - Show genuine understanding of what the role requires technically
  - Example structure:
    "This role's focus on [specific technical requirement from job description]
    aligns directly with my goal to [candidate's short/long term goal].
    My experience in [relevant experience] has prepared me to [specific contribution]."
      `;

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
- "I am excited about the opportunity"
- "I am excited about the opportunity to"
- "I am particularly drawn to"
- "makes me a strong fit"
- "make me a strong fit"
- "makes me a strong candidate"
- "make me a strong candidate"
- "makes me a suitable fit"
- "make me a suitable fit"
- "I am confident that"
- "I am confident that my"
- "is at your disposal"
- "at your convenience"
- "making a positive impact"
- "positive impact"
- Any phrase repeated more than once in the letter
✗ "I am confident that my skills and experience make me a suitable candidate"
✗ "I am confident that my background and experience make me a strong candidate"
✗ "I propose that we schedule a call"
✗ "I would like to discuss my application"
✗ "I look forward to the opportunity"
✗ "I believe that my skills and experience"
✗ Any sentence starting with "I am excited about"
✗ Any sentence starting with "I am confident that"
✗ Any sentence starting with "I am particularly drawn to"

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
NEVER mention ANY of these topics under any circumstance:
- CSR / Corporate Social Responsibility
- Sustainability / carbon / environment
- Diversity / equal opportunity / inclusion / DEI
- Underrepresented communities
- Employee well-being / work-life balance
- Annual reports / certifications
- Any statistics about team demographics (e.g. "73% of...")
- Inclusive hiring / inclusive by design
- Donations / community organizations
- Any generic statement about the company's "focus" or "vision"
  unless backed by a specific verified fact from the research below

⚠️ ABSOLUTE RULE #6 — CLOSING PARAGRAPH:
- ONE sentence proposing next steps — natural and direct
- Followed ONLY by "Thank you for considering my application."
- NEVER write two sentences that say the same thing
- NEVER use: "is at your disposal", "at your convenience",
  "I look forward to hearing from you", "I propose that we schedule"
- EXAMPLES of good closings:
  ✓ "An interview would allow us to explore how my experience in [X] fits your team's needs."
  ✓ "I would welcome a conversation about how my background in [X] can contribute to [company]."

⚠️ ABSOLUTE RULE #7 — NEVER APOLOGIZE FOR THE PROFILE:
NEVER mention gaps, limitations, or lack of experience.
NEVER write phrases like:
- "My experience with X has been limited"
- "I am eager to expand my skills in X"  
- "I am looking to grow in X"
- "Although I am junior"
- "Despite my limited experience"
Instead: focus on what the candidate HAS done and 
frame it as a foundation to build upon — without 
explicitly admitting it is a foundation.
Example:
✗ "My experience with Python has been limited to one internship"
✓ "My work with Python at Telnet Holding, combined with my strong 
   foundation in Java and object-oriented principles, positions me 
   to contribute to Python-based systems effectively."

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
  - NEVER use banned phrases from RULE #2

PARAGRAPH 2 — CONCRETE EXPERIENCE (4-5 sentences)
  - Focus on the most relevant experiences for this role
  - Be specific: what was built, what problem was solved
  - Use ONLY technologies and projects from the profile
  - NEVER add numbers or metrics not explicitly in the profile
  - Connect past work directly to what the job requires

${paragraph3Instruction}

PARAGRAPH 4 — CLOSING (2 sentences maximum)
  - ONE sentence proposing next steps — natural and direct
  - End with "Thank you for considering my application." as the final line
  - NEVER use banned phrases
  - NEVER repeat the same idea twice

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
${companySummary || 'No specific company data found — focus on professional alignment with the role instead.'}

${feedbackContext}

⚠️ SELF-CHECK BEFORE OUTPUTTING:
Read your letter and verify:
□ Does it contain "I am eager"? → REWRITE that sentence
□ Does it contain "I am drawn to"? → REWRITE that sentence  
□ Does it contain "I am excited"? → REWRITE that sentence
□ Does it contain "strong fit"? → REWRITE that sentence
□ Does it contain "I am confident"? → REWRITE that sentence
□ Does paragraph 3 repeat ideas from paragraph 1? → REWRITE paragraph 3
□ Does the closing have more than 2 sentences? → REMOVE extras
If any box is checked → fix it before outputting.

Now write the cover letter following the EXACT format above.
Start with "${openingLine.split('\n')[0]}" and end with "Sincerely," or the French equivalent.
    `;
  }
}
