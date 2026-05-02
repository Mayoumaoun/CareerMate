import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CvEntity } from './cv.entity';
import { Multer } from 'multer';

const pdfParse = require('pdf-parse');

@Injectable()
export class CvService {
  constructor(private readonly httpService: HttpService) {}

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

  // async optimizeCV(file: Express.Multer.File, dto: any) {
  //   const { text } = await this.uploadCV(file);
  //   return this.callPythonOptimize(
  //     text,
  //     dto.jd_text || '',
  //     dto.required_skills ? JSON.parse(dto.required_skills) : [],
  //     dto.user_profile ? JSON.parse(dto.user_profile) : {}
  //   );
  // }
  async optimizeCV(file: Express.Multer.File, dto: any) {
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

    return this.callPythonOptimize(
      text,
      dto.jd_text || '',
      requiredSkills,
      userProfile
    );
  }
  
  async generateFromScratch(dto: any) {
    return this.callPythonOptimize(
      dto.cv_text || '',
      dto.jd_text || '',
      dto.required_skills || [],
      dto.user_profile || {}
    );
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
} 




















