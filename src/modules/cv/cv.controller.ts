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

@Controller('cv')
export class CvController {
  constructor(private readonly cvService: CvService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCV(@UploadedFile() file: Express.Multer.File) {
    return this.cvService.uploadCV(file);
  }

  @Post('suggest-fixes')
  @UseInterceptors(FileInterceptor('file'))
  suggestFixes(
    @UploadedFile() file: Express.Multer.File,
    @Body('jobOffer') jobOffer: string,
  ) {
    return this.cvService.suggestAtsFixes(file, jobOffer);
  }

  @Post('optimize')
  @UseInterceptors(FileInterceptor('file'))
  async optimize(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CvEntity,
    @Res() res: Response,
  ) {
    const pdf = await this.cvService.optimizeCV(file, dto);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="cv-optimized.pdf"',
    });
    res.send(pdf);
  }

  @Post('generate')
  async generate(@Body() dto: CvEntity, @Res() res: Response) {
    const pdf = await this.cvService.generateFromScratch(dto);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="cv.pdf"',
    });
    res.end(pdf);
  }
}
