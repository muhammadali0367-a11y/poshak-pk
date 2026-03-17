"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SharedNav from "../SharedNav";

const BADGE_COLORS = { Bestseller:"#b07d4a",New:"#3d8a60",Sale:"#b03030",Exclusive:"#6a4a8a",Premium:"#3a6a9a",Trending:"#9a6a30",Festive:"#8a5a2a" };

function safePrice(p) { const n=Number(p); return isNaN(n)?0:n; }

export default function WishlistPage() {
  const router = useRouter();
  const [products,  setProducts]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [wishlist,  setWishlist]  = useState([]);
  const [mounted,   setMounted]   = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Load wishlist products from localStorage
  useEffect(() => {
    if (!mounted) return;
    try {
      const ids = JSON.parse(localStorage.getItem("poshak_wishlist") || "[]");
      const storedProds = JSON.parse(localStorage.getItem("poshak_wishlist_products") || "[]");
      setWishlist(ids);

      if (ids.length === 0) { setLoading(false); return; }

      if (storedProds.length > 0) {
        // Use locally stored products — instant, no API call needed
        const ordered = ids.map(id => storedProds.find(p => p.id === id)).filter(Boolean);
        setProducts(ordered.map(p => ({
          ...p,
          price: safePrice(p.price),
          original_price: safePrice(p.original_price),
        })));
        setLoading(false);
      } else {
        // Fallback: fetch from batch API if no stored products
        const chunks = [];
        for (let i = 0; i < ids.length; i += 20) chunks.push(ids.slice(i, i+20));
        Promise.all(
          chunks.map(chunk =>
            fetch(`/api/products/batch?ids=${chunk.join(",")}`)
              .then(r => r.json())
              .then(j => j.products || [])
              .catch(() => [])
          )
        ).then(results => {
          const all = results.flat().map(p => ({
            ...p,
            price: safePrice(p.price),
            original_price: safePrice(p.original_price),
          }));
          const ordered = ids.map(id => all.find(p => p.id === id)).filter(Boolean);
          setProducts(ordered);
        }).finally(() => setLoading(false));
      }
    } catch(e) {
      setLoading(false);
    }
  }, [mounted]);

  const removeFromWishlist = (id) => {
    const updated = wishlist.filter(x => x !== id);
    setWishlist(updated);
    setProducts(prev => prev.filter(p => p.id !== id));
    try {
      localStorage.setItem("poshak_wishlist", JSON.stringify(updated));
      const stored = JSON.parse(localStorage.getItem("poshak_wishlist_products") || "[]");
      localStorage.setItem("poshak_wishlist_products", JSON.stringify(stored.filter(p => p.id !== id)));
    } catch(e) {}
    window.dispatchEvent(new Event("storage"));
  };

  const clearAll = () => {
    setWishlist([]);
    setProducts([]);
    try {
      localStorage.removeItem("poshak_wishlist");
      localStorage.removeItem("poshak_wishlist_products");
    } catch(e) {}
    window.dispatchEvent(new Event("storage"));
  };

  if (!mounted) return null;

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:"linear-gradient(160deg,#fdfcfb 0%,#f5f0eb 100%)", minHeight:"100vh", color:"#2a2420" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        .wish-card{background:#fff;border:1px solid #e8e0d8;border-radius:10px;overflow:hidden;cursor:pointer;position:relative;box-shadow:0 2px 10px rgba(0,0,0,.04);transition:transform .28s,box-shadow .28s,border-color .2s;}
        .wish-card:hover{border-color:#c9a96e;transform:translateY(-5px);box-shadow:0 18px 44px rgba(180,140,90,.14);}
        .wish-card-img{width:100%;height:280px;object-fit:cover;display:block;background:#f5f0eb;transition:transform .48s;}
        .wish-card:hover .wish-card-img{transform:scale(1.04);}
        .remove-btn{position:absolute;top:10px;right:10px;background:rgba(255,255,255,.94);border:1px solid #e8e0d8;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;z-index:2;font-size:.9rem;}
        .remove-btn:hover{border-color:#b03030;color:#b03030;}
        .clear-btn{background:none;border:1px solid #f0c0c0;color:#b03030;padding:8px 18px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;border-radius:3px;transition:all .2s;}
        .clear-btn:hover{background:#fff0f0;}
        .tag{display:inline-block;background:#f5f0eb;border:1px solid #e8e2d8;padding:3px 10px;border-radius:20px;font-size:.62rem;letter-spacing:.07em;text-transform:uppercase;color:#999;}
        .breadcrumb{font-size:.7rem;color:#bbb;}
        .breadcrumb a{color:#c9a96e;text-decoration:none;}
        @media(max-width:640px){.wish-card-img{height:220px;}}
      `}</style>

      <SharedNav />

      <div style={{ maxWidth:"1240px", margin:"0 auto", padding:"28px 24px" }}>

        {/* Header */}
        <div className="breadcrumb" style={{ marginBottom:"12px" }}>
          <a href="/">Home</a> › Wishlist
        </div>
        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:"32px", paddingBottom:"16px", borderBottom:"1px solid #e8e0d8" }}>
          <div>
            <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"2.2rem", fontWeight:300, color:"#2a2420" }}>
              My Wishlist
            </h1>
            <p style={{ fontSize:".72rem", color:"#bbb", marginTop:"4px" }}>
              {loading ? "Loading…" : `${products.length} saved ${products.length === 1 ? "dress" : "dresses"}`}
            </p>
          </div>
          {products.length > 0 && (
            <button className="clear-btn" onClick={clearAll}>Clear All</button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign:"center", padding:"80px 0", color:"#c9a96e" }}>
            <div style={{ fontSize:"1.5rem", marginBottom:"12px" }}>◌</div>
            <p style={{ fontSize:".8rem", letterSpacing:".1em" }}>Loading your wishlist…</p>
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign:"center", padding:"80px 0" }}>
            <div style={{ fontSize:"3rem", color:"#e8e0d8", marginBottom:"20px" }}>♡</div>
            <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"1.4rem", color:"#aaa", marginBottom:"8px" }}>Your wishlist is empty</p>
            <p style={{ fontSize:".78rem", color:"#bbb", marginBottom:"28px" }}>Browse our collections and save dresses you love</p>
            <button onClick={() => router.push("/")}
              style={{ background:"#2a2420", color:"#fff", border:"none", padding:"12px 32px", cursor:"pointer", fontSize:".75rem", letterSpacing:".14em", textTransform:"uppercase", fontFamily:"'DM Sans',sans-serif", borderRadius:"4px" }}>
              Browse Collections
            </button>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:"20px", marginBottom:"60px" }}>
            {products.map(p => (
              <div key={p.id} className="wish-card" onClick={() => router.push(`/product/${p.id}`)}>
                <div style={{ position:"relative", overflow:"hidden" }}>
                  <img className="wish-card-img"
                    src={p.image_url || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&q=80"}
                    alt={p.name || "Product"} loading="lazy"
                    onError={e => { e.currentTarget.src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&q=80"; }}
                  />
                  {p.original_price > p.price && (
                    <div style={{ position:"absolute", top:"10px", left:"10px", background:BADGE_COLORS.Sale, color:"#fff", fontSize:".58rem", letterSpacing:".14em", textTransform:"uppercase", padding:"3px 9px", borderRadius:"20px", fontWeight:600 }}>
                      -{Math.round((1-p.price/p.original_price)*100)}% Off
                    </div>
                  )}
                  <button className="remove-btn"
                    onClick={e => { e.stopPropagation(); removeFromWishlist(p.id); }}
                    title="Remove from wishlist">
                    ♥
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
                  <div style={{ display:"flex", gap:"5px", flexWrap:"wrap" }}>
                    {p.brand && <span className="tag">{p.brand}</span>}
                    {p.color && <span className="tag">{p.color}</span>}
                  </div>
                </div>
              </div>
            ))}
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
