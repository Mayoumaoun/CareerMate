import { CreateTargetJobRoadmapDto } from './CreateTargetJobRoadmap.dto';
import { CreateJobOfferRoadmapDto } from './CreateJobOfferRoadmap.dto';
import { CreateGenericRoadmapDto } from './CreateGenericRoadmap.dto';


export type CreateRoadmapDto =
  | CreateTargetJobRoadmapDto
  | CreateJobOfferRoadmapDto
  | CreateGenericRoadmapDto;