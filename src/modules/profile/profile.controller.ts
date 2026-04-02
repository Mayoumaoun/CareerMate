import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  UseFilters,
  UsePipes,
  HttpStatus,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileEntity } from './entities/profile.entity';
import { CreateProfileDto } from './dtos/create-profile.dto';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { Step1PersonalInfoDto } from './dtos/step1-personal-info.dto';
import { Step2EducationDto } from './dtos/step2-education.dto';
import { Step3SkillsDto } from './dtos/step3-skills.dto';
import { Step4ExperiencesDto } from './dtos/step4-experiences.dto';
import { Step5ProjectsDto } from './dtos/step5-projects.dto';
import { Step6LanguagesDto } from './dtos/step6-languages.dto';
import { Step7CertificationsDto } from './dtos/step7-certifications.dto';
import { ValidateDatesPipe } from './pipes/validate-dates.pipe';
import { ValidateSkillsPipe } from './pipes/validate-skills.pipe';
import { ValidateAgeMinimumPipe } from './pipes/validate-age-minimum.pipe';

@Controller('profile')
@UsePipes(new ValidationPipe({ whitelist: true }))
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  /**
   * Create complete profile in one go (all steps at once)
   * POST /profile
   */
  @Post()
  async createCompleteProfile(
    @Body()
    createProfileDto: CreateProfileDto,
  ): Promise<ProfileEntity> {
    return await this.profileService.createCompleteProfile(
      '1',
      createProfileDto,
    );
  }


  @Get(':userId')
  async getProfile(@Param('userId') userId: string): Promise<ProfileEntity> {
    return await this.profileService.getProfile(userId);
  }


  @Get(':userId/summary')
  async getProfileSummary(@Param('userId') userId: string): Promise<{ profileScore: number; completionPercentage: number; summary: any }> {
    return await this.profileService.getProfileSummary(userId);
  }

  /**
   * Update complete profile at once (all steps together)
   * PUT /profile/:userId
   */
  @Put(':userId')
  async updateCompleteProfile(
    @Param('userId') userId: string,
    @Body()
    updateProfileDto: UpdateProfileDto,
  ): Promise<ProfileEntity> {
    return await this.profileService.updateCompleteProfile(
      userId,
      updateProfileDto,
    );
  }
  
  @Put('step/1')
  async updateStep1(
    @Body(ValidateAgeMinimumPipe)
    step1Data: Step1PersonalInfoDto,
  ): Promise<ProfileEntity> {
    return await this.profileService.updateProfileStep(
      '1',
      1,
      step1Data,
    );
  }

  @Put('step/2')
  async updateStep2(
    @Body(ValidateDatesPipe)
    step2Data: Step2EducationDto,
  ): Promise<ProfileEntity> {
    return await this.profileService.updateProfileStep(
      '1',
      2,
      step2Data,
    );
  }

  
  @Put('step/3')
  async updateStep3(
    @Body(ValidateSkillsPipe)
    step3Data: Step3SkillsDto,
  ): Promise<ProfileEntity> {
    return await this.profileService.updateProfileStep(
      '1',
      3,
      step3Data,
    );
  }


  @Put('step/4')
  async updateStep4(
    @Body(ValidateDatesPipe)
    step4Data: Step4ExperiencesDto,
  ): Promise<ProfileEntity> {
    return await this.profileService.updateProfileStep(
      '1',
      4,
      step4Data,
    );
  }

  @Put('step/5')
  async updateStep5(
    @Body()
    step5Data: Step5ProjectsDto,
  ): Promise<ProfileEntity> {
    return await this.profileService.updateProfileStep(
      '1',
      5,
      step5Data,
    );
  }

  @Put('step/6')
  async updateStep6(
    @Body()
    step6Data: Step6LanguagesDto,
  ): Promise<ProfileEntity> {
    return await this.profileService.updateProfileStep(
      '1',
      6,
      step6Data,
    );
  }

 
  @Put('step/7')
  async updateStep7(
    @Body()
    step7Data: Step7CertificationsDto,
  ): Promise<ProfileEntity> {
    return await this.profileService.updateProfileStep(
      '1',
      7,
      step7Data,
    );
  }
}
