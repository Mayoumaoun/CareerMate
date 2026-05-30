# 🔐 Refresh Token Implementation

## 📋 Overview

Le système d'authentification de CareerMate utilise maintenant un système **deux-tokens** pour sécuriser l'accès :

1. **Access Token** - Token JWT court terme (15 minutes par défaut)
2. **Refresh Token** - Token JWT long terme (7 jours par défaut), stocké en base de données

## 🔄 Flux d'authentification

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Login (POST /auth/signin)                                │
│    - Email + Password                                       │
│    - Retourne: access_token + refresh_token                │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Utiliser l'Access Token                                  │
│    - Authorization: Bearer <access_token>                   │
│    - Valide pendant 15 minutes                              │
└─────────────────────────────────────────────────────────────┘
                        ↓ (après 15 min)
┌─────────────────────────────────────────────────────────────┐
│ 3. Renouveler le token (POST /auth/refresh)                │
│    - Authorization: Bearer <refresh_token>                  │
│    - Retourne: nouvel access_token                          │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Configuration requise

Ajouter les variables d'environnement dans `.env` :

```env
# JWT Authentication
JWT_TOKEN_SIGN_IN="votre-secret-access-token-très-long"
JWT_TOKEN_REFRESH="votre-secret-refresh-token-très-long-et-différent"
JWT_EXPIRES_IN=15m              # Expiration access token
JWT_REFRESH_EXPIRES_IN=7d       # Expiration refresh token
```

⚠️ **Important** : Les deux secrets doivent être différents et très sécurisés !

Générer des secrets sécurisés :
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 📌 Endpoints d'authentification

### 1. Sign Up (Inscription)
```http
POST /auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "john_doe",
  "password": "secure_password"
}
```

### 2. Sign In (Connexion)
```http
POST /auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}

Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": "15m"
}
```

### 3. Refresh Token (Renouveler)
```http
POST /auth/refresh
Authorization: Bearer <refresh_token>

Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": "15m"
}
```

## 💻 Utilisation côté Frontend

### Exemple avec JavaScript/TypeScript

```typescript
// 1. Login
const loginResponse = await fetch('/auth/signin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { access_token, refresh_token } = await loginResponse.json();

// Sauvegarder les tokens (attention: localStorage est plus secure que sessionStorage)
localStorage.setItem('access_token', access_token);
localStorage.setItem('refresh_token', refresh_token);

// 2. Utiliser l'access token pour les requêtes
const response = await fetch('/profile', {
  headers: { 'Authorization': `Bearer ${access_token}` }
});

// 3. Si 401 Unauthorized, renouveler
if (response.status === 401) {
  const refreshResponse = await fetch('/auth/refresh', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${refresh_token}` }
  });
  
  const { access_token: newAccessToken } = await refreshResponse.json();
  localStorage.setItem('access_token', newAccessToken);
  
  // Réessayer la requête
  const retryResponse = await fetch('/profile', {
    headers: { 'Authorization': `Bearer ${newAccessToken}` }
  });
}
```

### Avec Axios et Interceptors

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000'
});

// Interceptor pour ajouter le token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor pour renouveler le token si 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');
      const { data } = await axios.post('/auth/refresh', {
        headers: { Authorization: `Bearer ${refreshToken}` }
      });

      localStorage.setItem('access_token', data.access_token);
      originalRequest.headers.Authorization = `Bearer ${data.access_token}`;

      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default api;
```

## 🔒 Bonnes pratiques de sécurité

1. **Stockage sécurisé** :
   - ✅ Utiliser `localStorage` (accès JS seulement)
   - ❌ Éviter les cookies sans `httpOnly`
   - ❌ Jamais dans le code source

2. **HTTPS obligatoire** en production

3. **Secrets forts** :
   - Minimum 32 caractères
   - Mélange de lettres, chiffres, caractères spéciaux

4. **Rotation des tokens** :
   - Access token court (15 min - 1 heure)
   - Refresh token long (7 j - 30 j)

5. **Logout** :
   - Supprimer les tokens du localStorage
   - Supprimer le refreshToken de la base de données (optionnel)

## 📊 Schéma base de données

Le champ `refreshToken` a été ajouté à la table `user` :

```sql
ALTER TABLE "user" ADD COLUMN "refreshToken" character varying;
```

Avec TypeORM et `synchronize: true`, cette modification est automatique.

## 🐛 Dépannage

### Erreur: "JWT_TOKEN_REFRESH is missing"
→ Ajouter `JWT_TOKEN_REFRESH` dans le fichier `.env`

### 401 Unauthorized lors du refresh
→ Vérifier que le `refresh_token` n'a pas expiré (7 jours)

### Token expiré mais pas renouvellé
→ S'assurer que le frontend envoie le refresh token avec le header `Authorization: Bearer <token>`

## 📚 Fichiers modifiés

- ✅ [user.entity.ts](../../user/entities/user.entity.ts) - Ajout du champ `refreshToken`
- ✅ [refresh.strategy.ts](./Passport/refresh.strategy.ts) - Nouvelle stratégie Passport
- ✅ [auth.service.ts](./auth.service.ts) - Méthodes de génération des tokens
- ✅ [auth.controller.ts](./auth.controller.ts) - Endpoint `/auth/refresh`
- ✅ [auth.module.ts](./auth.module.ts) - Configuration des modules JWT
- ✅ [.env.example](.../.env.example) - Variables d'environnement
