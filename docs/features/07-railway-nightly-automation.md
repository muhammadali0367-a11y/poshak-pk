# Feature: Railway Nightly Automation

## 1. What It Does

Runs the entire scraping pipeline automatically every night at 12:00 AM PKT without any human intervention. Before Railway, the pipeline had to run on a local laptop — meaning the laptop had to stay on for 12+ hours, couldn't go to sleep, and required manual triggering. Railway replaces this with a cloud server that runs on a schedule, always-on, with consistent performance.

---

## 2. How It Works Technically

### Railway Setup

- **Service type:** Cron job (not a web service)
- **GitHub integration:** Connected to the private `poshak-scraper` repository. Every `git push` triggers a new deployment.
- **Build system:** Nixpacks (Railway's default) — auto-detects Python, installs dependencies from `requirements.txt`.
- **Cron schedule:** `0 19 * * *` UTC = 12:00 AM PKT (Pakistan is UTC+5)

### Pipeline Execution (`run_pipeline.sh`)

The shell script chains four steps:

```bash
#!/bin/bash
set -e  # Exit on any error

# Step 1: Refresh Khaadi cookies (~2 min)
python khaadi_setup.py

# Step 2: Run scraper (~10-11 hours)
python scraper.py

# Step 3: Run converter with GPT enrichment (~30-40 min)
python convert.py

# Step 4: Upload to Supabase + embed to Pinecone (~30-40 min)
python upload_to_supabase.py
```

`set -e` means if any step fails, the entire pipeline stops. This prevents uploading bad data from a failed scraper.

### `railway.json` Configuration

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "bash run_pipeline.sh",
    "restartPolicyType": "NEVER",
    "cronSchedule": "0 19 * * *"
  }
}
```

- **`restartPolicyType: NEVER`** — The pipeline runs once and exits. Railway doesn't restart it (the next run is triggered by the cron schedule).
- **`startCommand`** — Points to the shell script that chains all four steps.

### Environment Variables (set in Railway dashboard)

```
SUPABASE_URL
SUPABASE_KEY (service role)
OPENAI_API_KEY
PINECONE_API_KEY
PINECONE_INDEX_NAME=poshak-products
PINECONE_ENVIRONMENT=us-east-1
```

### Playwright on Railway

Railway's Nixpacks environment doesn't include Chromium by default. The pipeline installs it at runtime:
```bash
playwright install chromium
playwright install-deps chromium
```

This adds ~30 seconds to pipeline startup but ensures the latest Chromium version is always used.

---

## 3. Files / Components Involved

| File | Role |
|---|---|
| `run_pipeline.sh` | Entry point. Chains all four pipeline steps sequentially. |
| `railway.json` | Railway deployment config — build system, cron schedule, start command. |
| `requirements.txt` | Python dependencies installed by Nixpacks during build. |
| `khaadi_setup.py` | Step 1 — cookie refresh |
| `scraper.py` | Step 2 — product scraping |
| `convert.py` | Step 3 — GPT enrichment + UUID generation |
| `upload_to_supabase.py` | Step 4 — database upload + embedding |
| GitHub `poshak-scraper` (private) | Source repo Railway deploys from |

---

## 4. APIs Used

| Service | Purpose | Cost |
|---|---|---|
| Railway.app (Hobby plan) | Hosts and schedules the pipeline | $5/month |
| GitHub | Source code repository for Railway deployments | Free |

All other APIs (OpenAI, Pinecone, Supabase) are called by the individual pipeline scripts, not by Railway itself.

---

## 5. Edge Cases

- **Pushing code while pipeline is running restarts it from zero.** Railway deploys on every `git push`. If the pipeline is mid-scrape (hour 6 of 11) and you push a code change, Railway kills the running process and starts a new deployment. The scrape is lost. There is no lock mechanism or graceful shutdown. Treat pipeline runs as a critical section — avoid pushing during the 12AM–12PM PKT window.
- **Pipeline exceeds Railway's execution time limit.** The Hobby plan allows long-running processes, but extremely slow scrapes (e.g., a brand's server being very slow) could push the pipeline beyond 24 hours, potentially overlapping with the next cron trigger. Railway's behavior in this case is undefined.
- **Nixpacks build failures.** Occasionally, Railway's build step fails due to dependency resolution issues (e.g., Playwright version conflicts). The pipeline never starts. Check Railway's build logs if the cron appears to have not run.
- **Environment variable changes.** If you rotate an API key (e.g., OpenAI key), you must update it in BOTH Railway's dashboard AND any local `.env` files. Forgetting Railway causes silent pipeline failures.
- **Cron timezone confusion.** Railway cron runs on UTC. `0 19 * * *` is midnight PKT, but during Pakistan's occasional daylight saving experiments, the offset could shift. Currently, Pakistan doesn't observe DST, so this is stable.

---

## 6. How to Improve

- **Deploy freeze during pipeline runs.** Add a GitHub Actions workflow that checks if the Railway pipeline is currently running (via the `pipeline_runs` table in Supabase) and blocks merges/deploys during that window.
- **Slack/email notifications.** Send a notification when the pipeline finishes (success or failure) with a summary: products uploaded, products marked out of stock, errors. Currently, you have to manually check Railway logs or the `pipeline_runs` table.
- **Retry failed steps.** Instead of `set -e` (exit on any failure), implement per-step retry logic. If `scraper.py` fails for one brand, retry that brand before moving to `convert.py`. If `convert.py` hits an OpenAI outage, wait 10 minutes and retry.
- **Resource monitoring.** Track Railway's CPU and memory usage during pipeline runs. Playwright + scraping can spike memory — knowing the baseline helps you right-size the plan.
- **Staging pipeline.** Run a separate "test" pipeline on a branch that scrapes only 1–2 brands. Use this for validating scraper changes before pushing to the main pipeline that runs the full catalog.
- **Pipeline duration tracking.** Log the duration of each step (scrape, convert, upload) separately in `pipeline_runs`. Helps identify which step is getting slower over time and needs optimization.
