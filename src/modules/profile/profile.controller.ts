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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody, ApiUnauthorizedResponse, ApiBadRequestResponse,} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProfileService } from './profile.service';
import { CvParserService } from './services/cv-parser.service';
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
import { ImportCVResponseDto } from './dtos/import-cv.dto';
import { ValidateDatesPipe } from './pipes/validate-dates.pipe';
import { ValidateSkillsPipe } from './pipes/validate-skills.pipe';
import { ValidateAgeMinimumPipe } from './pipes/validate-age-minimum.pipe';
import { ValidateTargetProfilePipe } from './pipes/validate-target-profile.pipe';
import { TargetProfileValidationDto } from './dtos/target-profile-validation.dto';

@ApiTags('profile')
@ApiBearerAuth()
@Controller('profile')
@UsePipes(new ValidationPipe({ whitelist: true }), new ValidateTargetProfilePipe())
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly cvParserService: CvParserService,
  ) {}


  @ApiOperation({ summary: 'Create user profile' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Profile created successfully.', type: ProfileEntity })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Invalid profile payload' })
  @ApiBody({ type: CreateProfileDto })
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


  @ApiOperation({ summary: 'Get authenticated user profile' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User profile returned successfully.', type: ProfileEntity })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @Get()
  async getProfile(@Req() request: any): Promise<ProfileEntity> {
    const userId = request.user.userId;
    return await this.profileService.getProfile(userId);
  }


  @ApiOperation({ summary: 'Get profile summary' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Profile summary returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @Get('summary')
  async getProfileSummary(@Req() request: any): Promise<{ profileScore: number; completionPercentage: number; summary: any }> {
    const userId = request.user.userId;
    return await this.profileService.getProfileSummary(userId);
  }

  /**
   * Import CV et retourner les données parsées
   * POST /profile/import-cv
   */
  @ApiOperation({ summary: 'Import CV and parse data' })
  @ApiResponse({ status: HttpStatus.OK, description: 'CV imported and parsed successfully.', type: ImportCVResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Invalid file or parsing error' })
  @Post('import-cv')
  @UseInterceptors(FileInterceptor('file'))
  async importCV(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ImportCVResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    console.log('[Profile Controller] 📤 CV import started');
    console.log('[Profile Controller] File:', {
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    });

    const result = await this.cvParserService.importCV(file);
    console.log('[Profile Controller] ✅ CV import completed');
    return result;
  }

  
 
  @ApiOperation({ summary: 'Update complete profile' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Profile updated successfully.', type: ProfileEntity })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Invalid profile payload' })
  @ApiBody({ type: UpdateProfileDto })
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
  
  @ApiOperation({ summary: 'Update profile step 1' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Profile step 1 updated successfully.', type: ProfileEntity })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Invalid step 1 payload' })
  @ApiBody({ type: Step1PersonalInfoDto })
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

  @ApiOperation({ summary: 'Update profile step 2' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Profile step 2 updated successfully.', type: ProfileEntity })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Invalid step 2 payload' })
  @ApiBody({ type: Step2EducationDto })
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

  
  @ApiOperation({ summary: 'Update profile step 3' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Profile step 3 updated successfully.', type: ProfileEntity })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Invalid step 3 payload' })
  @ApiBody({ type: Step3SkillsDto })
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


  @ApiOperation({ summary: 'Update profile step 4' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Profile step 4 updated successfully.', type: ProfileEntity })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Invalid step 4 payload' })
  @ApiBody({ type: Step4ExperiencesDto })
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

  @ApiOperation({ summary: 'Update profile step 5' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Profile step 5 updated successfully.', type: ProfileEntity })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Invalid step 5 payload' })
  @ApiBody({ type: Step5ProjectsDto })
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

  @ApiOperation({ summary: 'Update profile step 6' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Profile step 6 updated successfully.', type: ProfileEntity })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Invalid step 6 payload' })
  @ApiBody({ type: Step6LanguagesDto })
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

 
  @ApiOperation({ summary: 'Update profile step 7' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Profile step 7 updated successfully.', type: ProfileEntity })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Invalid step 7 payload' })
  @ApiBody({ type: Step7CertificationsDto })
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

  @ApiOperation({ summary: 'Update profile step 8' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Profile step 8 updated successfully.', type: ProfileEntity })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Invalid step 8 payload' })
  @ApiBody({ type: TargetProfileValidationDto })
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
