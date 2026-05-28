export enum RoadmapStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

export enum RoadmapMode {
  TARGET_JOB = 'target_job',
  JOB_OFFER = 'job_offer',
  GENERIC = 'generic',
}

export enum RoadmapIntensity {
  LIGHT = 'light',
  MODERATE = 'moderate',
  INTENSIVE = 'intensive',
}

export enum RoadmapDepth {
  OVERVIEW = 'overview',
  STANDARD = 'standard',
  DEEP_DIVE = 'deep_dive',
}

export enum StepStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
}
