// projects/projects.controller.ts
import { Controller, Patch, Param, UseGuards, Req, Get } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';

@ApiTags('projects')
@Controller()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('projects/:id/visibility')
  async toggleVisibility(@Req() req: any, @Param('id') projectId: string) {
    return this.projectsService.toggleVisibility(req.user.userId, projectId);
  }

  @Get('portfolio/:profileId')
  async getPublicPortfolio(@Param('profileId') profileId: string) {
    return this.projectsService.getPublicPortfolio(profileId);
  }
}