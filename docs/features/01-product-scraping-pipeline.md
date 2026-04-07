# Feature: Product Scraping Pipeline

## 1. What It Does

Fetches the complete product catalog from ~15 Pakistani fashion brand websites every night and outputs a single consolidated JSON file. This is the first step in Poshak.pk's data pipeline — everything downstream (enrichment, upload, search indexing) depends on the scraper producing a clean, deduplicated snapshot of what's currently live on each brand's site.

The scraper handles two fundamentally different platform types: Shopify (used by ~14 brands) and Salesforce Commerce Cloud / SFCC (used by Khaadi). Each requires its own scraping strategy. The output is always the same: `output/all_brands_poshak.json`.

---

## 2. How It Works Technically

### Shopify Brands (~14 brands)

Shopify stores expose a public JSON API. The scraper exploits this in two passes:

**Pass 1 — Discover all collections:**
Hits `{base_url}/collections.json?limit=250&page=N`, paginates until no more collections are returned. Each collection has a handle (e.g., `/lawn`, `/unstitched`, `/sale`).

**Pass 2 — Scrape products from each collection:**
For each collection, hits `{base_url}/collections/{handle}/products.json?limit=250&page=N`. Paginates until all products are fetched. Each product yields: name, price, images, handle, tags, product_type, and vendor.

**Deduplication:** Products appearing in multiple collections (e.g., a dress in both "Lawn" and "New Arrivals") are deduplicated by product handle within each brand. The scraper tracks seen handles in a set and skips any product it's already captured. The log message "121 new" means 121 products from that collection hadn't been seen in any earlier collection.

### Khaadi (SFCC)

Khaadi doesn't expose a JSON API. The scraper hits SFCC's `Search-UpdateGrid` endpoint with category group IDs (cgids) and parses the returned HTML.

**Category IDs (cgids):** Hardcoded in slug format — `003-Ready-To-Wear`, `002-Fabrics`, `001-New-In`, `008-Sale`. These were discovered by inspecting Khaadi's network requests in browser DevTools. Old numeric cgids (like `001002`, `014003`) no longer work after Khaadi restructured their site.

**HTML Parsing:** Targets `div.product[data-pid]` elements. Extracts product name and price from the `data-gtmdata` JSON attribute embedded in each product tile. This is more reliable than scraping visible text because `data-gtmdata` is structured data intended for Google Tag Manager.

**Pagination:** Uses `start` and `sz` parameters. Requests `sz=24` products at a time, incrementing `start` by 24 until fewer than 24 products are returned.

**Authentication:** Khaadi requires valid session cookies. These are loaded from `khaadi_cookies.json` (produced by `khaadi_setup.py`). The scraper also sends required SFCC headers: `X-Requested-With: XMLHttpRequest` and a `Referer` header pointing to `pk.khaadi.com`. Without these headers, the endpoint returns 0 products even with valid cookies.

### Shared Behavior

- **Retry logic:** Exponential backoff with jitter — 3 retries per request, doubling delay each time with a random 0–1 second addition.
- **User-Agent rotation:** Randomly picks from a list of browser user-agents per request.
- **Polite delays:** Short pauses between requests to avoid overwhelming brand servers.
- **Per-brand output:** Each brand gets its own JSON file (`output/khaadi.json`, `output/gul_ahmed.json`, etc.) plus everything merges into `output/all_brands_poshak.json`.

---

## 3. Files / Components Involved

| File | Role |
|---|---|
| `scraper.py` | Main scraper (~517 lines). Contains all brand configs, Shopify scraping logic, SFCC/Khaadi parsing, deduplication, retry logic. |
| `khaadi_setup.py` | Pre-scraper step. Refreshes Khaadi cookies before scraping starts. |
| `khaadi_cookies.json` | Output of `khaadi_setup.py`. Contains the session cookies `scraper.py` reads for Khaadi. |
| `output/all_brands_poshak.json` | Final output — the consolidated product catalog from all brands. |
| `output/{brand}.json` | Per-brand JSON files (intermediate, also produced). |
| `run_pipeline.sh` | Shell script that runs `khaadi_setup.py` → `scraper.py` → `convert.py` → `upload_to_supabase.py` in sequence. |

---

## 4. APIs Used

| API / Endpoint | Purpose |
|---|---|
| `{shopify_store}/collections.json` | Discover all Shopify collections for a brand |
| `{shopify_store}/collections/{handle}/products.json` | Fetch products from a specific collection |
| `pk.khaadi.com/on/demandware.store/Sites-Khaadi_PK-Site/en_PK/Search-UpdateGrid?cgid={cgid}&start={n}&sz=24` | Fetch Khaadi products by category |

No paid APIs are used by the scraper itself. All endpoints are public-facing store pages/APIs.

---

## 5. Edge Cases

- **Khaadi returns 0 products:** Usually means either cookies expired (rerun `khaadi_setup.py`) or SFCC headers are missing. The scraper logs `✓ khaadi: 0 unique products` which looks like success but is actually a failure signal.
- **Shopify rate limiting:** Some Shopify stores throttle after many rapid requests. The retry logic with exponential backoff handles this, but very aggressive scraping can still get temporarily blocked.
- **Khaadi cgid changes:** Khaadi has changed their category URL format before (numeric → slug). If the scraper suddenly returns 0 products for all cgids, the first thing to check is whether Khaadi restructured their categories again.
- **Cross Stitch and Sapphire:** Both block standard HTTP requests despite being Shopify stores. They need Playwright-based scraping (not yet implemented). Currently disabled in the scraper config.
- **HSY:** Disabled intentionally — luxury couture with ~50 items, manual entry is more practical.
- **Brand site downtime:** If a brand's site is down during the scrape window, that brand gets 0 products in the output. The next night's run will pick them back up. There's no retry-next-day logic.
- **Product handle collisions:** Two different products with the same Shopify handle within a brand would be incorrectly deduplicated. This is extremely rare in practice.
- **Fresh snapshot override:** Every run creates `all_brands_poshak.json` from scratch — it never appends. This is intentional (prices change, products go out of stock) but means a failed partial run produces an incomplete catalog.

---

## 6. How to Improve

- **Build Playwright scrapers for Sapphire and Cross Stitch** — these brands block standard HTTP requests but can be scraped with a real headless browser. Would add significant catalog coverage.
- **Incremental scraping:** Instead of a full re-scrape every night, track what changed since last run and only fetch new/modified products. Would reduce runtime from 10–11 hours to potentially under 1 hour.
- **Cgid auto-discovery for Khaadi:** Instead of hardcoding cgids, use Playwright to navigate Khaadi's site and discover cgids dynamically from the sitemap or navigation. Protects against future restructuring.
- **Health check before full run:** The `test_scraper.py` script exists but isn't integrated into the pipeline. Running it as Step 0 in `run_pipeline.sh` would catch issues like expired cookies before committing to a 10-hour scrape.
- **Parallel scraping:** Currently scrapes brands sequentially. Using async/threading to scrape 3–4 brands simultaneously could cut runtime by 60–70%.
- **Dead product detection:** If a product URL returns a 404, explicitly mark it rather than just relying on absence from the catalog.
