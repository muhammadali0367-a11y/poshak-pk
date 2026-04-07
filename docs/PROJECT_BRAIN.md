# PROJECT_BRAIN — Poshak.pk

> Last updated: March 30, 2026

---

## 1. Project Overview

Poshak.pk is Pakistan's first fashion search engine — a product aggregator that scrapes, indexes, and presents women's clothing from ~15 Pakistani fashion brands in a single, searchable interface. Think of it as Google Shopping built specifically for Pakistani fashion.

A user searches once (e.g., "black lawn suit under 5000") and instantly sees matching results from Khaadi, Gul Ahmed, Sapphire, Limelight, Alkaram, Maria B, and more — all in one place. Clicking a product takes the user directly to the brand's own website to purchase. Poshak.pk never handles inventory, payments, or shipping.

The long-term vision is to become the definitive discovery layer for South Asian fashion — starting with Pakistan, then expanding to the Pakistani diaspora in UAE, UK, and North America, and eventually covering Indian ethnic wear as well.

**Live URL:** https://poshak-pk-p7gv.vercel.app (domain: theposhak.pk)

---

## 2. Target Users

The primary audience is **Pakistani women aged 18–35** who shop online for eastern clothing. The core pain point is fragmentation: these users currently visit 10+ brand websites individually to compare products, wasting hours before making a purchase decision.

Secondary audiences include the **Pakistani diaspora** in UAE, UK, and North America who want to browse and buy Pakistani brands but struggle with discoverability and slow international shipping options, as well as **fashion-conscious shoppers** looking for deals, price drops, or occasion-specific outfits (Eid, weddings, casual wear).

---

## 3. Core Features

**Search & Discovery**

- Semantic search powered by vector embeddings (Pinecone) — understands intent, not just keywords
- GPT-4o mini query normalization — handles Urdu, Roman Urdu, and vague queries (e.g., "kuch acha sa lawn" → "lawn kurta casual summer")
- Hybrid reranking: 60% vector similarity + 40% keyword match for best-of-both-worlds results
- Automatic keyword fallback if vector search returns insufficient results
- Filters by brand, category, price range, fabric, color, and occasion

**Browsing**

- Homepage carousels showing products grouped by category
- Category pages with pagination (24 products per page + Load More)
- Sort by price (low to high, high to low) and name
- Mobile-responsive layout: 2-column grid, hidden tags, compact badges

**Product Experience**

- Product cards with image, name, brand, price, and category badge
- Click-through to the brand's own website for purchase
- Stock status read directly from the database (`in_stock` column)
- "Price unavailable" shown when price = 0
- Empty categories hidden from carousel, sidebar, and mega dropdown

**Data Freshness**

- Automated nightly scraping pipeline via Railway.app (12:00 AM PKT)
- Every scrape is a full fresh snapshot — prices, stock, and product availability are always current
- Out-of-stock detection: products not found in the latest scrape are marked `in_stock = false`
- Pipeline run logging in Supabase (`pipeline_runs` table) for observability

---

## 4. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                        │
│              theposhak.pk (Next.js on Vercel)            │
└──────────────┬──────────────────────────┬────────────────┘
               │                          │
          Search API                 Browse API
               │                          │
     ┌─────────▼──────────┐     ┌─────────▼──────────┐
     │   GPT-4o mini      │     │     Supabase        │
     │  (query normalize) │     │   (products table)  │
     └─────────┬──────────┘     └─────────────────────┘
               │
     ┌─────────▼──────────┐
     │  OpenAI Embeddings  │
     │ text-embedding-3-sm │
     └─────────┬──────────┘
               │
     ┌─────────▼──────────┐     ┌─────────────────────┐
     │     Pinecone        │────▶│     Supabase        │
     │  (vector search)    │     │  (fetch by IDs)     │
     └────────────────────┘     └──────────┬──────────┘
                                           │
                                  Hybrid Rerank
                                  (60% vector + 40% keyword)
                                           │
                                     Return results
```

**Frontend:** Next.js 14 hosted on Vercel. Handles all pages (homepage, category, search, product detail). API routes live inside the Next.js app under `app/api/`.

**Backend / Data Pipeline:** Python scraping pipeline running on Railway.app. Four scripts chained in sequence: `khaadi_setup.py` → `scraper.py` → `convert.py` → `upload_to_supabase.py`. Automated via cron at `0 19 * * *` UTC (12:00 AM PKT).

**Database:** Supabase (PostgreSQL). Stores ~31k products with columns for name, brand, price, category, tags, image URL, product URL, color, fabric, occasion, `in_stock`, and `embedding_synced`. Also stores the `pipeline_runs` logging table.

**Vector Search:** Pinecone (free tier, 1 index, 100k vector capacity). Stores embeddings for all products. Each embedding is a concatenation of: name + tags + category + brand, embedded via OpenAI `text-embedding-3-small` (1536 dimensions, cosine similarity).

**AI Services:** OpenAI GPT-4o mini for two purposes — (1) query normalization in the search API, and (2) product enrichment in `convert.py` (extracting category, color, fabric, occasion from raw product data in batches of 50).

---

## 5. Tech Stack

| Layer | Technology | Plan / Cost |
|---|---|---|
| Frontend | Next.js 14, Vercel | Free |
| Database | Supabase (PostgreSQL) | Free |
| Vector search | Pinecone | Free (100k vectors) |
| Embeddings | OpenAI `text-embedding-3-small` | ~$0.07 for 35k products |
| Query normalization | OpenAI GPT-4o mini | ~$0.000015 per query |
| Product enrichment | OpenAI GPT-4o mini | Batches of 50, pipe-separated |
| Scraping | Python (requests + BeautifulSoup) | — |
| JS-heavy scraping | Playwright + Chromium | For Khaadi cookies, Sapphire, Cross Stitch |
| Automation | Railway.app (Hobby plan) | $5/month |
| Source control | GitHub (private repo: `poshak-scraper`) | Free |
| Domain | theposhak.pk | Already purchased |
| **Total monthly cost** | | **~$5/month** |

---

## 6. How the System Works End-to-End

### Nightly Pipeline (Data Ingestion)

Every night at 12:00 AM PKT, Railway.app triggers `run_pipeline.sh`:

**Step 1 — Khaadi Cookie Refresh** (`khaadi_setup.py`, ~2 min)
Khaadi uses Salesforce Commerce Cloud (SFCC) which requires session cookies. The script uses Playwright to open a headless Chromium browser, visits pk.khaadi.com, captures fresh cookies, and saves them to `khaadi_cookies.json`. On Railway, it also works via direct HTTP requests with proper SFCC headers (`X-Requested-With`, `Referer`).

**Step 2 — Scraping** (`scraper.py`, ~10-11 hours)
The rebuilt scraper (~517 lines) fetches products from ~15 brands. Most brands use Shopify, so the scraper hits their `/products.json` endpoints directly. Khaadi uses SFCC with custom HTML parsing (`div.product[data-pid]`, reading from `data-gtmdata` JSON attributes). Khaadi category slugs: `003-Ready-To-Wear`, `002-Fabrics`, `001-New-In`, `008-Sale`. Deduplication by product handle prevents the same product appearing multiple times across collections. Retry logic with exponential backoff handles transient failures. Output: `output/all_brands_poshak.json`.

**Step 3 — Enrichment** (`convert.py`, ~30-40 min)
Reads the JSON, sends products to GPT-4o mini in batches of 50. Each product gets a single API call that returns pipe-separated values: `category|color|fabric|occasion`. Includes 4x retry logic, 60-second timeout per call, and a 15-second pause every 50 batches to respect rate limits. Generates stable UUIDs using `uuid5(NAMESPACE_URL, product_url)` — the same product URL always produces the same ID. Output: `output/all_brands_poshak.csv`.

**Step 4 — Upload & Embed** (`upload_to_supabase.py`, ~30-40 min)
Upserts all products to Supabase. For each new or updated product, generates an OpenAI embedding and upserts it to Pinecone. Runs `mark_out_of_stock`: compares the set of product IDs in the CSV against existing IDs in Supabase per brand — any ID present in the database but absent from the CSV gets `in_stock = false`. Logs the entire run to the `pipeline_runs` table (start time, finish time, products uploaded, products embedded, products marked out of stock, errors, status).

### Search Flow (User Query)

1. User types a query (e.g., "maroon velvet kurta for wedding")
2. `app/api/search/route.js` sends the query to GPT-4o mini for normalization
3. The normalized query is embedded via OpenAI `text-embedding-3-small`
4. The embedding is sent to Pinecone, which returns the top 50 most semantically similar product IDs
5. Those IDs are fetched from Supabase with full product details
6. Results are hybrid-reranked: 60% vector similarity score + 40% keyword match score
7. If vector search returns too few results, an automatic keyword fallback queries Supabase directly via `ILIKE`
8. Final results are returned to the frontend

### Browsing Flow

Homepage and category pages query Supabase directly by the `category` column (not tags/collections). Products are paginated at 24 per page with a "Load More" button. Sort filters (price, name) are applied client-side with correct `useEffect` dependencies.

---

## 7. Key Decisions and Why They Were Made

**Stable UUIDs (`uuid5` from product URL) instead of random UUIDs**
The original `convert.py` used `uuid4()` — a random ID every run. This meant the same product got a different ID each night, causing: (a) duplicate products accumulating in the database, (b) old IDs being falsely marked as out of stock, and (c) Pinecone filling up with orphan vectors. Switching to `uuid5(NAMESPACE_URL, product_url)` ensures the same product URL always maps to the same ID, making upserts and out-of-stock detection work correctly.

**Hybrid search (vector + keyword) instead of pure vector or pure keyword**
Pure keyword search (Postgres `ILIKE`) couldn't handle Urdu, Roman Urdu, synonyms, or intent-based queries. Pure vector search sometimes misses exact-match queries. The 60/40 hybrid with keyword fallback gives the best of both worlds — semantic understanding for vague queries, precision for exact ones.

**GPT-4o mini for query normalization before embedding**
Raw user queries are messy — mixed languages, abbreviations, slang. Embedding them directly produces poor vectors. A lightweight GPT call first normalizes "kuch acha sa lawn" into "lawn kurta casual summer", dramatically improving retrieval quality at negligible cost (~$0.000015 per query).

**Embed at upload time, not as a separate batch job**
Generating embeddings inside `upload_to_supabase.py` keeps Supabase and Pinecone perfectly in sync. A separate nightly batch would create a window where new products exist in the database but aren't searchable. On-demand embedding would add latency to user searches.

**Railway.app over GitHub Actions for the scraper**
The full scrape takes 10–11 hours. GitHub Actions has strict timeout limits and would require rotating brands across multiple days. Railway's Hobby plan ($5/month) gives a persistent server that runs the entire pipeline in one shot, with Playwright/Chromium for JS-heavy sites.

**Scraper collects raw data, `convert.py` does all classification**
Clean separation of concerns. The scraper just fetches what's on brand websites. `convert.py` handles all filtering, categorization, and enrichment via GPT. This makes it easy to change classification logic without touching scraping code, and vice versa.

**Supabase over Google Sheets for the database**
The project originally used Google Sheets as a database. This hit scaling limits quickly — slow queries, no proper filtering, no relational integrity. Supabase (free tier PostgreSQL) gives real SQL queries, proper indexing, a REST API, and room for 500MB+ of data.

**Not building a mobile app yet**
A Progressive Web App or native app was discussed but deferred. The website works on mobile with the 2-column responsive layout. Building a separate app before proving product-market fit with the web version would waste engineering time.

**Khaadi direct HTTP instead of proxy**
Initial debugging suggested Khaadi needed a residential proxy to access from Railway. After investigation, the actual issue was missing SFCC headers (`X-Requested-With`, `Referer`) in the scraper, not IP blocking. The proxy purchase ($5) was unnecessary — direct HTTP with correct headers works.

---

## 8. Known Issues / Limitations

**Scraper Coverage Gaps**

- Sapphire blocks standard HTTP requests — needs a dedicated Playwright scraper (not yet built)
- Cross Stitch has the same issue — also needs Playwright
- HSY has too few products for automated scraping — decision pending on manual entry vs. skip

**Pipeline Risks**

- Pushing code to Railway while the pipeline is running restarts it from zero — there's no lock mechanism; treat pipeline runs as a critical section and avoid mid-run deploys
- Khaadi's category URL format has changed before (numeric → slug-based) — scraper assumptions about site structure need periodic verification
- The full pipeline takes ~12 hours end to end; if it fails partway through, there's no automatic retry from the failure point — it reruns from scratch the next night

**Search Limitations**

- Pinecone free tier caps at 100k vectors — current catalog (~31k) has headroom, but adding Sapphire, Cross Stitch, and growth could approach the limit
- Vector search quality depends on the GPT enrichment — if `convert.py` miscategorizes a product, the embedding will reflect that error

**Frontend**

- React hydration errors were patched with `mounted` state guards and `suppressHydrationWarning` — these are workarounds, not root-cause fixes
- No user accounts — everyone sees the same experience, no personalization or saved preferences yet

**Business Model**

- No revenue stream implemented yet — affiliate links, sponsored placements, and ads are all future work
- No analytics beyond Supabase pipeline logs — no tracking of user searches, click-through rates, or conversion

---

## 9. Future Roadmap

**Immediate (This Week)**

- Verify Khaadi scrapes correctly on tonight's Railway cron run — check logs for 2000+ products
- Confirm all categories display correctly after the latest data cycle

**Short-Term (Next 2-4 Weeks)**

- Build Playwright scrapers for Sapphire and Cross Stitch
- Make a decision on HSY (manual entry or skip)
- User login system
- Price drop alerts (notify users when products they've viewed drop in price)

**Medium-Term (1-3 Months)**

- Instagram and TikTok content marketing — posts like "Best Eid Dresses Under 5000" driving traffic to Poshak.pk
- Facebook/Instagram test ads once site traffic is stable
- Target: 20,000 monthly visitors
- Affiliate revenue integration (Daraz affiliate program, direct brand partnerships)

**Long-Term (3-12 Months)**

- AI image search — upload a photo of any outfit, find similar products across all brands
- Sponsored placements — brands pay for top positioning in category pages and search results
- Expand to Pakistani diaspora markets (UAE, UK, North America)
- Approach brands for official data feeds and partnerships
- Display ads once traffic exceeds 100,000 monthly visitors

**Big Vision**

Pakistan currently has no strong fashion aggregator. LAAM is a marketplace (holds inventory, handles transactions). Poshak.pk is a discovery engine — zero inventory risk, zero logistics, just connecting buyers to brands. The moat is data coverage and user traffic. If every Pakistani woman who shops online for eastern wear uses Poshak.pk as her first stop, that's the dream.

---

## Appendix: Canonical Pipeline Reference

```
scraper.py → output/all_brands_poshak.json → convert.py → output/all_brands_poshak.csv → upload_to_supabase.py
```

**Khaadi cgids:** `003-Ready-To-Wear`, `002-Fabrics`, `001-New-In`, `008-Sale`

**convert.py config:** GPT batch size 50, pipe-separated output (category|color|fabric|occasion), 4x retry, 60s timeout, 15s pause every 50 batches

**Railway cron:** `0 19 * * *` UTC = 12:00 AM PKT

**Key files:**

| File | Purpose |
|---|---|
| `khaadi_setup.py` | Refresh Khaadi SFCC session cookies |
| `scraper.py` | Scrape all brands (~517 lines, rebuilt clean) |
| `convert.py` | GPT enrichment + stable UUID generation |
| `upload_to_supabase.py` | Upsert to Supabase + embed to Pinecone + out-of-stock marking + logging |
| `run_pipeline.sh` | Chains all four scripts in sequence |
| `railway.json` | Railway deployment config with cron schedule |
| `app/api/search/route.js` | Search API with vector + keyword hybrid |

**Environment variables (Railway + Vercel):**

- `SUPABASE_URL`
- `SUPABASE_KEY` (service role)
- `OPENAI_API_KEY`
- `PINECONE_API_KEY`
- `PINECONE_INDEX_NAME` (= `poshak-products`)
- `PINECONE_ENVIRONMENT` (= `us-east-1`)
