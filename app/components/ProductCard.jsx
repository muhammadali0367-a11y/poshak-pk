"use client";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

const BADGE_COLORS = {
  Bestseller:"#b07d4a", New:"#3d8a60", Sale:"#b03030",
  Exclusive:"#6a4a8a", Premium:"#3a6a9a", Trending:"#9a6a30", Festive:"#8a5a2a"
};

const FALLBACK = "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&q=80";

/**
 * Shared ProductCard — used across homepage, brand, category, search pages.
 * Uses next/image with fill + aspectRatio container = zero CLS permanently.
 *
 * Props:
 *   p        — product object
 *   idx      — index in list (used for priority loading of first 4)
 *   wishlist — array of wishlisted IDs
 *   onWish   — (id, e) => void
 *   onClick  — () => void (optional, defaults to router.push product page)
 */
export default function ProductCard({ p, idx = 99, wishlist = [], onWish, onClick }) {
  const router = useRouter();
  const [imgSrc, setImgSrc] = useState(p.image_url || p.image || FALLBACK);
  const isPriority = idx < 4;
  const isWished = wishlist.includes(p.id);
  const price = Number(p.price) || 0;
  const origPrice = Number(p.original_price) || 0;

  function handleClick() {
    if (onClick) onClick();
    else router.push(`/product/${p.id}`);
  }

  return (
    <div
      onClick={handleClick}
      style={{
        background:"#fff",
        border:"1px solid #e8e0d8",
        borderRadius:"10px",
        overflow:"hidden",
        cursor:"pointer",
        position:"relative",
        boxShadow:"0 2px 10px rgba(0,0,0,.04)",
        transition:"transform .28s,box-shadow .28s,border-color .2s",
      }}
      onMouseOver={e => {
        e.currentTarget.style.transform = "translateY(-5px)";
        e.currentTarget.style.borderColor = "#c9a96e";
        e.currentTarget.style.boxShadow = "0 18px 44px rgba(180,140,90,.14)";
      }}
      onMouseOut={e => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.borderColor = "#e8e0d8";
        e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,.04)";
      }}
    >
      {/* Image container — aspect-ratio reserves exact space before image loads = zero CLS */}
      <div style={{ position:"relative", aspectRatio:"3/4", background:"#f5f0eb", overflow:"hidden" }}>
        <Image
          src={imgSrc}
          alt={p.name || "Product"}
          fill
          sizes="(max-width:768px) 50vw, (max-width:1240px) 25vw, 220px"
          style={{ objectFit:"cover", transition:"transform .48s" }}
          priority={isPriority}
          loading={isPriority ? "eager" : "lazy"}
          onError={() => setImgSrc(FALLBACK)}
        />

        {/* Badge */}
        {p.badge && (
          <div style={{
            position:"absolute", top:"10px", left:"10px",
            background: BADGE_COLORS[p.badge] || "#888",
            color:"#fff", fontSize:".58rem", letterSpacing:".14em",
            textTransform:"uppercase", padding:"3px 9px",
            borderRadius:"20px", fontWeight:600, zIndex:2,
          }}>
            {p.badge}
          </div>
        )}

        {/* Wishlist button — position:absolute, outside document flow = no CLS */}
        <button
          onClick={e => { e.stopPropagation(); onWish?.(p.id, e); }}
          style={{
            position:"absolute", top:"10px", right:"10px",
            background:"rgba(255,255,255,.94)", border:"1px solid #e8e0d8",
            borderRadius:"50%", width:"34px", height:"34px",
            display:"flex", alignItems:"center", justifyContent:"center",
            cursor:"pointer", zIndex:2, flexShrink:0,
          }}
        >
          <span style={{ color: isWished ? "#c9a96e" : "#ccc", fontSize:".9rem" }}>
            {isWished ? "♥" : "♡"}
          </span>
        </button>
      </div>

      {/* Card body — fixed min-height reserves space before content loads = no CLS */}
      <div style={{ padding:"14px", minHeight:"80px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div style={{ flex:1, minWidth:0, paddingRight:"8px" }}>
            <div style={{
              fontSize:".6rem", letterSpacing:".14em", textTransform:"uppercase",
              color:"#c9a96e", marginBottom:"4px",
            }}>
              {p.brand}
            </div>
            <div style={{
              fontFamily:"'Cormorant Garamond',serif", fontSize:"1rem",
              color:"#2a2420", lineHeight:1.3, overflow:"hidden",
              display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical",
            }}>
              {p.name}
            </div>
          </div>
          <div style={{ textAlign:"right", flexShrink:0 }}>
            <div style={{ fontSize:".88rem", fontWeight:500 }}>
              Rs. {price.toLocaleString()}
            </div>
            {origPrice > price && (
              <div style={{ fontSize:".72rem", textDecoration:"line-through", color:"#bbb" }}>
                Rs. {origPrice.toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
