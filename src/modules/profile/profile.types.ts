/**
 * Frontend TypeScript Types for Profile Module
 * Use these types in your frontend React/Vue component to get type safety
 */

export interface PersonalInfoFormData {
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  city: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  email?: string;
  address?: string;
  zipCode?: string;
}

export interface DiplomaFormData {
  degree: string;
  institution: string;
  field: string;
  startDate: string;
  endDate: string;
  location: string;
}

export interface EducationFormData {
  userLevel: 'Student' | 'Junior' | 'Senior';
  education: DiplomaFormData[];
}

export interface SkillFormData {
  name: string;
  category: 'tech' | 'soft' | 'tool' | 'framework' | 'other';
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface SkillsFormData {
  skills: SkillFormData[];
}

export interface ExperienceFormData {
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface ExperiencesFormData {
  experiences: ExperienceFormData[];
}

export interface ProjectFormData {
  title: string;
  context: string;
  description: string;
  projectUrl?: string;
  githubUrl?: string;
  techStack?: string[];
  date?: string;
  imageUrl?: string;
}

export interface ProjectsFormData {
  projects: ProjectFormData[];
}

export interface LanguageFormData {
  language: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'native';
  certificate?: string;
}

export interface LanguagesFormData {
  languages: LanguageFormData[];
}

export interface CertificationFormData {
  name: string;
  organization: string;
  date: string;
  domain: string;
  context: string;
  url?: string;
}

export interface CertificationsFormData {
  certifications: CertificationFormData[];
}

export interface CompleteProfileFormData {
  step1: PersonalInfoFormData;
  step2: EducationFormData;
  step3: SkillsFormData;
  step4: ExperiencesFormData;
  step5: ProjectsFormData;
  step6: LanguagesFormData;
  step7: CertificationsFormData;
  bio?: string;
  shortTermGoals?: string;
  longTermGoals?: string;
}

export interface ProfileResponse {
  id: string;
  bio: string;
  userLevel: 'Student' | 'Junior' | 'Senior';
  profilScore: number;
  skills: SkillFormData[];
  experiences: ExperienceFormData[];
  education: DiplomaFormData[];
  languages: LanguageFormData[];
  certifications: CertificationFormData[];
  targetPosition: any;
  shortTermGoals: string;
  longTermGoals: string;
  createdAt: string;
  updatedAt: string;
  projects?: ProjectFormData[];
}

export interface ProfileSummary {
  profileScore: number;
  completionPercentage: number;
  summary: {
    personalInfo: {
      id: string;
      createdAt: string;
      userLevel: string;
    };
    education: DiplomaFormData[];
    skills: SkillFormData[];
    experiences: ExperienceFormData[];
    projects: ProjectFormData[];
    languages: LanguageFormData[];
    certifications: CertificationFormData[];
    goals: {
      shortTerm: string;
      longTerm: string;
    };
  };
}

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

/**
 * React Hook Example
 */
export function useProfileWizard() {
  const submitStep = async (stepNumber: number, data: any, token: string) => {
    const response = await fetch(`/api/profile/step/${stepNumber}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to save step ${stepNumber}`);
    }

    return response.json() as Promise<ApiResponse<ProfileResponse>>;
  };

  const getProfile = async (token: string) => {
    const response = await fetch('/api/profile', {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch profile');
    }

    return response.json() as Promise<ApiResponse<ProfileResponse>>;
  };

  const getSummary = async (token: string) => {
    const response = await fetch('/api/profile/summary', {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch summary');
    }

    return response.json() as Promise<ApiResponse<ProfileSummary>>;
  };

  const createCompleteProfile = async (data: CompleteProfileFormData, token: string) => {
    const response = await fetch('/api/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to create profile');
    }

    return response.json() as Promise<ApiResponse<ProfileResponse>>;
  };

  return {
    submitStep,
    getProfile,
    getSummary,
    createCompleteProfile,
  };
}

/**
 * Vue Composable Example
 */
export function useProfileWizardVue(token: string) {
  const submitStep = async (stepNumber: number, data: any) => {
    return useProfileWizard().submitStep(stepNumber, data, token);
  };

  const getProfile = async () => {
    return useProfileWizard().getProfile(token);
  };

  const getSummary = async () => {
    return useProfileWizard().getSummary(token);
  };

  const createCompleteProfile = async (data: CompleteProfileFormData) => {
    return useProfileWizard().createCompleteProfile(data, token);
  };

  return {
    submitStep,
    getProfile,
    getSummary,
    createCompleteProfile,
  };
}
