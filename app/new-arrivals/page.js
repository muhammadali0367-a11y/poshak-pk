"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import SharedNav from "../SharedNav";
import ProductCard from "../components/ProductCard";
import { getBrandsCached } from "../lib/clientDataCache";

const PRICE_RANGES = ["All Prices","Under 3,000","3,000–6,000","6,000–10,000","10,000–20,000","20,000+"];

function safePrice(p) { const n=Number(p); return isNaN(n)?0:n; }

function parsePriceRange(pr) {
  if (!pr || pr==="All Prices") return [null,null];
  const m=pr.match(/([\d,]+)–([\d,]+)/); if(m) return [parseInt(m[1].replace(/,/g,"")),parseInt(m[2].replace(/,/g,""))];
  const u=pr.match(/Under ([\d,]+)/); if(u) return [null,parseInt(u[1].replace(/,/g,""))];
  const o=pr.match(/([\d,]+)\+/); if(o) return [parseInt(o[1].replace(/,/g,"")),null];
  return [null,null];
}

export default function NewArrivalsPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [priceRange, setPriceRange] = useState("All Prices");
  const [brand, setBrand] = useState("All Brands");
  const [allBrands, setAllBrands] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [showNoResultsHint, setShowNoResultsHint] = useState(false);
  const sentinelRef = useRef(null);

  const WINDOW_SIZE = 72;
  const visibleProducts = useMemo(() => {
    if (products.length <= WINDOW_SIZE) return products;
    return products.slice(products.length - WINDOW_SIZE);
  }, [products]);

  useEffect(() => {
    getBrandsCached().then(brands => setAllBrands(brands));
    try {
      const saved = localStorage.getItem("poshak_wishlist");
      if (saved) setWishlist(JSON.parse(saved));
    } catch(e) {}
  }, []);

  useEffect(() => {
    setLoading(true);
    const [minP, maxP] = parsePriceRange(priceRange);
    const qp = new URLSearchParams({ page: String(page), sort: "newest" });
    if (brand !== "All Brands") qp.set("brand", brand);
    if (minP) qp.set("min_price", String(minP));
    if (maxP) qp.set("max_price", String(maxP));

    fetch(`/api/products?${qp}`)
      .then(r => r.json())
      .then(json => {
        const prods = (json.products || []).map(p => ({
          ...p,
          price: safePrice(p.price),
          original_price: safePrice(p.original_price),
        }));
        setProducts(prev => {
          if (prods.length === 0) return prev;
          return page === 1 ? prods : [...prev, ...prods];
        });
        if (page === 1 && prods.length === 0) {
          setShowNoResultsHint(brand !== "All Brands" || priceRange !== "All Prices");
        } else {
          setShowNoResultsHint(false);
        }
        setTotalPages(json.pages || 1);
        setTotal(json.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, brand, priceRange]);

  const toggleWish = (id, e) => {
    e?.stopPropagation();
    setWishlist(w => {
      const updated = w.includes(id) ? w.filter(x=>x!==id) : [...w,id];
      try { localStorage.setItem("poshak_wishlist", JSON.stringify(updated)); } catch(e) {}
      if (window.__poshakToast) window.__poshakToast(w.includes(id) ? "Removed from Wishlist" : "♥ Added to Wishlist");
      return updated;
    });
  };

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    let timer = null;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loading && page < totalPages) {
        timer = setTimeout(() => setPage(n => n + 1), 100);
      }
    }, { rootMargin: "400px" });
    observer.observe(sentinel);
    return () => { observer.disconnect(); if (timer) clearTimeout(timer); };
  }, [loading, page, totalPages]);

  const BRANDS = ["All Brands", ...allBrands];

  return (
    <div style={{ fontFamily:"'Jost','DM Sans',sans-serif", background:"#ffffff", minHeight:"100vh", color:"#000000" }}>
      <SharedNav />

      <div style={{ maxWidth:"1240px", margin:"0 auto", padding:"28px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom:"24px", paddingBottom:"16px", borderBottom:"2px solid #dfdfdf" }}>
          <h1 style={{ fontFamily:"'Jost','DM Sans',sans-serif", fontSize:"36px", fontWeight:400, color:"#000000", marginBottom:"4px" }}>New Arrivals</h1>
          <p style={{ fontSize:".72rem", color:"#757575" }}>{total.toLocaleString()} new products</p>
        </div>

        {/* Filters */}
        <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"20px", alignItems:"center" }}>
          <select value={brand} onChange={e=>{setBrand(e.target.value);setPage(1);setProducts([]);}}
            style={{ background:"#ffffff", border:"2px solid #dfdfdf", color:"#000000", padding:"9px 12px", cursor:"pointer", fontFamily:"'Jost','DM Sans',sans-serif", fontSize:".72rem", minHeight:"40px" }}>
            {BRANDS.map(b=><option key={b}>{b}</option>)}
          </select>
          {PRICE_RANGES.map(pr => (
            <button key={pr} onClick={() => { setPriceRange(pr); setPage(1); setProducts([]); }}
              style={{ padding:"9px 14px", border:"2px solid #dfdfdf", fontSize:".68rem", cursor:"pointer", fontFamily:"'Jost','DM Sans',sans-serif", background: priceRange===pr?"#000000":"#ffffff", color: priceRange===pr?"#ffffff":"#000000", whiteSpace:"nowrap", fontWeight:400, minHeight:"40px" }}>
              {pr}
            </button>
          ))}
        </div>
        {showNoResultsHint && (
          <p style={{ fontSize:".72rem", color:"#757575", marginBottom:"16px" }}>No results found</p>
        )}

        {/* Grid */}
        {loading && products.length === 0 ? (
          <div style={{ textAlign:"center", padding:"80px 0", color:"#757575" }}>
            <div style={{ fontSize:"1.5rem", marginBottom:"12px" }}>◌</div>
            <p style={{ fontSize:".8rem", letterSpacing:".1em" }}>Loading new arrivals…</p>
          </div>
        ) : (
          <>
            <div className="product-grid">
              {visibleProducts.map((p, idx) => (
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

      <footer style={{ borderTop:"2px solid #dfdfdf", padding:"24px", textAlign:"center", background:"#ffffff" }}>
        <div style={{ fontFamily:"'Jost','DM Sans',sans-serif", fontSize:"1.2rem", color:"#000000", marginBottom:"4px", fontWeight:400 }}>Poshak</div>
        <p style={{ fontSize:".62rem", letterSpacing:".12em", color:"#757575", textTransform:"uppercase" }}>Every brand. One place.</p>
      </footer>
    </div>
  );
}
