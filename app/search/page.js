"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SharedNav from "../SharedNav";

const BADGE_COLORS = { Bestseller:"#b07d4a",New:"#3d8a60",Sale:"#b03030",Exclusive:"#6a4a8a",Premium:"#3a6a9a",Trending:"#9a6a30",Festive:"#8a5a2a" };
const PRICE_RANGES = ["All Prices","Under 3,000","3,000–6,000","6,000–10,000","10,000–20,000","20,000+"];

// Urdu/Roman Urdu color map for server-side search
const COLOR_WORDS = {
  "kala":"black","kali":"black","safed":"white","lal":"red","surkh":"red",
  "neela":"blue","hara":"green","gulabi":"pink","zard":"yellow","ferozi":"teal",
  "gehra":"dark","halka":"light",
};

function safePrice(p) { const n=Number(p); return isNaN(n)?0:n; }
function slugify(s) { return (s||"").toLowerCase().replace(/\s*\/\s*/g,"-").replace(/\s+/g,"-"); }

function parsePriceRange(pr) {
  if (!pr || pr==="All Prices") return [null,null];
  const m=pr.match(/([\d,]+)–([\d,]+)/); if(m) return [parseInt(m[1].replace(/,/g,"")),parseInt(m[2].replace(/,/g,""))];
  const u=pr.match(/Under ([\d,]+)/); if(u) return [null,parseInt(u[1].replace(/,/g,""))];
  const o=pr.match(/([\d,]+)\+/); if(o) return [parseInt(o[1].replace(/,/g,"")),null];
  return [null,null];
}

function deriveBadge(tags, name, original_price, price) {
  const op=safePrice(original_price), p=safePrice(price);
  if(op>0&&op>p) return "Sale";
  if((tags||"").toLowerCase().includes("new")) return "New";
  return null;
}

function SearchResults() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const rawQ        = searchParams.get("q") || "";

  const [products,   setProducts]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total,      setTotal]      = useState(0);
  const [priceRange, setPriceRange] = useState("All Prices");
  const [allBrands,  setAllBrands]  = useState([]);
  const [brand,      setBrand]      = useState("All Brands");
  const [wishlist,   setWishlist]   = useState([]);
  const sentinelRef = useRef(null);

  useEffect(() => {
    fetch("/api/brands").then(r=>r.json()).then(j=>{ if(j.brands) setAllBrands(j.brands); }).catch(()=>{});
  }, []);

  useEffect(() => {
    if (!rawQ) return;
    setLoading(true);
    const [minP, maxP] = parsePriceRange(priceRange);
    const qp = new URLSearchParams({ q: rawQ, page: String(page) });
    if (brand !== "All Brands") qp.set("brand", brand);
    if (minP) qp.set("min_price", String(minP));
    if (maxP) qp.set("max_price", String(maxP));

    fetch(`/api/search?${qp}`)
      .then(r => r.json())
      .then(json => {
        const prods = (json.products||[]).map(p => ({
          ...p,
          price: safePrice(p.price),
          original_price: safePrice(p.original_price),
          badge: deriveBadge(p.tags, p.name, p.original_price, p.price),
        }));
        setProducts(prev => page===1 ? prods : [...prev,...prods]);
        setTotalPages(json.pages||1);
        setTotal(json.total||0);
      })
      .catch(()=>{})
      .finally(()=>setLoading(false));
  }, [rawQ, page, brand, priceRange]);

  // Reset on new query
  useEffect(() => {
    setPage(1);
    setProducts([]);
  }, [rawQ]);

  const toggleWish = (id,e) => { e?.stopPropagation(); setWishlist(w=>w.includes(id)?w.filter(x=>x!==id):[...w,id]); };

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loading && page < totalPages) {
        setPage(n => n + 1);
      }
    }, { rootMargin: "200px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loading, page, totalPages]);
  const BRANDS = ["All Brands",...allBrands];

  return (
    <div style={{ maxWidth:"1240px", margin:"0 auto", padding:"28px 24px" }}>
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:"24px", paddingBottom:"16px", borderBottom:"1px solid #e8e0d8", flexWrap:"wrap", gap:"12px" }}>
        <div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"2rem", fontWeight:300, color:"#2a2420" }}>
            Results for "{rawQ}"
          </h1>
          <p style={{ fontSize:".72rem", color:"#bbb", marginTop:"4px" }}>{total.toLocaleString()} dresses found</p>
        </div>
        <div style={{ display:"flex", gap:"10px", flexWrap:"wrap" }}>
          <select value={brand} onChange={e=>{setBrand(e.target.value);setPage(1);setProducts([]);}}
            style={{ background:"#fff",border:"1px solid #e0d8d0",color:"#777",padding:"7px 28px 7px 10px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:".72rem",letterSpacing:".08em",borderRadius:"3px",appearance:"none",backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23aaa'/%3E%3C/svg%3E\")",backgroundRepeat:"no-repeat",backgroundPosition:"right 10px center" }}>
            {BRANDS.map(b=><option key={b}>{b}</option>)}
          </select>
          <select value={priceRange} onChange={e=>{setPriceRange(e.target.value);setPage(1);setProducts([]);}}
            style={{ background:"#fff",border:"1px solid #e0d8d0",color:"#777",padding:"7px 28px 7px 10px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:".72rem",letterSpacing:".08em",borderRadius:"3px",appearance:"none",backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23aaa'/%3E%3C/svg%3E\")",backgroundRepeat:"no-repeat",backgroundPosition:"right 10px center" }}>
            {PRICE_RANGES.map(p=><option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {loading && products.length===0 ? (
        <div style={{ textAlign:"center", padding:"80px 0", color:"#c9a96e" }}>
          <div style={{ fontSize:"1.5rem", marginBottom:"12px" }}>◌</div>
          <p style={{ fontSize:".8rem", letterSpacing:".1em" }}>Searching…</p>
        </div>
      ) : products.length===0 && !loading ? (
        <div style={{ textAlign:"center", padding:"80px 0", color:"#ccc" }}>
          <div style={{ fontSize:"3rem", marginBottom:"16px" }}>◌</div>
          <p style={{ fontSize:".85rem" }}>No results found for "{rawQ}"</p>
          <p style={{ fontSize:".75rem", color:"#bbb", marginTop:"8px" }}>Try different keywords or browse categories</p>
        </div>
      ) : (
        <>
          <div className="product-grid">
            {products.map(p => (
              <div key={p.id}
                style={{ background:"#fff", border:"1px solid #e8e0d8", borderRadius:"10px", overflow:"hidden", cursor:"pointer", position:"relative", boxShadow:"0 2px 10px rgba(0,0,0,.04)", transition:"transform .28s,box-shadow .28s,border-color .2s" }}
                onClick={() => router.push(`/product/${p.id}`)}
                onMouseOver={e => { e.currentTarget.style.transform="translateY(-5px)"; e.currentTarget.style.borderColor="#c9a96e"; e.currentTarget.style.boxShadow="0 18px 44px rgba(180,140,90,.14)"; }}
                onMouseOut={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.borderColor="#e8e0d8"; e.currentTarget.style.boxShadow="0 2px 10px rgba(0,0,0,.04)"; }}>
                <div style={{ position:"relative", overflow:"hidden" }}>
                  <img src={p.image_url||"https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&q=80"}
                    alt={p.name||"Product"} loading="lazy" className="card-img"
                    style={{ width:"100%", height:"280px", objectFit:"cover", display:"block", background:"#f5f0eb", transition:"transform .48s" }}
                    onError={e=>{e.currentTarget.src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&q=80";}}
                  />
                  {p.badge && <div style={{ position:"absolute",top:"10px",left:"10px",background:BADGE_COLORS[p.badge]||"#888",color:"#fff",fontSize:".58rem",letterSpacing:".14em",textTransform:"uppercase",padding:"3px 9px",borderRadius:"20px",fontWeight:600 }}>{p.badge}</div>}
                  <button onClick={e=>toggleWish(p.id,e)}
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
                      {p.original_price>p.price && <div style={{ fontSize:".72rem",textDecoration:"line-through",color:"#bbb" }}>Rs. {p.original_price.toLocaleString()}</div>}
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
  );
}

export default function SearchPage() {
  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:"linear-gradient(160deg,#fdfcfb 0%,#f5f0eb 100%)", minHeight:"100vh", color:"#2a2420" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        .product-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:20px;margin-bottom:40px;}
        @media(max-width:768px){.product-grid{grid-template-columns:repeat(2,1fr)!important;gap:12px!important;}.card-img{height:180px!important;}.card-tag{display:none!important;}}
      `}</style>
      <SharedNav />
      <Suspense fallback={<div style={{height:"62px",borderBottom:"1px solid #e8e0d8"}} />}>
        <SearchResults />
      </Suspense>
      <footer style={{ borderTop:"1px solid #e8e0d8",padding:"40px 24px",textAlign:"center",background:"rgba(255,255,255,.55)" }}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:"1.35rem",color:"#c9a96e",marginBottom:"6px" }}>Poshak.pk</div>
        <p style={{ fontSize:".62rem",letterSpacing:".15em",color:"#bbb",textTransform:"uppercase" }}>Pakistan's Women's Fashion Discovery</p>
      </footer>
    </div>
  );
}
