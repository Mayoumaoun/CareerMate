import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileEntity } from './entities/profile.entity';
import { ProjectEntity } from './entities/projet.entity';
import { UserEntity } from '../user/entities/user.entity';
import { CreateProfileDto } from './dtos/create-profile.dto';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import * as jsonSchemas from 'src/common/types/json-schemas';
import { RedisService } from '../../common/redis/redis.service';
import { DiplomaDto } from './dtos';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(ProfileEntity)
    private readonly profileRepository: Repository<ProfileEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>, private readonly redis: RedisService
  ) {}

 
  async createProfile(
    userId: string,
    profileData: CreateProfileDto,
  ): Promise<any> {
    try {
      // Load user from database
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Progressive approach: Create profile with ONLY step1
      // Other steps will be added via PUT /profile/step/X
      const profileData_obj: any = {
        bio: profileData.bio || this.generateDefaultBio(profileData.step1),
        userLevel: 'Junior', // Default level (will be updated in step2)
        skills: [],
        experiences: [],
        education: [],
        languages: [],
        certifications: [],
        profilScore: 20, // Initial score for step1 completion
        user, // Associate the user to the profile
        targetProfile: profileData.targetProfile || null,
        firstName: profileData.step1.firstName,
        lastName: profileData.step1.lastName,
        phone: profileData.step1.phone,
        country: profileData.step1.country,
        city: profileData.step1.city,
        birthdate: profileData.step1.dateOfBirth,
        gender: profileData.step1.gender,
      };

      // Create and save profile
      const profile = this.profileRepository.create(profileData_obj);
      const savedProfile = await this.profileRepository.save(profile);
      await this.redis.set(`user:${userId}:profile`,savedProfile,24 * 3600 * 1000 );

      return savedProfile;
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to create profile: ${error.message}`,
      );
    }
  }


  async getProfile(userId: string): Promise<any> {

    const getProfile = async () => (await this.profileRepository.findOne({
      where: { user: { id: userId } },
      relations: ['projects', 'cvs', 'user'],
    } as any))
    const profile= await this.redis.getOrSet<ProfileEntity>(`user:${userId}:profile`,getProfile,24 * 3600 * 1000 );
    if (!profile) {
      //throw new NotFoundException('Profile not found');
      return null;
    }

    return profile;
  }


  async updateProfileStep(
    userId: string,
    step: number,
    stepData: any,
  ): Promise<any> {
const profile = await this.profileRepository.findOne({
  where: { user: { id: userId } },
});

if (!profile) {
  throw new BadRequestException(
    'Profile not created yet. Please create profile first.'
  );
}
    switch (step) {
      case 1:
        // Update all personal info fields
        profile.firstName = stepData.firstName || profile.firstName;
        profile.lastName = stepData.lastName || profile.lastName;
        profile.phone = stepData.phone || profile.phone;
        profile.country = stepData.country || profile.country;
        profile.city = stepData.city || profile.city;
        profile.birthdate = stepData.dateOfBirth || profile.birthdate;
        profile.gender = stepData.gender || profile.gender;
        profile.bio = stepData.bio || this.generateDefaultBio(stepData);
        break;
      case 2:
        profile.userLevel = stepData.userLevel;
        const education = stepData.education.map((edu: DiplomaDto) => ({
          degree: edu.degree,
          institution: edu.institution,
          field: edu.field,
          startDate: edu.startDate,
          endDate: edu.endDate || edu.startDate,
          location: edu.location,
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
        return this.getProfile(userId);
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
      case 8:
        // Step 8: Target Profile (optional final step)
        profile.targetProfile =
          stepData && Object.keys(stepData).length > 0 ? stepData : null;
        break;
      default:
        throw new BadRequestException(`Invalid step number: ${step}`);
    }

    profile.profilScore = await this.calculateProfileScore(profile);
    await this.redis.del(`user:${userId}:profile`); 
    return this.profileRepository.save(profile);
  }

  
  async updateProjects(userId: string, newProjectsData: any[]): Promise<void> {
  const profile = await this.getProfile(userId);
  const existingProjects = await this.projectRepository.find({
    where: { profile: { id: profile.id } },
  });

  for (const projectData of newProjectsData) {
    const existing = projectData.projectId
      ? existingProjects.find(p => p.id === projectData.projectId)
      : null;

    if (existing) {
      await this.projectRepository.update(existing.id, {
        title: projectData.title,
        context: projectData.context,
        description: projectData.description,
        techStack: projectData.techStack || [],
        projectUrl: projectData.projectUrl || '',
        imageUrl: projectData.imageUrl || '',
        date: projectData.date ? new Date(projectData.date) : existing.date,
      });
    } else {
      await this.projectRepository.save(
        this.projectRepository.create({
          title: projectData.title,
          context: projectData.context,
          description: projectData.description,
          techStack: projectData.techStack || [],
          projectUrl: projectData.projectUrl || '',
          imageUrl: projectData.imageUrl || '',
          date: projectData.date ? new Date(projectData.date) : new Date(),
          profile: { id: profile.id },
        }),
      );
    }
  }

  const incomingIds = newProjectsData.map(p => p.projectId).filter(Boolean);
  const toDelete = existingProjects.filter(p => !incomingIds.includes(p.id));
  if (toDelete.length > 0) {
    await this.projectRepository.remove(toDelete);
  }

    await this.redis.del(`user:${userId}:profile`); 

}
  
  async getProfileSummary(userId: string): Promise<any> {
    const profile = await this.getProfile(userId);
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
        targetProfile: profile.targetProfile,
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

      // Update personal info (Step 1) if provided
      if (profileData.step1) {
        profile.firstName = profileData.step1.firstName || profile.firstName;
        profile.lastName = profileData.step1.lastName || profile.lastName;
        profile.phone = profileData.step1.phone || profile.phone;
        profile.country = profileData.step1.country || profile.country;
        profile.city = profileData.step1.city || profile.city;
        profile.birthdate = profileData.step1.dateOfBirth || profile.birthdate;
        profile.gender = profileData.step1.gender || profile.gender;
      }

      // Update bio if provided
      if (profileData.bio) {
        profile.bio = profileData.bio;
      } else if (profileData.step1) {
        profile.bio = this.generateDefaultBio(profileData.step1);
      }

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
          location: edu.location,
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
      await this.redis.del(`user:${userId}:profile`); 

      // Update projects if provided
      if (profileData.step5 && profileData.step5.projects) {
        await this.updateProjects(userId, profileData.step5.projects);
      }
      return updatedProfile;
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to update profile: ${error.message}`,
      );
    }
  }

  // Helpers
  private generateDefaultBio(personalInfo: any): string {
    return `${'Hi! I\'m'} ${personalInfo.firstName} ${personalInfo.lastName}${'.'} ${'I\'m currently based in'} ${personalInfo.city}, ${personalInfo.country}`;
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

    // Step 8 target profile preferences (10 points)
    if (
      profile.targetProfile &&
      typeof profile.targetProfile === 'object' &&
      Object.keys(profile.targetProfile).length > 0
    ) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  private calculateCompletionPercentage(profile: ProfileEntity): number {
    let completedItems = 0;
    const totalItems = 8;

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
    if (
      profile.targetProfile &&
      typeof profile.targetProfile === 'object' &&
      Object.keys(profile.targetProfile).length > 0
    ) {
      completedItems++;
    }

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
