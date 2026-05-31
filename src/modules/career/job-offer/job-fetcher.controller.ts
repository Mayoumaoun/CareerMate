import { Controller, Post, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JobFetcherService } from './services/job-fetcher.service';

@ApiTags('Admin / Job Synchronisation')
@Controller('admin/jobs')
export class JobFetcherController {
  private readonly logger = new Logger(JobFetcherController.name);

  constructor(private readonly jobFetcherService: JobFetcherService) {}

  @Post('sync-jsearch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually trigger the JSearch background job fetcher' })
  @ApiResponse({ status: 200, description: 'JSearch sync started successfully' })
  async triggerJSearch() {
    this.logger.log('Manual trigger: JSearch sync');
    // We do not await this to prevent blocking the HTTP response if the scraping takes minutes
    this.jobFetcherService.handleJSearchCron().catch((err) => {
        this.logger.error('Error during manual JSearch sync', err);
    });
    return { message: 'JSearch sync started successfully in the background.' };
  }

  @Post('sync-keejobs')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually trigger the Keejobs background job fetcher' })
  @ApiResponse({ status: 200, description: 'Keejobs sync started successfully' })
  async triggerKeejobs() {
    this.logger.log('Manual trigger: Keejobs sync');
    // We do not await this to prevent blocking the HTTP response
    this.jobFetcherService.handleKeejobsCron().catch((err) => {
        this.logger.error('Error during manual Keejobs sync', err);
    });
    return { message: 'Keejobs sync started successfully in the background.' };
  }
}
