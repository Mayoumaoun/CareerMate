import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { JobOfferService } from './job-offer.service';
import { MatchResultDto } from './dto/match-result.dto';
import { MatchQueryDto } from './dto/match-query.dto';
import { UpdateJobOfferDto } from './dto/update-job-offer.dto';
import { CreateJobOfferDto } from './dto/create-job-offer.dto';

@Controller('job-offer')
export class JobOfferController {
  constructor(private readonly jobOfferService: JobOfferService) {}

  @Post()
  create(@Body() createJobOfferDto: CreateJobOfferDto) {
    return this.jobOfferService.create(createJobOfferDto);
  }

  @Get()
  findAll() {
    return this.jobOfferService.findAll();
  }

  @Get(':profileId')
  async getMatches(
    @Param('profileId') profileId: string,
    @Query() query: MatchQueryDto,
  ): Promise<MatchResultDto[]> {
    return this.jobOfferService.matchForProfile(profileId, query);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateJobOfferDto: UpdateJobOfferDto) {
    return this.jobOfferService.update(id, updateJobOfferDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.jobOfferService.remove(id);
  }
}

