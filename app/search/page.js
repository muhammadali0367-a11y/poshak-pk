"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import ProductCard from "../components/ProductCard";
import FilterBar from "@/app/components/FilterBar";
import Select from "@/app/components/ui/Select";
import { useRouter, useSearchParams } from "next/navigation";
import SharedNav from "../SharedNav";
import { getBrandsCached } from "../lib/clientDataCache";

const PRICE_RANGES = ["Under 3,000","3,000–6,000","6,000–10,000","10,000–20,000","20,000+"];

function safePrice(p) { const n=Number(p); return isNaN(n)?0:n; }

function parsePriceRange(pr) {
  if (!pr || pr==="All Prices") return [null,null];
  const m=pr.match(/([\d,]+)–([\d,]+)/); if(m) return [parseInt(m[1].replace(/,/g,"")),parseInt(m[2].replace(/,/g,""))];
  const u=pr.match(/Under ([\d,]+)/); if(u) return [null,parseInt(u[1].replace(/,/g,""))];
  const o=pr.match(/([\d,]+)\+/); if(o) return [parseInt(o[1].replace(/,/g,"")),null];
  return [null,null];
}

function toTitleCase(s) {
  return (s || "").replace(/\b\w/g, c => c.toUpperCase());
}

// Derive the price dropdown display label from URL min_price / max_price params
function derivePriceRange(minStr, maxStr) {
  if (!minStr && !maxStr)                             return "";
  if (!minStr && maxStr === "3000")                   return "Under 3,000";
  if (minStr === "3000"  && maxStr === "6000")        return "3,000–6,000";
  if (minStr === "6000"  && maxStr === "10000")       return "6,000–10,000";
  if (minStr === "10000" && maxStr === "20000")       return "10,000–20,000";
  if (minStr === "20000" && !maxStr)                  return "20,000+";
  return "All Prices";
}

function deriveBadge(tags, _name, original_price, price) {
  const op=safePrice(original_price), p=safePrice(price);
  if(op>0&&op>p) return "Sale";
  if((tags||"").toLowerCase().includes("new")) return "New";
  return null;
}

function SearchResults() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const rawQ         = searchParams.get("q")            || "";

  // All filter state lives in URL params
  const brand         = searchParams.get("brand")         || "";
  const main_category = searchParams.get("main_category") || "";
  const stitch_type   = searchParams.get("stitch_type")   || "";
  const tier          = searchParams.get("tier")          || "";
  const color         = searchParams.get("color")         || "";
  const fabric        = searchParams.get("fabric")        || "";
  const occasion      = searchParams.get("occasion")      || "";
  const piece_count   = searchParams.get("piece_count")   || "";
  const in_stock      = searchParams.get("in_stock")      || "";
  const sort          = searchParams.get("sort")          || "";
  // Price contract: min_price / max_price are the real URL state
  const min_price_url = searchParams.get("min_price")     || "";
  const max_price_url = searchParams.get("max_price")     || "";
  // Derive dropdown display value from URL min/max — not stored in URL itself
  const priceRange    = derivePriceRange(min_price_url, max_price_url);

  const [products,    setProducts]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [total,       setTotal]       = useState(0);
  const [allBrands,   setAllBrands]   = useState([]);
  const [filtersData, setFiltersData] = useState({
    main_category: [], stitch_type: [], tier: [],
    color: [], fabric: [], occasion: [], piece_count: [], in_stock: [],
  });
  const [wishlist,    setWishlist]    = useState([]);
  const [showNoResultsHint, setShowNoResultsHint] = useState(false);
  const sentinelRef = useRef(null);

  // Load brands + filter options once on mount
  useEffect(() => {
    getBrandsCached().then(setAllBrands).catch(() => {});
    fetch("/api/filters").then(r => r.json()).then(d => setFiltersData(d || {})).catch(() => {});
  }, []);

  // Reset page + products whenever any search param changes
  const filterKey = `${rawQ}|${brand}|${main_category}|${stitch_type}|${tier}|${color}|${fabric}|${occasion}|${piece_count}|${in_stock}|${sort}|${min_price_url}|${max_price_url}`;
  useEffect(() => {
    setPage(1);
    setProducts([]);
  }, [filterKey]);

  // Fetch products
  useEffect(() => {
    const hasQuery = rawQ || brand || main_category || stitch_type || tier || color || fabric || occasion || piece_count || in_stock;
    if (!hasQuery) { setLoading(false); return; }

    setLoading(true);
    const qp = new URLSearchParams({ page: String(page) });

    let endpoint;
    if (rawQ) {
      // Text search path — /api/search now fully supports the new contract
      endpoint = "/api/search";
      qp.set("q", rawQ);
      if (brand)         qp.set("brand",         brand);
      if (main_category) qp.set("main_category", main_category);
      if (stitch_type)   qp.set("stitch_type",   stitch_type);
      if (tier)          qp.set("tier",           tier);
      if (color)         qp.set("color",          color);
      if (fabric)        qp.set("fabric",         fabric);
      if (occasion)      qp.set("occasion",       occasion);
      if (piece_count)   qp.set("piece_count",    piece_count);
      if (in_stock)      qp.set("in_stock",       in_stock);
      if (sort)          qp.set("sort",           sort);
      if (min_price_url) qp.set("min_price",      min_price_url);
      if (max_price_url) qp.set("max_price",      max_price_url);
    } else {
      // Structured filter path (brand page, category drill-down, etc.) — /api/products
      endpoint = "/api/products";
      if (brand)         qp.set("brand",         brand);
      if (main_category) qp.set("main_category", main_category);
      if (stitch_type)   qp.set("stitch_type",   stitch_type);
      if (tier)          qp.set("tier",           tier);
      if (color)         qp.set("color",          color);
      if (fabric)        qp.set("fabric",         fabric);
      if (occasion)      qp.set("occasion",       occasion);
      if (piece_count)   qp.set("piece_count",    piece_count);
      if (in_stock)      qp.set("in_stock",       in_stock);
      if (sort)          qp.set("sort",           sort);
      if (min_price_url) qp.set("min_price",      min_price_url);
      if (max_price_url) qp.set("max_price",      max_price_url);
    }

    fetch(`${endpoint}?${qp}`)
      .then(r => r.json())
      .then(json => {
        const prods = (json.products || []).map(p => ({
          ...p,
          price:          safePrice(p.price),
          original_price: safePrice(p.original_price),
          badge:          deriveBadge(p.tags, p.name, p.original_price, p.price),
        }));
        setProducts(prev => page === 1 ? prods : (prods.length > 0 ? [...prev, ...prods] : prev));
        setShowNoResultsHint(page === 1 && prods.length === 0);
        setTotalPages(json.pages || 1);
        setTotal(json.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [rawQ, page, brand, main_category, stitch_type, tier, color, fabric, occasion, piece_count, in_stock, sort, min_price_url, max_price_url]);

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loading && page < totalPages) {
        setTimeout(() => setPage(n => n + 1), 100);
      }
    }, { rootMargin: "200px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loading, page, totalPages]);

  function updateUrl(updates) {
    const qp = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) qp.set(k, v); else qp.delete(k);
    });
    qp.delete("page");
    router.push(`/search?${qp.toString()}`, { scroll: false });
  }

  function handlePriceChange(label) {
    const [minP, maxP] = parsePriceRange(label);
    updateUrl({
      min_price: minP != null ? String(minP) : "",
      max_price: maxP != null ? String(maxP) : "",
    });
  }

  const toggleWish = (id, e) => { e?.stopPropagation(); setWishlist(w => w.includes(id) ? w.filter(x => x !== id) : [...w, id]); };

  const selectedFilters = { main_category, stitch_type, tier, color, fabric, occasion, piece_count, in_stock };
  const BRANDS = allBrands;

  const pageTitle = rawQ ? `Results for "${rawQ}"` : brand ? brand : "Products";

  return (
    <div style={{ maxWidth:"1240px", margin:"0 auto", padding:"28px 24px" }}>
      {/* Header + controls */}
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:"24px", paddingBottom:"16px", borderBottom:"2px solid #dfdfdf", flexWrap:"wrap", gap:"12px" }}>
        <div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"36px", fontWeight:300, color:"#000000" }}>
            {pageTitle}
          </h1>
          <p style={{ fontSize:".72rem", color:"#bbb", marginTop:"4px" }}>{total.toLocaleString()} results</p>
        </div>
        {/* Primary controls: Brand, Price, Sort */}
        <div style={{ display:"flex", gap:"10px", flexWrap:"wrap", alignItems:"center" }}>
          <Select
            value={brand}
            onChange={e => updateUrl({ brand: e.target.value || "" })}
            options={BRANDS.map(b => ({ value: b, label: toTitleCase(b) }))}
            placeholder="All Brands"
          />
          <Select
            value={priceRange}
            onChange={e => handlePriceChange(e.target.value)}
            options={PRICE_RANGES.map(p => ({ value: p, label: p }))}
            placeholder="All Prices"
          />
          <Select
            value={sort}
            onChange={e => updateUrl({ sort: e.target.value || "" })}
            options={[
              { value: "price_asc",  label: "Price: Low → High" },
              { value: "price_desc", label: "Price: High → Low" },
              { value: "name_asc",   label: "Name A–Z" },
            ]}
            placeholder="Sort"
          />
        </div>
      </div>
      {/* Secondary filters */}
      <div style={{ marginBottom:"20px" }}>
        <FilterBar
          filtersData={filtersData}
          selectedFilters={selectedFilters}
          onChange={(key, value) => updateUrl({ [key]: value })}
          onClearAll={() => updateUrl({ main_category: "", stitch_type: "", tier: "", color: "", fabric: "", occasion: "", piece_count: "", in_stock: "" })}
        />
      </div>
      {showNoResultsHint && (
        <p style={{ fontSize:".72rem", color:"#757575", marginBottom:"16px" }}>No results found</p>
      )}

      {loading && products.length===0 ? (
        <div style={{ textAlign:"center", padding:"80px 0", color:"#757575" }}>
          <div style={{ fontSize:"1.5rem", marginBottom:"12px" }}>◌</div>
          <p style={{ fontSize:".8rem", letterSpacing:".1em" }}>Searching…</p>
        </div>
      ) : products.length===0 && !loading ? (
        <div style={{ textAlign:"center", padding:"80px 0", color:"#ccc" }}>
          <div style={{ fontSize:"3rem", marginBottom:"16px" }}>◌</div>
          <p style={{ fontSize:".85rem" }}>No results found{rawQ ? ` for "${rawQ}"` : ""}</p>
          <p style={{ fontSize:".75rem", color:"#bbb", marginTop:"8px" }}>Try different keywords or browse categories</p>
        </div>
      ) : (
        <>
          <div className="product-grid">
            {products.map((p, idx) => (
              <div key={p.id} className="product-card-wrap">
                <ProductCard p={p} idx={idx} wishlist={wishlist} onWish={toggleWish} />
              </div>
            ))}
          </div>
          <div ref={sentinelRef} style={{ height:"40px", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"40px" }}>
            {loading && products.length > 0 && (
              <div style={{ fontSize:".75rem", color:"#757575", letterSpacing:".1em" }}>Loading more…</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <div style={{ fontFamily:"'Jost','DM Sans',sans-serif", background:"#ffffff", minHeight:"100vh", color:"#000000" }}>
      <SharedNav />
      <Suspense fallback={<div style={{height:"62px",borderBottom:"2px solid #dfdfdf"}} />}>
        <SearchResults />
      </Suspense>
      <footer style={{ borderTop:"2px solid #dfdfdf", padding:"40px 24px 32px", background:"#ffffff" }}>
        <div style={{ maxWidth:"1240px", margin:"0 auto" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:"32px", marginBottom:"32px" }}>
            <div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"1.4rem", color:"#000000", marginBottom:"8px", fontWeight:300 }}>Poshak</div>
              <p style={{ fontSize:".72rem", color:"#aaa", lineHeight:1.6 }}>Every brand. One place.</p>
            </div>
            <div>
              <div style={{ fontSize:".6rem", letterSpacing:".2em", textTransform:"uppercase", color:"#757575", marginBottom:"10px" }}>Top Brands</div>
              {["Khaadi","Gul Ahmed","Maria B","Sana Safinaz","Limelight"].map(b => (
                <div key={b} style={{ fontSize:".75rem", color:"#aaa", marginBottom:"5px", cursor:"pointer" }}>{b}</div>
              ))}
            </div>
            <div>
              <div style={{ fontSize:".6rem", letterSpacing:".2em", textTransform:"uppercase", color:"#757575", marginBottom:"10px" }}>Categories</div>
              {["Lawn","Bridal","Pret / Ready to Wear","Unstitched","Festive / Eid"].map(cat => (
                <div key={cat} style={{ fontSize:".75rem", color:"#aaa", marginBottom:"5px", cursor:"pointer" }}>{cat}</div>
              ))}
            </div>
          </div>
          <div style={{ borderTop:"2px solid #dfdfdf", paddingTop:"16px", display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:"8px" }}>
            <p style={{ fontSize:".62rem", letterSpacing:".12em", color:"#ccc", textTransform:"uppercase" }}>© 2026 Poshak · Pakistan's Women's Fashion Discovery</p>
            <p style={{ fontSize:".62rem", color:"#ccc" }}>Updated daily from 15+ brands</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
