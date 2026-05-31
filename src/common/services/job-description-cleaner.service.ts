import { Injectable } from '@nestjs/common';
import Groq from 'groq-sdk';

@Injectable()
export class JobDescriptionCleanerService {
  private groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  async clean(rawDescription: string, position: string): Promise<string> {
    if (!rawDescription || rawDescription.trim().length < 300) {
      return rawDescription ?? '';
    }

    try {
      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        temperature: 0,
        max_tokens: 512,
        messages: [
          {
            role: 'system',
            content: `You are a job description parser.
Your only job is to extract the information relevant for writing a cover letter or preparing interview questions.
Return ONLY the structured summary — no preamble, no commentary, nothing else.`,
          },
          {
            role: 'user',
            content: `Extract the relevant information from this job description.

Return a clean structured summary with these sections:
- Role & Responsibilities (3-5 bullet points max)
- Required Skills & Technologies
- Team & Project Context (if mentioned)
- Experience Level Required

RULES:
- Maximum 300 words
- Remove: legal disclaimers, company boilerplate, DEI statements,
  salary info, application instructions, benefits, equal opportunity statements
- Keep only what a candidate needs to prepare their application
- If a section has no relevant info, omit it entirely

Job Title: ${position}

Raw Description:
${rawDescription}`,
          },
        ],
      });

      const cleaned = completion.choices[0].message.content?.trim() ?? '';

      if (cleaned.length < 50) {
        return rawDescription;
      }

      return cleaned;
    } catch (error) {
      console.warn(
        '[JobDescriptionCleaner] Failed to clean description, using raw:',
        error,
      );
      return rawDescription;
    }
  }
}
