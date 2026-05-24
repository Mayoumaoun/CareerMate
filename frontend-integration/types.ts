/**
 * API Types pour l'intégration avec le backend CareerMate
 * À copier dans votre projet Next.js
 */

// ============================================
// AUTHENTIFICATION
// ============================================

export interface SignUpRequest {
  email: string;
  password: string;
  username: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
}

// ============================================
// PROFILE - ENUMS
// ============================================

export enum Gender {
  MALE = "Male",
  FEMALE = "Female",
  OTHER = "Other",
}

export enum UserLevel {
  SENIOR = "Senior",
  JUNIOR = "Junior",
  STUDENT = "Student",
}

// ============================================
// PROFILE - ÉTAPE 1 (Infos Personnelles)
// ============================================

export interface Step1PersonalInfoDto {
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  city: string;
  dateOfBirth: string; // ISO 8601 format: "YYYY-MM-DD"
  gender: Gender;
}

// ============================================
// PROFILE - ÉTAPE 2 (Éducation)
// ============================================

export interface EducationItem {
  school: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string; // ISO 8601 format
  endDate: string; // ISO 8601 format
}

export interface Step2EducationDto {
  education: EducationItem[];
}

// ============================================
// PROFILE - ÉTAPE 3 (Compétences)
// ============================================

export interface SkillItem {
  name: string;
  level: "Beginner" | "Intermediate" | "Expert" | "Master";
}

export interface Step3SkillsDto {
  skills: SkillItem[];
}

// ============================================
// PROFILE - ÉTAPE 4 (Expériences)
// ============================================

export interface ExperienceItem {
  company: string;
  position: string;
  description: string;
  startDate: string; // ISO 8601 format
  endDate: string; // ISO 8601 format
  currentlyWorking?: boolean;
}

export interface Step4ExperiencesDto {
  experiences: ExperienceItem[];
}

// ============================================
// PROFILE - ÉTAPE 5 (Projets)
// ============================================

export interface ProjectItem {
  title: string;
  description: string;
  technologies: string[];
  link?: string;
  startDate: string; // ISO 8601 format
  endDate?: string; // ISO 8601 format
}

export interface Step5ProjectsDto {
  projects: ProjectItem[];
}

// ============================================
// PROFILE - ÉTAPE 6 (Langues)
// ============================================

export interface LanguageItem {
  language: string;
  level: "Beginner" | "Intermediate" | "Advanced" | "Fluent" | "Native";
}

export interface Step6LanguagesDto {
  languages: LanguageItem[];
}

// ============================================
// PROFILE - ÉTAPE 7 (Certifications)
// ============================================

export interface CertificationItem {
  name: string;
  issuer: string;
  issueDate: string; // ISO 8601 format
  expirationDate?: string; // ISO 8601 format
  credentialUrl?: string;
}

export interface Step7CertificationsDto {
  certifications: CertificationItem[];
}

// ============================================
// PROFILE - ÉTAPE 8 (Career Goals & Preferences)
// ============================================

export type SectorInterestLevel =
  | "not_interested"
  | "somewhat_interested"
  | "very_interested";

export type ContractTypeEnum =
  | "cdi"
  | "cdd"
  | "stage"
  | "freelance"
  | "interim";

export type RemoteTypeEnum = "full_remote" | "hybrid" | "onsite";
export type AvailabilityEnum =
  | "immediate"
  | "two_weeks"
  | "one_month"
  | "two_months"
  | "three_months";

export interface SectorPreferenceDto {
  name: string;
  interest: SectorInterestLevel;
  weight: number; // 1..5
}

export interface ContractTypeItemDto {
  type: ContractTypeEnum;
  preferred?: boolean;
}

export interface RemotePreferenceDto {
  type: RemoteTypeEnum;
  hybridDays?: number; // required only when type === "hybrid"
}

// ============================================
// PROFILE - TARGET POSITION
// ============================================

export interface TargetPosition {
  jobTitle: string;
  industry?: string;
  experience?: string;
}

// ============================================
// PROFILE - TARGET PROFILE VALIDATION
// ============================================

export interface TargetProfileValidationDto {
  targetPositions?: string[];
  sectorPreferences?: SectorPreferenceDto[];
  minSalary?: number;
  maxSalary?: number;
  salaryType?: "gross" | "net";
  contractTypes?: ContractTypeItemDto[];
  targetCities?: string[];
  remotePreference?: RemotePreferenceDto;
  availability?: AvailabilityEnum;
}

export type Step8TargetProfileDto = TargetProfileValidationDto;

// ============================================
// PROFILE - CREATE & UPDATE DTOs
// ============================================

export interface CreateProfileDto {
  step1: Step1PersonalInfoDto;
  bio?: string;
  targetProfile?: TargetProfileValidationDto;
}

export interface UpdateProfileDto {
  step1?: Step1PersonalInfoDto;
  step2?: Step2EducationDto;
  step3?: Step3SkillsDto;
  step4?: Step4ExperiencesDto;
  step5?: Step5ProjectsDto;
  step6?: Step6LanguagesDto;
  step7?: Step7CertificationsDto;
  step8?: Step8TargetProfileDto;
  bio?: string;
  shortTermGoals?: string;
  longTermGoals?: string;
  targetProfile?: TargetProfileValidationDto;
}

// ============================================
// PROFILE - RESPONSE ENTITY
// ============================================

export interface ProfileEntity {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  city: string;
  birthdate: Date;
  gender: Gender;
  bio: string;
  profilScore: number;
  userLevel: UserLevel;
  skills: SkillItem[];
  experiences: ExperienceItem[];
  education: EducationItem[];
  languages: LanguageItem[];
  certifications: CertificationItem[];
  targetPosition: TargetPosition | null;
  shortTermGoals: string | null;
  longTermGoals: string | null;
  targetProfile: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// PROFILE - SUMMARY RESPONSE
// ============================================

export interface ProfileSummaryResponse {
  profileScore: number;
  completionPercentage: number;
  summary: Record<string, any>;
}

// ============================================
// ERROR RESPONSE
// ============================================

export interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
}
