# Profile Module - Implementation Guide

## 📦 Overview

The Profile Module implements a complete multi-step wizard API for user onboarding. Users create their professional profile through 7 steps and can update each step independently.

## 🗂️ File Structure

```
src/modules/profile/
├── dtos/
│   ├── create-profile.dto.ts          # Complete profile DTO
│   ├── step1-personal-info.dto.ts     # Personal information
│   ├── step2-education.dto.ts         # Education & user level
│   ├── step3-skills.dto.ts            # Skills with categories
│   ├── step4-experiences.dto.ts       # Work experiences
│   ├── step5-projects.dto.ts          # Projects
│   ├── step6-languages.dto.ts         # Languages
│   ├── step7-certifications.dto.ts    # Certifications
│   └── index.ts                       # Barrel export
├── pipes/
│   ├── validate-phone.pipe.ts         # Phone number validation
│   ├── validate-age-minimum.pipe.ts   # Age validation (16+)
│   ├── validate-skills.pipe.ts        # Skills array validation
│   └── validate-dates.pipe.pipe       # Date range validation
├── entities/
│   ├── profile.entity.ts              # Profile entity (TypeORM)
│   ├── projet.entity.ts               # Project entity
│   └── cv.entity.ts                   # CV entity
├── profile.controller.ts              # API endpoints
├── profile.service.ts                 # Business logic
└── profile.module.ts                  # Module definition
```

## 🚀 Features

### 1. Multi-Step Wizard
- **7 Comprehensive Steps** for complete profile creation
- **Individual Step Updates** - Update any step independently
- **All-at-Once Creation** - Submit complete profile in one request



### 3. Comprehensive Validation
- **Phone Numbers**: tunisien format validation
- **Age**: Minimum 16 years old
- **Date Ranges**: Start date < End date, not in future
- **Skills**: No duplicates, max 50 skills, max 50 char names

### 4. Profile Scoring
Automatic scoring based on profile completion:
- Bio (10 pts) + Education (15 pts) + Skills (20 pts)
- Experiences (20 pts) + Languages (10 pts) + Certifications (5 pts)
- Goals (10 pts) = Maximum 100 points

