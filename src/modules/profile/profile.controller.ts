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
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
import { ValidateTargetProfilePipe } from './pipes/validate-target-profile.pipe';
import { TargetProfileValidationDto } from './dtos/target-profile-validation.dto';

@Controller('profile')
@UsePipes(new ValidationPipe({ whitelist: true }), new ValidateTargetProfilePipe())
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}


  @Post()
  async createProfile(
    @Req() request: any,
    @Body()
    createProfileDto: CreateProfileDto,
  ): Promise<ProfileEntity> {
    const userId = request.user.userId;
    return await this.profileService.createProfile(
      userId,
      createProfileDto,
    );
  }


  @Get()
  async getProfile(@Req() request: any): Promise<ProfileEntity> {
    const userId = request.user.userId;
    return await this.profileService.getProfile(userId);
  }


  @Get('summary')
  async getProfileSummary(@Req() request: any): Promise<{ profileScore: number; completionPercentage: number; summary: any }> {
    const userId = request.user.userId;
    return await this.profileService.getProfileSummary(userId);
  }

  
 
  @Put()
  async updateCompleteProfile(
    @Req() request: any,
    @Body()
    updateProfileDto: UpdateProfileDto,
  ): Promise<ProfileEntity> {
    const userId = request.user.userId;
    return await this.profileService.updateCompleteProfile(
      userId,
      updateProfileDto,
    );
  }
  
  @Put('step/1')
  async updateStep1(
    @Req() request: any,
    @Body(ValidateAgeMinimumPipe)
    step1Data: Step1PersonalInfoDto,
  ): Promise<ProfileEntity> {
    const userId = request.user.userId;
    return await this.profileService.updateProfileStep(
      userId,
      1,
      step1Data,
    );
  }

  @Put('step/2')
  async updateStep2(
    @Req() request: any,
    @Body(ValidateDatesPipe)
    step2Data: Step2EducationDto,
  ): Promise<ProfileEntity> {
    const userId = request.user.userId;
    return await this.profileService.updateProfileStep(
      userId,
      2,
      step2Data,
    );
  }

  
  @Put('step/3')
  async updateStep3(
    @Req() request: any,
    @Body(ValidateSkillsPipe)
    step3Data: Step3SkillsDto,
  ): Promise<ProfileEntity> {
    const userId = request.user.userId;
    return await this.profileService.updateProfileStep(
      userId,
      3,
      step3Data,
    );
  }


  @Put('step/4')
  async updateStep4(
    @Req() request: any,
    @Body(ValidateDatesPipe)
    step4Data: Step4ExperiencesDto,
  ): Promise<ProfileEntity> {
    const userId = request.user.userId;
    return await this.profileService.updateProfileStep(
      userId,
      4,
      step4Data,
    );
  }

  @Put('step/5')
  async updateStep5(
    @Req() request: any,
    @Body()
    step5Data: Step5ProjectsDto,
  ): Promise<ProfileEntity> {
    const userId = request.user.userId;
    return await this.profileService.updateProfileStep(
      userId,
      5,
      step5Data,
    );
  }

  @Put('step/6')
  async updateStep6(
    @Req() request: any,
    @Body()
    step6Data: Step6LanguagesDto,
  ): Promise<ProfileEntity> {
    const userId = request.user.userId;
    return await this.profileService.updateProfileStep(
      userId,
      6,
      step6Data,
    );
  }

 
  @Put('step/7')
  async updateStep7(
    @Req() request: any,
    @Body()
    step7Data: Step7CertificationsDto,
  ): Promise<ProfileEntity> {
    const userId = request.user.userId;
    return await this.profileService.updateProfileStep(
      userId,
      7,
      step7Data,
    );
  }

  @Put('step/8')
  async updateStep8(
    @Req() request: any,
    @Body()
    step8Data: TargetProfileValidationDto,
  ): Promise<ProfileEntity> {
    const userId = request.user.userId;
    return await this.profileService.updateProfileStep(
      userId,
      8,
      step8Data,
    );
  }
}
