"use client";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";


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
    <div onClick={handleClick} style={{ cursor:"pointer", position:"relative" }}>
      {/* Image container — aspect-ratio reserves exact space before image loads = zero CLS */}
      <div className="product-card-image">
        <Image
          src={imgSrc}
          alt={p.name || "Product"}
          width={652}
          height={738}
          quality={85}
          style={{ width:"100%", height:"auto", display:"block", objectFit:"cover", transition:"transform .48s" }}
          priority={isPriority}
          loading={isPriority ? "eager" : "lazy"}
          onError={() => setImgSrc(FALLBACK)}
        />

        {/* Badge */}
        {p.badge && (
          <div className="product-card-badge" style={{ position:"absolute", top:"10px", left:"10px", zIndex:2 }}>
            {p.badge}
          </div>
        )}

        {/* Wishlist button */}
        <button
          onClick={e => { e.stopPropagation(); onWish?.(p.id, e); }}
          className="product-card-wishlist"
          style={{
            position:"absolute", top:"10px", right:"10px",
            background:"none", border:"none",
            width:"28px", height:"28px",
            display:"flex", alignItems:"center", justifyContent:"center",
            cursor:"pointer", zIndex:2,
          }}
        >
          <span style={{ color: isWished ? "#000000" : "#757575", fontSize:"1rem" }}>
            {isWished ? "♥" : "♡"}
          </span>
        </button>
      </div>

      {/* Card body */}
      <div style={{ padding:"10px 0 0 0" }}>
        <div className="product-card-brand">{p.brand}</div>
        <div className="product-card-name">{p.name}</div>
        <div className="product-card-price">
          {origPrice > price ? (
            <>
              <span className="product-card-price-sale">Rs. {price.toLocaleString()}</span>
              <span className="product-card-price-original">Rs. {origPrice.toLocaleString()}</span>
            </>
          ) : (
            <>Rs. {price.toLocaleString()}</>
          )}
        </div>
      </div>
    </div>
  );
}
