import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileEntity } from './entities/profile.entity';
import { ProjectEntity } from './entities/projet.entity';
import { CvEntity } from './entities/cv.entity';
import { CreateProfileDto } from './dtos/create-profile.dto';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import * as jsonSchemas from 'src/common/types/json-schemas';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(ProfileEntity)
    private readonly profileRepository: Repository<ProfileEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
  ) {}

 
  async createCompleteProfile(
    userId: string,
    profileData: CreateProfileDto,
  ): Promise<any> {
    try {
      const skills = profileData.step3.skills.map(skill => ({
        name: skill.name,
        level: skill.level || 'intermediate',
      })) as jsonSchemas.SkillItem[];

      const education: any[] = profileData.step2.education.map(edu => ({
        degree: edu.degree,
        institution: edu.institution,
        field: edu.field,
        startDate: edu.startDate,
        endDate: edu.endDate || edu.startDate,
      })) as jsonSchemas.EducationItem[];

      // experiences   
      const experiences: any[] = profileData.step4.experiences.map(exp => ({
        title: exp.title,
        company: exp.company,
        location: exp.location || '',
        startDate: exp.startDate,
        endDate: exp.endDate || exp.startDate,
        description: exp.description,
      })) as jsonSchemas.ExperienceItem[];

      // languages array
      const languages: jsonSchemas.LanguageItem[] = profileData.step6.languages;

      // certifications array
      const certifications: any[] = profileData.step7.certifications.map(cert => ({
        name: cert.name,
        date: cert.date,
        context: cert.context || '',
        domain: cert.domain || '',
        organization: cert.organization,
        url: cert.url,
      })) as jsonSchemas.CertificationItem[];

      // Create profile object
      const profileData_obj: any = {
        bio: profileData.bio || this.generateDefaultBio(profileData.step1),
        userLevel: profileData.step2.userLevel,
        skills,
        experiences,
        education,
        languages,
        certifications,
        profilScore: this.calculateInitialProfileScore(profileData),
      };

      // Create and save profile
      const profile = this.profileRepository.create(profileData_obj);
      const savedProfile = await this.profileRepository.save(profile);

      // Create projects associated with this profile
      if (profileData.step5.projects && profileData.step5.projects.length > 0) {
        const projects = profileData.step5.projects.map(projectData =>
          this.projectRepository.create({
            title: projectData.title,
            context: projectData.context,
            description: projectData.description,
            techStack: projectData.techStack || [],
            projectUrl: projectData.projectUrl || '',
            date: projectData.date ? new Date(projectData.date) : new Date(),
            profile: savedProfile,
          } as any),
        ) as any[];
        await this.projectRepository.save(projects);
      }

      return savedProfile;
    } catch (error) {
      throw new BadRequestException(
        `Failed to create profile: ${error.message}`,
      );
    }
  }


  async getProfile(userId: string): Promise<any> {
    const profile = await this.profileRepository.findOne({
      where: { id: userId },
      relations: ['projects', 'cvs'],
    } as any);

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
  }


  async updateProfileStep(
    userId: string,
    step: number,
    stepData: any,
  ): Promise<any> {
    const profile = await this.getProfile(userId);

    switch (step) {
      case 1:
        profile.bio = stepData.bio || this.generateDefaultBio(stepData);
        break;
      case 2:
        profile.userLevel = stepData.userLevel;
        const education = stepData.education.map((edu: any) => ({
          degree: edu.degree,
          institution: edu.institution,
          field: edu.field,
          startDate: edu.startDate,
          endDate: edu.endDate || edu.startDate,
          location: edu.location || '',
        }));
        profile.education = education;
        break;
      case 3:
        profile.skills = stepData.skills.map((skill: any) => ({
          name: skill.name,
          category: skill.category,
          level: skill.level || 'intermediate',
        }));
        break;
      case 4:
        const experiences = stepData.experiences.map((exp: any) => ({
          title: exp.title,
          company: exp.company,
          location: exp.location || '',
          startDate: exp.startDate,
          endDate: exp.endDate || exp.startDate,
          description: exp.description,
        }));
        profile.experiences = experiences;
        break;
      case 5:
        // Projects are handled separately
        await this.updateProjects(userId, stepData.projects);
        break;
      case 6:
        profile.languages = stepData.languages;
        break;
      case 7:
        const certifications = stepData.certifications.map((cert: any) => ({
          name: cert.name,
          date: cert.date,
          context: cert.context || '',
          domain: cert.domain || '',
          organization: cert.organization,
          url: cert.url,
        }));
        profile.certifications = certifications;
        break;
      default:
        throw new BadRequestException(`Invalid step number: ${step}`);
    }

    profile.profilScore = await this.calculateProfileScore(profile);
    return this.profileRepository.save(profile);
  }

  
  async updateProjects(userId: string, projects: any[]): Promise<void> {
    const profile = await this.getProfile(userId);

    // Delete existing projects
    await this.projectRepository.delete({ profile: { id: profile.id } } as any);

    // Create new projects
    if (projects && projects.length > 0) {
      const newProjects = projects.map(projectData =>
        this.projectRepository.create({
          title: projectData.title,
          context: projectData.context,
          description: projectData.description,
          techStack: projectData.techStack || [],
          projectUrl: projectData.projectUrl || '',
          imageUrl: projectData.imageUrl || '',
          date: projectData.date ? new Date(projectData.date) : new Date(),
          profile,
        } as any),
      );
      await this.projectRepository.save(newProjects as any);
    }
  }

  
  async getProfileSummary(userId: string): Promise<any> {
    const profile = await this.profileRepository.findOne({
      where: { id: userId },
      relations: ['projects'],
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const projects = await this.projectRepository.find({
      where: { profile: { id: profile.id } },
    });

    return {
      profileScore: profile.profilScore,
      completionPercentage: this.calculateCompletionPercentage(profile),
      summary: {
        personalInfo: this.getPersonalInfoSummary(profile),
        education: profile.education,
        skills: profile.skills,
        experiences: profile.experiences,
        projects,
        languages: profile.languages,
        certifications: profile.certifications,
        goals: {
          shortTerm: profile.shortTermGoals,
          longTerm: profile.longTermGoals,
        },
      },
    };
  }

 
  async updateCompleteProfile(
    userId: string,
    profileData: UpdateProfileDto,
  ): Promise<any> {
    try {
      const profile = await this.getProfile(userId);

      // Update skills if provided
      if (profileData.step3 && profileData.step3.skills) {
        profile.skills = profileData.step3.skills.map(skill => ({
          name: skill.name,
          level: skill.level || 'intermediate',
        })) as jsonSchemas.SkillItem[];
      }

      // Update education if provided
      if (profileData.step2 && profileData.step2.education) {
        profile.education = profileData.step2.education.map(edu => ({
          degree: edu.degree,
          institution: edu.institution,
          field: edu.field,
          startDate: edu.startDate,
          endDate: edu.endDate || edu.startDate,
        })) as jsonSchemas.EducationItem[];
      }

      // Update experiences if provided
      if (profileData.step4 && profileData.step4.experiences) {
        profile.experiences = profileData.step4.experiences.map(exp => ({
          title: exp.title,
          company: exp.company,
          location: exp.location || '',
          startDate: exp.startDate,
          endDate: exp.endDate || exp.startDate,
          description: exp.description,
        })) as jsonSchemas.ExperienceItem[];
      }

      // Update languages if provided
      if (profileData.step6 && profileData.step6.languages) {
        profile.languages = profileData.step6.languages;
      }

      // Update certifications if provided
      if (profileData.step7 && profileData.step7.certifications) {
        profile.certifications = profileData.step7.certifications.map(cert => ({
          name: cert.name,
          date: cert.date,
          context: cert.context || '',
          domain: cert.domain || '',
          organization: cert.organization,
          url: cert.url,
        })) as jsonSchemas.CertificationItem[];
      }

      // Update user level if provided
      if (profileData.step2 && profileData.step2.userLevel) {
        profile.userLevel = profileData.step2.userLevel;
      }

      // Update bio if provided
      if (profileData.bio) {
        profile.bio = profileData.bio;
      } else if (profileData.step1) {
        profile.bio = this.generateDefaultBio(profileData.step1);
      }

      // Update targetPosition if provided
      if (profileData.targetPosition) {
        profile.targetPosition = profileData.targetPosition;
      }

      // Update goals if provided
      if (profileData.shortTermGoals) {
        profile.shortTermGoals = profileData.shortTermGoals;
      }
      if (profileData.longTermGoals) {
        profile.longTermGoals = profileData.longTermGoals;
      }

      // Recalculate profile score
      profile.profilScore = await this.calculateProfileScore(profile);

      // Save updated profile
      const updatedProfile = await this.profileRepository.save(profile);

      // Update projects if provided
      if (profileData.step5 && profileData.step5.projects && profileData.step5.projects.length > 0) {
        // Delete existing projects
        await this.projectRepository.delete({ profile: { id: userId } });

        // Create and save new projects
        const projects = profileData.step5.projects.map(projectData =>
          this.projectRepository.create({
            title: projectData.title,
            context: projectData.context,
            description: projectData.description,
            techStack: projectData.techStack || [],
            projectUrl: projectData.projectUrl || '',
            date: projectData.date ? new Date(projectData.date) : new Date(),
            profile: updatedProfile,
          } as any),
        ) as any[];
        await this.projectRepository.save(projects);
      }

      return updatedProfile;
    } catch (error) {
      throw new BadRequestException(
        `Failed to update profile: ${error.message}`,
      );
    }
  }

  // Helpers
  private generateDefaultBio(personalInfo: any): string {
    return `${'Hi! I\'m'} ${personalInfo.firstName} ${personalInfo.lastName}${'.'} ${'I\'m currently based in'} ${personalInfo.city}, ${personalInfo.country}`;
  }

  private calculateInitialProfileScore(profileData: CreateProfileDto): number {
    let score = 0;

    // Personal info (20 points max)
    if (profileData.step1) score += 20;

    // Education (15 points max)
    if (profileData.step2?.education?.length > 0) score += 15;

    // Skills (20 points max)
    if (profileData.step3?.skills?.length > 0) {
      score += Math.min(20, profileData.step3.skills.length * 2);
    }

    // Experiences (20 points max)
    if (profileData.step4?.experiences?.length > 0) {
      score += Math.min(20, profileData.step4.experiences.length * 5);
    }

    // Projects (15 points max)
    if (profileData.step5?.projects?.length > 0) {
      score += Math.min(15, profileData.step5.projects.length * 3);
    }

    // Languages (5 points max)
    if (profileData.step6?.languages?.length > 0) {
      score += Math.min(5, profileData.step6.languages.length);
    }

    // Certifications (5 points max)
    if (profileData.step7?.certifications?.length > 0) {
      score += Math.min(5, profileData.step7.certifications.length);
    }

    return Math.min(score, 100); // Cap at 100
  }

  private async calculateProfileScore(profile: ProfileEntity): Promise<number> {
    let score = 0;

    // Bio (10 points)
    if (profile.bio && profile.bio.length > 20) score += 10;

    // Education (15 points)
    if (Array.isArray(profile.education) && profile.education.length > 0) {
      score += 15;
    }

    // Skills (20 points)
    if (Array.isArray(profile.skills) && profile.skills.length > 0) {
      score += Math.min(20, profile.skills.length * 2);
    }

    // Experiences (20 points)
    if (
      Array.isArray(profile.experiences) &&
      profile.experiences.length > 0
    ) {
      score += Math.min(20, profile.experiences.length * 5);
    }

    // Languages (10 points)
    if (Array.isArray(profile.languages) && profile.languages.length > 0) {
      score += 10;
    }

    // Certifications (5 points)
    if (
      Array.isArray(profile.certifications) &&
      profile.certifications.length > 0
    ) {
      score += 5;
    }

    // Goals (10 points)
    if (
      profile.shortTermGoals &&
      profile.shortTermGoals.length > 0 &&
      profile.longTermGoals &&
      profile.longTermGoals.length > 0
    ) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  private calculateCompletionPercentage(profile: ProfileEntity): number {
    let completedItems = 0;
    const totalItems = 7;

    // Check each step
    if (profile.bio && profile.bio.length > 0) completedItems++;
    if (Array.isArray(profile.education) && profile.education.length > 0)
      completedItems++;
    if (Array.isArray(profile.skills) && profile.skills.length > 0)
      completedItems++;
    if (Array.isArray(profile.experiences) && profile.experiences.length > 0)
      completedItems++;
    completedItems++;
    if (Array.isArray(profile.languages) && profile.languages.length > 0)
      completedItems++;
    if (Array.isArray(profile.certifications) && profile.certifications.length > 0)
      completedItems++;

    return Math.round((completedItems / totalItems) * 100);
  }

  private getPersonalInfoSummary(profile: ProfileEntity): any {
    return {
      id: profile.id,
      createdAt: profile.createdAt,
      userLevel: profile.userLevel,
    };
  }
}
