# Poshak.pk — Documentation

> Complete project knowledge base. Start with PROJECT_BRAIN.md for the full overview.

## Files

| Document | What's inside |
|---|---|
| [PROJECT_BRAIN.md](./PROJECT_BRAIN.md) | Full project overview — architecture, tech stack, how the system works end-to-end, roadmap |
| [DECISIONS.md](./DECISIONS.md) | 20 major technical and product decisions with reasoning and alternatives considered |
| [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) | 26 bugs encountered during development — symptoms, root causes, and fixes |

## Feature Docs (`/features`)

Detailed breakdown of each feature: what it does, how it works technically, which files are involved, APIs used, edge cases, and how to improve it.

| # | Feature | File |
|---|---|---|
| 01 | [Product Scraping Pipeline](./features/01-product-scraping-pipeline.md) | Shopify + SFCC scraping, deduplication, retry logic |
| 02 | [GPT Product Enrichment](./features/02-gpt-product-enrichment.md) | Batched GPT-4o mini for category/color/fabric/occasion |
| 03 | [Supabase Upload & Out-of-Stock](./features/03-supabase-upload-out-of-stock.md) | Upsert, stock detection, embedding sync |
| 04 | [Vector Search & Embeddings](./features/04-vector-search-embeddings.md) | Pinecone index, OpenAI embeddings, backfill |
| 05 | [Hybrid Search API](./features/05-hybrid-search-api.md) | GPT query normalization, 60/40 reranking, fallback |
| 06 | [Khaadi Cookie Automation](./features/06-khaadi-cookie-automation.md) | Playwright + HTTP cookie refresh for SFCC |
| 07 | [Railway Nightly Automation](./features/07-railway-nightly-automation.md) | Cron scheduling, pipeline chaining, deployment |
| 08 | [Pipeline Logging](./features/08-pipeline-logging.md) | `pipeline_runs` table, observability |
| 09 | [Homepage & Category Browsing](./features/09-homepage-category-browsing.md) | Carousels, pagination, populated categories |
| 10 | [Sort & Filter System](./features/10-sort-and-filter.md) | Brand, price, color, sort — server + client side |
| 11 | [Mobile Responsive Layout](./features/11-mobile-responsive-layout.md) | 2-col grid, hidden tags, hydration fix |
| 12 | [Stable UUID Generation](./features/12-stable-uuid-generation.md) | uuid5 from product URL, the most critical fix |
