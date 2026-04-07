# Feature: GPT Product Enrichment (convert.py)

## 1. What It Does

Takes the raw scraped product data (`all_brands_poshak.json`) and enriches every product with four structured attributes: **category**, **color**, **fabric**, and **occasion**. The scraper captures product names and tags, but these are messy and inconsistent across brands — "3-Piece Suit" tells you nothing about the color or fabric. `convert.py` uses GPT-4o mini to intelligently extract and normalize these fields so the website can offer clean filtering and the search engine can return accurate results.

Additionally, `convert.py` generates **stable UUIDs** for each product (derived from the product URL) and outputs the enriched data as a CSV ready for Supabase upload.

---

## 2. How It Works Technically

### Input / Output

- **Input:** `output/all_brands_poshak.json` — raw scraped data (product name, price, URL, image, brand, tags, etc.)
- **Output:** `output/all_brands_poshak.csv` — enriched with `category`, `color`, `fabric`, `occasion`, and a stable `id` column

### GPT Batching

Products are sent to GPT-4o mini in **batches of 50**. Each batch is a single API call where all 50 product names are listed in the prompt, and GPT returns 50 pipe-separated lines:

```
Kurta|Blue|Lawn|Casual
3 Piece Suit|Maroon|Velvet|Wedding
Unstitched Fabric|Green|Cotton|Eid
```

Each line corresponds to one product and contains exactly four pipe-separated values: `category|color|fabric|occasion`.

### Prompt Design

The system prompt instructs GPT-4o mini to:
- Classify the product into a predefined category (Kurta, 3 Piece Suit, 2 Piece Suit, Lawn, etc.)
- Extract the dominant color from the product name/description
- Identify the fabric type
- Determine the most likely occasion (Casual, Formal, Wedding, Eid, Party, etc.)
- Return "Unknown" for any field it can't determine
- Return ONLY pipe-separated values, no explanations

### Resilience

- **4x retry logic:** If an API call fails (timeout, rate limit, server error), it retries up to 4 times with increasing delays.
- **60-second timeout:** Per API call. Prevents the pipeline from hanging indefinitely on a stalled request.
- **15-second pause every 50 batches:** Deliberate cooldown to respect OpenAI rate limits and avoid 429 errors. At 50 products per batch, this means a pause every 2,500 products.
- **Fallback on parse failure:** If GPT returns a malformed line (wrong number of pipes), the product gets "Unknown" for all four fields rather than crashing the pipeline.

### Stable UUID Generation

The critical line:
```python
product_id = str(uuid5(NAMESPACE_URL, product_url))
```

`uuid5` is a deterministic hash — the same `product_url` always produces the same UUID. This replaced the original `uuid4()` (random) which caused:
- Duplicate products accumulating in the database (same product, different ID each run)
- False out-of-stock markings (old IDs not found in new run → marked out of stock)
- Pinecone filling with orphan vectors

---

## 3. Files / Components Involved

| File | Role |
|---|---|
| `convert.py` | Main enrichment script. Reads JSON, calls GPT in batches, generates UUIDs, outputs CSV. |
| `output/all_brands_poshak.json` | Input — raw scraped product data |
| `output/all_brands_poshak.csv` | Output — enriched data with category, color, fabric, occasion, and stable ID |
| `.env` | Contains `OPENAI_API_KEY` used by the GPT calls |

---

## 4. APIs Used

| API | Model | Purpose | Cost |
|---|---|---|---|
| OpenAI Chat Completions | GPT-4o mini | Extract category, color, fabric, occasion from product names | ~$0.000015 per product |

At ~31k products, a full enrichment run costs approximately $0.50.

---

## 5. Edge Cases

- **GPT returns wrong number of pipe-separated values:** If a product name contains a pipe character or GPT hallucinates extra fields, the parser falls back to "Unknown" for all fields. This is rare but happens occasionally with unusual product names.
- **Ambiguous colors:** Products like "Printed Lawn Suit" have no inherent color — GPT must guess or return "Multicolor". The accuracy depends heavily on whether the product name contains color information.
- **Cross-language product names:** Some brands use Urdu words in product names (e.g., "سفید"). GPT-4o mini handles these well but occasionally mistranslates.
- **Batch size mismatch:** If GPT returns fewer lines than the 50 products sent, the remaining products get "Unknown". If it returns more lines, extras are ignored.
- **API rate limits (429 errors):** The 15-second pause every 50 batches mitigates this, but during OpenAI outages or heavy load, the retries can exhaust and products get "Unknown" enrichment.
- **Enrichment drift:** If the product naming conventions change at a brand (e.g., Khaadi starts using codes instead of descriptive names), enrichment quality degrades silently. There's no quality monitoring.
- **UUID collision:** `uuid5` collisions are theoretically possible but astronomically unlikely (~1 in 2^122). For practical purposes, product URL uniqueness guarantees ID uniqueness.

---

## 6. How to Improve

- **Add brand-specific prompt context:** Including brand name and collection in the prompt would help GPT make better category decisions. A "Khaadi Ready-To-Wear" product should almost certainly be categorized as a Kurta or Suit, not "Unknown".
- **Validate enrichment output:** After GPT returns results, cross-check colors against a predefined color list and categories against the allowed category set. Flag or auto-correct obvious errors like "Blue" as a category.
- **Cache enrichment results:** If a product URL hasn't changed since the last run, reuse the previous enrichment instead of re-calling GPT. Would cut costs and runtime significantly for stable catalogs.
- **Use structured output (JSON mode):** Instead of pipe-separated text, use OpenAI's JSON mode to get structured `{"category": "...", "color": "...", "fabric": "...", "occasion": "..."}` responses. More reliable parsing, slightly higher token usage.
- **Enrichment quality dashboard:** Track what percentage of products get "Unknown" for each field, broken down by brand. Alert if a brand's enrichment quality drops below a threshold (e.g., >20% Unknown).
- **Image-based enrichment:** For products where the name is uninformative (e.g., "Product SKU-12345"), send the product image to a vision model to extract color and fabric. Would require GPT-4o (vision) instead of GPT-4o mini.
