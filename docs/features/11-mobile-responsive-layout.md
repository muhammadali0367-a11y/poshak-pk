# Feature: Mobile Responsive Layout

## 1. What It Does

Optimizes the Poshak.pk experience for mobile phones, where the majority of the target audience (Pakistani women 18–35) will access the site. The desktop layout uses a spacious grid with visible tags, large badges, and multi-column product grids. The mobile layout compresses everything into a 2-column product grid, hides non-essential UI elements, and ensures touch targets are large enough for comfortable browsing.

---

## 2. How It Works Technically

### 2-Column Product Grid

On screens below the mobile breakpoint (~768px), the product grid switches from 3–4 columns to 2 columns using CSS grid:

```css
@media (max-width: 768px) {
  .product-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
}
```

This applies to both the homepage category carousels and the category page product listings.

### Hidden Tags

On desktop, each product card shows tags (e.g., "Lawn", "Embroidered", "Summer"). On mobile, tags are hidden to save vertical space:

```css
@media (max-width: 768px) {
  .product-tags {
    display: none;
  }
}
```

Tags still exist in the data — they're just not rendered. Search and filtering still work because they query the database, not the visible UI.

### Reduced Badge Size

The brand/category badge on product cards is reduced in size on mobile:

```css
@media (max-width: 768px) {
  .brand-badge {
    font-size: 10px;
    padding: 2px 6px;
  }
}
```

### React Hydration Fix

A hydration mismatch error (#418) occurred because `localStorage` and `sessionStorage` are not available during server-side rendering (SSR). The fix uses a `mounted` state guard:

```javascript
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);

// Only access browser APIs after mount
const wishlist = mounted ? JSON.parse(localStorage.getItem('wishlist') || '[]') : [];
```

Additionally, `suppressHydrationWarning` is applied to elements that differ between server and client renders (e.g., elements that read from localStorage).

---

## 3. Files / Components Involved

| File | Role |
|---|---|
| `app/page.js` | Homepage — mobile grid, hidden tags, mounted guard for hydration |
| `app/category/[slug]/page.js` | Category page — mobile grid and badge sizing |
| CSS within page components | Inline `<style>` blocks with `@media` queries |
| Product card component | Conditional rendering of tags based on screen size |

---

## 4. APIs Used

None — mobile layout is purely a frontend concern. No API changes needed.

---

## 5. Edge Cases

- **Product images with inconsistent aspect ratios:** Some brands provide square images, others provide portrait or landscape. On a tight 2-column grid, inconsistent heights make the layout look jagged. Currently handled with `object-fit: cover` which crops to fill, but this can cut off important parts of product images.
- **Long product names on mobile:** Names like "Embroidered Luxury Chiffon 3 Piece Suit With Digital Printed Dupatta" overflow the 2-column card. Truncation with ellipsis is applied, but important details (like "3 Piece") may be cut off.
- **Touch target size:** Filter dropdowns and the "Load More" button need to be at least 44x44px for comfortable touch interaction (Apple's HIG recommendation). Some UI elements may be smaller.
- **Hydration mismatch on wishlist:** If a user has wishlist items in `localStorage`, the server renders an empty wishlist while the client renders the populated one. The `mounted` guard prevents this mismatch but causes a brief flash of content.
- **Sidebar on mobile:** The sidebar navigation slides in as an overlay. On very small screens (< 360px width), the sidebar may cover the entire viewport with no visible close button.

---

## 6. How to Improve

- **Progressive image loading:** Use `next/image` with blur placeholders or skeleton loading for product images. On slow mobile connections (common in Pakistan), images take seconds to load — a placeholder improves perceived performance dramatically.
- **Swipeable carousels:** The homepage category carousels should support touch swipe gestures on mobile, not just horizontal scroll. Use a library like `react-swipeable` or CSS scroll-snap.
- **Bottom navigation bar:** Add a fixed bottom nav bar with icons for Home, Search, Categories, and Wishlist. This is the standard mobile e-commerce pattern (used by Daraz, Myntra, Shopify stores) and puts key actions within thumb reach.
- **Pull-to-refresh:** On category pages, allow pull-to-refresh to reload products. Common mobile UX pattern that users expect.
- **Offline-first with service worker:** Cache the product grid and images using a service worker. Users on intermittent connections (common in Pakistan outside major cities) can still browse previously loaded products.
- **PWA (Progressive Web App):** Add a web app manifest, service worker, and install prompt. Users can "install" Poshak on their home screen and access it like a native app — no app store needed. This is on the roadmap.
- **Test on real devices:** The CSS media queries work in browser DevTools simulation, but real-device testing on popular Pakistani phones (Samsung Galaxy A series, Infinix, Tecno) is essential. These devices have different viewport sizes, browser rendering engines, and performance profiles.
