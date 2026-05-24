# Profile Module - Implementation Guide

## 📦 Overview

The Profile Module implements a complete **8-step progressive wizard API** for user onboarding. Users create their professional profile step-by-step and can update each step independently. Each step builds upon the previous one, allowing users to save progress incrementally.

## 🗂️ File Structure

```
src/modules/profile/
├── dtos/
│   ├── create-profile.dto.ts          # Complete profile DTO
│   ├── step1-personal-info.dto.ts     # Personal information
│   ├── step2-education.dto.ts         # Education & user level
│   ├── step3-skills.dto.ts            # Skills with proficiency levels
│   ├── step4-experiences.dto.ts       # Work experiences
│   ├── step5-projects.dto.ts          # Projects with tech stack
│   ├── step6-languages.dto.ts         # Languages with CEFR levels
│   ├── step7-certifications.dto.ts    # Certifications
│   ├── target-profile-validation.dto.ts # Career goals & preferences
│   └── index.ts                       # Barrel export
├── pipes/
│   ├── validate-phone.pipe.ts         # Phone number validation
│   ├── validate-age-minimum.pipe.ts   # Age validation (16+)
│   ├── validate-skills.pipe.ts        # Skills array validation
│   └── validate-dates.pipe.ts         # Date range validation
├── entities/
│   ├── profile.entity.ts              # Profile entity (TypeORM)
│   ├── projet.entity.ts               # Project entity (separate table)
│   └── cv.entity.ts                   # CV entity
├── profile.controller.ts              # API endpoints
├── profile.service.ts                 # Business logic
└── profile.module.ts                  # Module definition
```

## 🚀 Features

### 1. 8-Step Progressive Wizard
Users complete their profile through 8 independent steps:

| Step | Endpoint | Description | Required |
|------|----------|-------------|----------|
| 1 | `POST /profile` | Personal Information | ✅ Yes |
| 2 | `PUT /profile/step/2` | Education History | ✅ Yes |
| 3 | `PUT /profile/step/3` | Skills & Expertise | ✅ Yes (min 3) |
| 4 | `PUT /profile/step/4` | Work Experiences | ✅ Yes |
| 5 | `PUT /profile/step/5` | Projects Portfolio | ✅ Yes |
| 6 | `PUT /profile/step/6` | Languages | ⭕ Optional |
| 7 | `PUT /profile/step/7` | Certifications | ⭕ Optional |
| 8 | `PUT /profile/step/8` | Career Goals & Preferences | ⭕ Optional |

### 2. Step-by-Step Details

#### **Step 1: Personal Information**
```json
{
  "firstName": "string",
  "lastName": "string", 
  "phone": "+21625123456",  // Tunisian format
  "country": "string",
  "city": "string",
  "dateOfBirth": "YYYY-MM-DD",
  "gender": "male|female|other"
}
```

#### **Step 2: Education**
```json
{
  "userLevel": "Junior|Intermediate|Senior",
  "education": [
    {
      "degree": "Licence Informatique",
      "institution": "Université de Tunis",
      "field": "Computer Science",
      "startDate": "2020-09-01",
      "endDate": "2023-06-30",
      "location": "Tunis"
    }
  ]
}
```

#### **Step 3: Skills**
```json
{
  "skills": [
    {
      "name": "React",
      "level": "beginner|intermediate|advanced|expert"
    }
  ]
}
// Minimum 3 skills required
```

#### **Step 4: Work Experiences**
```json
{
  "experiences": [
    {
      "title": "Senior Developer",
      "company": "TechCorp",
      "location": "Tunis",
      "startDate": "2023-07-01",
      "endDate": "2024-12-31",
      "description": "..."
    }
  ]
}
```

#### **Step 5: Projects (Multiple Projects Support)**
```json
{
  "projects": [
    {
      "title": "E-Commerce Platform",
      "context": "Projet personnel|freelance|scolaire",
      "description": "Full-stack e-commerce with React & Node.js",
      "techStack": ["React", "Node.js", "MongoDB", "Stripe"],
      "projectUrl": "https://github.com/ahmed/ecommerce",
      "date": "2024-06-15"
    }
    // Multiple projects saved to database
  ]
}
```
**Important:** All projects in the array are created/updated in the database. Previous projects not in the list are deleted.

#### **Step 6: Languages**
```json
{
  "languages": [
    {
      "language": "English",
      "level": "A1|A2|B1|B2|C1|C2|native",  // CEFR levels
      "certificate": "https://..." // Optional
    }
  ]
}
```

#### **Step 7: Certifications**
```json
{
  "certifications": [
    {
      "name": "AWS Solutions Architect",
      "organization": "Amazon Web Services",
      "date": "2024-06-20",
      "domain": "Cloud Architecture",
      "context": "Professional Development",
      "url": "https://..."
    }
  ]
}
```

#### **Step 8: Career Goals & Preferences**
```json
{
  "targetPosition": ["Senior Full Stack Developer", "Tech Lead"],
  "preferredLocations": ["Tunis", "Remote"],
  "salaryExpectation": {
    "min": 2500,
    "max": 4000,
    "type": "net|gross"
  },
  "preferredContractTypes": [
    {
      "type": "cdi|cdd|stage|freelance|interim",
      "preferred": true
    }
  ],
  "remotePreference": {
    "type": "full_remote|hybrid|onsite",
    "flexible": true
  },
  "availability": "immediate|two_weeks|one_month|two_months|three_months",
  "sectorPreferences": [
    {
      "name": "Technology",
      "interest": "not_interested|somewhat_interested|very_interested",
      "weight": 1-5
    }
  ]
}
```

### 3. API Endpoints

#### **Create Profile (Step 1)**
```http
POST /api/profile
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "step1": { /* personal info */ },
  "bio": "Optional bio"
}
```

#### **Update Any Step**
```http
PUT /api/profile/step/{1-8}
Authorization: Bearer {{token}}
Content-Type: application/json

{ /* step data */ }
```

#### **Get Full Profile**
```http
GET /api/profile
Authorization: Bearer {{token}}
```

#### **Get Profile Summary**
```http
GET /api/profile/summary
Authorization: Bearer {{token}}

// Returns:
{
  "profileScore": 75,
  "completionPercentage": 85,
  "summary": { /* all steps data */ }
}
```

#### **Update Complete Profile**
```http
PUT /api/profile
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "step1": { /* ... */ },
  "step2": { /* ... */ },
  "step3": { /* ... */ }
  // Can include any combination of steps
}
```

### 4. Comprehensive Validation

| Field | Validation | Rule |
|-------|-----------|------|
| Phone | Format | Must be Tunisian format: +216xxxxxxxx |
| Age | Minimum | Must be 16+ years old |
| Dates | Range | startDate < endDate, not in future |
| Skills | Array | Min 3, Max 50, unique names, max 50 chars |
| Projects | Unique | Names must be unique |
| Languages | CEFR | A1-C2 or native |

### 5. Projects Handling

**Key Feature:** `updateProjects()` method properly handles **multiple projects**:
- ✅ Creates all new projects in the database
- ✅ Updates existing projects if `projectId` provided
- ✅ Deletes projects no longer in the incoming list
- ✅ Stores projects in separate `project` table with foreign key to profile

```typescript
// Database structure:
Profile (1) ──── (N) Project
  ├── id
  ├── firstName
  └── projects[] ──→ Project
                    ├── id
                    ├── title
                    ├── techStack
                    └── profileId (FK)
```

### 6. Profile Scoring

Automatic calculation based on completion:

| Component | Points | Calculation |
|-----------|--------|-------------|
| Profile Created | 20 | Base points |
| Bio | 10 | If present |
| Education | 15 | Per entry (max 30) |
| Skills | 20 | Min 3 skills = 20 pts |
| Experiences | 20 | Per entry (max 40) |
| Projects | 10 | If exists |
| Languages | 10 | Per language (max 20) |
| Certifications | 5 | Per cert (max 20) |
| **Maximum** | **100** | |

**Completion Percentage** = (Completed Steps / 8) × 100

### 7. Error Handling

```typescript
// Common errors:
{
  "statusCode": 400,
  "message": "Failed to create profile: ...",
  "error": "Bad Request"
}

// Validation errors return specific details
{
  "statusCode": 400,
  "message": "Profile validation failed",
  "errors": [
    "Phone must be in Tunisian format",
    "Age must be at least 16",
    "Skills must contain at least 3 items"
  ]
}
```

## 📝 Implementation Notes

### TypeORM Relations
- **Profile ↔ Projects**: One-to-Many relation with cascade delete
- **Profile ↔ User**: One-to-One relation
- **Projects stored in separate table**: Allows multiple projects per profile

### Transaction Safety
- `updateProjects()` uses transaction-like logic:
  1. Fetch existing projects
  2. Delete old projects
  3. Create/Update new projects
  4. Return updated profile with relations

### Validation Pipes
Applied automatically on POST/PUT requests:
- `ValidateAgeMinimumPipe` - Step 1
- `ValidateDatesPipe` - Steps 2, 4
- `ValidateSkillsPipe` - Step 3
- `ValidateTargetProfilePipe` - All requests (controller level)

## 🔄 Typical Flow

```
1. User creates account
   ↓
2. POST /profile (Step 1: Personal Info)
   ↓
3. PUT /profile/step/2 (Education)
   ↓
4. PUT /profile/step/3 (Skills)
   ↓
5. PUT /profile/step/4 (Experiences)
   ↓
6. PUT /profile/step/5 (Projects) ← Multiple projects supported
   ↓
7. PUT /profile/step/6 (Languages) [Optional]
   ↓
8. PUT /profile/step/7 (Certifications) [Optional]
   ↓
9. PUT /profile/step/8 (Career Goals) [Optional]
   ↓
10. GET /profile/summary (View final score)
```

## 🧪 Testing

Use the provided `profile-api-examples.http` file for testing all endpoints with example payloads.

