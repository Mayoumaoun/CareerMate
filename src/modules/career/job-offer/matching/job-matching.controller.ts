import { Body, Controller, Post, Request, UnauthorizedException } from '@nestjs/common';
import { JobMatchingService } from './job-matching.service';
import { RunJobMatchingDto } from './dto/run-job-matching.dto';
import { SyncJobSourcesDto } from './dto/sync-job-sources.dto';

@Controller('job-matching')
export class JobMatchingController {
  constructor(
    private readonly jobMatchingService: JobMatchingService,
  ) {}

  @Post('sources/sync')
  syncSourcesForUser(@Request() req: any, @Body() dto: SyncJobSourcesDto) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User ID not found in token');
    }
    return this.jobMatchingService.syncJobSources({
      ...dto,
      userId,
    });
  }

  @Post('match')
  matchUser(@Request() req: any, @Body() dto: RunJobMatchingDto) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User ID not found in token');
    }
    return this.jobMatchingService.matchUser(userId, dto);
  }
}