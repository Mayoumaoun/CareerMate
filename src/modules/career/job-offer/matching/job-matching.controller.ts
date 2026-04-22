import { Body, Controller, Param, Post } from '@nestjs/common';
import { JobMatchingService } from './job-matching.service';
import { RunJobMatchingDto } from './dto/run-job-matching.dto';
import { SyncJobSourcesDto } from './dto/sync-job-sources.dto';

@Controller('job-matching')
export class JobMatchingController {
  constructor(
    private readonly jobMatchingService: JobMatchingService,
  ) {}

  @Post('users/:userId/sources/sync')
  syncSourcesForUser(@Param('userId') userId: string, @Body() dto: SyncJobSourcesDto) {
    return this.jobMatchingService.syncJobSources({
      ...dto,
      userId,
    });
  }

  @Post('users/:userId/match')
  matchUser(@Param('userId') userId: string, @Body() dto: RunJobMatchingDto) {
    return this.jobMatchingService.matchUser(userId, dto);
  }
}