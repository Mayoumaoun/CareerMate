/**
 * API Client pour le frontend Next.js
 * Intégration avec le backend CareerMate
 * 
 * À copier dans votre projet Next.js: src/lib/api-client.ts
 * 
 * Usage:
 * import { careerMateAPI } from '@/lib/api-client';
 * 
 * const token = localStorage.getItem('access_token');
 * const profile = await careerMateAPI.profile.getProfile(token);
 */

import {
  SignUpRequest,
  SignInRequest,
  AuthResponse,
  CreateProfileDto,
  UpdateProfileDto,
  ProfileEntity,
  ProfileSummaryResponse,
  Step1PersonalInfoDto,
  Step2EducationDto,
  Step3SkillsDto,
  Step4ExperiencesDto,
  Step5ProjectsDto,
  Step6LanguagesDto,
  Step7CertificationsDto,
  Step8TargetProfileDto,
  ErrorResponse,
  MatchResultDto,
  MatchQueryDto,
  CreateJobOfferDto,
  UpdateJobOfferDto,
} from './types';

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_TIMEOUT = 30000; // 30 secondes

// ============================================
// UTILITAIRES
// ============================================

class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public errors?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  token?: string;
}

async function request<T>(
  endpoint: string,
  options: RequestOptions
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const fetchOptions: RequestInit = {
    method: options.method,
    headers: headers as Record<string, string>,
    signal: AbortSignal.timeout(API_TIMEOUT),
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const error: ErrorResponse = await response.json().catch(() => ({
        statusCode: response.status,
        message: response.statusText,
        error: 'Unknown error',
      }));

      const message = Array.isArray(error.message)
        ? error.message.join(', ')
        : error.message;

      throw new ApiError(response.status, message, error);
    }

    return await response.json() as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof TypeError) {
      throw new ApiError(
        0,
        `Network error: Could not reach ${url}. Make sure the backend API is running and accessible.`,
      );
    }

    throw new ApiError(500, 'Unexpected error', { error });
  }
}

// ============================================
// AUTH API
// ============================================

const authAPI = {
  /**
   * Créer un compte utilisateur
   */
  signUp: async (payload: SignUpRequest): Promise<AuthResponse> => {
    return request<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: payload,
    });
  },

  /**
   * Connexion utilisateur
   */
  signIn: async (payload: SignInRequest): Promise<AuthResponse> => {
    return request<AuthResponse>('/auth/signin', {
      method: 'POST',
      body: payload,
    });
  },
};

// ============================================
// PROFILE API
// ============================================

const profileAPI = {
  /**
   * Créer un profil complet
   */
  createProfile: async (
    token: string,
    payload: CreateProfileDto
  ): Promise<ProfileEntity> => {
    return request<ProfileEntity>('/profile', {
      method: 'POST',
      token,
      body: payload,
    });
  },

  /**
   * Récupérer le profil de l'utilisateur connecté
   */
  getProfile: async (token: string): Promise<ProfileEntity> => {
    return request<ProfileEntity>('/profile', {
      method: 'GET',
      token,
    });
  },

  /**
   * Récupérer le résumé du profil (score + completion %)
   */
  getProfileSummary: async (
    token: string
  ): Promise<ProfileSummaryResponse> => {
    return request<ProfileSummaryResponse>('/profile/summary', {
      method: 'GET',
      token,
    });
  },

  /**
   * Mettre à jour le profil complet
   */
  updateCompleteProfile: async (
    token: string,
    payload: UpdateProfileDto
  ): Promise<ProfileEntity> => {
    return request<ProfileEntity>('/profile', {
      method: 'PUT',
      token,
      body: payload,
    });
  },

  /**
   * Mettre à jour l'étape 1 (Infos Personnelles)
   */
  updateStep1: async (
    token: string,
    payload: Step1PersonalInfoDto
  ): Promise<ProfileEntity> => {
    return request<ProfileEntity>('/profile/step/1', {
      method: 'PUT',
      token,
      body: payload,
    });
  },

  /**
   * Mettre à jour l'étape 2 (Éducation)
   */
  updateStep2: async (
    token: string,
    payload: Step2EducationDto
  ): Promise<ProfileEntity> => {
    return request<ProfileEntity>('/profile/step/2', {
      method: 'PUT',
      token,
      body: payload,
    });
  },

  /**
   * Mettre à jour l'étape 3 (Compétences)
   */
  updateStep3: async (
    token: string,
    payload: Step3SkillsDto
  ): Promise<ProfileEntity> => {
    return request<ProfileEntity>('/profile/step/3', {
      method: 'PUT',
      token,
      body: payload,
    });
  },

  /**
   * Mettre à jour l'étape 4 (Expériences)
   */
  updateStep4: async (
    token: string,
    payload: Step4ExperiencesDto
  ): Promise<ProfileEntity> => {
    return request<ProfileEntity>('/profile/step/4', {
      method: 'PUT',
      token,
      body: payload,
    });
  },

  /**
   * Mettre à jour l'étape 5 (Projets)
   */
  updateStep5: async (
    token: string,
    payload: Step5ProjectsDto
  ): Promise<ProfileEntity> => {
    return request<ProfileEntity>('/profile/step/5', {
      method: 'PUT',
      token,
      body: payload,
    });
  },

  /**
   * Mettre à jour l'étape 6 (Langues)
   */
  updateStep6: async (
    token: string,
    payload: Step6LanguagesDto
  ): Promise<ProfileEntity> => {
    return request<ProfileEntity>('/profile/step/6', {
      method: 'PUT',
      token,
      body: payload,
    });
  },

  /**
   * Mettre à jour l'étape 7 (Certifications)
   */
  updateStep7: async (
    token: string,
    payload: Step7CertificationsDto
  ): Promise<ProfileEntity> => {
    return request<ProfileEntity>('/profile/step/7', {
      method: 'PUT',
      token,
      body: payload,
    });
  },

  /**
   * Mettre à jour l'étape 8 (Objectifs & Préférences)
   */
  updateStep8: async (
    token: string,
    payload: Step8TargetProfileDto
  ): Promise<ProfileEntity> => {
    return request<ProfileEntity>('/profile/step/8', {
      method: 'PUT',
      token,
      body: payload,
    });
  },
};

// ============================================
// JOB OFFERS API
// ============================================

const jobOfferAPI = {
  /**
   * Récupérer tous les job offers
   */
  getAllOffers: async (): Promise<MatchResultDto[]> => {
    return request<MatchResultDto[]>('/job-offer', {
      method: 'GET',
    });
  },

  /**
   * Récupérer les job offers correspondant au profil de l'utilisateur
   * avec options de filtrage
   */
  getMatches: async (
    profileId: string,
    filters?: MatchQueryDto
  ): Promise<MatchResultDto[]> => {
    const queryParams = new URLSearchParams();
    
    if (filters?.skills?.length) {
      queryParams.append('skills', JSON.stringify(filters.skills));
    }
    if (filters?.location?.length) {
      queryParams.append('location', JSON.stringify(filters.location));
    }
    if (filters?.experienceLevel?.length) {
      queryParams.append('experienceLevel', JSON.stringify(filters.experienceLevel));
    }
    if (filters?.salaryMin) {
      queryParams.append('salaryMin', String(filters.salaryMin));
    }
    if (filters?.salaryMax) {
      queryParams.append('salaryMax', String(filters.salaryMax));
    }

    const queryString = queryParams.toString();
    const url = queryString ? `/job-offer/${profileId}?${queryString}` : `/job-offer/${profileId}`;

    return request<MatchResultDto[]>(url, {
      method: 'GET',
    });
  },

  /**
   * Créer un nouveau job offer
   */
  create: async (
    token: string,
    payload: CreateJobOfferDto
  ): Promise<MatchResultDto> => {
    return request<MatchResultDto>('/job-offer', {
      method: 'POST',
      token,
      body: payload,
    });
  },

  /**
   * Mettre à jour un job offer
   */
  update: async (
    token: string,
    jobId: string,
    payload: UpdateJobOfferDto
  ): Promise<MatchResultDto> => {
    return request<MatchResultDto>(`/job-offer/${jobId}`, {
      method: 'PATCH',
      token,
      body: payload,
    });
  },

  /**
   * Supprimer un job offer
   */
  delete: async (token: string, jobId: string): Promise<void> => {
    return request<void>(`/job-offer/${jobId}`, {
      method: 'DELETE',
      token,
    });
  },
};

// ============================================
// MAIN API EXPORT
// ============================================

export const careerMateAPI = {
  auth: authAPI,
  profile: profileAPI,
  jobOffer: jobOfferAPI,
};

export { ApiError };
