# DECISION_LOG — Poshak.pk

> Every major technical and product decision, why it was made, and what else was on the table.

---

## 1. Supabase over Google Sheets as the database

**Decision:** Migrate from Google Sheets (the original data store) to Supabase (free-tier PostgreSQL).

**Reason:** Google Sheets hit a hard performance wall at ~32k products. The entire CSV (~10MB) was downloaded to the user's browser on every page load, taking 10–20 seconds on Pakistani mobile connections. Parsing, indexing, and filtering 32k rows client-side froze the UI for several seconds. Google Sheets was always intended as a temporary solution — it was the fastest way to get the MVP live, but it couldn't scale.

Supabase gives server-side querying (only fetch the 24 products you need per page), proper SQL filtering, a REST API, and 500MB free storage — enough for 500k+ products. Page load dropped from 10–20 seconds to under 1 second regardless of total product count.

**Alternatives considered:**
- **Keep Google Sheets + client-side pagination:** Would improve load times by showing 500 products at a time instead of 32k, but first load would still be slow and search would remain client-side.
- **PlanetScale:** Another free-tier MySQL option. Supabase was chosen because it has a visual dashboard (feels like a spreadsheet for a non-technical founder) and built-in REST API with no extra server needed.
- **Firebase/Firestore:** NoSQL, good for real-time apps but less natural for product catalog queries with filtering and sorting.

---

## 2. Pinecone + OpenAI embeddings over Meilisearch for search

**Decision:** Use Pinecone (vector database) with OpenAI `text-embedding-3-small` for semantic search, rather than Meilisearch (keyword search engine).

**Reason:** The original plan was to deploy Meilisearch on Railway for typo-tolerant keyword search. But the real problem wasn't typos — it was that users search in Urdu, Roman Urdu, slang, and vague descriptions ("kuch acha sa lawn", "shaadi ka jora"). No keyword engine can match "something nice for a summer wedding" to "Embroidered Lawn 3 Piece Suit" because they share zero words.

Vector search understands meaning. The query and every product are converted to 1536-dimensional vectors, and Pinecone finds the closest matches by cosine similarity. Combined with GPT-4o mini for query normalization, this handles any language, any phrasing, any level of vagueness.

Pinecone's free tier gives 100k vectors — enough for 3x the current catalog. Total cost to embed 31k products: $0.07.

**Alternatives considered:**
- **Meilisearch on Railway:** Fast, typo-tolerant, supports Arabic script. But fundamentally keyword-based — can't handle semantic queries. Would still fail on "wedding guest outfit not too formal."
- **Supabase full-text search (pg_trgm):** Already built and working as the keyword layer, but same fundamental limitation — no semantic understanding.
- **Elasticsearch:** Powerful but expensive to self-host and overkill at this scale. Minimum $50–100/month.
- **Pure vector search (no hybrid):** Would miss exact keyword matches. The hybrid approach (60% vector + 40% keyword) catches both semantic intent and precise terms.

---

## 3. Hybrid search (60% vector + 40% keyword) instead of pure vector or pure keyword

**Decision:** Combine vector similarity scores from Pinecone with keyword match scores from Supabase in a weighted formula: `finalScore = 0.6 × vectorScore + 0.4 × keywordScore`.

**Reason:** Pure vector search sometimes misses exact-match queries — a user searching "Khaadi" expects all Khaadi products, but semantically similar non-Khaadi products might score higher. Pure keyword search can't handle vague or cross-language queries. The hybrid approach, modeled after how Myntra and Ajio work, gives the best of both: semantic understanding for recall, keyword precision for accuracy.

An automatic keyword fallback activates if Pinecone is down or returns too few results, ensuring the search never completely fails.

**Alternatives considered:**
- **Pure vector search:** Simpler architecture, but loses exact-match precision.
- **Pure keyword search (ILIKE):** Already existed as the original search. Couldn't handle Urdu or semantic queries.
- **70/30 or 50/50 weighting:** 60/40 was chosen based on industry practice (aggregators lean toward semantic recall). Not extensively A/B tested — the ratio is a starting point.

---

## 4. GPT-4o mini for query normalization before embedding

**Decision:** Send every user query through GPT-4o mini to normalize it before creating an embedding.

**Reason:** Raw user queries are messy — mixed Urdu/English, slang, abbreviations, typos. Embedding a messy query directly produces a poor vector. A lightweight GPT call first translates and cleans the query ("kuch acha sa lawn" → "lawn kurta casual summer"), dramatically improving retrieval quality. At ~$0.000015 per query, the cost is negligible even at scale.

A static Urdu→English dictionary serves as the fallback if GPT is unavailable.

**Alternatives considered:**
- **Static translation dictionary only:** Implemented as the fallback. Covers common terms but misses slang, abbreviations, and creative phrasing.
- **GPT-4o (full model):** More capable but ~10x more expensive per call and slower. GPT-4o mini handles this task well enough.
- **Fine-tuned classifier:** Would be faster and cheaper at scale, but requires training data that doesn't exist yet. Can be explored once search query logs accumulate.
- **No normalization (embed raw query):** Tested implicitly — results were significantly worse for non-English queries.

---

## 5. GPT-4o mini batched enrichment (category, color, fabric, occasion) on product name only

**Decision:** Use GPT-4o mini in batches of 50 to extract category, color, fabric, and occasion from each product's name. Ignore tags, product_type, and collection for classification.

**Reason:** The original approach used a 3-level fallback chain: Level 1 mapped `product_type` to categories, Level 2 used GPT on name + type + tags, Level 3 did keyword matching on tags. This was fragile — `product_type` is brand-internal and often meaningless ("Stitched/Trouser Suit"), tags are polluted (a pant had "abaya" in its tags, causing it to appear in the Abaya category), and collection names vary wildly across brands.

Large aggregators like Farfetch, Lyst, and Google Shopping don't trust source data for classification. They run their own classifier on the product name only — the one field brands always get right because it's customer-facing. "Embroidered Abaya with Nida Fabric" tells you everything. GPT-4o mini classifying on name alone is simpler, more accurate (~95%+), and costs under $0.10 for 35k products.

The pipe-separated output format (`category|color|fabric|occasion`) packs all four extractions into one API call per product, with 50 products per call.

**Alternatives considered:**
- **3-level fallback chain (product_type → GPT → tag keywords):** The original approach. Produced incorrect results because product_type and tags are unreliable across brands.
- **GPT on all fields (name + type + tags + collection):** More context for GPT, but the polluted fields actually confused it. Name-only was cleaner.
- **Rule-based keyword matching only (no GPT):** Cheap but low accuracy — can't distinguish "Printed Lawn 3 Piece" as Lawn vs. 3 Piece Suit without understanding context.
- **Separate API call per field:** Would be 4x the calls and 4x the cost. The pipe-separated format keeps it to one call per product.

---

## 6. Stable UUIDs (uuid5 from product URL) instead of random UUIDs

**Decision:** Generate product IDs deterministically using `uuid5(NAMESPACE_URL, product_url)` instead of `uuid4()` (random).

**Reason:** Random UUIDs caused three cascading failures that made the system unusable: (1) every pipeline run created 31k new products as duplicates, (2) old IDs were falsely marked out of stock because they weren't in the new run, and (3) Pinecone accumulated 31k orphan vectors per day.

With `uuid5`, the same product URL always produces the same ID. Upserts work correctly (update existing rows instead of inserting duplicates), out-of-stock detection works (old ID exists in new run = still in stock), and Pinecone vectors are updated in place.

This was the most critical bug fix in the entire project. The fix was a single line change in `convert.py`.

**Alternatives considered:**
- **Use Shopify product handle as ID:** Would work for Shopify brands but not for Khaadi (SFCC). Product URL is universal.
- **Database-assigned auto-increment IDs:** Would require looking up existing products by URL before inserting, adding complexity. uuid5 is a pure function — no database lookup needed.
- **Hash of product name + brand:** Product names can change (brands rename products); URLs are more stable.

---

## 7. Railway.app ($5/month) over GitHub Actions for pipeline automation

**Decision:** Run the nightly scraping pipeline on Railway's Hobby plan instead of GitHub Actions free tier.

**Reason:** The full scrape takes 10–11 hours. GitHub Actions has a 6-hour maximum job runtime on the free tier and a 2,000 minutes/month budget. Even with a "rotate brands daily" strategy to stay within limits, it would be fragile and hard to debug. Railway gives a persistent server with no time limits, Playwright/Chromium support (needed for Khaadi cookies), and direct GitHub integration for auto-deployment.

At $5/month, Railway is the cheapest always-on server option that handles the full pipeline in a single run.

**Alternatives considered:**
- **GitHub Actions (free):** Originally planned. Hit the 6-hour runtime limit and the 2,000 minutes/month budget. Would require splitting the scrape across multiple days and complex state management.
- **Render.com (free tier):** Free tier has spin-down after inactivity, which kills long-running processes. Paid tier starts at $7/month — slightly more than Railway.
- **Running on local laptop:** The original approach. Required the laptop to stay on for 12+ hours, couldn't go to sleep, and needed manual triggering. Not sustainable.
- **AWS Lambda / Vercel Functions:** Serverless — can't run 10-hour processes. Maximum execution time is 5–15 minutes.

---

## 8. Scraper collects raw data, convert.py does all classification

**Decision:** Separate scraping (data collection) from enrichment (classification and ID generation) into two distinct scripts.

**Reason:** Originally, `scraper.py` tried to do both — it fetched products AND extracted color, fabric, and category using keyword matching during the scrape. This created coupling problems: fixing a classification bug required re-running the entire 10-hour scrape, and the scraper's inline keyword matching (`enrich_from_text()`) was producing wrong colors ("Printed" was in the COLOR_KEYWORDS list).

Splitting into raw collection → enrichment means:
- Classification bugs can be fixed by re-running just `convert.py` (30 minutes) instead of the full scrape (10 hours).
- The scraper stays simple and fast — just fetch and save.
- Enrichment logic can be upgraded independently (e.g., switching from keyword matching to GPT).

**Alternatives considered:**
- **All-in-one scraper:** The original design. Made debugging classification issues extremely slow because every test required a full re-scrape.
- **Enrichment at upload time:** Would work but conflates two concerns in `upload_to_supabase.py`. Keeping enrichment in its own script makes the pipeline more modular.

---

## 9. Embedding at upload time, not as a separate batch job

**Decision:** Generate OpenAI embeddings and upsert to Pinecone inside `upload_to_supabase.py`, not as a separate nightly batch script.

**Reason:** A separate batch job creates a window where new products exist in Supabase but aren't in Pinecone — they'd appear in keyword search but not vector search. On-demand embedding (at first search) would add latency to user searches. Embedding during upload keeps Supabase and Pinecone perfectly synchronized with zero lag.

The `embedding_synced` boolean column in Supabase tracks what's been embedded, making the process safe to interrupt and resume.

**Alternatives considered:**
- **Separate nightly batch job:** Simpler code separation but creates a sync gap. If the batch job fails, vector search silently degrades until the next successful run.
- **On-demand at first search:** Would add 200–500ms latency to the first search that encounters an unembedded product. Poor UX.
- **Real-time streaming (embed on product change):** Overkill for a once-per-night pipeline. Better suited for high-frequency update scenarios.

---

## 10. Not building a mobile app yet

**Decision:** Focus on the responsive web experience rather than building a native iOS/Android app or even a Progressive Web App (PWA).

**Reason:** A mobile app was discussed but deferred. The website with its 2-column responsive grid, hidden mobile tags, and compact badges already works on phones. Building a separate app before proving product-market fit would consume significant engineering time without adding user value. The target audience (18–35 Pakistani women) is mobile-first, but they discover products through social media links — which open in the browser, not an app store.

When traffic is consistent and retention is proven, a PWA (add-to-homescreen capability) would be the natural next step before considering a native app.

**Alternatives considered:**
- **React Native app:** Cross-platform, shares some code with Next.js. But requires app store submission, review processes, and ongoing platform-specific maintenance.
- **PWA now:** Low-cost option (add a manifest + service worker). Deferred because there's no user base yet to benefit from offline access or push notifications.
- **Flutter app:** Would require a completely separate codebase. Not justified until proven demand.

---

## 11. Discovery engine model (zero inventory) vs. marketplace

**Decision:** Build Poshak as a pure discovery/search engine, not a marketplace.

**Reason:** Marketplaces like LAAM hold inventory, process payments, handle shipping, and manage returns — requiring warehousing, logistics partnerships, payment gateway integration, and customer service infrastructure. Poshak deliberately avoids all of this. Users search on Poshak and click through to buy directly on the brand's website. Zero inventory risk, zero logistics, zero customer service overhead.

The revenue model is affiliate commissions (5–8% of referred sales), sponsored placements (brands pay for top positioning), and eventually display ads. This is a far leaner business model — the only costs are compute ($5/month) and marketing.

**Alternatives considered:**
- **Marketplace model (like LAAM):** Higher revenue per transaction but requires capital for inventory, warehousing, logistics, returns handling, and payment infrastructure. Not feasible as a solo founder.
- **Dropshipping model:** Brands ship directly but Poshak handles orders. Still requires payment integration, customer service, and brand partnerships. Too complex for Phase 1.

---

## 12. Khaadi direct HTTP with SFCC headers over residential proxy

**Decision:** Fix the missing HTTP headers (`X-Requested-With`, `Referer`) in the Khaadi scraper instead of routing through a residential proxy.

**Reason:** When Khaadi returned 0 products on Railway, the initial diagnosis was that Railway's datacenter IP was blocked. A $5 residential proxy was purchased. After deeper investigation, the real problem was that the SFCC `Search-UpdateGrid` endpoint requires specific headers to return products — without `X-Requested-With: XMLHttpRequest` and a `Referer` pointing to `pk.khaadi.com`, it returns valid HTML with 0 product tiles. Adding these two headers fixed the issue entirely. The proxy was unnecessary.

**Alternatives considered:**
- **Residential proxy ($5/month):** Purchased and tested. Worked, but only because it coincidentally also sent the right headers. The proxy itself wasn't needed.
- **Full Playwright scraping for Khaadi:** Using a real headless browser for the actual product scraping (not just cookies). Would work but is slower, uses more memory, and more fragile than direct HTTP.

---

## 13. Cron at 12:00 AM PKT instead of 10:00 PM or 6-hour intervals

**Decision:** Set the Railway cron to `0 19 * * *` UTC (12:00 AM midnight PKT), running once daily.

**Reason:** The pipeline takes 12+ hours end to end. Running every 6 hours (as initially considered) would cause overlapping runs. Midnight start means the pipeline finishes by ~noon the next day, giving fresh data every afternoon when users are most active. Running at 10 PM PKT was the first plan but was adjusted to midnight for cleaner scheduling.

**Alternatives considered:**
- **10:00 PM PKT:** Would finish around 10 AM — slightly earlier fresh data. Changed to midnight for simplicity.
- **Every 6 hours:** Would cause overlapping pipeline runs given the 12-hour runtime. Would need a lock mechanism or brand rotation.
- **Twice daily (midnight + noon):** Same overlap problem. Only feasible if the pipeline is optimized to run in <6 hours.

---

## 14. Pipeline logging in Supabase over external monitoring

**Decision:** Log pipeline run outcomes (start time, finish time, products uploaded/embedded/out-of-stock, errors, status) in a `pipeline_runs` Supabase table rather than using external monitoring tools.

**Reason:** External monitoring tools (Datadog, Grafana, PagerDuty) are expensive and overkill for a single nightly cron job. Railway's built-in logs are ephemeral — they get deleted after a retention period. A simple Supabase table gives permanent, queryable records with zero additional cost. You can check last night's pipeline status with a single SQL query.

**Alternatives considered:**
- **Railway logs only:** Free but ephemeral. Can't query historical patterns like "has product count been declining over the last week?"
- **Datadog / Grafana:** Professional-grade monitoring. Minimum $15–25/month. Not justified for a single scheduled job.
- **Slack webhook notifications:** Would alert on failures but doesn't store historical records. Can be added later as a supplement.
- **File-based logging on Railway:** Railway's filesystem resets between runs, so log files would be lost.

---

## 15. Disable RLS (Row Level Security) in Supabase

**Decision:** Skip Supabase's Row Level Security feature entirely.

**Reason:** RLS controls which database rows different users can see — useful for apps where each user has private data (like an email client or project management tool). Poshak's products table is entirely public — every visitor sees the same 31k products. RLS would add query overhead and configuration complexity with zero benefit. It can be enabled later if user accounts with private data (wishlists, price alerts) are added.

**Alternatives considered:**
- **Enable RLS with public read policy:** Would allow future private data alongside public products. Adds complexity now for a feature that doesn't exist yet.

---

## 16. Supabase region: Mumbai (ap-south-1)

**Decision:** Host the Supabase database in the Mumbai AWS region.

**Reason:** Mumbai is the geographically closest region to Pakistan. Lower latency for both the scraper pipeline (running on Railway) and end users (browsing from Lahore, Karachi, Islamabad). Supabase offered Singapore and US regions as alternatives, but Mumbai is ~1,500km from Pakistan vs. ~4,500km for Singapore and ~12,000km for US.

**Alternatives considered:**
- **Singapore:** Viable but ~3x farther. Would add ~20-40ms latency per database query.
- **US East:** Where Pinecone is hosted. Would optimize Pinecone ↔ Supabase communication but add significant latency for Pakistani end users.

---

## 17. text-embedding-3-small over text-embedding-3-large

**Decision:** Use OpenAI's `text-embedding-3-small` (1536 dimensions) for product and query embeddings.

**Reason:** At Poshak's scale (~31k products, relatively simple product descriptions), the quality difference between `small` and `large` (3072 dimensions) is negligible. The `small` model costs half as much per token, produces vectors that take half the storage in Pinecone, and processes twice as fast. The free-tier Pinecone index also has storage limits that smaller vectors help stay within.

If search quality becomes a measurable issue (tracked via search analytics that don't exist yet), upgrading to `large` is a one-time re-embed operation.

**Alternatives considered:**
- **text-embedding-3-large (3072d):** Higher quality but 2x cost and storage. Not justified without evidence that the `small` model is underperforming.
- **text-embedding-ada-002 (1536d):** Previous generation. Similar dimensions but lower quality than `3-small`. No reason to use it.
- **Open-source embedding models (e.g., BGE, E5):** Would eliminate OpenAI dependency and cost, but require self-hosting a model server. Complexity not justified at this scale.

---

## 18. Fresh snapshot override instead of incremental/append scraping

**Decision:** Every pipeline run creates `all_brands_poshak.json` from scratch, overwriting the previous file. The upload script upserts all products and marks missing ones as out of stock.

**Reason:** Products change constantly — prices update, items go out of stock, collections rotate seasonally. An append-based approach would accumulate stale data: products that no longer exist on the brand's website would persist in the database indefinitely. A fresh snapshot guarantees the database always reflects reality.

The stable UUID system makes this efficient — even though the full catalog is re-processed, Supabase only updates rows that actually changed (via upsert), and Pinecone vectors are updated in place.

**Alternatives considered:**
- **Incremental/append scraping:** Only fetch new products and changes. Would be faster (1 hour vs. 10 hours) but requires tracking what's been scraped before, detecting deleted products, and handling partial failures. Much more complex architecture.
- **Diff-based upload:** Compute a diff between the new CSV and the existing database, only applying changes. Would reduce Supabase writes by 90%+ but adds processing complexity. Can be added as an optimization later.

---

## 19. Women's fashion only (no men's, kids', home)

**Decision:** Filter out all non-women's products during the scraping/enrichment pipeline. The website shows only women's eastern clothing.

**Reason:** The target audience is Pakistani women shopping for eastern wear. Including men's kurtas, kids' clothing, home textiles, fragrances, and accessories would dilute the experience and confuse the brand identity. Many brands (Khaadi, Gul Ahmed, Sapphire) sell all categories — the scraper fetches everything but `convert.py` aggressively filters to women's fashion only using exclusion keywords (men's, boys, girls, kids, accessories, bags, shoes, fragrances, home, etc.).

**Alternatives considered:**
- **Include all categories:** Larger catalog but weaker brand identity. "Pakistan's fashion search engine" is clearer than "Pakistan's everything search engine."
- **Separate sections for men's/kids':** Possible future expansion but adds UI complexity and dilutes initial focus.

---

## 20. Start with 15 brands, not 50+

**Decision:** Launch with ~15 curated brands rather than trying to scrape every Pakistani fashion brand.

**Reason:** The selected brands (Khaadi, Gul Ahmed, Sapphire, Limelight, Alkaram, Maria B, Agha Noor, Baroque, etc.) cover the most popular and frequently searched names in Pakistani women's fashion. Each new brand requires building and testing a scraper, understanding their site structure, and handling platform-specific quirks. Quality of 15 well-scraped brands beats quantity of 50 poorly-scraped ones.

Sapphire and Cross Stitch are high-priority additions but require Playwright scrapers (they block standard HTTP). HSY is luxury couture with ~50 products — manual entry is more practical than building a scraper.

**Alternatives considered:**
- **Scrape every brand immediately:** Would produce a larger catalog but with many broken scrapers, missing products, and poor data quality.
- **Start with only 5 brands:** Too small a catalog. Users searching for specific brands would find nothing and not return.
- **Partner with brands for official data feeds:** Ideal but requires traffic and leverage that don't exist yet. Planned for Phase 3.
