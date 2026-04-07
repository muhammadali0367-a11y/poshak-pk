# Feature: Vector Search & Embeddings (Pinecone)

## 1. What It Does

Enables semantic search across the entire product catalog. Instead of matching exact keywords, vector search understands meaning — so a query like "something nice for a summer wedding" can find "Embroidered Lawn 3 Piece Suit" even though they share zero words. This is the foundation that makes Poshak's search feel intelligent rather than like a dumb keyword filter.

Every product in the database has a corresponding vector (a list of 1536 numbers) stored in Pinecone. When a user searches, their query is also converted to a vector, and Pinecone finds the products whose vectors are closest in meaning.

---

## 2. How It Works Technically

### What Gets Embedded

Each product's embedding is generated from a concatenated string:
```
{name} | Tags: {tags} | Category: {category} | Brand: {brand}
```

Example:
```
Embroidered Lawn Kurta | Tags: summer, floral, unstitched | Category: Lawn | Brand: Gul Ahmed
```

Including all four fields gives the embedding maximum semantic context. A query about "Gul Ahmed summer collection" will match because the brand and seasonal tags are in the embedding.

### Embedding Model

**Model:** OpenAI `text-embedding-3-small`
**Dimensions:** 1536
**Similarity metric:** Cosine similarity (configured in Pinecone)

This model was chosen for its balance of quality and cost. At ~$0.000002 per embedding, the entire 31k catalog costs about $0.07 to embed.

### Pinecone Index Configuration

- **Index name:** `poshak-products`
- **Tier:** Free (1 index, 100k vectors max)
- **Cloud/Region:** AWS us-east-1 (serverless)
- **Vector ID:** The product's stable UUID (same as the Supabase primary key)

Using the same ID in both Supabase and Pinecone is critical — it allows the search API to take Pinecone's vector results (a list of IDs + similarity scores) and directly fetch full product details from Supabase with a single `SELECT WHERE id IN (...)` query.

### Indexing Flow (at upload time)

```
Product data → Concatenate name+tags+category+brand
             → OpenAI text-embedding-3-small → 1536-dim vector
             → Pinecone upsert (id=product_uuid, vector=embedding)
             → Supabase SET embedding_synced = true
```

### Query Flow (at search time)

```
User query → GPT-4o mini normalizes → "lawn kurta casual summer"
           → OpenAI embed → 1536-dim query vector
           → Pinecone query (topK=50, cosine similarity)
           → Returns [{id, score}, {id, score}, ...]
           → Supabase SELECT WHERE id IN [...]
           → Hybrid rerank → Return to user
```

### The `embedding_synced` Column

A boolean column in Supabase's `products` table. Set to `false` when a product is inserted/updated, set to `true` after its embedding is generated and stored in Pinecone. This allows:
- Safe re-runs: only unsynced products get embedded
- Monitoring: `SELECT COUNT(*) WHERE embedding_synced = false` shows how many products are missing vectors
- Backfill: the `backfill_embeddings.py` script processes all unsynced products in batches

---

## 3. Files / Components Involved

| File | Role |
|---|---|
| `upload_to_supabase.py` | Generates embeddings at upload time for new/updated products |
| `backfill_embeddings.py` | One-time script to embed all existing products (used during initial setup) |
| `create_pinecone_index.py` | One-time script to create the Pinecone index with correct dimensions |
| `app/api/search/route.js` | Queries Pinecone at search time with the embedded user query |
| Supabase `products.embedding_synced` column | Tracks which products have been embedded |
| Pinecone `poshak-products` index | Stores all product vectors |

---

## 4. APIs Used

| API | Purpose | Cost |
|---|---|---|
| OpenAI Embeddings (`text-embedding-3-small`) | Convert text to 1536-dim vectors | ~$0.02 per 1M tokens |
| Pinecone Query API | Approximate nearest neighbor search | Free (within free tier) |
| Pinecone Upsert API | Store/update vectors | Free (within free tier) |

---

## 5. Edge Cases

- **Product with no tags or category:** The embedding string becomes just `{name} | Tags: | Category: Unknown | Brand: {brand}`. Still works but with less semantic context — the embedding will be dominated by the product name alone.
- **Pinecone free tier limit (100k vectors):** Currently at ~31k, but adding Sapphire, Cross Stitch, and organic growth could approach the limit. Orphan vectors from deleted products are never cleaned up, making this worse over time.
- **Embedding model change:** If OpenAI deprecates `text-embedding-3-small` or you want to upgrade to `text-embedding-3-large`, ALL existing vectors become incompatible with new query vectors. The entire index must be deleted and rebuilt.
- **Cold start after Pinecone purge:** After clearing Pinecone (e.g., during the UUID migration), all products need re-embedding. The `backfill_embeddings.py` script handles this but takes ~30 minutes for 31k products.
- **Stale embeddings:** If a product's name or tags change (e.g., a brand renames "Summer Collection" to "Spring '26"), the old embedding is still in Pinecone. The `embedding_synced` flag doesn't get reset on updates — only on new inserts. This means changed products have slightly stale vectors until the next full re-embed.
- **Pinecone latency:** Free-tier Pinecone has cold-start latency — the first query after inactivity can take 3–5 seconds. Subsequent queries are fast (~100ms).

---

## 6. How to Improve

- **Reset `embedding_synced` on product updates:** When `upload_to_supabase.py` upserts a product whose name, tags, or category changed, set `embedding_synced = false` so it gets re-embedded with updated content.
- **Orphan vector cleanup:** After each pipeline run, compare Pinecone vector IDs against Supabase product IDs. Delete any vectors that don't have a corresponding product (from products that were removed or re-IDed).
- **Metadata in Pinecone:** Store `brand`, `category`, `price`, and `in_stock` as Pinecone metadata. This allows Pinecone-side filtering (e.g., `filter={"brand": "Khaadi", "in_stock": true}`) before returning results, reducing the number of Supabase lookups needed.
- **Upgrade to `text-embedding-3-large`:** 3072 dimensions, better quality, ~2x cost. Would improve search relevance, especially for subtle queries like "something for a casual family dinner vs. a formal party."
- **Hybrid embedding:** Instead of just text, generate a combined text+image embedding using a multimodal model. Would let the search surface visually similar products, not just semantically similar names.
- **Pre-warm Pinecone:** Make a dummy query at app startup to avoid the free-tier cold-start latency hitting the first real user.
