## Module Scope

The matching module wires these providers:

- `JobMatchingController`
- `JobMatchingService`
- `AIRerankerService`
- `SimpleEmbeddingService`
- `AdzunaAdapter`
- `TheMuseAdapter`

The database repositories used by the service are:

- `UserEntity`
- `ProfileEntity`
- `JobOfferEntity`

## Public Endpoints

### 1) Sync job sources for a user

`POST /job-matching/sources/sync`

Request body (`SyncJobSourcesDto`, all optional):

- `keywords?: string[]`
- `location?: string`
- `limitPerSource?: number` (default: `25`)
- `sources?: ('adzuna' | 'themuse')[]` (enum-validated)

Route behavior:

- **Requires JWT authentication.** User ID is extracted from the JWT token, not from the URL.
- If token is missing or invalid, returns `401 Unauthorized`.

### 2) Match jobs for a user

`POST /job-matching/match`

Request body (`RunJobMatchingDto`, all optional):

- `limit?: number` (default return size: `15`)
- `shortlistSize?: number` (service cap: `25`, DTO minimum validation: `5`)
- `sources?: ('adzuna' | 'themuse')[]` (enum-validated)

**Requires JWT authentication.** User ID is extracted from the JWT token, not from the URL.

## Execution Flow: Source Sync

Below is the exact runtime path for `POST /job-matching/sources/sync`.

1. Global `JwtAuthGuard` validates token and extracts `userId`.
2. Controller forwards request to `JobMatchingService.syncJobSources` with `userId` from JWT.
2. Service calls `withProfileSeed(...)` because `userId` is present.
3. `withProfileSeed` loads user with profile relation:
	- if profile does not exist, throws `NotFoundException('Profile not found for this user.')`.
4. Service builds effective query seed:
	- `manualKeywords`: sanitized request keywords.
	- `profileKeywords`: extracted from profile target roles + profile skills (up to 8 profile-derived terms).
	- merged deduplicated keywords: `manual + profile`.
	- location fallback: request location, else `"{user.city}, {user.country}"` if available.
5. Service selects adapters:
	- all adapters by default.
	- filtered subset when `sources` is provided.
6. Service fetches each source in parallel (`Promise.allSettled`):
	- a failing source does not fail the full sync.
	- only fulfilled results are kept.
7. All fetched jobs are merged and deduplicated by `sourceHash`.
8. For each canonical job, service ensures vector exists (`ensureVector`):
	- if missing, generates vector using `SimpleEmbeddingService.embedJob(...)`.
9. If nothing remains after dedup, return `{ inserted: 0, fetched: 0 }`.
10. Service queries existing `sourceHash` values from DB.
11. Filters out already-known offers by `sourceHash`.
12. If all fetched jobs already exist, return `{ inserted: 0, fetched: <deduplicatedFetchedCount> }`.
13. Saves only fresh jobs to `job_offer` table with status forced to `ACTIVE`.
14. Returns `{ inserted: freshJobs.length, fetched: jobs.length }`.

## Execution Flow: Matching

Below is the exact runtime path for `POST /job-matching/match`.

1. Global `JwtAuthGuard` validates token and extracts `userId`.
2. Controller calls `JobMatchingService.matchUser(userId, dto)`.
2. Service loads user with relations `profile` and `profile.projects`.
3. If profile missing, throws `NotFoundException('Profile not found for this user.')`.
4. Service builds profile snapshot with:
	- user identity and location,
	- profile bio / level / target position,
	- serialized experiences, education, languages, certifications,
	- flattened project summaries,
	- normalized skill names.
5. Service builds `profileText` using `buildProfileText(snapshot)`.
6. Service resolves profile embedding vector:
	- uses persisted `profile.profileVector` when present,
	- otherwise generates with `SimpleEmbeddingService.embedProfile(snapshot)` and persists it.
7. Service loads all job offers ordered by `postedAt DESC`.
8. Optional source filter applies (`sources` in request).
9. For each loaded job, `ensurePersistedVector` runs:
	- if vector exists, reuse it,
	- else generate one from canonicalized job text.
10. If no jobs after filtering, returns an empty `MatchResponse` with counts set to 0 and AI flags disabled.
11. Service computes deterministic semantic score for every job:
	- cosine similarity between profile vector and job vector,
	- value clamped to range `[0, 1]`.
12. Jobs are sorted by descending semantic score.
13. Shortlist is selected:
	- `shortlistSize = min(requestedShortlistSize ?? 25, 25)`.
14. Service calls AI reranker with:
	- compact profile text,
	- shortlist jobs including base metadata + deterministic score converted to percentage.
15. Service merges AI results onto shortlist by `jobId`.
16. For each shortlisted job:
	- `semanticScore` is deterministic `%` score.
	- `matchScore` uses AI `matchScore` if present, otherwise deterministic `%` score fallback.
	- missing AI fields fallback to safe defaults:
	  - `missingSkills = []`
	  - `improvementTips = []`
	  - `confidenceLevel = 'low'`
	  - `explanation = deterministic explanation`
17. Final matches are sorted by descending `matchScore`.
18. Response is truncated to `limit ?? 15`.
19. Response includes telemetry counters:
	- `scannedJobs`
	- `shortlistedJobs`
	- `aiRankingsCount`
	- `aiMatchedCount`
	- `aiEnabled = aiMatchedCount > 0`

## AI Reranking Internal Flow

`AIRerankerService.rerank(...)` behavior:

1. Reads runtime LLM configuration.
2. Builds a budgeted prompt (with compression strategy).
3. Calls chat completions endpoint and expects JSON array output only.
4. If context-length error occurs:
	- retries once with aggressive compression.
5. If call fails for other reasons:
	- logs warning and returns empty list.
6. Parses JSON array from raw output.
7. If parsing fails:
	- executes a JSON repair pass using a second LLM call,
	- retries parse on repaired output.
8. Normalizes each item:
	- validates `jobId`.
	- clamps `matchScore` into `[0, 100]`.
	- bounds confidence to `high|medium|low` else defaults to `low`.
	- cleans `missingSkills` / `improvementTips` arrays.
9. Returns normalized AI rows, or empty array on irrecoverable failures.

Important implication:

- Matching endpoint is resilient: if AI is unavailable, malformed, or partially valid, deterministic ranking still returns results.


## Vectorization and Scoring Details

Embedding implementation (`SimpleEmbeddingService`):

- deterministic local text hashing (not external embedding API),
- fixed 96 dimensions,
- token normalization and weighted bucket accumulation,
- final L2 normalization.

Scoring:

- cosine similarity from profile vector vs job vector,
- score clamped to `[0,1]`, then exposed as percentage with 2 decimals.

## Response Contract (Match)

Top-level fields:

- `userId`
- `scannedJobs`
- `shortlistedJobs`
- `aiEnabled`
- `aiRankingsCount`
- `aiMatchedCount`
- `matches`

Each item in `matches`:

- `jobId`
- `title`
- `company`
- `location`
- `remote`
- `contractType`
- `url`
- `source`
- `semanticScore`
- `matchScore`
- `missingSkills`
- `improvementTips`
- `confidenceLevel`
- `explanation`


## Practical Test Flow

1. Start PostgreSQL and configure DB environment variables.
2. Start the API (`npm run start:dev`).
3. Ensure target user exists and has a profile.
4. Call source sync endpoint for that user.
5. Call match endpoint for the same user.
6. Verify response counters (`scannedJobs`, `shortlistedJobs`, `aiRankingsCount`, `aiMatchedCount`) and `matches` payload.

## Key Source Files

- `src/modules/career/job-offer/matching/job-matching.module.ts`
- `src/modules/career/job-offer/matching/job-matching.controller.ts`
- `src/modules/career/job-offer/matching/job-matching.service.ts`
- `src/modules/career/job-offer/matching/ai-reranker.service.ts`
- `src/modules/career/job-offer/matching/simple-embedding.service.ts`
- `src/modules/career/job-offer/matching/adapters/adzuna.adapter.ts`
- `src/modules/career/job-offer/matching/adapters/themuse.adapter.ts`
- `src/modules/career/job-offer/job-offer.entity.ts`
- `src/modules/profile/entities/profile.entity.ts`

## Postman Testing Guide

### Prerequisites

1. Start the API: `npm run start:dev`
2. Have a valid JWT token from `/auth/signin` or `/auth/google`
3. Database must be running with a user record and associated profile

### Setup in Postman

1. **Create a collection** for job matching tests
2. **Add Authorization header manually** to each request (Postman variable or Bearer token):
   - Header: `Authorization: Bearer <your-jwt-token>`
3. Alternative: Use Postman's Bearer Token auth tab

### Test 1: Sync Job Sources

**Request:**
```
POST http://localhost:3000/job-matching/sources/sync
Content-Type: application/json
Authorization: Bearer <jwt-token>

```


### Test 2: Match Jobs

**Request:**
```
POST http://localhost:3000/job-matching/match
Content-Type: application/json
Authorization: Bearer <jwt-token>


```

**Expected Response:**
```json
{
  "userId": "<user-id>",
  "scannedJobs": 42,
  "shortlistedJobs": 20,
  "aiEnabled": true,
  "aiRankingsCount": 3,
  "aiMatchedCount": 3,
  "matches": [
    {
      "jobId": "<id>",
      "title": "Senior Backend Engineer",
      "company": "TechCorp",
      "location": "Paris",
      "remote": true,
      "contractType": "CDI",
      "url": "https://...",
      "source": "adzuna",
      "semanticScore": 87.5,
      "matchScore": 92,
      "missingSkills": ["Kubernetes"],
      "improvementTips": ["Learn container orchestration"],
      "confidenceLevel": "high",
      "explanation": "Great fit..."
    }
  ]
}

```

### LLM Prompt Budget Variables

| Variable | Current Value | Code Default (normal / aggressive) | Floor | Used By | Purpose |
|----------|--------------|-------------------------------------|-------|---------|---------|
| `LLM_MAX_INPUT_TOKENS` | `2000` | `22000` / `12000` | `2000` | `AIRerankerService.getPromptBudgetConfig()` | **Maximum estimated input token budget.** Multiplied by `APPROX_CHARS_PER_TOKEN` (4) to get the max prompt character count. The budgeted prompt builder iteratively trims jobs, descriptions, and profile text until the prompt fits. |
| `LLM_MAX_PROFILE_CHARS` | `2000` | `5000` / `2000` | `500` | `AIRerankerService.getPromptBudgetConfig()` | Maximum characters of the candidate's profile text to include in the prompt. Profile text is truncated to this length before the budget loop begins. |
| `LLM_MAX_JOB_DESCRIPTION_CHARS` | `500` | `1200` / `400` | `150` | `AIRerankerService.getPromptBudgetConfig()` | Maximum characters per job description in the prompt. Each job's `description` field is truncated to this value. The budget loop may reduce this further (by 20% per iteration, floor 150). |
| `LLM_MAX_RERANK_JOBS` | *(not set)* | `20` / `8` | `3` | `AIRerankerService.getPromptBudgetConfig()` | Maximum number of jobs to include in the prompt (before budget trimming). The budget loop may further reduce this (by 2 per iteration, floor 3). |


### Job Matching Pipeline Variables

| Variable | Current Value | Code Default | Floor | Used By | Purpose |
|----------|--------------|-------------|-------|---------|---------|
| `JOB_MATCHING_SCAN_LIMIT` | `200` | `200` | `50` | `JobMatchingService.matchUser()` | Maximum number of job offers loaded from the database (via `take: scanLimit`). Jobs are sorted by `postedAt DESC`, so this effectively means "scan the 200 most recent jobs." |
| `JOB_MATCHING_DEFAULT_SHORTLIST_SIZE` | `10` | `6` | `5` | `JobMatchingService.matchUser()` | Default number of top-scoring jobs (by cosine similarity) sent to the AI reranker when the client doesn't specify `shortlistSize`. |
| `JOB_MATCHING_MAX_SHORTLIST_SIZE` | `20` | `10` | *equals default* | `JobMatchingService.matchUser()` | Upper bound for `shortlistSize`. Even if the client requests more, this caps it. The code enforces `maxShortlistSize ≥ defaultShortlistSize`. |