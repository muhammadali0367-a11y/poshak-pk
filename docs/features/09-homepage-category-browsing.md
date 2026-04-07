# Feature: Homepage & Category Browsing

## 1. What It Does

Provides the primary discovery experience for users who aren't searching for something specific. The homepage displays product carousels grouped by category (Lawn, Kurta, 3 Piece Suit, etc.), letting users browse what's available. Category pages show all products within a specific category with pagination and filtering. Together, these pages handle the "window shopping" use case — users exploring across brands without a specific query in mind.

---

## 2. How It Works Technically

### Homepage (`app/page.js`)

**Data fetching:** On page load, the homepage calls `GET /api/homepage`, which returns a small set of products for each populated category. The API queries Supabase strictly by the `category` column:

```sql
SELECT * FROM products WHERE category = 'Lawn' AND in_stock = true LIMIT 10
```

This is repeated for each category in the predefined `CATEGORIES` array.

**Populated categories:** Not all categories have products at any given time (seasonal items, brands going in/out of stock). The homepage maintains a `POPULATED_CATEGORIES` array — a filtered version of `CATEGORIES` that only includes categories with >0 products in Supabase. Empty categories are hidden from:
- The homepage category carousels
- The sidebar navigation
- The mega dropdown menu

**Category carousel component:** Each category gets a horizontal scrollable row showing up to 10 products. Users can click "View All →" to navigate to the full category page.

### Category Pages (`app/category/[slug]/page.js`)

**URL structure:** `/category/lawn`, `/category/3-piece-suit`, `/category/kurta`, etc. The slug is derived from the category name.

**Pagination:** Products are loaded 24 at a time from the API. A "Load More" button fetches the next page and appends results to the existing list (infinite scroll pattern without actual scroll detection).

**Filters available:**
- Brand (dropdown populated from products in this category)
- Price range (predefined brackets: Under 3,000 / 3,000–6,000 / 6,000–10,000 / 10,000–20,000 / 20,000+)
- Sort (Price Low→High, Price High→Low, Name A→Z, Name Z→A)

**API call pattern:**
```
GET /api/products?category=Lawn&page=1&brand=Khaadi&sort=price_asc
```

### Homepage Route (`app/api/homepage/route.js`)

This API route was specifically fixed to query by the `category` column instead of the `tags`, `collection`, or `product_type` columns. The old approach caused incorrect category display because products from different collections were being mixed together.

### SharedNav Component

The sidebar navigation and mega dropdown both pull their category lists from the homepage API. They use the `popCategories` state which is populated by fetching `/api/homepage` and extracting which categories returned products. This ensures the navigation never shows categories with zero products.

---

## 3. Files / Components Involved

| File | Role |
|---|---|
| `app/page.js` | Homepage — renders category carousels, uses `POPULATED_CATEGORIES` |
| `app/category/[slug]/page.js` | Category page — pagination, filtering, sort |
| `app/api/homepage/route.js` | API that returns products grouped by category |
| `app/api/products/route.js` | API for paginated product listing with filters |
| `app/SharedNav.js` | Sidebar + mega dropdown — dynamically hides empty categories |
| `app/components/CategoryCarousel.js` | Horizontal scrollable product row component |

---

## 4. APIs Used

| Endpoint | Purpose |
|---|---|
| `GET /api/homepage` | Returns up to 10 products per populated category |
| `GET /api/products?category=X&page=N` | Paginated product listing with optional brand, price, sort filters |
| Supabase REST (via `@supabase/supabase-js`) | All database queries |

---

## 5. Edge Cases

- **Category with only 1–2 products:** The carousel still renders but looks sparse. No minimum threshold is enforced — even a category with 1 product will appear.
- **Category name ↔ slug mismatch:** If a new category is added to the enrichment that doesn't have a corresponding slug mapping, the "View All" link will 404. The slug generation needs to handle all possible category names.
- **Seasonal emptiness:** During category transitions (e.g., Winter → Spring), many categories may temporarily have 0 products. The `POPULATED_CATEGORIES` filter handles this gracefully — carousels simply don't appear.
- **Homepage API performance:** The homepage API makes one Supabase query per category. With ~15 categories, that's 15 sequential queries on every homepage load. No caching is implemented.
- **Stale filter counts:** The brand dropdown on category pages shows all brands that exist in that category, but doesn't show product counts. A brand with only 1 out-of-stock product might still appear in the filter.

---

## 6. How to Improve

- **API response caching:** Cache the homepage API response for 5–10 minutes. Product data only changes once per night (after the pipeline runs), so there's no reason to hit Supabase on every homepage visit.
- **Category product counts:** Show the number of products next to each category in the sidebar and mega dropdown (e.g., "Lawn (340)"). Helps users understand catalog depth.
- **Skeleton loading states:** Instead of showing nothing while data loads, display skeleton placeholders (gray boxes in the shape of product cards). Improves perceived performance.
- **Server-side rendering (SSR):** Move data fetching to Next.js server components so the homepage is pre-rendered with product data. Eliminates the loading delay for first-time visitors and improves SEO.
- **Hero banner / curated collections:** Add an editorial layer — a featured banner for "Eid Collection 2026" or "New Arrivals This Week" that's manually curated or auto-generated from recent high-value products.
- **Infinite scroll:** Replace "Load More" with true infinite scroll on category pages using intersection observer. Reduces friction for browsing users.
