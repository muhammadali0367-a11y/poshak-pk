"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import SharedNav from "../../SharedNav";

const CATEGORIES = [
  "Lawn","Kurta","Co-ords","Pret / Ready to Wear","Luxury Pret",
  "Unstitched","Shalwar Kameez","Formal","Bridal","Festive / Eid",
  "Winter Collection","Abaya",
];

const BADGE_COLORS = { Bestseller:"#b07d4a",New:"#3d8a60",Sale:"#b03030",Exclusive:"#6a4a8a",Premium:"#3a6a9a",Trending:"#9a6a30",Festive:"#8a5a2a" };
const PRICE_RANGES = ["All Prices","Under 3,000","3,000–6,000","6,000–10,000","10,000–20,000","20,000+"];
const SORT_OPTIONS = [
  { value:"price_desc", label:"Price: High to Low" },
  { value:"price_asc",  label:"Price: Low to High" },
  { value:"name_asc",   label:"Name: A to Z" },
  { value:"name_desc",  label:"Name: Z to A" },
];

const SLUG_TO_CAT = {
  "lawn":"Lawn","kurta":"Kurta","co-ords":"Co-ords",
  "pret-ready-to-wear":"Pret / Ready to Wear","luxury-pret":"Luxury Pret",
  "unstitched":"Unstitched","shalwar-kameez":"Shalwar Kameez",
  "formal":"Formal","bridal":"Bridal","festive-eid":"Festive / Eid",
  "winter-collection":"Winter Collection","abaya":"Abaya",
};

function slugify(cat) {
  return (cat||"").toLowerCase().replace(/\s*\/\s*/g,"-").replace(/\s+/g,"-");
}

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
  const n = (name||"").toLowerCase();
  if (t.includes("new") || n.includes("new arrival")) return "New";
  if (t.includes("festive") || n.includes("festive"))  return "Festive";
  if (n.includes("luxury") || n.includes("premium"))   return "Premium";
  return null;
}

export default function CategoryPage() {
  const routeParams = useParams();
  const router      = useRouter();

  const [mounted,    setMounted]    = useState(false);
  const [catName,    setCatName]    = useState("");
  const [products,   setProducts]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total,      setTotal]      = useState(0);
  const [brand,      setBrand]      = useState("All Brands");
  const [priceRange, setPriceRange] = useState("All Prices");
  const [allBrands,  setAllBrands]  = useState([]);
  const [sort,       setSort]       = useState("price_desc");
  const [wishlist,   setWishlist]   = useState([]);
  const sentinelRef = useRef(null);

  // Fix: only read params after mount to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const slug = routeParams?.slug || "";
    const name = SLUG_TO_CAT[slug] || slug.replace(/-/g," ").replace(/\b\w/g,c=>c.toUpperCase());
    setCatName(name);
    setPage(1);
    setProducts([]);
  }, [mounted, routeParams?.slug]);

  useEffect(() => {
    fetch("/api/brands")
      .then(r => r.json())
      .then(j => { if (j.brands) setAllBrands(j.brands); })
      .catch(() => {});
  }, []);

  const loadProducts = useCallback((pageNum) => {
    if (!catName) return;
    setLoading(true);
    const [minP, maxP] = parsePriceRange(priceRange);
    const qp = new URLSearchParams({ page: String(pageNum), category: catName, sort });
    if (brand !== "All Brands") qp.set("brand", brand);
    if (minP) qp.set("min_price", String(minP));
    if (maxP) qp.set("max_price", String(maxP));

    fetch(`/api/products?${qp}`)
      .then(r => r.json())
      .then(json => {
        const prods = (json.products || []).map(p => ({
          ...p,
          price:          safePrice(p.price),
          original_price: safePrice(p.original_price),
          image:          p.image_url || "",
          badge:          deriveBadge(p.tags, p.name, p.original_price, p.price),
        }));
        setProducts(prev => pageNum === 1 ? prods : [...prev, ...prods]);
        setTotalPages(json.pages || 1);
        setTotal(json.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [catName, brand, priceRange, sort]);

  useEffect(() => {
    loadProducts(page);
  }, [catName, page, brand, priceRange]);

  // Infinite scroll — observe sentinel div at bottom of product grid
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !loading && page < totalPages) {
          setPage(p => p + 1);
        }
      },
      { rootMargin: "200px" } // trigger 200px before hitting bottom
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loading, page, totalPages]);

  const toggleWish = (id, e) => {
    e?.stopPropagation();
    setWishlist(w => w.includes(id) ? w.filter(x=>x!==id) : [...w,id]);
  };

  const BRANDS = ["All Brands", ...allBrands];

  if (!mounted) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontFamily:"'DM Sans',sans-serif", color:"#c9a96e" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:"1.5rem", marginBottom:"8px" }}>◌</div>
        <p style={{ fontSize:".8rem", letterSpacing:".1em" }}>Loading…</p>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:"linear-gradient(160deg,#fdfcfb 0%,#f5f0eb 40%,#ede8e0 100%)", minHeight:"100vh", color:"#2a2420" }}>
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
        .filter-btn{background:#fff;border:1px solid #e0d8d0;color:#777;padding:7px 14px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;border-radius:3px;transition:all .2s;white-space:nowrap;}
        .filter-btn:hover,.filter-btn.active{border-color:#c9a96e;color:#9a6a30;background:#fdf7ef;}
        .tag{display:inline-block;background:#f5f0eb;border:1px solid #e8e2d8;padding:3px 10px;border-radius:20px;font-size:.62rem;letter-spacing:.07em;text-transform:uppercase;color:#999;}
        select{appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23aaa'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;padding-right:28px !important;}
        .load-more{background:none;border:1px solid #e0d8d0;border-radius:4px;padding:12px 40px;cursor:pointer;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:#888;font-family:'DM Sans',sans-serif;transition:all .2s;}
        .load-more:hover{border-color:#c9a96e;color:#c9a96e;}
        .breadcrumb{font-size:.7rem;color:#bbb;}
        .breadcrumb a{color:#c9a96e;text-decoration:none;}
        .breadcrumb a:hover{text-decoration:underline;}
        @media(max-width:768px){.card-img{height:220px;}.cats-row{display:none!important;}}
      `}</style>

      <SharedNav />

      <div style={{ maxWidth:"1240px", margin:"0 auto", padding:"28px 24px" }}>

        <div className="breadcrumb" style={{ marginBottom:"12px" }}>
          <a href="/">Home</a> › {catName}
        </div>

        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:"20px", paddingBottom:"16px", borderBottom:"1px solid #e8e0d8", flexWrap:"wrap", gap:"12px" }}>
          <div>
            <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"2.2rem", fontWeight:300, color:"#2a2420" }}>{catName}</h1>
            <p style={{ fontSize:".72rem", color:"#bbb", marginTop:"4px", letterSpacing:".08em" }}>{total.toLocaleString()} dresses</p>
          </div>
          <div style={{ display:"flex", gap:"10px", flexWrap:"wrap" }}>
            <select value={brand} onChange={e => { setBrand(e.target.value); setPage(1); setProducts([]); }}
              className="filter-btn" style={{ background:"#fff", cursor:"pointer" }}>
              {BRANDS.map(b => <option key={b}>{b}</option>)}
            </select>
            <select value={priceRange} onChange={e => { setPriceRange(e.target.value); setPage(1); setProducts([]); }}
              className="filter-btn" style={{ background:"#fff", cursor:"pointer" }}>
              {PRICE_RANGES.map(p => <option key={p}>{p}</option>)}
            </select>
            <select value={sort} onChange={e => { setSort(e.target.value); setPage(1); setProducts([]); }}
              className="filter-btn" style={{ background:"#fff", cursor:"pointer" }}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Category pills */}
        <div className="cats-row" style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"28px" }}>
          {CATEGORIES.map(cat => (
            <button key={cat}
              className={`filter-btn ${catName===cat?"active":""}`}
              onClick={() => router.push(`/category/${slugify(cat)}`)}>
              {cat}
            </button>
          ))}
        </div>

        {loading && products.length === 0 ? (
          <div style={{ textAlign:"center", padding:"80px 0", color:"#c9a96e" }}>
            <div style={{ fontSize:"1.5rem", marginBottom:"12px" }}>◌</div>
            <p style={{ fontSize:".8rem", letterSpacing:".1em" }}>Loading {catName}…</p>
          </div>
        ) : products.length === 0 && !loading ? (
          <div style={{ textAlign:"center", padding:"80px 0", color:"#ccc" }}>
            <div style={{ fontSize:"3rem", marginBottom:"16px" }}>◌</div>
            <p style={{ fontSize:".85rem" }}>No dresses found in {catName}</p>
          </div>
        ) : (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:"20px", marginBottom:"40px" }}>
              {products.map((p) => (
                <div key={p.id} className="card" onClick={() => router.push(`/product/${p.id}`)}>
                  <div style={{ position:"relative", overflow:"hidden" }}>
                    <img className="card-img"
                      src={p.image_url || p.image || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&q=80"}
                      alt={p.name || "Product"}
                      loading="lazy"
                      onError={e => { e.currentTarget.src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&q=80"; }}
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
                        <div style={{ fontSize:".88rem", fontWeight:500, color:"#2a2420" }}>Rs. {p.price.toLocaleString()}</div>
                        {p.original_price > p.price && (
                          <div style={{ fontSize:".72rem", textDecoration:"line-through", color:"#bbb" }}>Rs. {p.original_price.toLocaleString()}</div>
                        )}
                      </div>
                    </div>
                    <span className="tag">{p.brand}</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Infinite scroll sentinel — triggers next page load when visible */}
            <div ref={sentinelRef} style={{ height:"40px", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"40px" }}>
              {loading && products.length > 0 && (
                <div style={{ fontSize:".75rem", color:"#c9a96e", letterSpacing:".1em" }}>Loading more…</div>
              )}
            </div>
          </>
        )}
      </div>

      <footer style={{ borderTop:"1px solid #e8e0d8", padding:"40px 24px", textAlign:"center", background:"rgba(255,255,255,.55)", marginTop:"20px" }}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"1.35rem", color:"#c9a96e", marginBottom:"6px" }}>Poshak.pk</div>
        <p style={{ fontSize:".62rem", letterSpacing:".15em", color:"#bbb", textTransform:"uppercase" }}>Pakistan's Women's Fashion Discovery</p>
      </footer>
    </div>
  );
}
