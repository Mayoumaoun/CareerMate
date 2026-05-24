import {
  Controller,
  Post,
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
        user_profile: { type: 'string', description: 'JSON object' }
      }
    }
  })
  async optimize(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CvEntity,
    // @Res() res: Response,
  ) {
    // const pdf = await this.cvService.optimizeCV(file, dto);
    // res.set({
    //   'Content-Type': 'application/pdf',
    //   'Content-Disposition': 'attachment; filename="cv-optimized.pdf"',
    // });
    // res.send(pdf);
    return this.cvService.optimizeCV(file, dto);

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
}
















