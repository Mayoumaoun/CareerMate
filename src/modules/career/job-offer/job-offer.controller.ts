import { Controller, Get, Param, Query, UseGuards, Req, Logger, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { JobOfferService, JobSearchFilters } from './job-offer.service';
import { JobSearchResponseDto } from './dto/job.dto';
import { MatchResultDto } from './dto/match-result.dto';
import { ProfileEntity } from '../../profile/entities/profile.entity';

@ApiTags('Job Offers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('job-offer') // Changed from 'jobs' to 'job-offer' to match frontend integration docs
export class JobOfferController {
  private readonly logger = new Logger(JobOfferController.name);

  constructor(
    private readonly jobOfferService: JobOfferService,
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all job offers' })
  async getAllOffers() {
    return this.jobOfferService.getAllOffers();
  }

  @Get(':profileId')
  @ApiOperation({ summary: 'Get ranked and matched jobs for a specific profile' })
  @ApiQuery({ name: 'skills', required: false, type: [String] })
  @ApiQuery({ name: 'location', required: false, type: [String] })
  @ApiQuery({ name: 'experienceLevel', required: false, type: [String] })
  @ApiQuery({ name: 'salaryMin', required: false, type: Number })
  @ApiQuery({ name: 'salaryMax', required: false, type: Number })
  @ApiResponse({ type: JobSearchResponseDto })
  async getMatchedJobs(
    @Req() req: any,
    @Param('profileId') profileId: string,
    @Query('skills') skills?: string | string[],
    @Query('location') location?: string | string[],
    @Query('experienceLevel') experienceLevel?: string | string[],
    @Query('salaryMin') salaryMin?: number,
    @Query('salaryMax') salaryMax?: number,
  ) {
    let profile = req.user?.profile;
    
    // If the auth strategy didn't eagerly load the profile, fetch it from DB
    if (!profile) {
      const profileRepo = this.dataSource.getRepository(ProfileEntity);
      
      profile = await profileRepo.findOne({
        where: [
          { id: profileId },
          { user: { id: req.user?.userId } }
        ],
        relations: ['user']
      });

      if (!profile) {
        throw new NotFoundException('User profile not found. Please complete your profile first.');
      }
    }

    // Build filters object
    const filters: JobSearchFilters = {};
    if (skills) filters.skills = Array.isArray(skills) ? skills : [skills];
    if (location) filters.location = Array.isArray(location) ? location : [location];
    if (experienceLevel) filters.experienceLevel = Array.isArray(experienceLevel) ? experienceLevel : [experienceLevel];
    if (salaryMin) filters.salaryMin = Number(salaryMin);
    if (salaryMax) filters.salaryMax = Number(salaryMax);

    return this.jobOfferService.searchJobsForProfile(profile, filters);
  }

  @Get(':jobId/match')
  @ApiOperation({ summary: 'Explain match for a specific job offer using LLM' })
  @ApiResponse({ type: MatchResultDto })
  async getMatchExplanation(@Req() req: any, @Param('jobId') jobId: string) {
    let profile = req.user?.profile;
    
    // If the auth strategy didn't eagerly load the profile, fetch it from DB
    if (!profile) {
      const profileRepo = this.dataSource.getRepository(ProfileEntity);
      
      profile = await profileRepo.findOne({
        where: { user: { id: req.user?.userId } },
        relations: ['user']
      });

      if (!profile) {
        throw new NotFoundException('User profile not found. Please complete your profile first.');
      }
    }

    return this.jobOfferService.getMatchExplanation(profile, jobId);
  }
}
