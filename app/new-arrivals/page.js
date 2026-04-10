"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import SharedNav from "../SharedNav";
import { getBrandsCached } from "../lib/clientDataCache";

const BADGE_COLORS = { Bestseller:"#b07d4a",New:"#3d8a60",Sale:"#b03030",Exclusive:"#6a4a8a",Premium:"#3a6a9a",Trending:"#9a6a30",Festive:"#8a5a2a" };
const PRICE_RANGES = ["All Prices","Under 3,000","3,000–6,000","6,000–10,000","10,000–20,000","20,000+"];

function safePrice(p) { const n=Number(p); return isNaN(n)?0:n; }

function parsePriceRange(pr) {
  if (!pr || pr==="All Prices") return [null,null];
  const m=pr.match(/([\d,]+)–([\d,]+)/); if(m) return [parseInt(m[1].replace(/,/g,"")),parseInt(m[2].replace(/,/g,""))];
  const u=pr.match(/Under ([\d,]+)/); if(u) return [null,parseInt(u[1].replace(/,/g,""))];
  const o=pr.match(/([\d,]+)\+/); if(o) return [parseInt(o[1].replace(/,/g,"")),null];
  return [null,null];
}

function deriveBadge(tags, original_price, price) {
  const op=safePrice(original_price), p=safePrice(price);
  if(op>0&&op>p) return "Sale";
  return "New";
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

  useEffect(() => {
    console.log("NewArrivalsPage mounted");
  }, []);

  const WINDOW_SIZE = 72;
  const visibleProducts = useMemo(() => {
    if (products.length <= WINDOW_SIZE) return products;
    return products.slice(products.length - WINDOW_SIZE);
  }, [products]);

  useEffect(() => {
    getBrandsCached().then((brands) => {
      console.log("fetched brands:", brands);
      console.log("setAllBrands called with:", brands);
      setAllBrands(brands);
    });
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
          badge: deriveBadge(p.tags, p.original_price, p.price),
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
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:"#fdfcfb", minHeight:"100vh", color:"#2a2420" }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        .product-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:20px;margin-bottom:40px;}
        .card{background:#fff;border:1px solid #e8e0d8;border-radius:10px;overflow:hidden;cursor:pointer;position:relative;box-shadow:0 2px 10px rgba(0,0,0,.04);transition:transform .28s,box-shadow .28s,border-color .2s;}
        .card:hover{border-color:#c9a96e;transform:translateY(-5px);box-shadow:0 18px 44px rgba(180,140,90,.14);}
        .card-img{width:100%;aspect-ratio:3/4;object-fit:cover;display:block;background:#f5f0eb;transition:transform .48s;}
        .card:hover .card-img{transform:scale(1.04);}
        @media(max-width:768px){.product-grid{grid-template-columns:repeat(2,1fr)!important;gap:12px!important;}}
      `}</style>

      <SharedNav />

      <div style={{ maxWidth:"1240px", margin:"0 auto", padding:"28px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom:"24px", paddingBottom:"16px", borderBottom:"1px solid #e8e0d8" }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:"6px", background:"#e8f5ec", border:"1px solid #c0dd97", borderRadius:"20px", padding:"3px 10px", fontSize:".65rem", color:"#27500a", marginBottom:"8px", letterSpacing:".04em" }}>
            <span style={{ width:"6px", height:"6px", background:"#3d8a60", borderRadius:"50%", display:"inline-block" }}></span>
            Just Added
          </div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"2rem", fontWeight:300, color:"#1a1210", marginBottom:"4px" }}>New Arrivals</h1>
          <p style={{ fontSize:".72rem", color:"#888" }}>{total.toLocaleString()} new products · Updated nightly</p>
        </div>

        {/* Filters */}
        <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"20px", alignItems:"center" }}>
          <select value={brand} onChange={e=>{setBrand(e.target.value);setPage(1);setProducts([]);}}
            style={{ background:"#fff",border:"1px solid #e0d8d0",color:"#555",padding:"7px 28px 7px 10px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:".72rem",borderRadius:"3px",appearance:"none",backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23aaa'/%3E%3C/svg%3E\")",backgroundRepeat:"no-repeat",backgroundPosition:"right 10px center" }}>
            {BRANDS.map(b=><option key={b}>{b}</option>)}
          </select>
          {PRICE_RANGES.map(pr => (
            <button key={pr} onClick={() => { setPriceRange(pr); setPage(1); setProducts([]); }}
              style={{ padding:"6px 12px", borderRadius:"20px", border:"1px solid", fontSize:".68rem", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", background: priceRange===pr?"#2a2420":"#fff", color: priceRange===pr?"#f5f0eb":"#777", borderColor: priceRange===pr?"#2a2420":"#e0d8d0", transition:"all .15s", whiteSpace:"nowrap" }}>
              {pr}
            </button>
          ))}
        </div>
        {showNoResultsHint && (
          <p style={{ fontSize:".72rem", color:"#9a6a30", marginBottom:"16px" }}>No results found</p>
        )}

        {/* Grid */}
        {loading && products.length === 0 ? (
          <div style={{ textAlign:"center", padding:"80px 0", color:"#c9a96e" }}>
            <div style={{ fontSize:"1.5rem", marginBottom:"12px" }}>◌</div>
            <p style={{ fontSize:".8rem", letterSpacing:".1em" }}>Loading new arrivals…</p>
          </div>
        ) : (
          <>
            <div className="product-grid">
              {visibleProducts.map((p, idx) => (
                <div key={p.id} className="card" onClick={() => router.push(`/product/${p.id}`)}>
                  <div style={{ position:"relative", overflow:"hidden", aspectRatio:"3/4", background:"#f5f0eb" }}>
                    <Image
                      className="card-img"
                      src={p.image_url || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&q=80"}
                      alt={p.name || "Product"}
                      fill
                      sizes="(max-width:768px) 50vw, (max-width:1240px) 25vw, 220px"
                      style={{ objectFit: "cover" }}
                      loading={idx < 4 ? "eager" : "lazy"}
                      fetchPriority={idx < 4 ? "high" : "auto"}
                    />
                    <div style={{ position:"absolute",top:"10px",left:"10px",background:"#3d8a60",color:"#fff",fontSize:".58rem",letterSpacing:".14em",textTransform:"uppercase",padding:"3px 9px",borderRadius:"20px",fontWeight:600 }}>New</div>
                    {p.original_price > p.price && (
                      <div style={{ position:"absolute",top:"10px",left:"52px",background:"#b03030",color:"#fff",fontSize:".58rem",letterSpacing:".14em",textTransform:"uppercase",padding:"3px 9px",borderRadius:"20px",fontWeight:600 }}>Sale</div>
                    )}
                    <button onClick={e => toggleWish(p.id, e)}
                      style={{ position:"absolute",top:"10px",right:"10px",background:"rgba(255,255,255,.94)",border:"1px solid #e8e0d8",borderRadius:"50%",width:"34px",height:"34px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
                      <span style={{ color:wishlist.includes(p.id)?"#c9a96e":"#ccc",fontSize:".9rem" }}>{wishlist.includes(p.id)?"♥":"♡"}</span>
                    </button>
                  </div>
                  <div style={{ padding:"14px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div style={{ flex:1, minWidth:0, paddingRight:"8px" }}>
                        <div style={{ fontSize:".6rem",letterSpacing:".14em",textTransform:"uppercase",color:"#c9a96e",marginBottom:"4px" }}>{p.brand}</div>
                        <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:"1rem",color:"#2a2420",lineHeight:1.3,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical" }}>{p.name}</div>
                      </div>
                      <div style={{ textAlign:"right",flexShrink:0 }}>
                        <div style={{ fontSize:".88rem",fontWeight:500 }}>Rs. {p.price.toLocaleString()}</div>
                        {p.original_price > p.price && <div style={{ fontSize:".72rem",textDecoration:"line-through",color:"#bbb" }}>Rs. {p.original_price.toLocaleString()}</div>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div ref={sentinelRef} style={{ height:"40px", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"40px" }}>
              {loading && products.length > 0 && (
                <div style={{ fontSize:".75rem", color:"#c9a96e", letterSpacing:".1em" }}>Loading more…</div>
              )}
            </div>
          </>
        )}
      </div>

      <footer style={{ borderTop:"1px solid #e8e0d8", padding:"24px", textAlign:"center", background:"rgba(255,255,255,.55)" }}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"1.2rem", color:"#c9a96e", marginBottom:"4px", fontWeight:300 }}>Poshak</div>
        <p style={{ fontSize:".62rem", letterSpacing:".12em", color:"#888", textTransform:"uppercase" }}>Every brand. One place.</p>
      </footer>
    </div>
  );
}
