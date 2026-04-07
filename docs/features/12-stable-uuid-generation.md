# Feature: Stable UUID Generation

## 1. What It Does

Ensures that every product in the system has a permanent, deterministic ID that never changes across pipeline runs. The same product (identified by its URL on the brand's website) always gets the same UUID, regardless of when or how many times it's scraped. This is the single most important data integrity mechanism in the entire pipeline — without it, the database fills with duplicates, the out-of-stock detection breaks, and Pinecone accumulates orphan vectors.

---

## 2. How It Works Technically

### The Core Mechanism

```python
from uuid import uuid5, NAMESPACE_URL

product_id = str(uuid5(NAMESPACE_URL, product_url))
```

`uuid5` is a deterministic hashing function defined in RFC 4122. It takes a namespace (we use `NAMESPACE_URL`, a predefined constant) and a name string (the product's URL), and produces a UUID that is always the same for the same input.

Examples:
- `uuid5(NAMESPACE_URL, "https://pk.khaadi.com/products/xyz")` → always `"a1b2c3d4-..."` 
- `uuid5(NAMESPACE_URL, "https://www.gulahmedshop.com/products/abc")` → always `"e5f6g7h8-..."`

### Why It Was Needed (The Bug)

The original `convert.py` used `uuid4()` — a random UUID generator. Every pipeline run produced new random IDs for every product. This caused a cascade of failures:

1. **Duplicate products:** Monday's "Embroidered Lawn Kurta" got ID `aaa-111`. Tuesday's identical product got ID `bbb-222`. Both existed in Supabase simultaneously.
2. **False out-of-stock:** `mark_out_of_stock` checks which old IDs are missing from the new run. Since ALL old IDs are missing (new IDs are completely different), it marked EVERYTHING as out of stock.
3. **Pinecone pollution:** Each run added ~31k new vectors to Pinecone without removing old ones. The index grew by 31k vectors per day, heading toward the 100k free-tier limit.
4. **Upsert didn't work:** Supabase `upsert` uses the ID as the key. With random IDs, every product was always a new insert, never an update.

### The Fix

Changed one line in `convert.py`:
```python
# BEFORE (broken)
product_id = str(uuid4())

# AFTER (fixed)  
product_id = str(uuid5(NAMESPACE_URL, product_url))
```

### The Migration

After deploying the fix, a one-time reset was required:
1. `TRUNCATE TABLE products` in Supabase (clear all old random-ID rows)
2. Clear all vectors from Pinecone (`index.delete(delete_all=True)`)
3. Run the full pipeline fresh — all products get new stable IDs
4. Run `backfill_embeddings.py` to re-embed everything in Pinecone

From that point forward, every nightly run correctly upserts (updates existing + inserts new) instead of creating duplicates.

---

## 3. Files / Components Involved

| File | Role |
|---|---|
| `convert.py` | Contains the UUID generation line. This is where the fix was applied. |
| `upload_to_supabase.py` | Uses the stable IDs for upsert operations and out-of-stock detection. |
| `backfill_embeddings.py` | Uses the stable IDs as vector IDs in Pinecone. |
| Supabase `products.id` column | Primary key — must be stable across runs. |
| Pinecone vector IDs | Must match Supabase product IDs for search→fetch to work. |

---

## 4. APIs Used

None — UUID generation is a pure Python computation with no external dependencies.

---

## 5. Edge Cases

- **Product URL changes:** If a brand restructures their site and a product's URL changes (e.g., `brand.com/old-path` → `brand.com/new-path`), it gets a new UUID. The old UUID stays in the database marked as out-of-stock, and a new row is created. Effectively, the product is "deleted and re-created" from the system's perspective.
- **URL normalization:** `https://brand.com/product` and `https://brand.com/product/` (trailing slash) produce different UUIDs. The scraper must be consistent about URL formatting. Currently, URLs are taken as-is from the brand's API/HTML.
- **UUID collision probability:** `uuid5` has a collision probability of approximately 1 in 2^122 for different inputs. For practical purposes with <100k products, collisions are impossible.
- **Supabase + Pinecone ID sync:** The same UUID is used as the primary key in Supabase AND the vector ID in Pinecone. If either system is cleared without clearing the other, they go out of sync. Operations that clear one must always clear both.

---

## 6. How to Improve

- **URL normalization layer:** Before generating the UUID, normalize the product URL — lowercase, remove trailing slashes, remove query parameters (like tracking params), resolve redirects. This prevents different representations of the same URL from generating different IDs.
- **Fallback ID source:** For products without a stable URL (e.g., HSY manual entries that might not have URLs), use a fallback like `uuid5(NAMESPACE_URL, f"{brand}:{product_name}")`. Not as reliable as URL-based, but better than random.
- **ID change detection:** When the pipeline detects that a URL it's seen before now resolves to a different page (e.g., 301 redirect to a new URL), log a warning. This helps catch URL restructuring before it causes phantom duplicates.
- **Historical ID mapping:** Maintain a table that maps old IDs to new IDs when URL changes are detected. This would allow the system to preserve wishlist items, price history, and other user-facing data across URL migrations.
