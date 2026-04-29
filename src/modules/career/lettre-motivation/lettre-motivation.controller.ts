import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Patch,
  ParseUUIDPipe,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { LettreMotivationService } from './lettre-motivation.service';
import { GenerateLettreMotivationDto } from './dto/generate-lettre-motivation.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FeedbackDto } from './dto/generate-lettre-motivation.dto';
import { PdfExportService } from './pdf-export.service';

@UseGuards(JwtAuthGuard)
@Controller('lettre-motivation')
export class LettreMotivationController {;
  constructor(private lettreMotivationService: LettreMotivationService,private pdfExportService: PdfExportService) {}

  @Post('generate')
  generate(@Body() dto: GenerateLettreMotivationDto, @Req() req) {
    // const TEST_USER_ID = '33333333-3333-3333-3333-333333333333';
    // return this.lettreMotivationService.generate(TEST_USER_ID, dto);
    return this.lettreMotivationService.generate(req.user.id, dto);
  }

  @Get()
  findAll(@Req() req) {
    // const TEST_USER_ID = '33333333-3333-3333-3333-333333333333';
    // return this.lettreMotivationService.findAll(TEST_USER_ID);
    return this.lettreMotivationService.findAll(req.user.id);
  }

  @Patch(':id/feedback')
  feedback(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: FeedbackDto,
    @Req() req,
  ) {
    // const TEST_USER_ID = '33333333-3333-3333-3333-333333333333';
    // return this.lettreMotivationService.addFeedback(id, TEST_USER_ID, dto);
    return this.lettreMotivationService.addFeedback(id, req.user.id, dto);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string, @Req() req) {
    // const TEST_USER_ID = '33333333-3333-3333-3333-333333333333';
    // return this.lettreMotivationService.findOne(id, TEST_USER_ID);
    return this.lettreMotivationService.findOne(id, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string, @Req() req) {
    // const TEST_USER_ID = '33333333-3333-3333-3333-333333333333';
    // return this.lettreMotivationService.remove(id, TEST_USER_ID);
    return this.lettreMotivationService.remove(id, req.user.id);
  }

  @Get(':id/export/pdf')
  async exportPdf(@Req() req, @Param('id') id: string, @Res() res: Response) {
    const lettre = await this.lettreMotivationService.findOne(id, req.user.id);

    const profile = await this.lettreMotivationService.getProfile(req.user.id);
    // const TEST_USER_ID = '33333333-3333-3333-3333-333333333333';
    //     const lettre = await this.lettreMotivationService.findOne(
    //       id,
    //       TEST_USER_ID
    //     );
    //     const profile = await this.lettreMotivationService.getProfile(
    //       TEST_USER_ID
    //     );

    const pdf = await this.pdfExportService.generateCoverLetterPdf(
      lettre.content,
      {
        candidateName: `${profile.firstName} ${profile.lastName}`,
        company: lettre.company ?? '',
        position: lettre.position ?? '',
        city: profile.city,
        phone: profile.phone,
      },
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="cover-letter-${lettre.company}-${lettre.position}.pdf"`,
    );
    res.send(pdf);
  }
}
