import { Body, Controller, Get, Post, Req, UnauthorizedException } from '@nestjs/common';
import { CandidatureService } from './candidature.service';
import { CreateCandidatureDto } from './dto/create-candidature.dto';

@Controller('candidatures')
export class CandidatureController {
  constructor(private readonly candidatureService: CandidatureService) {}

  @Post()
  apply(@Req() req: { user?: { userId?: string } }, @Body() dto: CreateCandidatureDto) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User ID not found in token');
    }
    return this.candidatureService.apply(userId, dto.jobOfferId);
  }

  @Get('me')
  listMine(@Req() req: { user?: { userId?: string } }) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User ID not found in token');
    }
    return this.candidatureService.listForUser(userId);
  }
}
