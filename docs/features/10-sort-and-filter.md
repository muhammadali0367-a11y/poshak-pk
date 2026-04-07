# Feature: Sort & Filter System

## 1. What It Does

Lets users narrow down products by multiple dimensions (brand, color, fabric, occasion, price range) and reorder results by price or name. This transforms the experience from "here are 3,000 products, good luck" to "here are 12 blue lawn kurtas under 5,000, sorted cheapest first." Filters are available on the homepage (when browsing by category), category pages, and search results.

---

## 2. How It Works Technically

### Filter Architecture

Filters operate at two levels depending on the page:

**Server-side (API level) — Category pages & search:**
- `brand` — passed as URL param, applied as `WHERE brand ILIKE '%{brand}%'` in Supabase
- `min_price` / `max_price` — applied as `WHERE price >= {min} AND price <= {max}`
- `category` — applied as `WHERE category = '{category}'`
- `color` — detected from search query and applied as `WHERE color ILIKE '%{color}%'`

**Client-side (JavaScript) — Homepage filtered view:**
- `activeCategory` — filters the loaded product array by `p.category === activeCategory`
- `color`, `fabric`, `occasion` — exact match filters on product attributes
- `priceRange` — bracket-based: "Under 3,000", "3,000–6,000", etc.
- `query` — client-side text filter across name, brand, category, fabric, occasion

The homepage loads all products and filters client-side for instant responsiveness. Category pages use server-side filtering for performance with large datasets.

### Sort Implementation

Sort options:
- Price: Low to High (`price_asc`)
- Price: High to Low (`price_desc`)
- Name: A to Z (`name_asc`)
- Name: Z to A (`name_desc`)

On category pages, sort is passed to the API and applied in the Supabase query:
```javascript
query = query.order('price', { ascending: true })  // price_asc
```

On the homepage, sort is applied client-side via `Array.sort()` on the filtered product array.

### The Sort Bug Fix

The original category page had `sort` missing from the `useEffect` dependency array:

```javascript
// BEFORE (broken)
useEffect(() => { loadProducts(page) }, [catName, page, brand, priceRange]);

// AFTER (fixed)
useEffect(() => { loadProducts(page) }, [catName, page, brand, priceRange, sort]);
```

When a user changed the sort dropdown, `setSort()` triggered a state update that cleared products and reset the page to 1, but the `useEffect` didn't re-run because `sort` wasn't in its deps. Result: empty screen with "No dresses found."

### Price Range Brackets

```javascript
const priceOk = (price) => {
  if (priceRange === "All Prices")    return true;
  if (priceRange === "Under 3,000")   return price < 3000;
  if (priceRange === "3,000–6,000")   return price >= 3000  && price <= 6000;
  if (priceRange === "6,000–10,000")  return price > 6000   && price <= 10000;
  if (priceRange === "10,000–20,000") return price > 10000  && price <= 20000;
  if (priceRange === "20,000+")       return price > 20000;
  return true;
};
```

---

## 3. Files / Components Involved

| File | Role |
|---|---|
| `app/page.js` | Homepage — client-side filtering and sorting |
| `app/category/[slug]/page.js` | Category page — server-side filtering, sort in useEffect deps |
| `app/api/products/route.js` | API — applies brand, price, category, sort filters at the database level |
| `app/api/search/route.js` | Search API — applies brand, price, color filters to vector search results |
| `app/SharedNav.js` | Contains filter dropdowns in the sidebar |

---

## 4. APIs Used

| Endpoint | Filters Applied |
|---|---|
| `GET /api/products?category=X&brand=Y&sort=price_asc&page=1` | Server-side: category, brand, sort, pagination |
| `GET /api/search?q=X&brand=Y&min_price=Z&max_price=W` | Server-side: brand, price range, color |
| Supabase `.order()`, `.gte()`, `.lte()`, `.ilike()` | Database-level filtering and sorting |

---

## 5. Edge Cases

- **Price = 0 products:** Some scraped products have price 0 (price unavailable). These always pass the "Under 3,000" filter even though they're not actually cheap — they're just missing price data. The product card shows "Price unavailable" for these.
- **Filter combinations that return 0 results:** Selecting "Brand: HSY" + "Price: Under 3,000" returns nothing (HSY is luxury). No helpful "try broadening your filters" message is shown.
- **Color filter ambiguity:** The color filter uses `ILIKE` which means "Blue" matches "Navy Blue", "Baby Blue", "Royal Blue", and "Blue-Grey". This is mostly desirable but occasionally returns unexpected results.
- **Sort + pagination interaction:** On category pages, changing the sort resets to page 1. But if a user is on page 5 and changes sort, they lose their scroll position and go back to the top.
- **Case sensitivity in brand filter:** Brand names must match the database exactly. If a brand is stored as "Gul Ahmed" but the filter sends "gul ahmed", the `ILIKE` handles it. But `=` exact match would fail.

---

## 6. How to Improve

- **Filter counts:** Show the number of matching products for each filter option (e.g., "Blue (45)", "Khaadi (120)"). Helps users understand which combinations are productive.
- **URL-based filter state:** Encode active filters in the URL (e.g., `/category/lawn?brand=khaadi&sort=price_asc`). This makes filtered views shareable and bookmarkable. Currently, refreshing the page resets all filters.
- **"No results" helper:** When filters return 0 products, show a message suggesting which filter to relax. "No blue velvet kurtas under 3,000 — try expanding your price range or removing the color filter."
- **Dynamic price range brackets:** Instead of hardcoded brackets, compute them from the actual price distribution in each category. A category with products mostly between 1,000–3,000 should have finer brackets than one with products at 50,000+.
- **Multi-select filters:** Currently, you can only select one brand at a time. Allow multi-select: "Show me products from Khaadi AND Gul Ahmed."
- **Saved filter preferences:** Once user accounts exist, remember a user's preferred sort order and frequently used filters across sessions.
