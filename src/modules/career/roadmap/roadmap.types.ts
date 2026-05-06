import { StepStatus } from "./roadmap.enums";


export interface RoadmapResource {
  type: 'course' | 'article' | 'project' | 'practice' | 'video';
  title: string;
  url?: string;
  platform?: string;         
  estimatedHours?: number;
  free?: boolean;
}

export interface RoadmapStep {
  id: string;
  weekNumber: number;
  title: string;
  description: string;
  skills: string[];
  resources: RoadmapResource[];
  status: StepStatus;
  completedAt?: Date | null;
  notes?: string;            
}

export interface GenerationParams {
  durationWeeks?: number;
  intensity?: string;
  depth?: string;
  jobOfferId?: string;
  jobDescriptionRaw?: string;
  topic?: string;
  focusAreas?: string[];
  currentSkillsOverride?: string[];
}
