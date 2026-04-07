# Feature: Hybrid Search API

## 1. What It Does

The search API is the core user-facing intelligence of Poshak.pk. When a user types anything — English, Urdu, Roman Urdu, slang, vague descriptions — the API understands the intent, finds the most relevant products across all brands, and returns ranked results. It combines three search strategies (AI query normalization, vector similarity, and keyword matching) into a single hybrid pipeline that's more accurate than any one method alone.

---

## 2. How It Works Technically

### The Full Pipeline (per search request)

```
Step 1: Query Normalization (GPT-4o mini)
Step 2: Color Detection
Step 3: Vector Search (Pinecone)
Step 4: Fetch Products (Supabase)
Step 5: Hybrid Reranking
Step 6: Keyword Fallback (if needed)
```

### Step 1 — Query Normalization

The raw user query is sent to GPT-4o mini with a system prompt that instructs it to:
- Translate Urdu/Roman Urdu to English
- Fix typos and expand abbreviations
- Keep it concise (max 8 words)
- Preserve color, fabric, category, and occasion keywords

Examples:
- `"kuch acha sa lawn"` → `"lawn kurta casual summer"`
- `"shaadi ka jora"` → `"wedding suit formal"`
- `"gulabi lawn kurta"` → `"pink lawn kurta"`
- `"sale mein kya hai gul ahmed ka"` → `"Gul Ahmed discounted products"`

If GPT fails (timeout, error), it falls back to a static `translateQuery()` function that uses a hardcoded dictionary of Urdu/Roman Urdu → English mappings.

### Step 2 — Color Detection

Two parallel functions scan both the normalized and translated queries:
- `detectColor()` — checks if the entire query is a pure color term
- `extractColorFromQuery()` — extracts a color from within a longer query

Color synonyms include Urdu terms: `"kala"` → black, `"gulabi"` → pink, `"neela"` → navy blue, `"ferozi"` → teal.

If a color is detected, it's applied as a hard filter on the Supabase query (`WHERE color ILIKE '%{color}%'`).

### Step 3 — Vector Search

The normalized query is embedded via OpenAI `text-embedding-3-small` (same model used for product embeddings). The resulting vector is sent to Pinecone with `topK=50`, returning up to 50 product IDs ranked by cosine similarity.

### Step 4 — Fetch Products from Supabase

The 50 product IDs from Pinecone are used in a single Supabase query:
```sql
SELECT * FROM products WHERE id IN (...) AND in_stock = true
```

Additional filters are applied based on URL params: `brand`, `min_price`, `max_price`, and the detected `color`.

### Step 5 — Hybrid Reranking

Each product gets a composite score combining two signals:

```
finalScore = (0.6 × vectorScore) + (0.4 × keywordScore)
```

**Vector score (60% weight):** The cosine similarity from Pinecone. Measures how semantically close the product's embedding is to the query.

**Keyword score (40% weight):** A custom function that checks how many of the query terms appear in the product's searchable text (name, brand, tags, category, product_type, collection). Returns a ratio of matching terms to total terms.

Products are sorted by `finalScore` descending. This hybrid approach handles the strengths and weaknesses of both methods:
- Vector search is great for vague/semantic queries but sometimes misses exact matches
- Keyword matching catches exact terms but can't understand intent or synonyms
- Combined, they complement each other

### Step 6 — Keyword Fallback

If vector search returns fewer than a threshold of results (e.g., Pinecone is down or the query is too unusual), the API falls back to a pure Supabase keyword search using `ILIKE`:

```sql
SELECT * FROM products WHERE name ILIKE '%query%' OR tags ILIKE '%query%'
```

This ensures the user always gets some results, even if the AI pipeline fails entirely.

---

## 3. Files / Components Involved

| File | Role |
|---|---|
| `app/api/search/route.js` | The search API endpoint. Contains all logic: normalization, embedding, Pinecone query, Supabase fetch, hybrid reranking, fallback. |
| `.env.local` / Vercel env vars | `OPENAI_API_KEY`, `PINECONE_API_KEY`, `PINECONE_INDEX_NAME`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Frontend search bar component | Sends GET requests to `/api/search?q=...&page=1&brand=...` |

**Dependencies (npm):**
- `openai` — GPT-4o mini calls and embedding generation
- `@pinecone-database/pinecone` — Pinecone vector queries
- `@supabase/supabase-js` — Supabase database queries

---

## 4. APIs Used

| API | Purpose | Cost per query |
|---|---|---|
| OpenAI Chat (GPT-4o mini) | Query normalization | ~$0.000015 |
| OpenAI Embeddings (`text-embedding-3-small`) | Embed the normalized query | ~$0.000001 |
| Pinecone Query | Find top-50 similar product vectors | Free |
| Supabase REST | Fetch product details by IDs | Free |

Total cost per search: approximately **$0.000016** (effectively free at any reasonable scale).

---

## 5. Edge Cases

- **GPT normalization fails:** Falls back to the static `translateQuery()` dictionary. Coverage is decent for common Urdu terms but misses slang, abbreviations, and creative phrasing.
- **Pure Urdu script queries (e.g., "سفید لان"):** The static dictionary includes some Urdu script mappings, but coverage is limited. GPT-4o mini handles these much better, so if GPT is down, Urdu script queries degrade significantly.
- **Empty query:** Returns immediately with `{ products: [], total: 0 }`. No API calls made.
- **Pinecone cold start:** Free-tier Pinecone can take 3–5 seconds on the first query after inactivity. Users see a delayed first search, then fast subsequent searches.
- **Color in brand name:** A query like "Gul" could match the color "green" (gul = flower, but similar to "green" in some mappings) leading to incorrect color filtering. The color detection logic tries to be conservative but can still misfire.
- **Pagination with reranking:** The hybrid reranking reorders the top 50 results, but pagination (`page=2`, `page=3`) would need the full reranked set. Currently, only page 1 benefits from reranking; deeper pages may have degraded relevance.
- **Price filter with vector search:** Price filtering happens at the Supabase level AFTER Pinecone returns IDs. If most of the top-50 vector results are outside the price range, the final result set could be very small even though relevant products exist at that price point.

---

## 6. How to Improve

- **Move price/brand filtering to Pinecone metadata:** Store price and brand as Pinecone metadata, then filter at the Pinecone level. This ensures the top-50 results already match the user's filters, giving the hybrid reranker a better pool to work with.
- **Cache GPT normalization:** Many users search similar queries. Cache the GPT normalization result keyed by the raw query string. Would eliminate the GPT call latency (~200ms) and cost for repeated searches.
- **Streaming results:** Return initial keyword-match results immediately while the vector search + GPT normalization runs in the background, then update with reranked results. Perceived latency drops to near-zero.
- **Query spell correction:** Add a spell-check layer before normalization. Users often misspell brand names ("Khadi" instead of "Khaadi") which neither GPT nor keywords handle well.
- **Search analytics:** Log every search query, the normalized version, the number of results, and click-through rates. Use this data to identify gaps (queries that return 0 or irrelevant results) and improve the system.
- **Personalized reranking:** Once user accounts exist, factor in browsing history and preferences. A user who frequently views Khaadi products should see Khaadi results ranked higher.
- **Increase topK for deeper pages:** When `page > 1`, request `topK = 50 * page` from Pinecone so that deeper pages still have properly reranked results rather than leftovers.
