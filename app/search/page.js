"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import ProductCard from "../components/ProductCard";
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
        setTimeout(() => setPage(n => n + 1), 100);
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
        <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"8px" }}>
          {["All Prices","Under 3,000","3,000–6,000","6,000–10,000","20,000+"].map(pr => (
            <button key={pr} onClick={() => { setPriceRange(pr); setPage(1); setProducts([]); }}
              style={{ padding:"5px 12px", borderRadius:"20px", border:"1px solid", fontSize:".68rem", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", background: priceRange===pr?"#2a2420":"#fff", color: priceRange===pr?"#f5f0eb":"#777", borderColor: priceRange===pr?"#2a2420":"#e0d8d0", transition:"all .15s" }}>
              {pr}
            </button>
          ))}
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
            {products.map((p, idx) => (
              <ProductCard key={p.id} p={p} idx={idx} wishlist={wishlist} onWish={toggleWish} />
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
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:"#fdfcfb", minHeight:"100vh", color:"#2a2420" }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        .product-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:20px;margin-bottom:40px;}.card-img{aspect-ratio:3/4!important;height:auto!important;}
        @media(max-width:768px){.product-grid{grid-template-columns:repeat(2,1fr)!important;gap:12px!important;}.card-img{aspect-ratio:3/4!important;height:auto!important;}.card-tag{display:none!important;}}
      `}</style>
      <SharedNav />
      <Suspense fallback={<div style={{height:"62px",borderBottom:"1px solid #e8e0d8"}} />}>
        <SearchResults />
      </Suspense>
      <footer style={{ borderTop:"1px solid #e8e0d8", padding:"40px 24px 32px", background:"rgba(255,255,255,.55)" }}>
        <div style={{ maxWidth:"1240px", margin:"0 auto" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:"32px", marginBottom:"32px" }}>
            <div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"1.4rem", color:"#c9a96e", marginBottom:"8px", fontWeight:300 }}>Poshak</div>
              <p style={{ fontSize:".72rem", color:"#aaa", lineHeight:1.6 }}>Every brand. One place.</p>
            </div>
            <div>
              <div style={{ fontSize:".6rem", letterSpacing:".2em", textTransform:"uppercase", color:"#c9a96e", marginBottom:"10px" }}>Top Brands</div>
              {["Khaadi","Gul Ahmed","Maria B","Sana Safinaz","Limelight"].map(b => (
                <div key={b} style={{ fontSize:".75rem", color:"#aaa", marginBottom:"5px", cursor:"pointer" }}>{b}</div>
              ))}
            </div>
            <div>
              <div style={{ fontSize:".6rem", letterSpacing:".2em", textTransform:"uppercase", color:"#c9a96e", marginBottom:"10px" }}>Categories</div>
              {["Lawn","Bridal","Pret / Ready to Wear","Unstitched","Festive / Eid"].map(cat => (
                <div key={cat} style={{ fontSize:".75rem", color:"#aaa", marginBottom:"5px", cursor:"pointer" }}>{cat}</div>
              ))}
            </div>
          </div>
          <div style={{ borderTop:"1px solid #e8e0d8", paddingTop:"16px", display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:"8px" }}>
            <p style={{ fontSize:".62rem", letterSpacing:".12em", color:"#ccc", textTransform:"uppercase" }}>© 2026 Poshak · Pakistan's Women's Fashion Discovery</p>
            <p style={{ fontSize:".62rem", color:"#ccc" }}>Updated daily from 15+ brands</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
