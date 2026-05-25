import { Injectable, BadRequestException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ImportCVResponseDto } from '../dtos/import-cv.dto';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFParse = require('pdf-parse/lib/pdf-parse.js');

@Injectable()
export class CvParserService implements OnModuleInit {
  private openaiApiKey: string;
  private openaiModel: string;
  private apiEndpoint: string;
  private readonly MAX_CV_LENGTH = 12000;
  private readonly AXIOS_TIMEOUT = 30000;
  private readonly MAX_RETRIES = 3;

  constructor(private configService: ConfigService) {
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.openaiModel = this.configService.get<string>('OPENAI_MODEL', 'llama-3.3-70b-versatile');
    this.apiEndpoint = this.configService.get<string>(
      'GROQ_API_ENDPOINT',
      'https://api.groq.com/openai/v1'
    );
  }

  onModuleInit() {
    if (!this.openaiApiKey) {
      console.warn('⚠️ WARNING: OPENAI_API_KEY not configured in .env');
      console.warn('⚠️ Get Groq key at: https://console.groq.com/keys');
      return;
    }
    const provider = this.apiEndpoint.includes('groq') ? 'Groq' : 'OpenAI';
    console.log(`[CV Parser] ✅ ${provider} configured`);
    console.log(`[CV Parser] Model: ${this.openaiModel}`);
  }

  async extractTextFromPDF(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files allowed');
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('File too large (max 10MB)');
    }

    try {
      console.log('[CV Parser] 📖 Parsing PDF...');
      const data = await PDFParse(file.buffer);

      if (!data.text || data.text.trim().length === 0) {
        throw new Error('PDF contains no extractable text');
      }

      console.log(`[CV Parser] ✅ PDF extracted: ${data.text.length} chars, ${data.numpages} pages`);
      return data.text;
    } catch (error) {
      console.error('[CV Parser] ❌ PDF error:', error.message);
      throw new BadRequestException(`Failed to parse PDF: ${error.message}`);
    }
  }

  async parseWithAI(cvText: string): Promise<ImportCVResponseDto> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`[CV Parser] 🔄 Attempt ${attempt}/${this.MAX_RETRIES}`);
        return await this.callOpenAIAPI(cvText);
      } catch (error) {
        lastError = error;
        console.warn(`[CV Parser] ⚠️ Attempt ${attempt} failed:`, error.message);

        if (attempt < this.MAX_RETRIES) {
          const delayMs = 5000 * Math.pow(2, attempt - 1);
          console.log(`[CV Parser] ⏱️ Waiting ${delayMs}ms...`);
          await this.delay(delayMs);
        }
      }
    }

    throw new BadRequestException(
      `Failed after ${this.MAX_RETRIES} attempts: ${lastError.message}`
    );
  }

  private async callOpenAIAPI(cvText: string): Promise<ImportCVResponseDto> {
    if (!this.openaiApiKey) {
      throw new BadRequestException('API key not configured');
    }

    const trimmedText = cvText.slice(0, this.MAX_CV_LENGTH);
    const approxTokens = Math.ceil(trimmedText.length / 4);
    console.log(`[CV Parser] 📊 Tokens: ${approxTokens}`);

    const systemPrompt = `You are an expert CV parser.
Return ONLY valid JSON (no markdown, no commentary), using EXACTLY this schema:

{
  "step1": {
    "firstName": "string",
    "lastName": "string",
    "phone": "string",
    "country": "string",
    "city": "string",
    "dateOfBirth": "YYYY-MM-DD",
    "gender": "female|male|other|prefer_not_to_say"
  },
  "step2": {
    "userLevel": "Student|Junior|Senior",
    "education": [
      {
        "degree": "string",
        "institution": "string",
        "field": "string",
        "startDate": "YYYY-MM-DD",
        "endDate": "YYYY-MM-DD",
        "location": "string"
      }
    ]
  },
  "step3": {
    "skills": [
      {
        "name": "string",
        "level": "beginner|intermediate|advanced|expert"
      }
    ]
  },
  "step4": {
    "experiences": [
      {
        "title": "string",
        "company": "string",
        "location": "string",
        "startDate": "YYYY-MM-DD",
        "endDate": "YYYY-MM-DD",
        "description": "string"
      }
    ]
  },
  "step5": {
    "projects": [
      {
        "title": "string",
        "context": "string",
        "description": "string",
        "projectUrl": "string",
        "githubUrl": "string",
        "techStack": ["string"],
        "date": "YYYY-MM-DD"
      }
    ]
  },
  "step6": {
    "languages": [
      {
        "language": "string",
        "level": "A1|A2|B1|B2|C1|C2",
        "certificate": "string"
      }
    ]
  },
  "step7": {
    "certifications": [
      {
        "name": "string",
        "organization": "string",
        "date": "YYYY-MM-DD",
        "domain": "string",
        "context": "string",
        "url": "string"
      }
    ]
  }
}

Rules:
1) Always include all steps and arrays (use [] if empty).
2) For required fields, avoid empty values when possible by inferring from context. Use null only if impossible.
3) Dates must be ISO format YYYY-MM-DD. If only year is known (e.g. 2022), use YYYY-01-01.
4) Infer step2.userLevel:
   - Student: mostly education/projects, internships, PFE, or explicit student wording
   - Junior: about 1-3 years relevant experience
   - Senior: 4+ years or clear leadership/senior scope
5) Infer gender ONLY if explicit or strongly indicated by CV language. If uncertain use "prefer_not_to_say".
6) Normalize Tunisian phone numbers to +216XXXXXXXX when possible.
7) For optional URL fields (projectUrl, githubUrl, certificate, url), return null if unknown.
Return only JSON.`;

    try {
      console.log('[CV Parser] 📡 Calling API...');

      const response = await axios.post(
        `${this.apiEndpoint}/chat/completions`,
        {
          model: this.openaiModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Parse this CV:\n\n${trimmedText}` },
          ],
          temperature: 0.2,
          top_p: 0.9,
          max_tokens: 2000,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: this.AXIOS_TIMEOUT,
        }
      );

      const content = response.data.choices[0].message.content;
      console.log('[CV Parser] ✅ Response received');

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found');
      }

      let parsedData: any;
      try {
        parsedData = JSON.parse(jsonMatch[0]);
      } catch (parseErr) {
        console.error('[CV Parser] ❌ JSON error:', parseErr.message);
        throw new BadRequestException('Invalid JSON response');
      }

      parsedData = this.normalizeParsedData(parsedData);

      console.log('[CV Parser] ✅ Validation complete');
      return parsedData as ImportCVResponseDto;
    } catch (error) {
      if (error.response) {
        console.error('[CV Parser] ❌ API Error:', error.response.status);
        console.error('Data:', JSON.stringify(error.response.data).substring(0, 200));
        throw new BadRequestException(
          `API error (${error.response.status}): ${error.response.data.error?.message || 'Unknown'}`
        );
      }
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('API call failed: ' + error.message);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private normalizeParsedData(raw: any): ImportCVResponseDto {
    const asString = (value: any): string => (typeof value === 'string' ? value.trim() : '');
    const withFallback = (value: any, fallback: string): string => {
      const text = asString(value);
      return text || fallback;
    };
    const normalizeDate = (value: any, fallback = ''): string => {
      const dateText = asString(value);
      if (!dateText) return fallback;
      if (/^\d{4}$/.test(dateText)) return `${dateText}-01-01`;
      if (/^\d{4}-\d{2}$/.test(dateText)) return `${dateText}-01`;
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return dateText;
      return fallback || dateText;
    };
    const isValidHttpUrl = (value: string): boolean => /^https?:\/\/\S+$/i.test(value);
    const optionalUrl = (value: any): string | undefined => {
      const text = asString(value);
      return text && isValidHttpUrl(text) ? text : undefined;
    };
    const normalizePhone = (value: any): string => {
      const rawPhone = asString(value);
      if (!rawPhone) return '';
      const compact = rawPhone.replace(/[^\d+]/g, '');
      const digitsOnly = compact.replace(/\D/g, '');

      if (compact.startsWith('+216') && /^\+216\d{8}$/.test(compact)) {
        return compact;
      }
      if (digitsOnly.startsWith('216') && digitsOnly.length === 11) {
        return `+${digitsOnly}`;
      }
      if (digitsOnly.length === 9 && digitsOnly.startsWith('0')) {
        return `+216${digitsOnly.slice(1)}`;
      }
      if (digitsOnly.length === 8) {
        return `+216${digitsOnly}`;
      }
      return compact;
    };
    const inferCountry = (country: string, phone: string): string => {
      if (country) return country;
      if (phone.startsWith('+216')) return 'Tunisia';
      return 'Unknown';
    };
    const inferField = (field: string, degree: string): string => {
      if (field) return field;
      const text = degree.toLowerCase();
      if (text.includes('informatique') || text.includes('computer')) return 'Computer Science';
      if (text.includes('software') || text.includes('logiciel')) return 'Software Engineering';
      return 'General';
    };
    const inferProjectContext = (context: string, title: string, description: string): string => {
      if (context) return context;
      const text = `${title} ${description}`.toLowerCase();
      if (/(stage|intern|entreprise|client|sofrecom)/i.test(text)) return 'professional';
      if (/(pfe|projet de fin|universit|school|academ|etudiant|étudiant)/i.test(text)) return 'academic';
      return 'personal';
    };
    const normalizeGender = (value: any): 'female' | 'male' | 'other' | 'prefer_not_to_say' => {
      const gender = asString(value).toLowerCase();
      if (gender === 'female' || gender === 'male' || gender === 'other') return gender;
      return 'prefer_not_to_say';
    };
    const normalizeSkillLevel = (value: any): 'beginner' | 'intermediate' | 'advanced' | 'expert' => {
      const level = asString(value).toLowerCase();
      if (level === 'beginner' || level === 'advanced' || level === 'expert') return level;
      return 'intermediate';
    };
    const normalizeLanguageLevel = (value: any): 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' => {
      const level = asString(value).toUpperCase();
      if (['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(level)) {
        return level as 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
      }

      const rawLevel = asString(value).toLowerCase();
      if (['native', 'mother_tongue', 'mother tongue', 'fluent', 'bilingual'].includes(rawLevel)) {
        return 'C2';
      }

      return 'B1';
    };

    const step1Raw = raw?.step1 ?? {};
    const step2Raw = raw?.step2 ?? {};
    const step3Raw = raw?.step3 ?? {};
    const step4Raw = raw?.step4 ?? {};
    const step5Raw = raw?.step5 ?? {};
    const step6Raw = raw?.step6 ?? {};
    const step7Raw = raw?.step7 ?? {};

    const normalizedPhone = normalizePhone(step1Raw.phone);
    const normalizedCity = withFallback(step1Raw.city, 'Unknown');
    const normalizedCountry = inferCountry(asString(step1Raw.country), normalizedPhone);

    const experiences = Array.isArray(step4Raw.experiences)
      ? step4Raw.experiences.map((exp: any) => {
          const title = withFallback(exp?.title || exp?.position, 'Experience');
          const startDate = normalizeDate(exp?.startDate, '2000-01-01');
          return {
            title,
            company: withFallback(exp?.company, 'Unknown Company'),
            location: withFallback(exp?.location, normalizedCity || normalizedCountry || 'Unknown'),
            startDate,
            endDate: normalizeDate(exp?.endDate || exp?.startDate, startDate),
            description: withFallback(exp?.description, 'No description provided'),
          };
        })
      : [];

    const inferredUserLevel = (() => {
      if (experiences.length === 0) return 'Student';

      let totalMonths = 0;
      let hasProfessionalSignal = false;
      let hasSeniorSignal = false;
      let hasStudentSignal = false;
      let hasStrongFullTimeSignal = false;

      for (const exp of experiences) {
        const signalText = `${exp.title} ${exp.description}`.toLowerCase();
        if (/(étudiant|etudiant|student|stagiaire|stage|intern|internship|pfe|projet de fin d[’']études)/i.test(signalText)) {
          hasStudentSignal = true;
        }
        if (/(developpeur|développeur|engineer|full[- ]?stack|backend|frontend|software)/i.test(signalText)) {
          hasProfessionalSignal = true;
        }
        if (/(cdi|full[- ]?time|permanent|employee|ing[ée]nieur|consultant)/i.test(signalText)) {
          hasStrongFullTimeSignal = true;
        }
        if (/(senior|lead|architect|manager|principal|head)/i.test(signalText)) {
          hasSeniorSignal = true;
        }

        const start = new Date(exp.startDate);
        const end = new Date(exp.endDate || exp.startDate);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
          totalMonths +=
            (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
        }
      }

      if (hasSeniorSignal || totalMonths >= 48) return 'Senior';
      if (hasStudentSignal && !hasStrongFullTimeSignal) return 'Student';
      if (hasProfessionalSignal || totalMonths >= 6) return 'Junior';
      return 'Student';
    })();

    const normalized: ImportCVResponseDto = {
      step1: {
        firstName: withFallback(step1Raw.firstName, 'Unknown'),
        lastName: withFallback(step1Raw.lastName, 'Unknown'),
        phone: withFallback(normalizedPhone, '+21600000000'),
        country: normalizedCountry,
        city: normalizedCity,
        dateOfBirth: normalizeDate(step1Raw.dateOfBirth, '2000-01-01'),
        gender: normalizeGender(step1Raw.gender),
      },
      step2: {
        userLevel: inferredUserLevel,
        education: Array.isArray(step2Raw.education)
          ? step2Raw.education.map((edu: any) => {
              const degree = withFallback(edu?.degree, 'Unknown Degree');
              const startDate = normalizeDate(edu?.startDate, '2000-01-01');
              return {
                degree,
                institution: withFallback(edu?.institution || edu?.school, 'Unknown Institution'),
                field: inferField(asString(edu?.field), degree),
                startDate,
                endDate: normalizeDate(edu?.endDate || edu?.startDate, startDate),
                location: withFallback(edu?.location, normalizedCity || normalizedCountry || 'Unknown'),
              };
            })
          : [],
      },
      step3: {
        skills: Array.isArray(step3Raw.skills)
          ? step3Raw.skills.map((skill: any) => ({
              name: withFallback(skill?.name, 'Unknown Skill'),
              level: normalizeSkillLevel(skill?.level),
            }))
          : [],
      },
      step4: {
        experiences,
      },
      step5: {
        projects: Array.isArray(step5Raw.projects)
          ? step5Raw.projects.map((project: any) => {
              const title = withFallback(project?.title || project?.name, 'Project');
              const description = withFallback(project?.description, 'No description provided');
              const projectUrl = optionalUrl(project?.projectUrl || project?.url);
              const githubUrl = optionalUrl(project?.githubUrl);
              const date = normalizeDate(project?.date);

              return {
                title,
                context: inferProjectContext(asString(project?.context), title, description),
                description,
                ...(projectUrl ? { projectUrl } : {}),
                ...(githubUrl ? { githubUrl } : {}),
                techStack: Array.isArray(project?.techStack)
                  ? project.techStack.map((tech: any) => asString(tech)).filter(Boolean)
                  : Array.isArray(project?.technologies)
                    ? project.technologies.map((tech: any) => asString(tech)).filter(Boolean)
                    : [],
                ...(date ? { date } : {}),
              };
            })
          : [],
      },
      step6: {
        languages: Array.isArray(step6Raw.languages)
          ? step6Raw.languages.map((language: any) => {
              const certificate = optionalUrl(language?.certificate);
              return {
                language: withFallback(language?.language || language?.name, 'Unknown'),
                level: normalizeLanguageLevel(language?.level),
                ...(certificate ? { certificate } : {}),
              };
            })
          : [],
      },
      step7: {
        certifications: Array.isArray(step7Raw.certifications)
          ? step7Raw.certifications.map((cert: any) => {
              const certUrl = optionalUrl(cert?.url);
              return {
                name: withFallback(cert?.name, 'Unknown Certification'),
                organization: withFallback(cert?.organization || cert?.issuer, 'Unknown Organization'),
                date: normalizeDate(cert?.date, '2000-01-01'),
                domain: withFallback(cert?.domain, 'General'),
                context: withFallback(cert?.context, 'Professional Development'),
                ...(certUrl ? { url: certUrl } : {}),
              };
            })
          : [],
      },
    };

    return normalized;
  }

  async importCV(file: Express.Multer.File): Promise<ImportCVResponseDto> {
    console.log(`[CV Parser] 📥 File: ${file.originalname} (${(file.size / 1024).toFixed(2)}KB)`);

    const cvText = await this.extractTextFromPDF(file);
    const approxTokens = Math.ceil(cvText.length / 4);
    console.log(`[CV Parser] ✅ Extracted: ${cvText.length} chars (~${approxTokens} tokens)`);

    const data = await this.parseWithAI(cvText);
    console.log('[CV Parser] ✅ Complete');
    console.log(`[CV Parser] 📊 Summary:`);
    console.log(`   - Personal: ${data.step1.firstName} ${data.step1.lastName}`);
    console.log(`   - Education: ${data.step2.education.length}`);
    console.log(`   - Skills: ${data.step3.skills.length}`);
    console.log(`   - Experiences: ${data.step4.experiences.length}`);
    console.log(`   - Projects: ${data.step5.projects.length}`);
    console.log(`   - Languages: ${data.step6.languages.length}`);
    console.log(`   - Certifications: ${data.step7.certifications.length}`);

    return data;
  }
}
