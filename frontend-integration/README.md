# CareerMate Frontend Integration

Guide d'intégration du backend CareerMate avec un frontend Next.js

## 📁 Structure des fichiers

- `types.ts` - Tous les types TypeScript pour l'API
- `api-client.ts` - Client API réutilisable
- `README.md` - Ce fichier

## 🚀 Installation dans votre projet Next.js

### 1. Copier les fichiers

```bash
# Dans votre projet Next.js
cp types.ts src/lib/
cp api-client.ts src/lib/
```

### 2. Configurer les variables d'environnement

Ajouter dans `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Ou pour la production:

```env
NEXT_PUBLIC_API_URL=https://api.careermate.com
```

## 📖 Utilisation

### Authentification

```typescript
import { careerMateAPI } from '@/lib/api-client';

// Sign Up
const authResponse = await careerMateAPI.auth.signUp({
  email: 'user@example.com',
  password: 'securePassword123',
  username: 'username',
});

console.log(authResponse.access_token); // JWT token

// Sign In
const loginResponse = await careerMateAPI.auth.signIn({
  email: 'user@example.com',
  password: 'securePassword123',
});

// Stocker le token
localStorage.setItem('access_token', loginResponse.access_token);
```

### Profil - Créer un profil

```typescript
const token = localStorage.getItem('access_token');

const profile = await careerMateAPI.profile.createProfile(token, {
  step1: {
    firstName: 'Ouma',
    lastName: 'Oun',
    phone: '+21650000000',
    country: 'Tunisia',
    city: 'Tunis',
    dateOfBirth: '1990-01-01',
    gender: 'Female',
  },
  bio: 'Full-stack developer with 5 years of experience',
});
```

### Profil - Récupérer le profil

```typescript
const token = localStorage.getItem('access_token');

const profile = await careerMateAPI.profile.getProfile(token);
console.log(profile.firstName); // Ouma
```

### Profil - Récupérer le résumé

```typescript
const token = localStorage.getItem('access_token');

const summary = await careerMateAPI.profile.getProfileSummary(token);
console.log(summary.profileScore); // 75
console.log(summary.completionPercentage); // 60
```

### Profil - Mettre à jour l'étape 1 (Infos Personnelles)

```typescript
const token = localStorage.getItem('access_token');

const updatedProfile = await careerMateAPI.profile.updateStep1(token, {
  firstName: 'Ouma',
  lastName: 'Oun',
  phone: '+21650000000',
  country: 'Tunisia',
  city: 'Tunis',
  dateOfBirth: '1990-01-01',
  gender: 'Female',
});
```

### Profil - Mettre à jour l'étape 2 (Éducation)

```typescript
const token = localStorage.getItem('access_token');

const updatedProfile = await careerMateAPI.profile.updateStep2(token, {
  education: [
    {
      school: 'University of Tunis',
      degree: 'Bachelor',
      fieldOfStudy: 'Computer Science',
      startDate: '2018-09-01',
      endDate: '2022-06-30',
    },
  ],
});
```

### Profil - Mettre à jour l'étape 3 (Compétences)

```typescript
const token = localStorage.getItem('access_token');

const updatedProfile = await careerMateAPI.profile.updateStep3(token, {
  skills: [
    { name: 'React', level: 'Expert' },
    { name: 'Node.js', level: 'Intermediate' },
    { name: 'TypeScript', level: 'Expert' },
  ],
});
```

### Profil - Mettre à jour l'étape 4 (Expériences)

```typescript
const token = localStorage.getItem('access_token');

const updatedProfile = await careerMateAPI.profile.updateStep4(token, {
  experiences: [
    {
      company: 'Tech Corp',
      position: 'Senior Developer',
      description: 'Led the development of...',
      startDate: '2021-01-15',
      endDate: '2023-06-30',
      currentlyWorking: false,
    },
  ],
});
```

### Profil - Mettre à jour l'étape 5 (Projets)

```typescript
const token = localStorage.getItem('access_token');

const updatedProfile = await careerMateAPI.profile.updateStep5(token, {
  projects: [
    {
      title: 'CareerMate Platform',
      description: 'A comprehensive career development platform',
      technologies: ['React', 'Node.js', 'PostgreSQL'],
      link: 'https://github.com/example/careermate',
      startDate: '2023-01-01',
      endDate: '2023-06-30',
    },
  ],
});
```

### Profil - Mettre à jour l'étape 6 (Langues)

```typescript
const token = localStorage.getItem('access_token');

const updatedProfile = await careerMateAPI.profile.updateStep6(token, {
  languages: [
    { language: 'Français', level: 'Native' },
    { language: 'English', level: 'Fluent' },
    { language: 'Arabic', level: 'Fluent' },
  ],
});
```

### Profil - Mettre à jour l'étape 7 (Certifications)

```typescript
const token = localStorage.getItem('access_token');

const updatedProfile = await careerMateAPI.profile.updateStep7(token, {
  certifications: [
    {
      name: 'AWS Solutions Architect',
      issuer: 'Amazon Web Services',
      issueDate: '2023-01-15',
      expirationDate: '2025-01-15',
      credentialUrl: 'https://aws.example.com/certificate',
    },
  ],
});
```

### Profil - Mettre à jour le profil complet

```typescript
const token = localStorage.getItem('access_token');

const updatedProfile = await careerMateAPI.profile.updateCompleteProfile(
  token,
  {
    step1: { /* ... */ },
    step2: { /* ... */ },
    step3: { /* ... */ },
    step4: { /* ... */ },
    step5: { /* ... */ },
    step6: { /* ... */ },
    step7: { /* ... */ },
    bio: 'Updated bio',
    shortTermGoals: '...',
    longTermGoals: '...',
  }
);
```

## 🔐 Gestion du Token JWT

### Stocker le token après connexion

```typescript
const response = await careerMateAPI.auth.signIn({
  email: 'user@example.com',
  password: 'password',
});

localStorage.setItem('access_token', response.access_token);
```

### Récupérer le token

```typescript
const token = localStorage.getItem('access_token');
```

### Utiliser un hook personnalisé (Optionnel)

```typescript
// hooks/useAuth.ts
import { useCallback } from 'react';

export function useAuth() {
  const signIn = useCallback(async (email: string, password: string) => {
    const response = await careerMateAPI.auth.signIn({ email, password });
    localStorage.setItem('access_token', response.access_token);
    return response;
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem('access_token');
  }, []);

  const getToken = useCallback(() => {
    return localStorage.getItem('access_token');
  }, []);

  return { signIn, signOut, getToken };
}
```

## 🛡️ Gestion des erreurs

```typescript
import { ApiError, careerMateAPI } from '@/lib/api-client';

try {
  const profile = await careerMateAPI.profile.getProfile(token);
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`Error ${error.statusCode}: ${error.message}`);
    console.error('Details:', error.errors);

    // Rediriger vers login si 401
    if (error.statusCode === 401) {
      window.location.href = '/login';
    }
  }
}
```

## 📋 Types disponibles

Tous les types TypeScript sont documentés dans `types.ts` et peuvent être importés:

```typescript
import {
  ProfileEntity,
  Step1PersonalInfoDto,
  AuthResponse,
  Gender,
  UserLevel,
  // ... etc
} from '@/lib/types';
```

## ✅ Validation des données

Les DTOs sont validés côté backend avec les validateurs suivants:

### Étape 1 (Infos Personnelles)
- `firstName` & `lastName`: chaîne non-vide
- `phone`: numéro tunisien valide (+216XXXXXXXX)
- `country`, `city`: chaîne non-vide
- `dateOfBirth`: date ISO 8601, âge minimum respecté
- `gender`: Male, Female, ou Other

### Étape 2 (Éducation)
- `startDate` < `endDate`
- Toutes les dates en format ISO 8601

### Étape 3 (Compétences)
- Au minimum 1 compétence
- Level: Beginner, Intermediate, Expert, Master

## 🔗 Configuration du middleware (Optionnel)

Pour ajouter le token JWT automatiquement à toutes les requêtes:

```typescript
// lib/api-client.ts
const token = typeof window !== 'undefined' 
  ? localStorage.getItem('access_token') 
  : null;

async function request<T>(
  endpoint: string,
  options: RequestOptions
): Promise<T> {
  // ... existing code ...
  
  if (token && !options.token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // ... rest of the code ...
}
```

## 🚨 Troubleshooting

| Erreur | Solution |
|--------|----------|
| `401 Unauthorized` | Token expiré ou invalide. Reconnecter l'utilisateur |
| `400 Bad Request` | Vérifier les données envoyées contre le type DTO |
| `Network error` | Vérifier que le backend est accessible et `NEXT_PUBLIC_API_URL` est correct |
| `Timeout` | Augmenter `API_TIMEOUT` dans api-client.ts |

## 📚 Ressources

- [NestJS Documentation](https://docs.nestjs.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [JWT Documentation](https://jwt.io)

---

**Développé pour CareerMate Platform** 🚀
