import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { EntretienService } from './services/entretien.service';
import { CreateEntretienDto } from './dto/create-entretien.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
// import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
// @UseGuards(JwtAuthGuard)
@Controller('entretien')
export class EntretienController {
  constructor(private entretienService: EntretienService) {}

  // Démarrer un entretien
  @Post('start')
  start(@Req() req, @Body() dto: CreateEntretienDto) {
    return this.entretienService.start(req.user.id, dto);
  }

  // Question courante en texte
  @Get(':id/question')
  getCurrentQuestion(@Req() req, @Param('id') id: string) {
    return this.entretienService.getCurrentQuestion(id, req.user.id);
  }

  // Question courante en audio (Edge TTS)
  @Get(':id/question/audio')
  async getCurrentQuestionAudio(
    @Req() req,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const audio = await this.entretienService.getCurrentQuestionAudio(
      id,
      req.user.id,
    );
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(audio);
  }

  // Soumettre une réponse texte
  @Post(':id/answer')
  submitAnswer(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.entretienService.submitAnswer(id, req.user.id, dto);
  }

  // Soumettre une réponse audio
  @Post(':id/answer/audio')
  @UseInterceptors(FileInterceptor('audio'))
  async submitAudioAnswer(
    @Req() req,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('durationSeconds') durationSeconds?: number,
  ) {
    return this.entretienService.submitAudioAnswer(
      id,
      req.user.id,
      file.buffer,
      durationSeconds,
    );
  }

  // Rapport final
  @Get(':id/report')
  getReport(@Req() req, @Param('id') id: string) {
    return this.entretienService.getReport(id, req.user.id);
  }

  // Historique
  @Get()
  findAll(@Req() req) {
    return this.entretienService.findAll(req.user.id);
  }

  // Supprimer
  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
      return this.entretienService.remove(id, req.user.id);

  }
}
