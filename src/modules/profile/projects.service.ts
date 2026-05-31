import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectEntity } from '../profile/entities/projet.entity';
import { ProfileEntity } from '../profile/entities/profile.entity';
import { RedisService } from 'src/common/redis/redis.service';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    @InjectRepository(ProfileEntity)
    private readonly profileRepository: Repository<ProfileEntity>,
    private readonly redis: RedisService,
  ) {}

  async toggleVisibility(userId: string, projectId: string): Promise<ProjectEntity> {
    const project = await this.projectRepository.findOne({
        where: { id: projectId },
        relations: ['profile', 'profile.user'],
    });

    if (!project) throw new NotFoundException('Project not found');
    if (project.profile.user.id !== userId) throw new ForbiddenException();

    project.isPublic = !project.isPublic;
    const saved = await this.projectRepository.save(project);

    await this.redis.del(`user:${userId}:profile`);

    return saved;
    }

  async getPublicPortfolio(profileId: string): Promise<{ profile: Partial<ProfileEntity>; projects: ProjectEntity[] }> {
    const profile = await this.profileRepository.findOne({
      where: { id: profileId },
      relations: ['user'],
    });

    if (!profile) throw new NotFoundException('Portfolio not found');

    const projects = await this.projectRepository.find({
      where: { profile: { id: profileId }, isPublic: true },
      order: { date: 'DESC' },
    });

    return {
      profile: {
        id: profile.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        bio: profile.bio,
        city: profile.city,
        country: profile.country,
        userLevel: profile.userLevel,
        skills: profile.skills,
      },
      projects,
    };
  }
}