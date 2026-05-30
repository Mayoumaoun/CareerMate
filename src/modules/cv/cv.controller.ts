import {
  Controller,
  Post,
  Get, 
  Param,
  UseInterceptors,
  UploadedFile,
  Body,
  Res,
} from '@nestjs/common';

import { CvService } from './cv.service';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CvEntity } from './cv.entity';
import { ApiConsumes, ApiBody, ApiResponse } from '@nestjs/swagger';

@Controller('cv')
export class CvController {
  constructor(private readonly cvService: CvService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
  schema: {
    type: 'object',
    properties: {
      file: { type: 'string', format: 'binary' }
    }
  }
  })
  async uploadCV(@UploadedFile() file: Express.Multer.File) {
    return this.cvService.uploadCV(file);
  }

  @Post('suggest-fixes')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        jobOffer: { type: 'string' }
      }
    }
  })
  suggestFixes(
    @UploadedFile() file: Express.Multer.File,
    @Body('jobOffer') jobOffer: string,
  ) {
    return this.cvService.suggestAtsFixes(file, jobOffer);
  }



  @Post('optimize')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        jd_text: { type: 'string' },
        required_skills: { type: 'string', description: 'JSON array e.g. ["Python","Docker"]' },
        user_profile: { type: 'string', description: 'JSON object' },
        profileId: { type: 'string', description: 'UUID of the user profile for saving CV' }
      }
    }
  })

  async optimize(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: any,
    // @Res() res: Response,
  ) {
    console.log('🔍 Optimize endpoint called with:', { profileId: dto.profileId, hasFile: !!file, jdLength: dto.jd_text?.length });
    
    if (!dto.profileId) {
      console.warn('⚠️  WARNING: profileId is missing from request body');
    }
    
    // const pdf = await this.cvService.optimizeCV(file, dto);
    // res.set({
    //   'Content-Type': 'application/pdf',
    //   'Content-Disposition': 'attachment; filename="cv-optimized.pdf"',
    // });
    // res.send(pdf);
    return this.cvService.optimizeCV(file, dto, dto.profileId);
  }

  // @Post('generate')
  // // async generate(@Body() dto: CvEntity, @Res() res: Response) {
  // //   const pdf = await this.cvService.generateFromScratch(dto);
  // //   res.set({
  // //     'Content-Type': 'application/pdf',
  // //     'Content-Disposition': 'attachment; filename="cv.pdf"',
  // //   });
  // //   res.end(pdf);
  // // }
  // async generate(@Body() dto: any) {
  //   return this.cvService.generateFromScratch(dto);
  // }


@Post('generate-pdf')
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      optimized_cv: {
        type: 'object',
        description: 'The optimized CV object returned from /cv/optimize endpoint',
      },
      candidate_name: {
        type: 'string',
        description: 'The name of the candidate (optional)',
        example: 'John Doe'
      },
      personal_info: {
        type: 'object',
        description: 'Extracted personal info (email, phone, linkedin, github)',
        example: {
          email: "nameFamilyname@gmail.com",
          phone: "99 999 9999",
          linkedin: "linkedin.com/in/name-familyname",
          github: "github.com/name-familyname"
        }
      }
    },
    required: ['optimized_cv']
  }
})
@ApiResponse({
  status: 200,
  description: 'PDF file generated successfully',
  content: { 'application/pdf': {} }
})
async generatePdf(@Body() dto: any, @Res() res: Response) {
  if (!dto.optimized_cv) {
    throw new Error('optimized_cv is required in request body');
  }
  const pdfBuffer = await this.cvService.generatePdf(
    dto.optimized_cv,
    dto.candidate_name || 'Candidate',
    dto.personal_info || {}
  );
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment; filename="cv-optimized.pdf"',
    'Content-Length': pdfBuffer.length,
  });
  res.end(pdfBuffer);
}

// Add these to cv.controller.ts

@Post('generate-from-profile')
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      profileId: { type: 'string', description: 'UUID of the user profile' },
      jobTitle: { type: 'string', description: 'Optional target job title' },
      jobDescription: { type: 'string', description: 'Optional full job description for targeted CV' },
      force: { type: 'boolean', description: 'Generate even if profile is incomplete (default: false)' }
    },
    required: ['profileId']
  }
})
async generateFromProfile(@Body() dto: { profileId: string; jobTitle?: string; jobDescription?: string; force?: boolean }) {
  if (!dto.profileId || typeof dto.profileId !== 'string') {
    throw new Error('profileId must be a valid string');
  }
  
  // Validate UUID format (36 chars: 8-4-4-4-12 hex digits with hyphens)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(dto.profileId)) {
    throw new Error('profileId must be a valid UUID format (e.g., 550e8400-e29b-41d4-a716-446655440000). Your UUID appears to be incomplete or malformed.');
  }
  
  return this.cvService.generateFromProfile(dto.profileId, dto.jobTitle, dto.jobDescription, dto.force ?? false);
}

@Get('my-cvs/:profileId')
async getUserCvs(@Param('profileId') profileId: string) {
  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(profileId)) {
    throw new Error('profileId must be a valid UUID format');
  }
  return this.cvService.getUserCvs(profileId);
}

@Get(':id/:profileId')
async getCvById(
  @Param('id') id: string,
  @Param('profileId') profileId: string
) {
  // Validate UUID format for both parameters
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id) || !uuidRegex.test(profileId)) {
    throw new Error('Both id and profileId must be valid UUID format');
  }
  return this.cvService.getCvById(id, profileId);
}
}
