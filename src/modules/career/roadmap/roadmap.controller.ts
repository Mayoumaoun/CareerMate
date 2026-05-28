import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiOkResponse, ApiCreatedResponse, ApiNoContentResponse, ApiBody, getSchemaPath, ApiExtraModels } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RoadmapService } from './roadmap.service';
import { RoadmapStatus } from './roadmap.enums';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { GetRoadmapsByStatusDto } from './dto/GetRoadmapsByStatus.dto';
import type { CreateRoadmapDto } from './dto/CreateRoadmap.dto';
import { UpdateRoadmapStatusDto } from './dto/UpdateRoadmapStatus.dto';
import { UpdateRoadmapStepsDto } from './dto/UpdateRoadmapSteps.dto';
import { UpdateStepDto } from './dto/UpdateStep.dto';
import { CreateTargetJobRoadmapDto } from './dto/CreateTargetJobRoadmap.dto';
import { CreateJobOfferRoadmapDto } from './dto/CreateJobOfferRoadmap.dto';
import { CreateGenericRoadmapDto } from './dto/CreateGenericRoadmap.dto';
@ApiExtraModels(CreateTargetJobRoadmapDto, CreateJobOfferRoadmapDto, CreateGenericRoadmapDto)
@ApiTags('Roadmaps')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('roadmaps')
export class RoadmapController {
  constructor(private readonly roadmapService: RoadmapService) {}

  @Get()
  @ApiOperation({ summary: 'Get all roadmaps for the current user' })
  @ApiOkResponse({ description: 'List of roadmaps returned successfully' })
  getAllRoadmaps(@CurrentUser('userId') userId: string) {
    return this.roadmapService.getAllRoadmaps(userId);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get roadmaps filtered by status' })
  @ApiQuery({ name: 'status', enum: RoadmapStatus, required: false })
  @ApiOkResponse({ description: 'Filtered roadmaps returned successfully' })
  getRoadmapsByStatus(
    @CurrentUser('userId') userId: string,
    @Query() query: GetRoadmapsByStatusDto,
  ) {
    return this.roadmapService.getRoadmapsByStatus(userId, query.status ?? RoadmapStatus.ACTIVE);
  }

  @Post('preview')
  @ApiOperation({ summary: 'Generate a roadmap preview without saving' })
  @ApiCreatedResponse({ description: 'Preview generated successfully' })
  @ApiBody({
    schema: {
      oneOf: [
        { $ref: getSchemaPath(CreateTargetJobRoadmapDto) },
        { $ref: getSchemaPath(CreateJobOfferRoadmapDto) },
        { $ref: getSchemaPath(CreateGenericRoadmapDto) },
      ],
    },
  })
  generatePreview(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateRoadmapDto,
  ) {
    return this.roadmapService.generatePreview(userId, dto);
  }

  @Post()
  @ApiOperation({ summary: 'Create and save a new roadmap' })
  @ApiCreatedResponse({ description: 'Roadmap created successfully' })
  @ApiBody({
    schema: {
      oneOf: [
        { $ref: getSchemaPath(CreateTargetJobRoadmapDto) },
        { $ref: getSchemaPath(CreateJobOfferRoadmapDto) },
        { $ref: getSchemaPath(CreateGenericRoadmapDto) },
      ],
    },
  })
  createRoadmap(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateRoadmapDto,
  ) {
    return this.roadmapService.createRoadmap(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single roadmap by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Roadmap returned successfully' })
  getRoadmap(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) roadmapId: string,
  ) {
    return this.roadmapService.getRoadmap(userId, roadmapId);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get completion stats for a roadmap' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Roadmap stats returned successfully' })
  getRoadmapStats(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) roadmapId: string,
  ) {
    return this.roadmapService.getRoadmapStats(userId, roadmapId);
  }

  @Get(':id/active-steps')
  @ApiOperation({ summary: 'Get active steps for a roadmap' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Active steps returned successfully' })
  getActiveSteps(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) roadmapId: string,
  ) {
    return this.roadmapService.getActiveSteps(userId, roadmapId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update the status of a roadmap' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Roadmap status updated successfully' })
  updateRoadmapStatus(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) roadmapId: string,
    @Body() dto: UpdateRoadmapStatusDto,
  ) {
    return this.roadmapService.updateRoadmapStatus(userId, roadmapId, dto.status);
  }

  @Patch(':id/steps')
  @ApiOperation({ summary: 'Replace all steps of a roadmap (reorder / manual edit)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Roadmap steps updated successfully' })
  updateRoadmapSteps(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) roadmapId: string,
    @Body() dto: UpdateRoadmapStepsDto,
  ) {
    return this.roadmapService.updateRoadmapSteps(userId, roadmapId, dto.steps);
  }

  @Patch(':id/steps/:stepId')
  @ApiOperation({ summary: 'Update a single step (status, notes)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'stepId', type: 'string' })
  @ApiOkResponse({ description: 'Step updated successfully' })
  updateStep(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) roadmapId: string,
    @Param('stepId') stepId: string,
    @Body() dto: UpdateStepDto,
  ) {
    return this.roadmapService.updateStep(userId, roadmapId, stepId, dto);
  }

  @Post(':id/regenerate')
  @ApiOperation({ summary: 'Regenerate a roadmap using the original configuration' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiCreatedResponse({ description: 'Roadmap regenerated successfully' })
  regenerateRoadmap(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) roadmapId: string,
  ) {
    return this.roadmapService.regenerateRoadmap(userId, roadmapId);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate an existing roadmap' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiCreatedResponse({ description: 'Roadmap duplicated successfully' })
  duplicateRoadmap(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) roadmapId: string,
  ) {
    return this.roadmapService.duplicateRoadmap(userId, roadmapId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a roadmap' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Roadmap deleted successfully' })
  deleteRoadmap(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) roadmapId: string,
  ) {
    return this.roadmapService.deleteRoadmap(userId, roadmapId);
  }
}