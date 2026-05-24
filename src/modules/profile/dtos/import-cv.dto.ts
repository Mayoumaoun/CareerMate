export interface Step1ImportData {
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  country: string;
  dateOfBirth?: string;
  gender?: 'female' | 'male' | 'other' | 'prefer_not_to_say';
}

export interface EducationImport {
  degree: string;
  institution: string;
  field: string;
  startDate: string;
  endDate?: string;
  location: string;
}

export interface SkillImport {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface ExperienceImport {
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate?: string;
  description: string;
}

export interface ProjectImport {
  title: string;
  context: string;
  description: string;
  projectUrl?: string;
  githubUrl?: string;
  techStack?: string[];
  date?: string;
}

export interface LanguageImport {
  language: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  certificate?: string;
}

export interface CertificationImport {
  name: string;
  organization: string;
  date: string;
  domain: string;
  context: string;
  url?: string;
}

export class ImportCVResponseDto {
  step1: Step1ImportData;
  step2: {
    userLevel: 'Student' | 'Junior' | 'Senior';
    education: EducationImport[];
  };
  step3: {
    skills: SkillImport[];
  };
  step4: {
    experiences: ExperienceImport[];
  };
  step5: {
    projects: ProjectImport[];
  };
  step6: {
    languages: LanguageImport[];
  };
  step7: {
    certifications: CertificationImport[];
  };
}
