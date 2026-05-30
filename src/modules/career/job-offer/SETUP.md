# Job Offers Module - Configuration & Setup Guide

This guide outlines the necessary steps, environment variables, and background services required to successfully run and test the `job-offer` module in a local development environment.

---

## 1. Environment Variables (.env)

Your NestJS `.env` file must include the following keys for the module's AI and caching components to function:

```env
# LLM API Key - Required by MatchExplainerService 
still under construction :)

# Redis Configuration (Used for caching queries and explanations)
REDIS_HOST="localhost"
REDIS_PORT=6379
```

---

## 2. Database Configuration (pgvector)

The `JobNormalizerService` generates high-dimensional embeddings for jobs and profiles. The database requires the `pgvector` extension to store and search these vectors efficiently.

1. Ensure your PostgreSQL instance has `pgvector` installed.
2. Connect to your database using pgAdmin, DBeaver, or psql.
3. Run the following SQL command to enable the extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

---

## 3. Running the Python Scraper Service

The NestJS `KeejobsAdapter` relies on a separate Python FastAPI scraper service to fetch raw data. If the scraper is not running, scheduled and manual syncs will fail with `404` or connection errors.

1. Navigate to the Python scraper directory.
2. Install the requirements (if not already done):
   ```bash
   pip install -r requirements.txt
   ```
3. Start the FastAPI server (typically running on port 8000):
   ```bash
   uvicorn keejob_scraper:app --reload
   ```
   *(Ensure the local URL matches what the NestJS adapters expect, e.g., `http://localhost:8000/scrape/keejob`)*

---

## 4. Populating Data (Admin Endpoints)

By default, the job fetching jobs are scheduled via `@Cron` to run at 1 AM and 2 AM. If you are setting up the project locally for the first time, your database will be empty. 

You can manually trigger the background workers to fetch, normalize, and store jobs using the Admin Endpoints via Postman or Curl.

**Note:** The normalization process uses `@xenova/transformers` (`all-MiniLM-L6-v2`), which will download the model weights (~80MB) automatically the first time it runs.

### Sync JSearch
**Endpoint:** `POST /admin/jobs/sync-jsearch`
**Description:** Triggers the JSearch API fetcher in the background.

```bash
curl -X POST http://localhost:3000/admin/jobs/sync-jsearch
```

### Sync Keejobs (Requires Scraper running)
**Endpoint:** `POST /admin/jobs/sync-keejobs`
**Description:** Triggers the Keejobs local Python scraper adapter.

```bash
curl -X POST http://localhost:3000/admin/jobs/sync-keejobs
```

*(Both endpoints return a `200 OK` immediately while the fetching and embedding continues in the background.)*

---