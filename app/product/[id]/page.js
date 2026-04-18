"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import SharedNav from "../../SharedNav";


function slugify(s) { return (s||"").toLowerCase().replace(/\s*\/\s*/g,"-").replace(/\s+/g,"-"); }

export default function ProductPage() {
  const params  = useParams();
  const router  = useRouter();

  const [id,        setId]        = useState(null);
  const [product,   setProduct]   = useState(null);
  const [similar,   setSimilar]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [liveStock, setLiveStock] = useState(null);
  const [wishlist,  setWishlist]  = useState([]);
  const [shareMsg,  setShareMsg]  = useState("");

  function handleShare() {
    const url = window.location.href;
    const text = product ? `Check out ${product.name} by ${product.brand} on Poshak!` : "Check this out on Poshak!";
    if (navigator.share) {
      navigator.share({ title: product?.name || "Poshak", text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setShareMsg("Link copied!");
        setTimeout(() => setShareMsg(""), 2000);
      });
    }
  }

  useEffect(() => {
    // Load wishlist from localStorage
    try {
      const saved = localStorage.getItem("poshak_wishlist");
      if (saved) setWishlist(JSON.parse(saved));
    } catch(e) {}
  }, []);

  useEffect(() => {
    const productId = params?.id;
    if (!productId) return;
    setId(productId);
  }, [params]);

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
          // Use DB in_stock value directly — no-cors fetch is unreliable
          setLiveStock(json.product.in_stock === false ? "sold_out" : "in_stock");

          // Fetch similar products — same occasion, similar price range, different brand
          const p = json.product;
          const currentPrice = Number(p.price) || 0;
          const currentBrand = p.brand || "";

          // Build URL — use occasion if available, otherwise fall back to product_type category
          const qp = new URLSearchParams({ page: "1" });
          if (p.occasion) qp.set("occasion", p.occasion);
          // Price range: ±50% of current price to keep results relevant
          if (currentPrice > 0) {
            qp.set("min_price", Math.floor(currentPrice * 0.5));
            qp.set("max_price", Math.ceil(currentPrice * 1.5));
          }

          fetch(`/api/products?${qp}`)
            .then(r => r.json())
            .then(j => {
              const candidates = (j.products || []).filter(sp => sp.id !== id);
              // Sort: different brand first, then closest price
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
    checking: { color:"#757575", text:"Checking availability…", bg:"#f2f2f2" },
    in_stock: { color:"#3d8a60", text:"In Stock",               bg:"#f2f2f2" },
    sold_out: { color:"#b03030", text:"Sold Out",               bg:"#f2f2f2" },
    unknown:  { color:"#757575", text:"Check brand website",    bg:"#f2f2f2" },
  };
  const s = stockInfo[liveStock] || stockInfo.unknown;

  if (loading) return (
    <div style={{ fontFamily:"'Jost','DM Sans',sans-serif", display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#ffffff", color:"#757575" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:"2rem", marginBottom:"12px" }}>◌</div>
        <p style={{ fontSize:".8rem", letterSpacing:".1em" }}>Loading…</p>
      </div>
    </div>
  );

  if (!product) return (
    <div style={{ fontFamily:"'Jost','DM Sans',sans-serif", display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#ffffff" }}>
      <div style={{ textAlign:"center" }}>
        <p style={{ fontSize:".85rem", color:"#757575", marginBottom:"16px" }}>Product not found</p>
        <button onClick={() => router.push("/")} style={{ background:"none", border:"2px solid #dfdfdf", padding:"10px 24px", cursor:"pointer", fontSize:".72rem", letterSpacing:".1em", textTransform:"uppercase", color:"#757575", fontFamily:"'Jost','DM Sans',sans-serif" }}>Go Home</button>
      </div>
    </div>
  );

  const discountPct = product.original_price > product.price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : null;

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "image": product.image_url,
    "description": `${product.name} by ${product.brand}${product.category ? ` — ${product.category}` : ""}`,
    "brand": {
      "@type": "Brand",
      "name": product.brand
    },
    "offers": {
      "@type": "Offer",
      "url": product.product_url,
      "priceCurrency": "PKR",
      "price": product.price,
      "availability": product.in_stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": product.brand
      }
    }
  };

  return (
    <div style={{ fontFamily:"'Jost','DM Sans',sans-serif", background:"#ffffff", minHeight:"100vh", paddingBottom:"0", color:"#000000" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <style>{`
        .cta-btn{background:#000;color:#fff;border:none;padding:16px 24px;font-family:'Jost','DM Sans',sans-serif;font-size:.78rem;letter-spacing:.14em;text-transform:uppercase;font-weight:400;cursor:pointer;transition:background .22s;width:100%;display:flex;align-items:center;justify-content:center;gap:8px;}
        .cta-btn:hover{background:#757575;}
        .cta-btn.sold-out{background:#757575;cursor:not-allowed;}
        .similar-card{background:#fff;border:2px solid #dfdfdf;overflow:hidden;cursor:pointer;}
        .breadcrumb{font-size:.7rem;color:#757575;}
        .breadcrumb a{color:#000;text-decoration:none;}
        .breadcrumb a:hover{text-decoration:underline;}
        @media(max-width:768px){.desktop-cta{display:none;}.product-layout{flex-direction:column !important;}.product-img{height:auto !important;aspect-ratio:3/4;}}
        .sticky-cta{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:2px solid #dfdfdf;padding:12px 20px;z-index:100;display:flex;gap:10px;align-items:center;}
        .share-btn{background:none;border:2px solid #dfdfdf;color:#757575;padding:10px 14px;cursor:pointer;font-size:.75rem;font-family:'Jost','DM Sans',sans-serif;white-space:nowrap;flex-shrink:0;}
        .share-btn:hover{border-color:#000;color:#000;}
        @media(min-width:769px){.sticky-cta{display:none;}}@media(max-width:768px){.product-actions{padding-bottom:80px;}}
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
            <div style={{ position:"relative", overflow:"hidden" }}>
              <div style={{ position:"relative", width:"100%", aspectRatio:"3/4", background:"#f2f2f2" }}>
                <Image
                  src={product.image_url || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80"}
                  alt={product.name || "Product"}
                  fill
                  priority
                  sizes="(max-width:768px) 100vw, 50vw"
                  style={{ objectFit:"cover", filter: liveStock==="sold_out"?"grayscale(20%)":"none" }}
                  onError={() => {}}
                />
              </div>
              {discountPct && (
                <div style={{ position:"absolute", top:"14px", left:"14px", background:"#b03030", color:"#fff", fontSize:".62rem", letterSpacing:".14em", textTransform:"uppercase", padding:"4px 12px", fontWeight:400 }}>
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
            <div style={{ fontSize:".65rem", letterSpacing:".22em", textTransform:"uppercase", color:"#757575", marginBottom:"8px", cursor:"pointer" }}
              onClick={() => router.push(`/brand/${slugify(product.brand)}`)}>
              {product.brand}
            </div>
            <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"2rem", fontWeight:400, color:"#000000", lineHeight:1.25, marginBottom:"16px" }}>{product.name}</h1>

            <div style={{ marginBottom:"20px" }}>
              {product.price > 0
                ? <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"2rem", color:"#000000" }}>Rs. {product.price.toLocaleString()}</span>
                : <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"1.4rem", color:"#757575", fontStyle:"italic" }}>Price unavailable — check brand website</span>
              }
              {product.original_price > product.price && (
                <span style={{ fontSize:".95rem", textDecoration:"line-through", color:"#bbb", marginLeft:"12px" }}>Rs. {(product.original_price||0).toLocaleString()}</span>
              )}
            </div>

            {/* Stock */}
            <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"24px", padding:"10px 14px", background:s.bg, border:"2px solid #dfdfdf" }}>
              <div style={{ width:"8px", height:"8px", background:s.color, flexShrink:0 }} />
              <span style={{ fontSize:".72rem", color:s.color, fontWeight:400 }}>{s.text}</span>
            </div>

            {/* Details */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", background:"#f2f2f2", padding:"20px", marginBottom:"24px" }}>
              {[["Brand",product.brand],["Collection",product.collection],["Type",product.product_type],["Status",product.in_stock?"In Stock":"Out of Stock"]].map(([label,value]) => value ? (
                <div key={label}>
                  <div style={{ fontSize:".58rem", letterSpacing:".18em", textTransform:"uppercase", color:"#757575", marginBottom:"4px" }}>{label}</div>
                  <div style={{ fontSize:".88rem", color:"#000000", fontWeight:400 }}>{value}</div>
                </div>
              ) : null)}
            </div>

            <div className="product-actions"><div style={{ background:"#f2f2f2", border:"2px solid #dfdfdf", padding:"12px 16px", marginBottom:"24px", fontSize:".7rem", color:"#757575", lineHeight:1.6 }}>
              ℹ️ Links to {product.brand}'s official website. Availability and pricing are controlled by the brand.
            </div>

            <a href={product.product_url} target="_blank" rel="noopener noreferrer" className="desktop-cta" style={{ textDecoration:"none", display:"block", marginBottom:"12px" }}>
              <button className={`cta-btn ${liveStock==="sold_out"?"sold-out":""}`}>
                {liveStock==="sold_out" ? `View on ${product.brand} (Sold Out) →` : `View & Buy on ${product.brand} →`}
              </button>
            </a>

            <button onClick={() => {
                const id = product.id;
                setWishlist(w => {
                  const updated = w.includes(id) ? w.filter(x=>x!==id) : [...w, id];
                  try {
                    localStorage.setItem("poshak_wishlist", JSON.stringify(updated));
                    const stored = JSON.parse(localStorage.getItem("poshak_wishlist_products") || "[]");
                    const updatedProds = w.includes(id)
                      ? stored.filter(p => p.id !== id)
                      : [...stored, { ...product }];
                    localStorage.setItem("poshak_wishlist_products", JSON.stringify(updatedProds));
                    window.dispatchEvent(new Event("storage"));
                  } catch(e) {}
                  return updated;
                });
              }}
              style={{ width:"100%", background:"none", border:"2px solid #dfdfdf", padding:"12px", cursor:"pointer", fontSize:".72rem", letterSpacing:".1em", textTransform:"uppercase", color:wishlist.includes(product.id)?"#000":"#757575", fontFamily:"'Jost','DM Sans',sans-serif" }}>
              {wishlist.includes(product.id) ? "♥ Saved to Wishlist" : "♡ Save to Wishlist"}
            </button>
          </div></div>
        </div>

        {/* Similar */}
        {similar.length > 0 && (
          <div style={{ marginBottom:"60px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"16px", marginBottom:"24px" }}>
              <div style={{ flex:1, height:"2px", background:"#dfdfdf" }} />
              <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"1.2rem", color:"#757575", fontStyle:"italic", whiteSpace:"nowrap" }}>You May Also Like</span>
              <div style={{ flex:1, height:"2px", background:"#dfdfdf" }} />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:"16px" }}>
              {similar.map(sp => (
                <div key={sp.id} className="similar-card" onClick={() => router.push(`/product/${sp.id}`)}>
                  <div style={{ position:"relative", width:"100%", aspectRatio:"3/4", background:"#f2f2f2" }}>
                    <Image
                      src={sp.image_url || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=70"}
                      alt={sp.name || "Product"}
                      fill
                      sizes="25vw"
                      style={{ objectFit:"cover" }}
                      onError={() => {}}
                    />
                  </div>
                  <div style={{ padding:"10px" }}>
                    <div style={{ fontSize:".56rem", letterSpacing:".12em", textTransform:"uppercase", color:"#757575", marginBottom:"3px" }}>{sp.brand}</div>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:".88rem", color:"#000000", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:"4px" }}>{sp.name}</div>
                    <div style={{ fontSize:".75rem", color:"#757575" }}>Rs. {(sp.price||0).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky CTA — mobile only */}
      {product && (
        <div className="sticky-cta">
          <button className="share-btn" onClick={handleShare}>
            {shareMsg || "Share"}
          </button>
          <a href={product.product_url} target="_blank" rel="noopener noreferrer"
            style={{ flex:1, background:liveStock==="sold_out"?"#757575":"#000000", color:"#fff", border:"none", padding:"12px 20px", fontFamily:"'Jost','DM Sans',sans-serif", fontSize:".78rem", letterSpacing:".1em", textTransform:"uppercase", fontWeight:400, cursor:"pointer", textAlign:"center", textDecoration:"none", display:"flex", alignItems:"center", justifyContent:"center" }}>
            {liveStock==="sold_out" ? `Sold Out — View on ${product.brand}` : `View & Buy on ${product.brand} →`}
          </a>
        </div>
      )}

      <footer style={{ borderTop:"2px solid #dfdfdf", padding:"32px 24px", background:"#ffffff" }}>
        <div style={{ maxWidth:"1240px", margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"12px" }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"1.2rem", color:"#000000", fontWeight:300 }}>Poshak</div>
          <p style={{ fontSize:".62rem", letterSpacing:".12em", color:"#ccc", textTransform:"uppercase" }}>Every brand. One place.</p>
          <p style={{ fontSize:".62rem", color:"#ccc" }}>Updated daily from 15+ brands</p>
        </div>
      </footer>
    </div>
  );
}


