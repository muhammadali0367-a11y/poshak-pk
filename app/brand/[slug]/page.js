"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import ProductCard from "../../components/ProductCard";
import { useParams, useRouter } from "next/navigation";
import SharedNav from "../../SharedNav";

const CATEGORIES   = ["All Categories","Lawn","Kurta","Co-ords","Pret / Ready to Wear","Luxury Pret","Unstitched","Shalwar Kameez","Formal","Bridal","Festive / Eid","Winter Collection","Abaya"];
const PRICE_RANGES = ["All Prices","Under 3,000","3,000–6,000","6,000–10,000","10,000–20,000","20,000+"];
const BADGE_COLORS = { Bestseller:"#b07d4a",New:"#3d8a60",Sale:"#b03030",Exclusive:"#6a4a8a",Premium:"#3a6a9a",Trending:"#9a6a30",Festive:"#8a5a2a" };

function slugify(s)   { return (s||"").toLowerCase().replace(/\s*\/\s*/g,"-").replace(/\s+/g,"-"); }
function deslugify(s) { return (s||"").replace(/-/g," ").replace(/\b\w/g,c=>c.toUpperCase()); }

function safePrice(price) {
  const n = Number(price);
  return isNaN(n) ? 0 : n;
}

function parsePriceRange(pr) {
  if (!pr || pr === "All Prices") return [null, null];
  const m = pr.match(/([\d,]+)–([\d,]+)/);
  if (m) return [parseInt(m[1].replace(/,/g,"")), parseInt(m[2].replace(/,/g,""))];
  const u = pr.match(/Under ([\d,]+)/);
  if (u) return [null, parseInt(u[1].replace(/,/g,""))];
  const o = pr.match(/([\d,]+)\+/);
  if (o) return [parseInt(o[1].replace(/,/g,"")), null];
  return [null, null];
}

function deriveBadge(tags, name, original_price, price) {
  const op = safePrice(original_price);
  const p  = safePrice(price);
  if (op > 0 && op > p) return "Sale";
  const t = (tags||"").toLowerCase();
  if (t.includes("new")) return "New";
  if ((name||"").toLowerCase().includes("festive")) return "Festive";
  return null;
}

export default function BrandPage() {
  const routeParams = useParams();
  const router      = useRouter();

  const [mounted,    setMounted]    = useState(false);
  const [brandName,  setBrandName]  = useState("");
  const [products,   setProducts]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total,      setTotal]      = useState(0);
  const [category,   setCategory]   = useState("All Categories");
  const [priceRange, setPriceRange] = useState("All Prices");
  const [wishlist,   setWishlist]   = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const sentinelRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setShowBackToTop(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const slug = routeParams?.slug || "";
    setBrandName(deslugify(slug));
    setPage(1);
    setProducts([]);
  }, [mounted, routeParams?.slug]);

  useEffect(() => {
    if (!brandName) return;
    setLoading(true);
    const [minP, maxP] = parsePriceRange(priceRange);
    const qp = new URLSearchParams({ page: String(page), brand: brandName });
    if (category !== "All Categories") qp.set("category", category);
    if (minP) qp.set("min_price", String(minP));
    if (maxP) qp.set("max_price", String(maxP));

    fetch(`/api/products?${qp}`)
      .then(r => r.json())
      .then(json => {
        const prods = (json.products || []).map(p => ({
          ...p,
          price:          safePrice(p.price),
          original_price: safePrice(p.original_price),
          badge:          deriveBadge(p.tags, p.name, p.original_price, p.price),
        }));
        setProducts(prev => page === 1 ? prods : [...prev, ...prods]);
        setTotalPages(json.pages || 1);
        setTotal(json.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [brandName, page, category, priceRange]);

  const toggleWish = (id, e) => {
    e?.stopPropagation();
    setWishlist(w => w.includes(id) ? w.filter(x=>x!==id) : [...w,id]);
  };

  // Virtualization: keep only last 3 pages in DOM (72 products max)
  const WINDOW_SIZE = 72;
  const visibleProducts = useMemo(() => {
    if (products.length <= WINDOW_SIZE) return products;
    return products.slice(products.length - WINDOW_SIZE);
  }, [products]);

  // Infinite scroll — debounced to avoid blocking main thread
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    let timer = null;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loadingMore && !loading && page < totalPages) {
        timer = setTimeout(() => setPage(n => n + 1), 100);
      }
    }, { rootMargin: "400px" });
    observer.observe(sentinel);
    return () => { observer.disconnect(); if (timer) clearTimeout(timer); };
  }, [loadingMore, loading, page, totalPages]);

  if (!mounted) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontFamily:"'DM Sans',sans-serif", color:"#c9a96e" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:"1.5rem", marginBottom:"8px" }}>◌</div>
        <p style={{ fontSize:".8rem", letterSpacing:".1em" }}>Loading…</p>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:"#fdfcfb", minHeight:"100vh", color:"#2a2420" }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        .nav{height:60px;border-bottom:1px solid #e8e0d8;display:flex;align-items:center;padding:0 24px;position:sticky;top:0;z-index:200;background:rgba(253,252,251,.97);justify-content:space-between;}
        .wordmark{font-family:'Cormorant Garamond',serif;font-size:1.45rem;font-weight:300;letter-spacing:.18em;cursor:pointer;color:#2a2420;}
        .card{background:#fff;border:1px solid #e8e0d8;border-radius:10px;overflow:hidden;cursor:pointer;position:relative;box-shadow:0 2px 10px rgba(0,0,0,.04);transition:transform .28s,box-shadow .28s,border-color .2s;}
        .card:hover{border-color:#c9a96e;transform:translateY(-5px);box-shadow:0 18px 44px rgba(180,140,90,.14);}
        .card-img{width:100%;aspect-ratio:3/4;object-fit:cover;display:block;background:#f5f0eb;transition:transform .48s;}
        .card:hover .card-img{transform:scale(1.04);}
        .badge-pill{position:absolute;top:10px;left:10px;font-family:'DM Sans',sans-serif;font-size:.58rem;letter-spacing:.14em;text-transform:uppercase;padding:3px 9px;border-radius:20px;font-weight:600;color:#fff;z-index:2;}
        .wish-btn{position:absolute;top:10px;right:10px;background:rgba(255,255,255,.94);border:1px solid #e8e0d8;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;z-index:2;}
        .wish-btn:hover{border-color:#c9a96e;}
        .filter-btn{background:#fff;border:1px solid #e0d8d0;color:#777;padding:7px 14px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;border-radius:3px;transition:all .2s;white-space:nowrap;}
        .filter-btn:hover{border-color:#c9a96e;color:#9a6a30;background:#fdf7ef;}
        .tag{display:inline-block;background:#f5f0eb;border:1px solid #e8e2d8;padding:3px 10px;border-radius:20px;font-size:.62rem;letter-spacing:.07em;text-transform:uppercase;color:#999;}
        select{appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23aaa'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;padding-right:28px !important;}
        .load-more{background:none;border:1px solid #e0d8d0;border-radius:4px;padding:12px 40px;cursor:pointer;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:#888;font-family:'DM Sans',sans-serif;transition:all .2s;}
        .load-more:hover{border-color:#c9a96e;color:#c9a96e;}
        .breadcrumb{font-size:.7rem;color:#bbb;}.back-to-top{position:fixed;bottom:24px;right:20px;width:40px;height:40px;background:#2a2420;border:1px solid #c9a96e;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:90;opacity:0;pointer-events:none;transition:opacity .3s;}.back-to-top.visible{opacity:1;pointer-events:all;}
        .breadcrumb a{color:#c9a96e;text-decoration:none;}
        .breadcrumb a:hover{text-decoration:underline;}
        @media(max-width:768px){.card-img{aspect-ratio:3/4;}.product-grid{grid-template-columns:repeat(2,1fr)!important;gap:12px!important;}.card-tag{display:none!important;}}
      `}</style>

      <SharedNav />

      <div style={{ maxWidth:"1240px", margin:"0 auto", padding:"28px 24px" }}>
        <div className="breadcrumb" style={{ marginBottom:"12px" }}>
          <a href="/">Home</a> › Brands › {brandName}
        </div>

        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:"24px", paddingBottom:"16px", borderBottom:"1px solid #e8e0d8", flexWrap:"wrap", gap:"12px" }}>
          <div>
            <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"2.2rem", fontWeight:300, color:"#2a2420" }}>{brandName}</h1>
            <p style={{ fontSize:".72rem", color:"#bbb", marginTop:"4px", letterSpacing:".08em" }}>{total.toLocaleString()} products</p>
          </div>
          <div style={{ display:"flex", gap:"10px", flexWrap:"wrap" }}>
            <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); setProducts([]); }}
              className="filter-btn" style={{ background:"#fff", cursor:"pointer" }}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginTop:"10px" }}>
            {PRICE_RANGES.map(pr => (
              <button key={pr} onClick={() => { setPriceRange(pr); setPage(1); setProducts([]); }}
                style={{ padding:"5px 12px", borderRadius:"20px", border:"1px solid", fontSize:".68rem", cursor:"pointer", letterSpacing:".06em", fontFamily:"'DM Sans',sans-serif", background: priceRange===pr?"#2a2420":"#fff", color: priceRange===pr?"#f5f0eb":"#777", borderColor: priceRange===pr?"#2a2420":"#e0d8d0", transition:"all .15s" }}>
                {pr}
              </button>
            ))}
          </div>
        </div>

        {loading && products.length === 0 ? (
          <div style={{ textAlign:"center", padding:"80px 0", color:"#c9a96e" }}>
            <div style={{ fontSize:"1.5rem", marginBottom:"12px" }}>◌</div>
            <p style={{ fontSize:".8rem", letterSpacing:".1em" }}>Loading {brandName}…</p>
          </div>
        ) : products.length === 0 && !loading ? (
          <div style={{ textAlign:"center", padding:"80px 0", color:"#ccc" }}>
            <div style={{ fontSize:"3rem", marginBottom:"16px" }}>◌</div>
            <p style={{ fontSize:".85rem" }}>No products found for {brandName}</p>
          </div>
        ) : (
          <>
            <div className="product-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:"20px", marginBottom:"40px" }}>
              {visibleProducts.map(p => (
                <div key={p.id} className="card" onClick={() => router.push(`/product/${p.id}`)}>
                  <div style={{ position:"relative", overflow:"hidden", aspectRatio:"3/4", background:"#f5f0eb" }}>
                    <Image
                      className="card-img"
                      src={p.image_url || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&q=80"}
                      alt={p.name || "Product"}
                      fill
                      sizes="(max-width:768px) 50vw, (max-width:1240px) 25vw, 240px"
                      style={{ objectFit: "cover" }}
                      loading="lazy"
                    />
                    {p.badge && <div className="badge-pill" style={{ background:BADGE_COLORS[p.badge]||"#888" }}>{p.badge}</div>}
                    <button className="wish-btn" onClick={e => toggleWish(p.id, e)}>
                      <span style={{ color:wishlist.includes(p.id)?"#c9a96e":"#ccc", fontSize:".9rem" }}>{wishlist.includes(p.id)?"♥":"♡"}</span>
                    </button>
                  </div>
                  <div style={{ padding:"14px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"8px" }}>
                      <div style={{ flex:1, minWidth:0, paddingRight:"8px" }}>
                        <div style={{ fontSize:".6rem", letterSpacing:".14em", textTransform:"uppercase", color:"#c9a96e", marginBottom:"4px" }}>{p.brand}</div>
                        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"1rem", color:"#2a2420", lineHeight:1.3, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{p.name}</div>
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        <div style={{ fontSize:".88rem", fontWeight:500 }}>Rs. {p.price.toLocaleString()}</div>
                        {p.original_price > p.price && (
                          <div style={{ fontSize:".72rem", textDecoration:"line-through", color:"#bbb" }}>Rs. {p.original_price.toLocaleString()}</div>
                        )}
                      </div>
                    </div>
                    <span className="tag card-tag">{p.product_type || p.collection || p.brand}</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} style={{ height:"40px", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"40px" }}>
              {loading && products.length > 0 && (
                <div style={{ fontSize:".75rem", color:"#c9a96e", letterSpacing:".1em" }}>Loading more…</div>
              )}
            </div>
          </>
        )}
      </div>

      <button className={`back-to-top ${showBackToTop?"visible":""}`}
        onClick={() => window.scrollTo({ top:0, behavior:"smooth" })}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 12V2M3 6l4-4 4 4" stroke="#c9a96e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <footer style={{ borderTop:"1px solid #e8e0d8", padding:"40px 24px 32px", background:"rgba(255,255,255,.55)" }}>
        <div style={{ maxWidth:"1240px", margin:"0 auto" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:"32px", marginBottom:"32px" }}>
            <div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"1.4rem", color:"#c9a96e", marginBottom:"8px", fontWeight:300 }}>Poshak</div>
              <p style={{ fontSize:".72rem", color:"#aaa", lineHeight:1.6, letterSpacing:".02em" }}>Every brand. One place.<br/>Pakistan's first women's fashion search engine.</p>
            </div>
            <div>
              <div style={{ fontSize:".6rem", letterSpacing:".2em", textTransform:"uppercase", color:"#c9a96e", marginBottom:"10px" }}>Top Brands</div>
              {["Khaadi","Gul Ahmed","Maria B","Sana Safinaz","Limelight","Beechtree"].map(b => (
                <div key={b} style={{ fontSize:".75rem", color:"#aaa", marginBottom:"5px", cursor:"pointer" }}
                  onClick={() => router.push(`/brand/${b.toLowerCase().replace(/\s+/g,"-")}`)}>{b}</div>
              ))}
            </div>
            <div>
              <div style={{ fontSize:".6rem", letterSpacing:".2em", textTransform:"uppercase", color:"#c9a96e", marginBottom:"10px" }}>Categories</div>
              {["Lawn","Bridal","Pret / Ready to Wear","Unstitched","Festive / Eid","Formal"].map(cat => (
                <div key={cat} style={{ fontSize:".75rem", color:"#aaa", marginBottom:"5px", cursor:"pointer" }}
                  onClick={() => router.push(`/category/${cat.toLowerCase().replace(/\s*\/\s*/g,"-").replace(/\s+/g,"-")}`)}>{cat}</div>
              ))}
            </div>
            <div>
              <div style={{ fontSize:".6rem", letterSpacing:".2em", textTransform:"uppercase", color:"#c9a96e", marginBottom:"10px" }}>About</div>
              <div style={{ fontSize:".75rem", color:"#aaa", marginBottom:"5px" }}>About Poshak</div>
              <div style={{ fontSize:".75rem", color:"#aaa", marginBottom:"5px" }}>Contact</div>
              <div style={{ fontSize:".75rem", color:"#aaa", marginBottom:"5px" }}>theposhak.pk</div>
            </div>
          </div>
          <div style={{ borderTop:"1px solid #e8e0d8", paddingTop:"16px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"8px" }}>
            <p style={{ fontSize:".62rem", letterSpacing:".12em", color:"#ccc", textTransform:"uppercase" }}>© 2026 Poshak · Pakistan's Women's Fashion Discovery</p>
            <p style={{ fontSize:".62rem", color:"#ccc" }}>Updated daily from 15+ brands</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
