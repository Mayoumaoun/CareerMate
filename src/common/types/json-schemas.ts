export interface SkillItem {
  name: string;
  category: 'tech' | 'soft' | 'tool' | 'framework' | 'other';
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface ExperienceItem {
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate?: string;
  description: string;
}

export interface EducationItem {
  degree: string;
  institution: string;
  field: string;
  startDate: string;
  endDate?: string;
  location: string;
}

export interface LanguageItem {
  language: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  certificate?: string;
}

export interface CertificationItem {
  name: string;
  date: string;
  context: string;
  domain: string;
  organization: string;
  url?: string;
}

export interface TargetPosition {
  roles: string[];
  sectors: string[];
  salaryRange: { min: number; max: number; currency: string };
  contractTypes: string[];
  locations: string[];
  availability: string;
  urgency: 'urgent' | 'normal' | 'passive';
  dealBreakers: string[];
}

export interface JobOffersPreferences {
  expirationDays: number;
  autoDeleteDismissed: boolean;
  notifyNewMatch: boolean;
  matchScoreThreshold: number;
  preferredLocations: string[];
  preferredContractTypes: string[];
  preferredRemote: boolean;
}

export interface SimulationPreferences {
  language: string;
  defaultDuration: number;
  feedbackDetail: 'full' | 'summary';
  defaultMode: 'RH' | 'technique';
  voiceEnabled: boolean;
  autoSaveFeedback: boolean;
}

export interface LettreMotivationPreferences {
  defaultStyle: 'classique' | 'moderne' | 'storytelling';
  defaultLanguage: string;
  defaultLength: 'short' | 'medium' | 'long';
  autoAttachToCandidature: boolean;
}

export interface PostsLinkedInPreferences {
  defaultTone: 'professionnel' | 'inspirant' | 'pedagogique' | 'humain';
  defaultType: 'apprentissage' | 'experience' | 'veille' | 'reflexion';
  includeHashtags: boolean;
  hashtagCount: number;
  generateVariants: boolean;
  variantCount: number;
}

export interface RoadmapPreferences {
  sprintDuration: number;
  reminderEnabled: boolean;
  reminderDay: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  reminderTime: string;
  learningPlatforms: ('coursera' | 'udemy' | 'youtube' | 'linkedin' | 'pluralsight')[];
}

export interface OpportunitiesPreferences {
  categories: ('hackathon' | 'bourse' | 'concours' | 'conference' | 'acceleration')[];
  preferredLocations: string[];
  onlineOnly: boolean;
  notifyBeforeDeadlineDays: number;
  notifyBeforeDeadlineDaysUrgent: number;
  minRelevanceScore: number;
}

export interface TendancesPreferences {
  sectors: string[];
  keywords: string[];
  sources: ('linkedin' | 'twitter' | 'arxiv' | 'reddit' | 'blogs')[];
  digestFrequency: 'daily' | 'weekly' | 'monthly';
  digestDay: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  alertEnabled: boolean;
  alertThreshold: 'low' | 'medium' | 'high';
}

export interface JobOfferEXtraInfo{
    
}
