"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import SharedNav from "../../SharedNav";

const BADGE_COLORS = { Bestseller:"#b07d4a",New:"#3d8a60",Sale:"#b03030",Exclusive:"#6a4a8a",Premium:"#3a6a9a",Trending:"#9a6a30",Festive:"#8a5a2a" };

function slugify(s) { return (s||"").toLowerCase().replace(/\s*\/\s*/g,"-").replace(/\s+/g,"-"); }

export default function ProductPage() {
  const params  = useParams();
  const router  = useRouter();

  const [id,        setId]        = useState(null);
  const [product,   setProduct]   = useState(null);
  const [similar,   setSimilar]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [liveStock, setLiveStock] = useState("checking");
  const [wishlist,  setWishlist]  = useState([]);
  const [mounted,   setMounted]   = useState(false);

  // Fix hydration: only read params after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const productId = params?.id;
    if (!productId) return;
    setId(productId);
  }, [mounted, params]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    fetch(`/api/product/${id}`)
      .then(r => r.json())
      .then(json => {
        if (json.product) {
          setProduct({
            ...json.product,
            price: Number(json.product.price) || 0,
            original_price: Number(json.product.original_price) || 0,
          });
          checkLiveStock(json.product.product_url).then(setLiveStock);

          // Fetch similar products — match by occasion first, then product_type
          // Exclude current product, prefer different brands
          const p = json.product;
          const currentBrand = p.brand || "";
          const occasion = encodeURIComponent(p.occasion || "");
          const productType = encodeURIComponent(p.product_type || "");

          // Try occasion-based similarity first, fall back to product_type
          const similarUrl = p.occasion
            ? `/api/products?occasion=${occasion}&page=1`
            : `/api/products?category=${productType}&page=1`;

          fetch(similarUrl)
            .then(r => r.json())
            .then(j => {
              const candidates = (j.products || []).filter(sp => sp.id !== id);
              // Sort: different brand first, then by price proximity
              const currentPrice = Number(p.price) || 0;
              candidates.sort((a, b) => {
                const aDiff = Math.abs((Number(a.price)||0) - currentPrice);
                const bDiff = Math.abs((Number(b.price)||0) - currentPrice);
                if (a.brand !== currentBrand && b.brand === currentBrand) return -1;
                if (a.brand === currentBrand && b.brand !== currentBrand) return 1;
                return aDiff - bDiff;
              });
              setSimilar(candidates.slice(0, 6));
            })
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const stockInfo = {
    checking: { color:"#c9a96e", text:"Checking availability…", bg:"#fffbf0" },
    in_stock: { color:"#3d8a60", text:"In Stock",               bg:"#f0faf4" },
    sold_out: { color:"#b03030", text:"Sold Out",               bg:"#fff4f4" },
    unknown:  { color:"#888",    text:"Check brand website",    bg:"#f8f8f8" },
  };
  const s = stockInfo[liveStock] || stockInfo.unknown;

  if (!mounted || loading) return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#fdfcfb", color:"#c9a96e" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:"2rem", marginBottom:"12px" }}>◌</div>
        <p style={{ fontSize:".8rem", letterSpacing:".1em" }}>Loading…</p>
      </div>
    </div>
  );

  if (!product) return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#fdfcfb" }}>
      <div style={{ textAlign:"center" }}>
        <p style={{ fontSize:".85rem", color:"#bbb", marginBottom:"16px" }}>Product not found</p>
        <button onClick={() => router.push("/")} style={{ background:"none", border:"1px solid #e0d8d0", borderRadius:"4px", padding:"10px 24px", cursor:"pointer", fontSize:".72rem", letterSpacing:".1em", textTransform:"uppercase", color:"#888", fontFamily:"'DM Sans',sans-serif" }}>Go Home</button>
      </div>
    </div>
  );

  const discountPct = product.original_price > product.price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : null;

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:"linear-gradient(160deg,#fdfcfb 0%,#f5f0eb 100%)", minHeight:"100vh", color:"#2a2420" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        .nav{height:60px;border-bottom:1px solid #e8e0d8;display:flex;align-items:center;padding:0 24px;position:sticky;top:0;z-index:200;background:rgba(253,252,251,.97);backdrop-filter:blur(14px);justify-content:space-between;}
        .wordmark{font-family:'Cormorant Garamond',serif;font-size:1.45rem;font-weight:300;letter-spacing:.18em;cursor:pointer;color:#2a2420;}
        .cta-btn{background:#2a2420;color:#fff;border:none;padding:16px 24px;font-family:'DM Sans',sans-serif;font-size:.78rem;letter-spacing:.14em;text-transform:uppercase;font-weight:500;cursor:pointer;border-radius:4px;transition:all .22s;width:100%;display:flex;align-items:center;justify-content:center;gap:8px;}
        .cta-btn:hover{background:#c9a96e;}
        .cta-btn.sold-out{background:#888;cursor:not-allowed;}
        .similar-card{background:#fff;border:1px solid #e8e0d8;border-radius:8px;overflow:hidden;cursor:pointer;transition:all .22s;}
        .similar-card:hover{border-color:#c9a96e;transform:translateY(-3px);box-shadow:0 8px 24px rgba(180,140,90,.1);}
        .breadcrumb{font-size:.7rem;color:#bbb;}
        .breadcrumb a{color:#c9a96e;text-decoration:none;}
        .breadcrumb a:hover{text-decoration:underline;}
        @media(max-width:768px){.product-layout{flex-direction:column !important;}.product-img{height:360px !important;}}
      `}</style>

      <SharedNav />

      <div style={{ maxWidth:"1100px", margin:"0 auto", padding:"28px 24px" }}>

        <div className="breadcrumb" style={{ marginBottom:"20px" }}>
          <a href="/">Home</a> ›{" "}
          <a href={`/brand/${slugify(product.brand)}`}>{product.brand}</a> ›{" "}
          <span style={{ color:"#888" }}>{product.name}</span>
        </div>

        <div className="product-layout" style={{ display:"flex", gap:"48px", marginBottom:"60px" }}>

          {/* Image */}
          <div style={{ flex:"0 0 460px" }}>
            <div style={{ position:"relative", borderRadius:"12px", overflow:"hidden", boxShadow:"0 8px 40px rgba(0,0,0,.1)" }}>
              <img className="product-img" src={product.image_url} alt={product.name}
                style={{ width:"100%", height:"540px", objectFit:"cover", display:"block", filter: liveStock==="sold_out"?"grayscale(20%)":"none" }}
                onError={e => { e.target.src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&q=80"; }} />
              {discountPct && (
                <div style={{ position:"absolute", top:"14px", left:"14px", background:BADGE_COLORS.Sale, color:"#fff", fontSize:".62rem", letterSpacing:".14em", textTransform:"uppercase", padding:"4px 12px", borderRadius:"20px", fontWeight:600 }}>
                  -{discountPct}% Off
                </div>
              )}
              {liveStock === "sold_out" && (
                <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(20,14,8,.4)" }}>
                  <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"2rem", color:"#fff", letterSpacing:".1em", fontWeight:300 }}>Sold Out</span>
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:".65rem", letterSpacing:".22em", textTransform:"uppercase", color:"#c9a96e", marginBottom:"8px", cursor:"pointer" }}
              onClick={() => router.push(`/brand/${slugify(product.brand)}`)}>
              {product.brand}
            </div>
            <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"2rem", fontWeight:400, color:"#2a2420", lineHeight:1.25, marginBottom:"16px" }}>{product.name}</h1>

            <div style={{ marginBottom:"20px" }}>
              <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"2rem", color:"#2a2420" }}>Rs. {(product.price||0).toLocaleString()}</span>
              {product.original_price > product.price && (
                <span style={{ fontSize:".95rem", textDecoration:"line-through", color:"#bbb", marginLeft:"12px" }}>Rs. {(product.original_price||0).toLocaleString()}</span>
              )}
            </div>

            {/* Stock */}
            <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"24px", padding:"10px 14px", background:s.bg, borderRadius:"6px", border:`1px solid ${s.color}22` }}>
              <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:s.color, flexShrink:0 }} />
              <span style={{ fontSize:".72rem", color:s.color, fontWeight:500 }}>{s.text}</span>
            </div>

            {/* Details */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", background:"#f8f4ef", borderRadius:"10px", padding:"20px", marginBottom:"24px" }}>
              {[["Brand",product.brand],["Collection",product.collection],["Type",product.product_type],["Status",product.in_stock?"In Stock":"Out of Stock"]].map(([label,value]) => value ? (
                <div key={label}>
                  <div style={{ fontSize:".58rem", letterSpacing:".18em", textTransform:"uppercase", color:"#bbb", marginBottom:"4px" }}>{label}</div>
                  <div style={{ fontSize:".88rem", color:"#2a2420", fontWeight:500 }}>{value}</div>
                </div>
              ) : null)}
            </div>

            <div style={{ background:"#fffbf0", border:"1px solid #f0e0b0", borderRadius:"8px", padding:"12px 16px", marginBottom:"24px", fontSize:".7rem", color:"#888", lineHeight:1.6 }}>
              ℹ️ Links to {product.brand}'s official website. Availability and pricing are controlled by the brand.
            </div>

            <a href={product.product_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration:"none", display:"block", marginBottom:"12px" }}>
              <button className={`cta-btn ${liveStock==="sold_out"?"sold-out":""}`}>
                {liveStock==="sold_out" ? `View on ${product.brand} (Sold Out) →` : `View & Buy on ${product.brand} →`}
              </button>
            </a>

            <button onClick={() => setWishlist(w => w.includes(product.id)?w.filter(x=>x!==product.id):[...w,product.id])}
              style={{ width:"100%", background:"none", border:"1px solid #e0d8d0", borderRadius:"4px", padding:"12px", cursor:"pointer", fontSize:".72rem", letterSpacing:".1em", textTransform:"uppercase", color:wishlist.includes(product.id)?"#c9a96e":"#888", fontFamily:"'DM Sans',sans-serif", transition:"all .2s" }}>
              {wishlist.includes(product.id) ? "♥ Saved to Wishlist" : "♡ Save to Wishlist"}
            </button>
          </div>
        </div>

        {/* Similar */}
        {similar.length > 0 && (
          <div style={{ marginBottom:"60px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"16px", marginBottom:"24px" }}>
              <div style={{ flex:1, height:"1px", background:"linear-gradient(90deg,transparent,#c9a96e 30%,#c9a96e 70%,transparent)" }} />
              <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"1.2rem", color:"#aaa", fontStyle:"italic", whiteSpace:"nowrap" }}>You May Also Like</span>
              <div style={{ flex:1, height:"1px", background:"linear-gradient(90deg,#c9a96e 30%,transparent)" }} />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:"16px" }}>
              {similar.map(sp => (
                <div key={sp.id} className="similar-card" onClick={() => router.push(`/product/${sp.id}`)}>
                  <img src={sp.image_url} alt={sp.name} style={{ width:"100%", height:"180px", objectFit:"cover", display:"block" }}
                    onError={e => { e.target.src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&q=80"; }} />
                  <div style={{ padding:"10px" }}>
                    <div style={{ fontSize:".56rem", letterSpacing:".12em", textTransform:"uppercase", color:"#c9a96e", marginBottom:"3px" }}>{sp.brand}</div>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:".88rem", color:"#2a2420", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:"4px" }}>{sp.name}</div>
                    <div style={{ fontSize:".75rem", color:"#aaa" }}>Rs. {(sp.price||0).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer style={{ borderTop:"1px solid #e8e0d8", padding:"40px 24px", textAlign:"center", background:"rgba(255,255,255,.55)" }}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"1.35rem", color:"#c9a96e", marginBottom:"6px" }}>Poshak.pk</div>
        <p style={{ fontSize:".62rem", letterSpacing:".15em", color:"#bbb", textTransform:"uppercase" }}>Pakistan's Women's Fashion Discovery</p>
      </footer>
    </div>
  );
}

async function checkLiveStock(product_url) {
  if (!product_url) return "unknown";
  try {
    const handleMatch = product_url.match(/\/products\/([^/?#]+)/);
    if (!handleMatch) return "unknown";
    const handle  = handleMatch[1];
    const baseUrl = product_url.split("/products/")[0];
    const ctrl    = new AbortController();
    setTimeout(() => ctrl.abort(), 5000);
    await fetch(`${baseUrl}/products/${handle}.json`, { mode:"no-cors", signal:ctrl.signal });
    return "in_stock";
  } catch(e) {
    return e.name === "AbortError" ? "unknown" : "sold_out";
  }
}
