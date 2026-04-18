"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SharedNav from "../SharedNav";
import ProductCard from "../components/ProductCard";

function safePrice(p) { const n=Number(p); return isNaN(n)?0:n; }

export default function WishlistPage() {
  const router = useRouter();
  const [products,  setProducts]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [wishlist,  setWishlist]  = useState([]);

  // Load wishlist products from localStorage
  useEffect(() => {
    try {
      const ids = JSON.parse(localStorage.getItem("poshak_wishlist") || "[]");
      const storedProds = JSON.parse(localStorage.getItem("poshak_wishlist_products") || "[]");
      setWishlist(ids);

      if (ids.length === 0) { setLoading(false); return; }

      if (storedProds.length > 0) {
        const ordered = ids.map(id => storedProds.find(p => p.id === id)).filter(Boolean);
        setProducts(ordered.map(p => ({
          ...p,
          price: safePrice(p.price),
          original_price: safePrice(p.original_price),
        })));
        setLoading(false);
      } else {
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
  }, []);

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

  return (
    <div style={{ fontFamily:"'Jost','DM Sans',sans-serif", background:"#ffffff", minHeight:"100vh", color:"#000000" }}>
      <SharedNav />

      <div style={{ maxWidth:"1240px", margin:"0 auto", padding:"28px 24px" }}>

        {/* Header */}
        <div style={{ fontSize:".7rem", color:"#757575", marginBottom:"12px" }}>
          <a href="/" style={{ color:"#757575", textDecoration:"none" }}>Home</a> › Wishlist
        </div>
        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:"32px", paddingBottom:"16px", borderBottom:"2px solid #dfdfdf" }}>
          <div>
            <h1 style={{ fontFamily:"'Jost','DM Sans',sans-serif", fontSize:"36px", fontWeight:400, color:"#000000" }}>
              My Wishlist
            </h1>
            <p style={{ fontSize:".72rem", color:"#757575", marginTop:"4px" }}>
              {loading ? "Loading…" : `${products.length} saved ${products.length === 1 ? "item" : "items"}`}
            </p>
          </div>
          {products.length > 0 && (
            <button onClick={clearAll}
              style={{ background:"#ffffff", border:"2px solid #dfdfdf", color:"#000000", padding:"9px 18px", cursor:"pointer", fontFamily:"'Jost','DM Sans',sans-serif", fontSize:".72rem", letterSpacing:".1em", textTransform:"uppercase", fontWeight:400 }}>
              Clear All
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign:"center", padding:"80px 0", color:"#757575" }}>
            <div style={{ fontSize:"1.5rem", marginBottom:"12px" }}>◌</div>
            <p style={{ fontSize:".8rem", letterSpacing:".1em" }}>Loading your wishlist…</p>
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign:"center", padding:"80px 0" }}>
            <div style={{ fontSize:"3rem", color:"#dfdfdf", marginBottom:"20px" }}>♡</div>
            <p style={{ fontFamily:"'Jost','DM Sans',sans-serif", fontSize:"1.2rem", color:"#757575", marginBottom:"8px" }}>Your wishlist is empty</p>
            <p style={{ fontSize:".78rem", color:"#757575", marginBottom:"28px" }}>Browse our collections and save items you love</p>
            <button onClick={() => router.push("/")}
              style={{ background:"#000000", color:"#ffffff", border:"none", padding:"12px 32px", cursor:"pointer", fontSize:".75rem", letterSpacing:".14em", textTransform:"uppercase", fontFamily:"'Jost','DM Sans',sans-serif", fontWeight:400 }}>
              Browse Collections
            </button>
          </div>
        ) : (
          <div className="product-grid" style={{ marginBottom:"60px" }}>
            {products.map((p, idx) => (
              <div key={p.id} className="product-card-wrap" style={{ position:"relative" }}>
                <ProductCard p={p} idx={idx} wishlist={wishlist} onWish={(id, e) => { e?.stopPropagation(); removeFromWishlist(id); }} />
              </div>
            ))}
          </div>
        )}
      </div>

      <footer style={{ borderTop:"2px solid #dfdfdf", padding:"40px 24px", textAlign:"center", background:"#ffffff" }}>
        <div style={{ fontFamily:"'Jost','DM Sans',sans-serif", fontSize:"1.2rem", color:"#000000", marginBottom:"6px", fontWeight:400 }}>Poshak.pk</div>
        <p style={{ fontSize:".62rem", letterSpacing:".15em", color:"#757575", textTransform:"uppercase" }}>Pakistan's Women's Fashion Discovery</p>
      </footer>
    </div>
  );
}
