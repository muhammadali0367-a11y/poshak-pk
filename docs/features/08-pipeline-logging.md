# Feature: Pipeline Run Logging

## 1. What It Does

Records the outcome of every nightly pipeline run in a dedicated Supabase table (`pipeline_runs`). Instead of digging through Railway's ephemeral logs to figure out what happened last night, you can query a permanent log that shows exactly when the pipeline ran, how many products were processed, how many were marked out of stock, and whether any errors occurred.

This is Poshak's observability layer — lightweight, zero-cost, and queryable with SQL.

---

## 2. How It Works Technically

### Table Schema

```sql
CREATE TABLE pipeline_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  products_uploaded INTEGER DEFAULT 0,
  products_embedded INTEGER DEFAULT 0,
  products_out_of_stock INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running',
  notes TEXT
);
```

### Logging Flow

At the start of `upload_to_supabase.py`:
1. Inserts a new row with `status = 'running'` and `started_at = NOW()`.
2. Stores the row's UUID for later updates.

During processing:
3. Increments `products_uploaded` as products are upserted.
4. Increments `products_embedded` as embeddings are generated.
5. Increments `errors` on any failed operations.

At the end:
6. Runs `mark_out_of_stock` and records the count in `products_out_of_stock`.
7. Updates the row with `finished_at = NOW()` and `status = 'success'` (or `'failed'`).
8. Writes any error messages to `notes`.

### Querying the Logs

```sql
-- Last 5 pipeline runs
SELECT * FROM pipeline_runs ORDER BY started_at DESC LIMIT 5;

-- Check if last night's run succeeded
SELECT status, products_uploaded, products_out_of_stock, errors
FROM pipeline_runs ORDER BY started_at DESC LIMIT 1;

-- Average products per run over the last week
SELECT AVG(products_uploaded) FROM pipeline_runs
WHERE started_at > NOW() - INTERVAL '7 days';
```

---

## 3. Files / Components Involved

| File | Role |
|---|---|
| `upload_to_supabase.py` | Writes to `pipeline_runs` at start and end of each upload cycle. |
| Supabase `pipeline_runs` table | Stores all pipeline run records. |

---

## 4. APIs Used

| API | Purpose |
|---|---|
| Supabase REST (insert + update) | Write pipeline run records |

No additional cost — uses the existing Supabase free tier.

---

## 5. Edge Cases

- **Pipeline crashes mid-run:** The row gets inserted at the start with `status = 'running'`, but if the script crashes before the final update, the row stays as `'running'` forever. Querying `WHERE status = 'running' AND started_at < NOW() - INTERVAL '24 hours'` identifies stale runs.
- **Multiple simultaneous runs:** If two pipeline instances run simultaneously (e.g., cron trigger + manual trigger), both insert separate rows. The data itself may be inconsistent (both writing to the products table), but the log accurately reflects that two runs occurred.
- **Error details lost:** The `notes` field captures error messages, but stack traces and full context are only in Railway's logs. If Railway's logs expire, the debugging information is gone.

---

## 6. How to Improve

- **Per-brand breakdown:** Add a `brand_stats` JSONB column that records product counts per brand (e.g., `{"khaadi": 2100, "gul_ahmed": 3500, ...}`). This immediately surfaces which brand's scraper failed.
- **Duration tracking per step:** Log when each step (scrape, convert, upload) started and finished. Helps identify bottlenecks and performance regressions.
- **Alerting:** Query `pipeline_runs` from a simple cron job — if the latest run has `status != 'success'` or `products_uploaded < previous_run * 0.5`, send a notification (email, Slack webhook).
- **Stale run cleanup:** A scheduled SQL function that automatically marks any `'running'` status older than 24 hours as `'crashed'`.
- **Dashboard:** A simple admin page on the website that displays a table of recent pipeline runs with status indicators. Useful for at-a-glance health monitoring without opening Supabase.
