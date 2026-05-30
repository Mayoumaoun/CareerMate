import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { CvEntity, CvType } from './cv.entity';
import { ProfileEntity } from '../profile/entities/profile.entity';
import { Multer } from 'multer';

const pdfParse = require('pdf-parse');

@Injectable()
export class CvService {
  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(CvEntity)
    private readonly cvRepository: Repository<CvEntity>,
    @InjectRepository(ProfileEntity)
    private readonly profileRepository: Repository<ProfileEntity>,
  ) {}

  private readonly PYTHON_SERVICE = 'http://localhost:8000';

  async uploadCV(file: Express.Multer.File) {
    const data = await pdfParse(file.buffer);
    return {
      text: data.text,
      pages: data.numpages,
      characters: data.text.length
    };
  }

async suggestAtsFixes(file: Express.Multer.File, jobOffer: string) {
  const { text } = await this.uploadCV(file);
  try {
    const response = await firstValueFrom(
      this.httpService.post(
        `${this.PYTHON_SERVICE}/suggest-fixes`,
        {
          cv_text: text,
          jd_text: jobOffer,
          required_skills: []
        },
        { timeout: 30000 }
      )
    );
    return response.data;
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      throw new HttpException('Python service not running', HttpStatus.SERVICE_UNAVAILABLE);
    }
    throw new HttpException(
      error.response?.data?.detail || 'Analysis failed',
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

  async optimizeCV(file: Express.Multer.File, dto: any, profileId: string) {
    const { text } = await this.uploadCV(file);
    
    // Handle required_skills as either JSON array string or comma-separated string
    let requiredSkills: string[] = [];
    if (dto.required_skills) {
      try {
        requiredSkills = JSON.parse(dto.required_skills);
      } catch {
        // fallback: treat as comma-separated
        requiredSkills = dto.required_skills.split(',').map((s: string) => s.trim());
      }
    }

    // Handle user_profile as JSON string or empty
    let userProfile = {};
    if (dto.user_profile) {
      try {
        userProfile = JSON.parse(dto.user_profile);
      } catch {
        userProfile = {};
      }
    }
    //save result
    const result = await this.callPythonOptimize(text, dto.jd_text || '', requiredSkills, userProfile);
    
    //save it to DB
    if (result && !result.error) {
      console.log('Optimize result received, profileId:', profileId);
      
      const profile = await this.profileRepository.findOne({ where: { id: profileId } });
      console.log('Profile found:', profile?.id, profile?.firstName);
      
      if (profile) {
        const cv = this.cvRepository.create({
          title: `Optimized CV — ${dto.jd_text?.slice(0, 40) || 'Job'}`,
          type: CvType.OPTIMIZED,
          rawText: text,
          optimizedData: result.optimized_cv,
          personalInfo: result.personal_info,
          targetJobDescription: dto.jd_text || '',
          atsScoreOriginal: result.ats_before,
          atsScoreOptimized: result.ats_after,
          profile,
        });
        console.log('CV object created, attempting to save:', { title: cv.title, type: cv.type });
        
        try {
          const saved = await this.cvRepository.save(cv);
          console.log('✓ CV saved successfully:', saved.id);
        } catch (saveError: any) {
          console.error('✗ CV save failed:', saveError.message, saveError.code);
          throw saveError;
        }
      } else {
        console.warn('⚠ Profile not found for profileId:', profileId);
      }
    } else {
      console.warn('⚠ Optimization failed or returned error:', result?.error);
    }

    return result;
  }
  
  // async generateFromScratch(dto: any) {
  //   return this.callPythonOptimize(
  //     dto.cv_text || '',
  //     dto.jd_text || '',
  //     dto.required_skills || [],
  //     dto.user_profile || {}
  //   );
  // }

  async generateFromProfile(profileId: string, jobTitle?: string, jobDescription?: string, force: boolean = false): Promise<any> {
    // Load full profile from DB with all relations
    // Note: experiences, education, languages, certifications are JSONB columns, not relations
    const profile = await this.profileRepository.findOne({
      where: { id: profileId },
      relations: ['projects', 'user'],
    });

    if (!profile) {
      throw new HttpException('Profile not found', HttpStatus.NOT_FOUND);
    }

    // Check profile completeness — reuse existing function from ProfileService logic
    // Import this or calculate it here
    const completionPercentage = this.calculateCompletionPercentage(profile);
    const COMPLETENESS_THRESHOLD = 50;

    if (!force && completionPercentage < COMPLETENESS_THRESHOLD) {
      // Return warning instead of proceeding
      return {
        warning: true,
        message: `Profile is only ${completionPercentage}% complete. Please complete your profile for better CV generation.`,
        completionPercentage,
        missingSections: this.identifyMissingSections(profile),
        suggestedAction: 'Complete profile first or use force: true to generate anyway'
      };
    }

    // Build structured profile object for the LLM
    const profileData = {
      name: `${profile.firstName} ${profile.lastName}`,
      phone: profile.phone,
      city: profile.city,
      country: profile.country,
      level: profile.userLevel,
      bio: profile.bio,
      skills: profile.skills,
      experiences: profile.experiences,
      education: profile.education,
      languages: profile.languages,
      certifications: profile.certifications,
      projects: profile.projects?.map(p => ({
        title: p.title,
        description: p.description,
        techStack: p.techStack,
        date: p.date,
      })),
      targetPosition: profile.targetPosition,
      shortTermGoals: profile.shortTermGoals,
      longTermGoals: profile.longTermGoals,
    };

    // Call Python to generate CV from profile
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.PYTHON_SERVICE}/generate-from-profile`,
          { 
            profile: profileData, 
            job_title: jobTitle || '', 
            job_description: jobDescription || '' 
          },
          { timeout: 30000 }
        )
      );

      const result = response.data;

      // Save generated CV to DB
      const cv = this.cvRepository.create({
        title: jobTitle ? `CV — ${jobTitle}` : `CV — ${profile.firstName} ${profile.lastName}`,
        type: CvType.GENERATED,
        optimizedData: result.generated_cv,
        personalInfo: {
          name: profileData.name,
          phone: profile.phone,
          email: profile.user?.email || '',
        },
        profile,
      });
      await this.cvRepository.save(cv);

      return result;
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        throw new HttpException('Python service not running', HttpStatus.SERVICE_UNAVAILABLE);
      }
      throw new HttpException(
        error.response?.data?.detail || 'CV generation failed',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  async getUserCvs(profileId: string): Promise<CvEntity[]> {
    return this.cvRepository
      .createQueryBuilder('cv')
      .leftJoinAndSelect('cv.profile', 'profile')
      .where('profile.id = :profileId', { profileId })
      .orderBy('cv.uploadedAt', 'DESC')
      .getMany();
  }

  async getCvById(id: string, profileId: string): Promise<CvEntity> {
    const cv = await this.cvRepository.findOne({
      where: { id, profile: { id: profileId } },
    });
    if (!cv) throw new HttpException('CV not found', HttpStatus.NOT_FOUND);
    return cv;
  }

  private async callPythonOptimize(
    cvText: string,
    jdText: string,
    requiredSkills: string[],
    userProfile: object
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.PYTHON_SERVICE}/optimize`,
          {
            cv_text: cvText,
            jd_text: jdText,
            required_skills: requiredSkills,
            user_profile: userProfile
          },
          { timeout: 30000 }
        )
      );
      return response.data;
    } catch (error:any) {
      if (error.code === 'ECONNREFUSED') {
        throw new HttpException(
          'Python optimization service is not running. Start it with: uvicorn rag.main:app --port 8000',
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }
      throw new HttpException(
        error.response?.data?.detail || 'CV optimization failed',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async generatePdf(optimizedCv: any, candidateName: string = 'Candidate', personalInfo: any = {}): Promise<Buffer> {
  try {
    const response = await firstValueFrom(
      this.httpService.post(
        `${this.PYTHON_SERVICE}/generate-pdf`,
        { optimized_cv: optimizedCv, candidate_name: candidateName, personal_info: personalInfo },
        { responseType: 'arraybuffer', timeout: 15000 }
      )
    );
    return Buffer.from(response.data);
  } catch (error: any) {
    throw new HttpException(
      'PDF generation failed',
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
  }

  // Reuse the completion percentage logic (matches ProfileService)
  private calculateCompletionPercentage(profile: ProfileEntity): number {
    let completedItems = 0;
    const totalItems = 7;

    // Check each step
    if (profile.bio && profile.bio.length > 0) completedItems++;
    if (Array.isArray(profile.education) && profile.education.length > 0)
      completedItems++;
    if (Array.isArray(profile.skills) && profile.skills.length > 0)
      completedItems++;
    if (Array.isArray(profile.experiences) && profile.experiences.length > 0)
      completedItems++;
    completedItems++; // Projects step
    if (Array.isArray(profile.languages) && profile.languages.length > 0)
      completedItems++;
    if (Array.isArray(profile.certifications) && profile.certifications.length > 0)
      completedItems++;

    return Math.round((completedItems / totalItems) * 100);
  }

  // Identify which sections are missing
  private identifyMissingSections(profile: ProfileEntity): string[] {
    const missing: string[] = [];

    if (!profile.bio || profile.bio.length === 0) missing.push('bio');
    if (!profile.education || profile.education.length === 0) missing.push('education');
    if (!profile.skills || profile.skills.length === 0) missing.push('skills');
    if (!profile.experiences || profile.experiences.length === 0) missing.push('experiences');
    if (!profile.languages || profile.languages.length === 0) missing.push('languages');
    if (!profile.certifications || profile.certifications.length === 0) missing.push('certifications');

    return missing;
  }
}
