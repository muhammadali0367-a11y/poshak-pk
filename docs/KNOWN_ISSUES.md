# BUG_LOG — Poshak.pk

> Every major bug we encountered, what caused it, and how it was fixed.

---

## BUG-01: Product duplication and false out-of-stock (uuid4 random IDs)

**Symptom:** After every nightly pipeline run, the database doubled in size with duplicate products. All previously existing products were simultaneously marked as out of stock, even though they were still live on brand websites.

**Root cause:** `convert.py` used `uuid4()` to generate product IDs — a completely random UUID every run. The same "Embroidered Lawn Kurta" from Khaadi got ID `aaa-111` on Monday and `bbb-222` on Tuesday. The upload script's `mark_out_of_stock` function compared new IDs against old IDs, found zero matches (all IDs were new), and marked everything as out of stock. Meanwhile, all Tuesday products were inserted as brand new rows.

**Fix:** Changed one line in `convert.py`: `str(uuid4())` → `str(uuid5(NAMESPACE_URL, product_url))`. The same product URL now always produces the same UUID. Required a one-time database truncate + Pinecone clear + fresh pipeline run.

**Files changed:** `convert.py`

---

## BUG-02: React hydration error #418 (localStorage/sessionStorage during SSR)

**Symptom:** Console showed `Uncaught Error: Minified React error #418` on every page load. The entire website was either blank white or partially rendered with broken interactions. Sometimes accompanied by errors #423 and #425.

**Root cause:** The homepage component (`app/page.js`) read from `localStorage` and `sessionStorage` directly during rendering. These browser APIs don't exist during server-side rendering (SSR) in Next.js. The server rendered HTML without wishlist data, but the client tried to render with wishlist data from localStorage — React detected the mismatch and threw a hydration error.

**Fix:** Added a `mounted` state guard pattern:
```javascript
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
const wishlist = mounted ? JSON.parse(localStorage.getItem('wishlist') || '[]') : [];
```
Also added `suppressHydrationWarning` to elements that legitimately differ between server and client.

**Files changed:** `app/page.js`, `app/category/[slug]/page.js`

---

## BUG-03: Null price crash — `TypeError: Cannot read properties of null (reading 'toLocaleString')`

**Symptom:** Clicking into category or brand pages threw a TypeError. The entire page went white. Console showed the error originating from price display code.

**Root cause:** Some products in Supabase had `price: null` (price unavailable from brand website). The frontend called `p.price.toLocaleString()` without null checking. One null price crashed the entire page.

**Fix:** Replaced every `p.price.toLocaleString()` with `(p.price || 0).toLocaleString()` across all page files. Added a `safePrice()` helper. Products with price 0 now display "Price unavailable."

**Files changed:** `app/page.js`, `app/category/[slug]/page.js`, `app/brand/[slug]/page.js`, `app/product/[id]/page.js`

---

## BUG-04: Khaadi scraper returning 0 products — outdated numeric cgids

**Symptom:** `scraper.py` showed `✓ khaadi: 0 unique products` despite cookies loading successfully. All 24 cgids probed, none returned products.

**Root cause:** Khaadi restructured their site and changed category IDs from numeric format (`001002`, `014003`) to slug format (`003-Ready-To-Wear`, `002-Fabrics`, `001-New-In`, `008-Sale`). The old numeric cgids silently returned empty results.

**Fix:** Replaced all 24 hardcoded numeric cgids with the 4 working slug-format cgids discovered via browser DevTools network inspection.

**Files changed:** `scraper.py`

---

## BUG-05: Khaadi returning 0 products on Railway — missing SFCC headers

**Symptom:** After fixing cgids, Khaadi scraped correctly locally but returned 0 products on Railway.

**Root cause:** Khaadi's SFCC endpoint requires `X-Requested-With: XMLHttpRequest` and `Referer: https://pk.khaadi.com/ready-to-wear/` headers. Without them, the endpoint returns valid HTML with zero product tiles. Worked locally by coincidence (browser cookie state carried extra context).

**Fix:** Modified `get_headers()` to accept an `sfcc=True` flag adding the required headers. Updated all SFCC calls.

**Files changed:** `scraper.py`

---

## BUG-06: Playwright crash on Railway — "Page crashed" / TargetClosedError

**Symptom:** `khaadi_setup.py` threw `Page.goto: Page crashed` or `TargetClosedError: BrowserContext.cookies: Target page, context or browser has been closed`.

**Root cause:** Two issues. (1) Chromium in Railway's container needed `--no-sandbox` and `--disable-dev-shm-usage` flags. (2) `wait_until="networkidle"` was too strict for Railway's memory, causing hangs or crashes.

**Fix:** Added container-safe flags to browser launch. Changed `wait_until` to `"domcontentloaded"`. Upgraded to Railway Hobby plan ($5/mo) for 8GB RAM.

**Files changed:** `khaadi_setup.py`

---

## BUG-07: Pipeline auto-runs on every git push to Railway

**Symptom:** Every `git push` triggered the full 12-hour pipeline, even for small config changes.

**Root cause:** Railway's `startCommand` was `bash run_pipeline.sh`. Every deployment = full pipeline run.

**Fix:** Set `startCommand` to `echo "Ready"` (no-op). Pipeline runs only via cron schedule. Avoid pushing code during the midnight–noon pipeline window.

**Files changed:** `railway.json`, Railway dashboard

---

## BUG-08: Sort filter showing "No dresses found"

**Symptom:** Changing sort dropdown on category pages cleared products and showed "No dresses found."

**Root cause:** `sort` was missing from the `useEffect` dependency array. `setSort()` cleared products, but the fetch `useEffect` never re-fired.

**Fix:** Added `sort` to deps: `[catName, page, brand, priceRange, sort]`.

**Files changed:** `app/category/[slug]/page.js`

---

## BUG-09: Empty categories in carousel, sidebar, and mega dropdown

**Symptom:** Categories with 0 products still appeared in all navigation. Clicking showed empty pages.

**Root cause:** Carousel used hardcoded `CATEGORIES` array. Sidebar and dropdown did the same. None checked which categories actually had products.

**Fix:** Carousel switched to `POPULATED_CATEGORIES`. `SharedNav.js` now fetches populated categories from the homepage API and filters dynamically.

**Files changed:** `app/page.js`, `app/SharedNav.js`

---

## BUG-10: "View on [Brand]" links returning 404

**Symptom:** Product modal "View on Gul Ahmed" button navigated to a broken URL.

**Root cause:** Some product URLs were stored as relative paths without the domain prefix, or pointed to collection URLs instead of product pages.

**Fix:** Ensured scraper constructs full absolute URLs for every product.

**Files changed:** `scraper.py`

---

## BUG-11: Abaya category empty despite products existing

**Symptom:** Abaya page was empty even though products with "Abaya" in their name existed.

**Root cause:** The old 3-level classification chain assigned Abayas to "Pret / Ready to Wear" because `product_type` mapping caught them first. Some non-Abaya products had "abaya" in their tags, also causing miscategorization.

**Fix:** Replaced the 3-level fallback with GPT-4o mini classification on product name only. Also fixed homepage API to query strictly by `category` column.

**Files changed:** `convert.py`, `app/api/homepage/route.js`

---

## BUG-12: "Printed" and "Embroidered" treated as colors

**Symptom:** Products showing "Printed" or "Embroidered" as color. Color filters returned wrong results.

**Root cause:** `COLOR_KEYWORDS` in `scraper.py` included `"printed"` and `"embroidered"`.

**Fix:** Removed both from the list. They're style descriptors, not colors.

**Files changed:** `scraper.py`

---

## BUG-13: Shopify color case mismatch — "Off-White" vs "Off White"

**Symptom:** Off-white products didn't match the "Off White" filter.

**Root cause:** `_extract_plain()` returned `kw.title()` converting "off-white" to "Off-White" (with hyphen). `convert.py` expected "Off White" (space, no hyphen).

**Fix:** Normalize by replacing hyphens with spaces before title-casing.

**Files changed:** `scraper.py`

---

## BUG-14: Click-away overlay intercepting dropdown clicks (z-index conflict)

**Symptom:** "All" mega dropdown appeared but links inside were unclickable.

**Root cause:** Transparent click-away div at `z-index: 299` rendered above the dropdown which had no explicit z-index.

**Fix:** Set dropdown to `z-index: 400`.

**Files changed:** `app/page.js`

---

## BUG-15: Sidebar sections expanded by default on mobile

**Symptom:** Opening sidebar showed all sections expanded — long scrollable list.

**Root cause:** `SidebarSection` initialized with `useState(true)`.

**Fix:** Changed to `useState(false)` — sections start collapsed.

**Files changed:** `app/page.js`

---

## BUG-16: Brands filter intermittently empty

**Symptom:** Brand dropdown sometimes showed all brands, sometimes empty.

**Root cause:** Brands API paginated through 37k+ products with a while loop hitting Supabase's per-request limit. Under load, some iterations timed out.

**Fix:** Replaced with single `SELECT DISTINCT brand FROM products WHERE in_stock = true`.

**Files changed:** `app/api/brands/route.js`

---

## BUG-17: Category page `params` variable shadowing

**Symptom:** Category pages sometimes displayed wrong category or broke entirely.

**Root cause:** `const params = new URLSearchParams(...)` shadowed `params` from `useParams()`. After that line, `params.slug` was `undefined`.

**Fix:** Renamed to `searchParams` to avoid shadowing.

**Files changed:** `app/category/[slug]/page.js`

---

## BUG-18: `useParams()` returns null during SSR

**Symptom:** Category and brand pages crashed on server render.

**Root cause:** `useParams()` returns `null` during SSR. Code accessed `params?.slug` immediately without waiting for mount.

**Fix:** Combined with the `mounted` guard — renders skeleton during SSR, accesses params only after mount.

**Files changed:** `app/category/[slug]/page.js`, `app/brand/[slug]/page.js`

---

## BUG-19: Vercel build failure — "Module not found: Can't resolve 'openai'"

**Symptom:** Deployment failed during `npm run build` after adding the vector search API.

**Root cause:** `openai` and `@pinecone-database/pinecone` packages weren't installed in the Next.js project.

**Fix:** `npm install openai @pinecone-database/pinecone` and pushed.

**Files changed:** `package.json`, `package-lock.json`

---

## BUG-20: Category page 404 — wrong filename `Categorypage.js`

**Symptom:** All `/category/*` pages returned 404.

**Root cause:** File saved as `Categorypage.js` instead of `page.js`. Next.js file-system routing requires `page.js`.

**Fix:** Renamed to `page.js`.

**Files changed:** `app/category/[slug]/page.js` (rename)

---

## BUG-21: Homepage showing wrong products in category carousels

**Symptom:** Lawn carousel contained formal wear. Kurta carousel was empty despite having kurtas.

**Root cause:** Homepage API filtered by `tags`, `collection`, and `product_type` — raw brand data that didn't map to Poshak's cleaned categories.

**Fix:** Changed to query strictly by the `category` column (populated by GPT classification).

**Files changed:** `app/api/homepage/route.js`

---

## BUG-22: Google Fonts 404 (malformed URL)

**Symptom:** Console showed 404 for Google Fonts CSS. Fonts fell back to system defaults.

**Root cause:** Google Fonts URL was HTML-entity encoded (`&amp;` instead of `&`) when rendered by Next.js.

**Fix:** Used `next/font/google` module instead of raw `<link>` tag.

**Files changed:** `app/layout.js`

---

## BUG-23: Khaadi HTML parser targeting wrong CSS selector

**Symptom:** Parser found 0 products in valid Khaadi HTML.

**Root cause:** Parser searched for `<div class="tile">` — Khaadi's old structure. Products changed to `<div class="product" data-pid="...">` with `data-gtmdata` JSON attribute.

**Fix:** Rewrote parser to target `div.product[data-pid]` and read from `data-gtmdata`.

**Files changed:** `scraper.py`

---

## BUG-24: Unnecessary proxy purchase

**Symptom:** Khaadi returned 0 products on Railway. Assumed IP blocking.

**Root cause:** Misdiagnosis — actual issue was missing SFCC headers (BUG-05).

**Resolution:** Headers fixed the problem. $5 proxy was unnecessary. Lesson: test simplest hypothesis first.

**Files changed:** None (config rollback)

---

## BUG-25: "Product not found" after UUID migration

**Symptom:** Every product showed "Product not found" after deploying uuid5 fix.

**Root cause:** Browser `sessionStorage` cached old uuid4-based product IDs that no longer existed in Supabase.

**Fix:** One-time `sessionStorage.clear()` in browser console + hard refresh. New visitors unaffected.

**Files changed:** None (client cache)

---

## BUG-26: convert.py GPT calls hanging / silent failures

**Symptom:** `convert.py` would hang indefinitely or produce products with all fields "Unknown."

**Root cause:** Original single-product GPT calls had no timeout and no retry logic. OpenAI rate limits (429) returned empty results silently.

**Fix:** Rebuilt with batched calls (50/batch), 4x retry, 60s timeout, 15s cooldown every 50 batches.

**Files changed:** `convert.py`
