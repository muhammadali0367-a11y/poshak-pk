"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

const BADGE_COLORS = { Bestseller:"#b07d4a",New:"#3d8a60",Sale:"#b03030",Exclusive:"#6a4a8a",Premium:"#3a6a9a",Trending:"#9a6a30",Festive:"#8a5a2a" };
const PRICE_RANGES = ["All Prices","Under 3,000","3,000–6,000","6,000–10,000","10,000–20,000","20,000+"];
const CATEGORIES   = ["All Categories","Lawn","Kurta","Co-ords","Pret / Ready to Wear","Luxury Pret","Unstitched","Shalwar Kameez","Formal","Bridal","Festive / Eid","Winter Collection","Abaya"];

function slugify(s) { return (s||"").toLowerCase().replace(/\s*\/\s*/g,"-").replace(/\s+/g,"-"); }
function deslugify(s) { return (s||"").replace(/-/g," ").replace(/\b\w/g, c=>c.toUpperCase()); }

function deriveBadge(tags, name, original_price, price) {
  if (original_price > price) return "Sale";
  const t = (tags||"").toLowerCase();
  if (t.includes("new")) return "New";
  if ((name||"").toLowerCase().includes("festive")) return "Festive";
  return null;
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

export default function BrandPage() {
  const params    = useParams();
  const router    = useRouter();
  const slug      = params?.slug || "";
  const brandName = deslugify(slug);

  const [products,   setProducts]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total,      setTotal]      = useState(0);
  const [category,   setCategory]   = useState("All Categories");
  const [priceRange, setPriceRange] = useState("All Prices");
  const [wishlist,   setWishlist]   = useState([]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    const [minP, maxP] = parsePriceRange(priceRange);
    const p = new URLSearchParams({ page, brand: brandName });
    if (category !== "All Categories") p.set("category", category);
    if (minP) p.set("min_price", minP);
    if (maxP) p.set("max_price", maxP);

    fetch(`/api/products?${p}`)
      .then(r => r.json())
      .then(json => {
        const prods = (json.products || []).map(p => ({
          ...p,
          image: p.image_url,
          badge: deriveBadge(p.tags, p.name, p.original_price, p.price),
        }));
        setProducts(prev => page === 1 ? prods : [...prev, ...prods]);
        setTotalPages(json.pages || 1);
        setTotal(json.total || 0);
      })
      .finally(() => setLoading(false));
  }, [slug, page, category, priceRange]);

  const toggleWish = (id, e) => {
    e?.stopPropagation();
    setWishlist(w => w.includes(id) ? w.filter(x=>x!==id) : [...w,id]);
  };

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:"linear-gradient(160deg,#fdfcfb 0%,#f5f0eb 100%)", minHeight:"100vh", color:"#2a2420" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        .nav{height:60px;border-bottom:1px solid #e8e0d8;display:flex;align-items:center;padding:0 24px;position:sticky;top:0;z-index:200;background:rgba(253,252,251,.97);backdrop-filter:blur(14px);justify-content:space-between;}
        .wordmark{font-family:'Cormorant Garamond',serif;font-size:1.45rem;font-weight:300;letter-spacing:.18em;cursor:pointer;color:#2a2420;}
        .card{background:#fff;border:1px solid #e8e0d8;border-radius:10px;overflow:hidden;cursor:pointer;position:relative;box-shadow:0 2px 10px rgba(0,0,0,.04);transition:transform .28s,box-shadow .28s,border-color .2s;}
        .card:hover{border-color:#c9a96e;transform:translateY(-5px);box-shadow:0 18px 44px rgba(180,140,90,.14);}
        .card-img{width:100%;height:280px;object-fit:cover;display:block;background:#f5f0eb;transition:transform .48s;}
        .card:hover .card-img{transform:scale(1.04);}
        .badge-pill{position:absolute;top:10px;left:10px;font-family:'DM Sans',sans-serif;font-size:.58rem;letter-spacing:.14em;text-transform:uppercase;padding:3px 9px;border-radius:20px;font-weight:600;color:#fff;z-index:2;}
        .wish-btn{position:absolute;top:10px;right:10px;background:rgba(255,255,255,.94);border:1px solid #e8e0d8;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;z-index:2;}
        .wish-btn:hover{border-color:#c9a96e;}
        .filter-btn{background:#fff;border:1px solid #e0d8d0;color:#777;padding:7px 14px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;border-radius:3px;transition:all .2s;}
        .filter-btn:hover,.filter-btn.active{border-color:#c9a96e;color:#9a6a30;background:#fdf7ef;}
        .tag{display:inline-block;background:#f5f0eb;border:1px solid #e8e2d8;padding:3px 10px;border-radius:20px;font-size:.62rem;letter-spacing:.07em;text-transform:uppercase;color:#999;}
        select{appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23aaa'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;padding-right:28px !important;}
        .load-more{background:none;border:1px solid #e0d8d0;border-radius:4px;padding:12px 40px;cursor:pointer;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:#888;font-family:'DM Sans',sans-serif;transition:all .2s;}
        .load-more:hover{border-color:#c9a96e;color:#c9a96e;}
        .breadcrumb{font-size:.7rem;color:#bbb;}
        .breadcrumb a{color:#c9a96e;text-decoration:none;}
        .breadcrumb a:hover{text-decoration:underline;}
        @media(max-width:768px){.card-img{height:220px;}}
      `}</style>

      <nav className="nav">
        <div className="wordmark" onClick={() => router.push("/")}>Poshak<span style={{color:"#c9a96e"}}>.</span>pk</div>
        <button onClick={() => router.back()} style={{ background:"none", border:"1px solid #e0d8d0", borderRadius:"3px", padding:"6px 14px", cursor:"pointer", fontSize:".7rem", letterSpacing:".1em", textTransform:"uppercase", color:"#888", fontFamily:"'DM Sans',sans-serif" }}>← Back</button>
      </nav>

      <div style={{ maxWidth:"1240px", margin:"0 auto", padding:"28px 24px" }}>
        <div className="breadcrumb" style={{ marginBottom:"12px" }}>
          <a href="/">Home</a> › Brands › {brandName}
        </div>

        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:"24px", paddingBottom:"16px", borderBottom:"1px solid #e8e0d8" }}>
          <div>
            <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"2.2rem", fontWeight:300, color:"#2a2420" }}>{brandName}</h1>
            <p style={{ fontSize:".72rem", color:"#bbb", marginTop:"4px", letterSpacing:".08em" }}>{total.toLocaleString()} products</p>
          </div>
          <div style={{ display:"flex", gap:"10px", flexWrap:"wrap" }}>
            <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); setProducts([]); }}
              className="filter-btn" style={{ background:"#fff", cursor:"pointer" }}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={priceRange} onChange={e => { setPriceRange(e.target.value); setPage(1); setProducts([]); }}
              className="filter-btn" style={{ background:"#fff", cursor:"pointer" }}>
              {PRICE_RANGES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {loading && products.length === 0 ? (
          <div style={{ textAlign:"center", padding:"80px 0", color:"#c9a96e" }}>
            <div style={{ fontSize:"1.5rem", marginBottom:"12px" }}>◌</div>
            <p style={{ fontSize:".8rem", letterSpacing:".1em" }}>Loading {brandName}…</p>
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign:"center", padding:"80px 0", color:"#ccc" }}>
            <div style={{ fontSize:"3rem", marginBottom:"16px" }}>◌</div>
            <p style={{ fontSize:".85rem" }}>No products found for {brandName}</p>
          </div>
        ) : (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:"20px", marginBottom:"40px" }}>
              {products.map((p, i) => (
                <div key={p.id} className="card" onClick={() => router.push(`/product/${p.id}`)}>
                  <div style={{ position:"relative", overflow:"hidden" }}>
                    <img className="card-img" src={p.image_url || p.image} alt={p.name} loading="lazy"
                      onError={e => { e.target.src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&q=80"; }} />
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
                        {p.original_price > p.price && <div style={{ fontSize:".72rem", textDecoration:"line-through", color:"#bbb" }}>Rs. {p.original_price.toLocaleString()}</div>}
                      </div>
                    </div>
                    <span className="tag">{p.product_type || p.collection}</span>
                  </div>
                </div>
              ))}
            </div>
            {page < totalPages && (
              <div style={{ textAlign:"center", marginBottom:"60px" }}>
                <button className="load-more" onClick={() => setPage(p => p + 1)} disabled={loading}>
                  {loading ? "Loading…" : `Load More (${total - products.length} remaining)`}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <footer style={{ borderTop:"1px solid #e8e0d8", padding:"40px 24px", textAlign:"center", background:"rgba(255,255,255,.55)" }}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"1.35rem", color:"#c9a96e", marginBottom:"6px" }}>Poshak.pk</div>
        <p style={{ fontSize:".62rem", letterSpacing:".15em", color:"#bbb", textTransform:"uppercase" }}>Pakistan's Women's Fashion Discovery</p>
      </footer>
    </div>
  );
}
