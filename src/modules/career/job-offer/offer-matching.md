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

`POST /job-matching/users/:userId/sources/sync`

Request body (`SyncJobSourcesDto`, all optional):

- `keywords?: string[]`
- `location?: string`
- `limitPerSource?: number` (default: `25`)
- `sources?: ('adzuna' | 'themuse')[]`

Route behavior:

- `userId` is always forced from the URL path, then passed to `syncJobSources`.

### 2) Match jobs for a user

`POST /job-matching/users/:userId/match`

Request body (`RunJobMatchingDto`, all optional):

- `limit?: number` (default return size: `15`)
- `shortlistSize?: number` (service cap: `25`, DTO minimum validation: `5`)
- `sources?: ('adzuna' | 'themuse')[]`

## Execution Flow: Source Sync

Below is the exact runtime path for `POST /job-matching/users/:userId/sources/sync`.

1. Controller forwards request to `JobMatchingService.syncJobSources` with `userId` from route.
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

Below is the exact runtime path for `POST /job-matching/users/:userId/match`.

1. Controller calls `JobMatchingService.matchUser(userId, dto)`.
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

- `src/modules/matching/job-matching.module.ts`
- `src/modules/matching/job-matching.controller.ts`
- `src/modules/matching/job-matching.service.ts`
- `src/modules/matching/ai-reranker.service.ts`
- `src/modules/matching/simple-embedding.service.ts`
- `src/modules/matching/adapters/adzuna.adapter.ts`
- `src/modules/matching/adapters/themuse.adapter.ts`
- `src/modules/career/job-offer/job-offer.entity.ts`
- `src/modules/profile/entities/profile.entity.ts`
