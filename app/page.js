"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── GOOGLE SHEET CONFIG ───────────────────────────────────────────────────────
// Replace YOUR_SHEET_ID with your actual published sheet ID
const GOOGLE_SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQjuWejNvV1eOM9H1abXWMB-wAJMN2reQNNY1jWWx6dap-x2OTwdMzK5uK3DO05Bq6g0appKglzUDl4/pub?gid=0&single=true&output=csv";

// ─── GENDER / CATEGORY TAXONOMY ───────────────────────────────────────────────
const GENDER_MAP = {
  Women:       ["Lawn", "Kurta", "Co-ords", "Pret / Ready to Wear", "Luxury Pret",
                "Unstitched", "Shalwar Kameez", "Formal", "Bridal", "Festive / Eid",
                "Winter Collection", "Abaya"],
  Men:         ["Men's Kurta", "Shalwar Kameez Men", "Men's Formal", "Men's Casual",
                "Waistcoat", "Men's Winter", "Sherwani"],
  Kids:        ["Girls Wear", "Boys Wear", "Kids Casual", "Kids Formal", "Kids Lawn"],
  Accessories: ["Jewelry", "Handbags", "Footwear", "Dupattas", "Scarves", "Watches",
                "Sunglasses", "Clutches"],
};

const ALL_GENDERS  = ["Women", "Men", "Kids", "Accessories"];
const GENDER_ICONS = { Women: "👗", Men: "👔", Kids: "🧸", Accessories: "💍" };
const GENDER_ACCENT = { Women: "#c9a96e", Men: "#4a7ab5", Kids: "#6a9e5a", Accessories: "#9a6a9a" };

// Filters
const PRICE_RANGES     = ["All Prices","Under 3,000","3,000–6,000","6,000–10,000","10,000–20,000","20,000+"];
const STATIC_FABRICS   = ["All Fabrics","Lawn","Cotton","Chiffon","Silk","Organza","Velvet","Khaddar","Karandi","Linen","Cambric","Jacquard","Net","Raw Silk","Metal"];
const STATIC_OCCASIONS = ["All Occasions","Casual / Everyday","Office / Work","Formal Event","Wedding","Eid / Festive","Party","Bridal","Winter"];
const STATIC_COLORS    = ["All","Black","White","Navy","Red","Maroon","Pink","Peach","Mint","Teal","Mustard","Olive","Grey","Beige","Pastel","Multi / Printed","Gold","Silver"];
const BADGE_COLORS     = { Bestseller:"#b07d4a", New:"#3d8a60", Sale:"#b03030", Exclusive:"#6a4a8a", Premium:"#3a6a9a", Trending:"#9a6a30", Festive:"#8a5a2a" };

// ─── PRODUCT DATA ──────────────────────────────────────────────────────────────
const FALLBACK_PRODUCTS = [
  // ── WOMEN ──
  { id:1,  gender:"Women",      name:"Embroidered Lawn 3-Piece",    brand:"Khaadi",        price:4800,  category:"Lawn",                 color:"White",           fabric:"Lawn",    occasion:"Eid / Festive",     image:"https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&q=80", product_url:"https://www.khaadi.com/pk/women/",                             badge:"Bestseller" },
  { id:2,  gender:"Women",      name:"Printed Pret Kurta",          brand:"Sapphire",      price:3200,  category:"Pret / Ready to Wear", color:"Pink",            fabric:"Cotton",  occasion:"Casual / Everyday", image:"https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=500&q=80", product_url:"https://pk.sapphireonline.pk/collections/pret",                badge:"New" },
  { id:3,  gender:"Women",      name:"Formal Chiffon Suit",         brand:"Gul Ahmed",     price:7500,  category:"Formal",               color:"Navy",            fabric:"Chiffon", occasion:"Wedding",           image:"https://images.unsplash.com/photo-1619086303291-0ef7699e4b31?w=500&q=80", product_url:"https://www.gulahmedshop.com/collections/formal",              badge:null },
  { id:4,  gender:"Women",      name:"Casual Linen Co-ord",         brand:"Limelight",     price:2800,  category:"Co-ords",              color:"Pastel",          fabric:"Linen",   occasion:"Casual / Everyday", image:"https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=500&q=80", product_url:"https://www.limelightpk.com/collections/pret-wear",            badge:"Sale" },
  { id:5,  gender:"Women",      name:"Luxury Eid Collection",       brand:"Alkaram Studio",price:9200,  category:"Festive / Eid",        color:"Red",             fabric:"Silk",    occasion:"Eid / Festive",     image:"https://images.unsplash.com/photo-1604671801908-6f0c6a092c05?w=500&q=80", product_url:"https://www.alkaramstudio.com/collections/festive",            badge:"Exclusive" },
  { id:6,  gender:"Women",      name:"Black Embroidered Kurta",     brand:"Khaadi",        price:5500,  category:"Kurta",                color:"Black",           fabric:"Cotton",  occasion:"Party",             image:"https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=500&q=80", product_url:"https://www.khaadi.com/pk/women/",                             badge:null },
  { id:7,  gender:"Women",      name:"Office Wear Lawn Set",        brand:"Sapphire",      price:4100,  category:"Lawn",                 color:"Multi / Printed", fabric:"Lawn",    occasion:"Office / Work",     image:"https://images.unsplash.com/photo-1582142407894-ec85a1260cce?w=500&q=80", product_url:"https://pk.sapphireonline.pk/collections/lawn",                badge:"New" },
  { id:8,  gender:"Women",      name:"Karandi Winter Suit",         brand:"Gul Ahmed",     price:6800,  category:"Winter Collection",    color:"Navy",            fabric:"Karandi", occasion:"Winter",            image:"https://images.unsplash.com/photo-1623091411395-09e79fdbfcf6?w=500&q=80", product_url:"https://www.gulahmedshop.com/collections/winter",              badge:null },
  { id:9,  gender:"Women",      name:"Wedding Silk Gharara",        brand:"Limelight",     price:12000, category:"Bridal",               color:"Red",             fabric:"Silk",    occasion:"Wedding",           image:"https://images.unsplash.com/photo-1614886137799-1629b5a17c4c?w=500&q=80", product_url:"https://www.limelightpk.com/collections/formal-wear",          badge:"Premium" },
  { id:10, gender:"Women",      name:"Pastel Summer Pret",          brand:"Alkaram Studio",price:2500,  category:"Pret / Ready to Wear", color:"Pastel",          fabric:"Cotton",  occasion:"Casual / Everyday", image:"https://images.unsplash.com/photo-1571513722275-4b41940f54b8?w=500&q=80", product_url:"https://www.alkaramstudio.com/collections/summer",             badge:"Sale" },
  { id:11, gender:"Women",      name:"Luxury Bridal Chiffon",       brand:"Khaadi",        price:18900, category:"Bridal",               color:"Pink",            fabric:"Chiffon", occasion:"Bridal",            image:"https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=500&q=80", product_url:"https://www.khaadi.com/pk/women/",                             badge:"Exclusive" },
  { id:12, gender:"Women",      name:"White Eid Luxury 3-Pc",       brand:"Sapphire",      price:11500, category:"Festive / Eid",        color:"White",           fabric:"Chiffon", occasion:"Eid / Festive",     image:"https://images.unsplash.com/photo-1606503825008-909a67e63c3d?w=500&q=80", product_url:"https://pk.sapphireonline.pk/collections/eid",                 badge:"Trending" },
  // ── MEN ──
  { id:13, gender:"Men",        name:"Classic Shalwar Kameez",      brand:"Khaadi",        price:3800,  category:"Shalwar Kameez Men",   color:"White",           fabric:"Cotton",  occasion:"Casual / Everyday", image:"https://images.unsplash.com/photo-1594938298603-c8148c4b4e64?w=500&q=80", product_url:"https://www.khaadi.com/pk/men/",                               badge:null },
  { id:14, gender:"Men",        name:"Embroidered Waistcoat",       brand:"Gul Ahmed",     price:4200,  category:"Waistcoat",            color:"Navy",            fabric:"Jacquard",occasion:"Formal Event",      image:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&q=80", product_url:"https://www.gulahmedshop.com/collections/men",                 badge:"New" },
  { id:15, gender:"Men",        name:"Men's Lawn Kurta",            brand:"Sapphire",      price:2900,  category:"Men's Kurta",          color:"Beige",           fabric:"Lawn",    occasion:"Casual / Everyday", image:"https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=500&q=80", product_url:"https://pk.sapphireonline.pk/collections/men",                 badge:null },
  { id:16, gender:"Men",        name:"Karandi Wedding Sherwani",    brand:"Alkaram Studio",price:8500,  category:"Sherwani",             color:"Maroon",          fabric:"Karandi", occasion:"Wedding",           image:"https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&q=80", product_url:"https://www.alkaramstudio.com/collections/men",                badge:"Premium" },
  { id:17, gender:"Men",        name:"Casual Printed Kurta",        brand:"Limelight",     price:2400,  category:"Men's Casual",         color:"Multi / Printed", fabric:"Cotton",  occasion:"Casual / Everyday", image:"https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=500&q=80", product_url:"https://www.limelightpk.com/collections/men",                  badge:"Sale" },
  { id:18, gender:"Men",        name:"Eid Festive Kurta Set",       brand:"Khaadi",        price:5200,  category:"Men's Kurta",          color:"Beige",           fabric:"Lawn",    occasion:"Eid / Festive",     image:"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&q=80", product_url:"https://www.khaadi.com/pk/men/",                               badge:"Festive" },
  // ── KIDS ──
  { id:19, gender:"Kids",       name:"Girls Lawn Frock",            brand:"Khaadi",        price:1800,  category:"Girls Wear",           color:"Pink",            fabric:"Lawn",    occasion:"Casual / Everyday", image:"https://images.unsplash.com/photo-1518831959646-742c3a14ebf6?w=500&q=80", product_url:"https://www.khaadi.com/pk/kids/",                              badge:"New" },
  { id:20, gender:"Kids",       name:"Boys Eid Kurta Set",          brand:"Gul Ahmed",     price:2200,  category:"Boys Wear",            color:"White",           fabric:"Cotton",  occasion:"Eid / Festive",     image:"https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?w=500&q=80", product_url:"https://www.gulahmedshop.com/collections/kids",                badge:"Festive" },
  { id:21, gender:"Kids",       name:"Girls Party Dress",           brand:"Sapphire",      price:2600,  category:"Kids Formal",          color:"Red",             fabric:"Chiffon", occasion:"Party",             image:"https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=500&q=80", product_url:"https://pk.sapphireonline.pk/collections/kids",                badge:null },
  { id:22, gender:"Kids",       name:"Kids Unstitched Lawn",        brand:"Alkaram Studio",price:1400,  category:"Kids Lawn",            color:"Pastel",          fabric:"Lawn",    occasion:"Casual / Everyday", image:"https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=500&q=80", product_url:"https://www.alkaramstudio.com/collections/kids",               badge:"Sale" },
  { id:23, gender:"Kids",       name:"Boys Casual Kurta",           brand:"Limelight",     price:1600,  category:"Boys Wear",            color:"Navy",            fabric:"Cotton",  occasion:"Casual / Everyday", image:"https://images.unsplash.com/photo-1560807707-8cc77767d783?w=500&q=80", product_url:"https://www.limelightpk.com/collections/kids",                 badge:null },
  // ── ACCESSORIES ──
  { id:24, gender:"Accessories",name:"Gold Jhumka Earrings",        brand:"Khaadi",        price:1200,  category:"Jewelry",              color:"Gold",            fabric:"Metal",   occasion:"Eid / Festive",     image:"https://images.unsplash.com/photo-1588444837495-c6cfeb53f32d?w=500&q=80", product_url:"https://www.khaadi.com/pk/accessories/",                       badge:"New" },
  { id:25, gender:"Accessories",name:"Embroidered Silk Dupatta",    brand:"Gul Ahmed",     price:1800,  category:"Dupattas",             color:"Multi / Printed", fabric:"Silk",    occasion:"Formal Event",      image:"https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=500&q=80", product_url:"https://www.gulahmedshop.com/collections/accessories",         badge:null },
  { id:26, gender:"Accessories",name:"Oxidised Choker Set",         brand:"Sapphire",      price:950,   category:"Jewelry",              color:"Silver",          fabric:"Metal",   occasion:"Casual / Everyday", image:"https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500&q=80", product_url:"https://pk.sapphireonline.pk/collections/accessories",         badge:"Sale" },
  { id:27, gender:"Accessories",name:"Bridal Kundan Necklace Set",  brand:"Limelight",     price:4500,  category:"Jewelry",              color:"Gold",            fabric:"Metal",   occasion:"Wedding",           image:"https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=500&q=80", product_url:"https://www.limelightpk.com/collections/accessories",          badge:"Premium" },
  { id:28, gender:"Accessories",name:"Floral Printed Handbag",      brand:"Alkaram Studio",price:2200,  category:"Handbags",             color:"Beige",           fabric:"Fabric",  occasion:"Casual / Everyday", image:"https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500&q=80", product_url:"https://www.alkaramstudio.com/collections/accessories",        badge:null },
  { id:29, gender:"Accessories",name:"Pearl Drop Earrings",         brand:"Khaadi",        price:780,   category:"Jewelry",              color:"White",           fabric:"Metal",   occasion:"Office / Work",     image:"https://images.unsplash.com/photo-1589128777073-263566ae5e4d?w=500&q=80", product_url:"https://www.khaadi.com/pk/accessories/",                       badge:null },
  { id:30, gender:"Accessories",name:"Embroidered Clutch",          brand:"Sapphire",      price:1650,  category:"Clutches",             color:"Maroon",          fabric:"Fabric",  occasion:"Wedding",           image:"https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=500&q=80", product_url:"https://pk.sapphireonline.pk/collections/accessories",         badge:"Trending" },
];

// ─── CSV PARSER ────────────────────────────────────────────────────────────────
// Build a reverse lookup: category → gender (authoritative source of truth)
const CATEGORY_TO_GENDER = {};
for (const [g, cats] of Object.entries(GENDER_MAP)) {
  for (const cat of cats) { CATEGORY_TO_GENDER[cat] = g; }
}

function inferGender(category) {
  return CATEGORY_TO_GENDER[category] || "Women";
}

function validateGenderCategory(gender, category) {
  // If the category maps to a known gender, ALWAYS trust the category
  // over the gender field — this fixes importer misclassifications.
  const correctGender = CATEGORY_TO_GENDER[category];
  if (correctGender) return correctGender;
  // Category is unknown; trust gender if it's valid, else default
  if (ALL_GENDERS.includes(gender)) return gender;
  return "Women";
}

function parseCSV(csvText) {
  const lines   = csvText.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
  return lines.slice(1).map((line, i) => {
    const values = line.match(/(".*?"|[^,]+)(?=,|$)/g) || [];
    const obj    = {};
    headers.forEach((h, idx) => { obj[h] = (values[idx] || "").replace(/"/g, "").trim(); });
    const cat    = obj.category || "";
    const rawGender = obj.gender || inferGender(cat);
    return {
      id: i + 1,
      gender:      validateGenderCategory(rawGender, cat),
      name:        obj.name        || "",
      brand:       obj.brand       || "",
      price:       parseInt(obj.price) || 0,
      category:    cat,
      color:       obj.color       || "",
      fabric:      obj.fabric      || "",
      occasion:    obj.occasion    || "",
      image:       obj.image_url   || "",
      product_url: obj.product_url || "#",
      badge:       obj.badge       || null,
    };
  }).filter(p => p.name);
}

// ─── SMART SIMILAR — STRICT GENDER + CATEGORY ─────────────────────────────────
// Jewelry only suggests Jewelry/Accessories. Men never show Women items. Etc.
function getSimilar(product, allProducts) {
  const isAccessories = product.gender === "Accessories";

  return allProducts
    .filter(p => {
      if (p.id === product.id)     return false;
      if (p.gender !== product.gender) return false;          // strict gender wall
      // For Accessories: prefer same category (jewelry stays with jewelry)
      if (isAccessories && p.category !== product.category) return false;
      return true;
    })
    .map(p => {
      let score = 0;
      if (p.category === product.category)                          score += 4;
      if (p.occasion === product.occasion)                          score += 2;
      if (p.fabric   === product.fabric)                            score += 1;
      if (p.brand    === product.brand)                             score += 1;
      if (Math.abs(p.price - product.price) < 2000)                score += 1;
      return { ...p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

// ─── LINK HEALTH CHECK ─────────────────────────────────────────────────────────
// Uses no-cors HEAD request. Returns "ok" | "warn" | "error" | "checking"
const _linkCache = {};
async function checkLinkHealth(url) {
  if (_linkCache[url]) return _linkCache[url];
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    await fetch(url, { method: "HEAD", mode: "no-cors", cache: "no-cache", signal: ctrl.signal });
    clearTimeout(timer);
    _linkCache[url] = "ok";
  } catch (e) {
    _linkCache[url] = e.name === "AbortError" ? "warn" : "error";
  }
  return _linkCache[url];
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { overflow-x: hidden; }
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: #f0ebe4; }
::-webkit-scrollbar-thumb { background: #c9a96e; border-radius: 2px; }

/* ── SIDEBAR ── */
.sb { position:fixed; top:0; left:0; height:100vh; width:272px; background:#fff; border-right:1px solid #ede8e0; z-index:300; transform:translateX(-100%); transition:transform .34s cubic-bezier(.4,0,.2,1); box-shadow:6px 0 40px rgba(0,0,0,0.09); overflow-y:auto; display:flex; flex-direction:column; }
.sb.open { transform:translateX(0); }
.sb-overlay { position:fixed; inset:0; background:rgba(20,14,8,.35); z-index:299; opacity:0; pointer-events:none; transition:opacity .28s; backdrop-filter:blur(2px); }
.sb-overlay.open { opacity:1; pointer-events:all; }
.sb-gender-btn { width:100%; padding:13px 20px; background:transparent; border:none; border-left:3px solid transparent; text-align:left; cursor:pointer; display:flex; align-items:center; gap:11px; transition:all .2s; font-family:'DM Sans',sans-serif; }
.sb-gender-btn:hover { background:#fdf8f3; }
.sb-gender-btn.active { background:#fdf7ef; }
.sb-cat-btn { width:100%; padding:8px 20px 8px 48px; background:transparent; border:none; border-left:2px solid transparent; text-align:left; cursor:pointer; font-size:.74rem; color:#999; transition:all .15s; font-family:'DM Sans',sans-serif; letter-spacing:.04em; }
.sb-cat-btn:hover { color:#777; background:#fafaf8; }
.sb-cat-btn.active { color:#c9a96e; border-left-color:#c9a96e; background:#fff8ef; font-weight:500; }

/* ── NAV ── */
.nav { height:60px; border-bottom:1px solid #e8e0d8; display:flex; align-items:center; padding:0 24px; gap:0; position:sticky; top:0; z-index:200; background:rgba(253,252,251,.97); backdrop-filter:blur(14px); justify-content:space-between; }
.hamburger { background:none; border:none; cursor:pointer; padding:8px; display:flex; flex-direction:column; gap:5px; }
.hamburger span { display:block; width:22px; height:1.5px; background:#2a2420; border-radius:2px; transition:all .22s; }
.wordmark { font-family:'Cormorant Garamond',serif; font-size:1.45rem; font-weight:300; letter-spacing:.18em; cursor:pointer; color:#2a2420; user-select:none; }
.gender-tab { padding:9px 18px; border:1px solid #e0d8d0; background:#fff; border-radius:3px; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:.72rem; letter-spacing:.1em; text-transform:uppercase; color:#888; transition:all .2s; }
.gender-tab:hover { border-color:#c9a96e; color:#9a6a30; background:#fdf7ef; }
.gender-tab.active { background:#2a2420; border-color:#2a2420; color:#fff; }

/* ── CARDS ── */
.card { background:#fff; border:1px solid #e8e0d8; border-radius:10px; overflow:hidden; cursor:pointer; position:relative; box-shadow:0 2px 10px rgba(0,0,0,.04); transition:transform .28s ease,box-shadow .28s ease,border-color .2s; }
.card:hover { border-color:#c9a96e; transform:translateY(-5px); box-shadow:0 18px 44px rgba(180,140,90,.14); }
.card-img { width:100%; height:280px; object-fit:cover; display:block; background:#f5f0eb; transition:transform .48s ease; }
.card:hover .card-img { transform:scale(1.04); }
.slider-card { background:#fff; border:1px solid #e8e0d8; border-radius:8px; overflow:hidden; cursor:pointer; flex-shrink:0; width:216px; box-shadow:0 2px 8px rgba(0,0,0,.04); transition:transform .26s ease,box-shadow .26s,border-color .2s; scroll-snap-align:start; }
.slider-card:hover { border-color:#c9a96e; transform:translateY(-4px); box-shadow:0 14px 36px rgba(180,140,90,.12); }
.slider-card-img { width:100%; height:196px; object-fit:cover; display:block; background:#f5f0eb; transition:transform .4s; }
.slider-card:hover .slider-card-img { transform:scale(1.04); }
.similar-card { background:#fff; border:1px solid #e8e0d8; border-radius:6px; overflow:hidden; cursor:pointer; transition:all .22s; }
.similar-card:hover { border-color:#c9a96e; transform:translateY(-3px); box-shadow:0 8px 24px rgba(180,140,90,.1); }
.similar-card-img { width:100%; height:148px; object-fit:cover; display:block; background:#f5f0eb; }

/* ── BADGES & BUTTONS ── */
.badge-pill { position:absolute; top:10px; left:10px; font-family:'DM Sans',sans-serif; font-size:.58rem; letter-spacing:.14em; text-transform:uppercase; padding:3px 9px; border-radius:20px; font-weight:600; color:#fff; z-index:2; }
.wish-btn { position:absolute; top:10px; right:10px; background:rgba(255,255,255,.94); border:1px solid #e8e0d8; border-radius:50%; width:34px; height:34px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .2s; backdrop-filter:blur(4px); z-index:2; }
.wish-btn:hover { border-color:#c9a96e; }
.filter-btn { background:#fff; border:1px solid #e0d8d0; color:#777; padding:7px 14px; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:.72rem; letter-spacing:.1em; text-transform:uppercase; border-radius:3px; transition:all .2s; white-space:nowrap; }
.filter-btn:hover,.filter-btn.active { border-color:#c9a96e; color:#9a6a30; background:#fdf7ef; }
.cta-btn { background:#2a2420; color:#fff; border:none; padding:14px 24px; font-family:'DM Sans',sans-serif; font-size:.78rem; letter-spacing:.14em; text-transform:uppercase; font-weight:500; cursor:pointer; border-radius:4px; transition:all .22s; width:100%; display:flex; align-items:center; justify-content:center; gap:8px; }
.cta-btn:hover { background:#c9a96e; }
.cta-btn.warn { background:#9a6a30; }
.cta-btn.err  { background:#b03030; }
.tag { display:inline-block; background:#f5f0eb; border:1px solid #e8e2d8; padding:3px 10px; border-radius:20px; font-size:.62rem; letter-spacing:.07em; text-transform:uppercase; color:#999; }
.quick-tag { background:#f5f0eb; border:1px solid #e0d8d0; padding:5px 14px; border-radius:20px; font-family:'DM Sans',sans-serif; font-size:.68rem; letter-spacing:.08em; text-transform:uppercase; color:#999; cursor:pointer; transition:all .2s; }
.quick-tag:hover { background:#fdf7ef; border-color:#c9a96e; color:#9a6a30; }
select { appearance:none; -webkit-appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23aaa'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 10px center; padding-right:28px !important; }
.search-box { background:transparent; border:none; outline:none; width:100%; font-family:'DM Sans',sans-serif; font-size:.95rem; color:#2a2420; }
.search-box::placeholder { color:#c8c0b8; }
.filter-panel { background:#fff; border:1px solid #e8e0d8; border-radius:8px; overflow:hidden; transition:max-height .4s ease,padding .3s; box-shadow:0 4px 18px rgba(0,0,0,.04); }

/* ── SLIDERS ── */
.slider-track { display:flex; gap:16px; overflow-x:auto; padding-bottom:6px; scroll-snap-type:x mandatory; scrollbar-width:none; }
.slider-track::-webkit-scrollbar { display:none; }

/* ── MODAL ── */
.modal-overlay { position:fixed; inset:0; background:rgba(20,14,8,.52); backdrop-filter:blur(7px); z-index:1000; display:flex; align-items:flex-start; justify-content:center; padding:28px 16px; overflow-y:auto; animation:mFadeIn .2s ease; }
@keyframes mFadeIn { from{opacity:0} to{opacity:1} }
.modal { background:linear-gradient(158deg,#fdfcfb 0%,#f8f3ed 100%); border-radius:14px; width:100%; max-width:900px; overflow:hidden; animation:mSlide .3s ease; box-shadow:0 48px 120px rgba(0,0,0,.22); }
@keyframes mSlide { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
.modal-close { position:absolute; top:14px; right:14px; background:rgba(255,255,255,.92); border:1px solid #e8e0d8; border-radius:50%; width:38px; height:38px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:1rem; color:#888; transition:all .2s; backdrop-filter:blur(4px); z-index:10; }
.modal-close:hover { border-color:#c9a96e; color:#9a6a30; }

/* ── MISC ── */
.animate-in { opacity:0; transform:translateY(12px); animation:aIn .42s ease forwards; }
@keyframes aIn { to{opacity:1;transform:translateY(0)} }
.section-rule { height:1px; background:linear-gradient(90deg,transparent,#c9a96e 30%,#c9a96e 70%,transparent); }
.breadcrumb span { font-family:'DM Sans',sans-serif; font-size:.7rem; letter-spacing:.12em; text-transform:uppercase; color:#bbb; }
.breadcrumb span.active { color:#2a2420; }
.breadcrumb span.link { color:#c9a96e; cursor:pointer; }
.breadcrumb span.link:hover { text-decoration:underline; }

/* ── DISCLAIMER BOX ── */
.disclaimer { border-radius:8px; padding:11px 14px; margin-bottom:16px; display:flex; gap:11px; align-items:flex-start; }
.disclaimer.info  { background:#fffbf0; border:1px solid #f0e0b0; }
.disclaimer.warn  { background:#fff8f0; border:1px solid #f0cca0; }
.disclaimer.error { background:#fff4f4; border:1px solid #f0b0b0; }

@media(max-width:768px){
  .card-img { height:220px; }
  .slider-card { width:170px; }
  .slider-card-img { height:160px; }
  .gender-tabs-desktop { display:none !important; }
}
`;

// ─── ROOT COMPONENT ────────────────────────────────────────────────────────────
export default function App() {
  const [products,        setProducts]        = useState(FALLBACK_PRODUCTS);
  const [dataSource,      setDataSource]      = useState("fallback");
  const [loaded,          setLoaded]          = useState(false);
  const [sidebarOpen,     setSidebarOpen]     = useState(false);
  const [activeGender,    setActiveGender]    = useState(null);   // null = homepage
  const [activeCategory,  setActiveCategory]  = useState("All");
  const [query,           setQuery]           = useState("");
  const [priceRange,      setPriceRange]      = useState("All Prices");
  const [fabric,          setFabric]          = useState("All Fabrics");
  const [occasion,        setOccasion]        = useState("All Occasions");
  const [color,           setColor]           = useState("All");
  const [wishlist,        setWishlist]        = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [filtersOpen,     setFiltersOpen]     = useState(false);
  const [linkStatus,      setLinkStatus]      = useState("checking"); // checking|ok|warn|error
  const modalRef = useRef(null);

  // Load products from Google Sheet
  useEffect(() => {
    if (GOOGLE_SHEET_CSV_URL.includes("YOUR_SHEET_ID")) { setTimeout(() => setLoaded(true), 80); return; }
    fetch(GOOGLE_SHEET_CSV_URL)
      .then(r => r.text())
      .then(csv => { const p = parseCSV(csv); if (p.length) { setProducts(p); setDataSource("sheets"); } })
      .catch(() => {})
      .finally(() => setTimeout(() => setLoaded(true), 80));
  }, []);

  // Scroll-lock + link check when modal opens
  useEffect(() => {
    document.body.style.overflow = selectedProduct ? "hidden" : "";
    if (selectedProduct) {
      setLinkStatus("checking");
      modalRef.current?.scrollTo({ top: 0 });
      checkLinkHealth(selectedProduct.product_url).then(setLinkStatus);
    }
    return () => { document.body.style.overflow = ""; };
  }, [selectedProduct]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const priceOk = useCallback((price) => {
    if (priceRange === "All Prices")    return true;
    if (priceRange === "Under 3,000")   return price < 3000;
    if (priceRange === "3,000–6,000")   return price >= 3000  && price <= 6000;
    if (priceRange === "6,000–10,000")  return price > 6000   && price <= 10000;
    if (priceRange === "10,000–20,000") return price > 10000  && price <= 20000;
    if (priceRange === "20,000+")       return price > 20000;
    return true;
  }, [priceRange]);

  const filtered = products.filter(p => {
    const q = query.toLowerCase();
    const qMatch = !q || [p.name, p.brand, p.category, p.fabric, p.occasion].some(v => v.toLowerCase().includes(q));
    return qMatch
      && (activeGender   === null  || p.gender   === activeGender)
      && (activeCategory === "All" || p.category === activeCategory)
      && (color    === "All"          || p.color   === color)
      && (fabric   === "All Fabrics"  || p.fabric  === fabric)
      && (occasion === "All Occasions"|| p.occasion === occasion)
      && priceOk(p.price);
  });

  const similar = selectedProduct ? getSimilar(selectedProduct, products) : [];
  const activeFilterCount = [activeCategory !== "All", color !== "All", fabric !== "All Fabrics", occasion !== "All Occasions", priceRange !== "All Prices"].filter(Boolean).length;

  const toggleWish = (id, e) => { e?.stopPropagation(); setWishlist(w => w.includes(id) ? w.filter(x => x !== id) : [...w, id]); };
  const clearFilters = () => { setActiveCategory("All"); setColor("All"); setFabric("All Fabrics"); setOccasion("All Occasions"); setPriceRange("All Prices"); setQuery(""); };
  const goHome = () => { setActiveGender(null); setActiveCategory("All"); };
  const goGender = (g) => { setActiveGender(g); setActiveCategory("All"); setSidebarOpen(false); };

  // Homepage section data — one row per gender
  const homeSections = ALL_GENDERS.map(g => ({
    gender: g, items: products.filter(p => p.gender === g).slice(0, 10),
  })).filter(s => s.items.length > 0);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "linear-gradient(160deg,#fdfcfb 0%,#f5f0eb 40%,#ede8e0 100%)", minHeight: "100vh", color: "#2a2420" }}>
      <style>{CSS}</style>

      {/* ── SIDEBAR OVERLAY ── */}
      <div className={`sb-overlay ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />

      {/* ── SIDEBAR ── */}
      <aside className={`sb ${sidebarOpen ? "open" : ""}`}>
        {/* Header */}
        <div style={{ padding: "20px 20px 14px", borderBottom: "1px solid #f0ebe4", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div className="wordmark" style={{ fontSize: "1.25rem" }}>Poshak<span style={{ color: "#c9a96e" }}>.</span>pk</div>
              <div style={{ fontSize: ".6rem", letterSpacing: ".15em", textTransform: "uppercase", color: "#ccc", marginTop: "3px" }}>Fashion Discovery</div>
            </div>
            <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "1px solid #e8e0d8", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", color: "#aaa", fontSize: ".9rem" }}>✕</button>
          </div>
        </div>

        {/* Homepage link */}
        <button className="sb-gender-btn" onClick={() => { goHome(); setSidebarOpen(false); }}
          style={{ borderLeft: activeGender === null ? "3px solid #c9a96e" : undefined, background: activeGender === null ? "#fdf7ef" : undefined }}>
          <span>🏠</span>
          <span style={{ fontSize: ".78rem", letterSpacing: ".1em", textTransform: "uppercase", color: activeGender === null ? "#c9a96e" : "#555", fontWeight: activeGender === null ? "500" : "400" }}>Home</span>
        </button>

        {/* Gender sections with sub-categories */}
        {ALL_GENDERS.map(g => (
          <div key={g}>
            <button className={`sb-gender-btn ${activeGender === g ? "active" : ""}`}
              onClick={() => goGender(g)}
              style={{ borderLeftColor: activeGender === g ? GENDER_ACCENT[g] : "transparent" }}>
              <span style={{ fontSize: "1.1rem" }}>{GENDER_ICONS[g]}</span>
              <span style={{ fontSize: ".78rem", letterSpacing: ".1em", textTransform: "uppercase", color: activeGender === g ? GENDER_ACCENT[g] : "#555", fontWeight: activeGender === g ? "500" : "400" }}>{g}</span>
              <span style={{ marginLeft: "auto", fontSize: ".65rem", color: "#ccc" }}>{products.filter(p => p.gender === g).length}</span>
            </button>
            {/* Sub-categories — expanded when gender is active */}
            {activeGender === g && (
              <div style={{ background: "#fafaf8", borderBottom: "1px solid #f0ebe4" }}>
                <button className={`sb-cat-btn ${activeCategory === "All" ? "active" : ""}`}
                  onClick={() => { setActiveCategory("All"); setSidebarOpen(false); }}>
                  All {g}
                </button>
                {GENDER_MAP[g].map(cat => (
                  <button key={cat} className={`sb-cat-btn ${activeCategory === cat ? "active" : ""}`}
                    onClick={() => { setActiveCategory(cat); setSidebarOpen(false); }}>
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Footer */}
        <div style={{ marginTop: "auto", padding: "16px 20px", borderTop: "1px solid #f0ebe4", fontSize: ".62rem", letterSpacing: ".1em", textTransform: "uppercase", color: "#ccc", textAlign: "center" }}>
          {products.length} Products · {dataSource === "sheets" ? <span style={{ color: "#3d8a60" }}>● Live</span> : "Sample Data"}
        </div>
      </aside>

      {/* ── NAV BAR ── */}
      <nav className="nav">
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <span /><span /><span />
          </button>
          <div className="wordmark" onClick={goHome}>Poshak<span style={{ color: "#c9a96e" }}>.</span>pk</div>
        </div>

        {/* Desktop gender tabs */}
        <div className="gender-tabs-desktop" style={{ display: "flex", gap: "4px" }}>
          {ALL_GENDERS.map(g => (
            <button key={g} className={`gender-tab ${activeGender === g ? "active" : ""}`}
              onClick={() => activeGender === g ? goHome() : goGender(g)}>
              {GENDER_ICONS[g]} {g}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          {dataSource === "sheets" && <span style={{ fontSize: ".66rem", color: "#3d8a60", letterSpacing: ".1em" }}>● Live</span>}
          {wishlist.length > 0 && (
            <span style={{ fontSize: ".72rem", color: "#c9a96e", letterSpacing: ".06em" }}>♥ {wishlist.length}</span>
          )}
        </div>
      </nav>

      {/* ════════════════════════════════════════════
          HOMEPAGE VIEW  (activeGender === null)
          ════════════════════════════════════════════ */}
      {activeGender === null && (
        <>
          {/* HERO */}
          <section style={{ textAlign: "center", padding: "68px 24px 52px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 75% 55% at 50% 0%,rgba(201,169,110,.09) 0%,transparent 72%)", pointerEvents: "none" }} />
            <p style={{ fontSize: ".65rem", letterSpacing: ".38em", textTransform: "uppercase", color: "#c9a96e", marginBottom: "14px" }}>Pakistan's Fashion Discovery Engine</p>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(2rem,5.5vw,4rem)", fontWeight: 300, lineHeight: 1.1, marginBottom: "4px" }}>Find Every Style,</h1>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(2rem,5.5vw,4rem)", fontWeight: 300, fontStyle: "italic", lineHeight: 1.1, marginBottom: "28px", color: "#c9a96e" }}>Across Every Brand</h1>
            <div style={{ width: "48px", height: "1px", background: "linear-gradient(90deg,transparent,#c9a96e,transparent)", margin: "0 auto 32px" }} />
            {/* Search */}
            <div style={{ maxWidth: "600px", margin: "0 auto 18px" }}>
              <div style={{ display: "flex", alignItems: "center", background: "#fff", border: "1px solid #e0d8d0", borderRadius: "8px", padding: "13px 20px", gap: "12px", boxShadow: "0 4px 22px rgba(0,0,0,.06)" }}>
                <span style={{ color: "#ccc", fontSize: "1.1rem" }}>⊹</span>
                <input className="search-box" placeholder="Search lawn suit, bridal, men's kurta, jewelry…" value={query} onChange={e => setQuery(e.target.value)} />
                {query && <button onClick={() => setQuery("")} style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer" }}>✕</button>}
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
              {["Lawn 3-Piece", "Bridal", "Men's Kurta", "Kids Eid", "Jewelry", "Winter Suit", "Co-ords", "Handbags"].map(t => (
                <button key={t} className="quick-tag" onClick={() => setQuery(t)}>{t}</button>
              ))}
            </div>
          </section>

          {/* SEARCH RESULTS (when query active) */}
          {query ? (
            <div style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px 60px" }}>
              <p style={{ fontSize: ".7rem", letterSpacing: ".12em", textTransform: "uppercase", color: "#aaa", marginBottom: "20px" }}>{filtered.length} results for "{query}"</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: "20px" }}>
                {filtered.map((p, i) => <ProductCard key={p.id} p={p} i={i} wishlist={wishlist} toggleWish={toggleWish} onClick={() => setSelectedProduct(p)} />)}
              </div>
            </div>
          ) : (
            /* SECTION ROWS */
            <div style={{ padding: "0 24px 60px" }}>
              {homeSections.map(({ gender, items }) => (
                <div key={gender} style={{ maxWidth: "1240px", margin: "0 auto 56px" }}>
                  {/* Section header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <div style={{ width: "3px", height: "30px", background: GENDER_ACCENT[gender], borderRadius: "2px", flexShrink: 0 }} />
                      <div>
                        <p style={{ fontSize: ".6rem", letterSpacing: ".22em", textTransform: "uppercase", color: GENDER_ACCENT[gender], marginBottom: "2px" }}>{GENDER_ICONS[gender]} {gender}</p>
                        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.65rem", fontWeight: 400, color: "#2a2420" }}>
                          {gender === "Women" ? "Women's Collection" : gender === "Men" ? "Men's Collection" : gender === "Kids" ? "Kids' Corner" : "Accessories & Jewelry"}
                        </h2>
                      </div>
                    </div>
                    <button className="filter-btn" onClick={() => goGender(gender)} style={{ flexShrink: 0 }}>
                      View All →
                    </button>
                  </div>
                  {/* Horizontal slider */}
                  <div className="slider-track">
                    {items.map(p => (
                      <div key={p.id} className="slider-card" onClick={() => setSelectedProduct(p)}>
                        <div style={{ position: "relative", overflow: "hidden" }}>
                          <img className="slider-card-img" src={p.image} alt={p.name} />
                          {p.badge && <div className="badge-pill" style={{ background: BADGE_COLORS[p.badge] || "#888" }}>{p.badge}</div>}
                          <button className="wish-btn" onClick={e => toggleWish(p.id, e)}>
                            <span style={{ color: wishlist.includes(p.id) ? "#c9a96e" : "#ccc", fontSize: ".9rem" }}>{wishlist.includes(p.id) ? "♥" : "♡"}</span>
                          </button>
                        </div>
                        <div style={{ padding: "11px 12px 13px" }}>
                          <div style={{ fontSize: ".58rem", letterSpacing: ".14em", textTransform: "uppercase", color: "#c9a96e", marginBottom: "3px" }}>{p.brand}</div>
                          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: ".95rem", color: "#2a2420", lineHeight: 1.3, marginBottom: "5px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.name}</div>
                          <div style={{ fontSize: ".78rem", color: "#888" }}>Rs. {p.price.toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════
          GENDER / CATEGORY VIEW  (activeGender set)
          ════════════════════════════════════════════ */}
      {activeGender !== null && (
        <div style={{ maxWidth: "1240px", margin: "0 auto", padding: "28px 24px 60px" }}>

          {/* Breadcrumb */}
          <div className="breadcrumb" style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "22px" }}>
            <span className="link" onClick={goHome}>Home</span>
            <span>›</span>
            <span className={activeCategory === "All" ? "active" : "link"} onClick={() => setActiveCategory("All")}>{activeGender}</span>
            {activeCategory !== "All" && <><span>›</span><span className="active">{activeCategory}</span></>}
          </div>

          {/* Category pill tabs */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "22px" }}>
            <button className={`filter-btn ${activeCategory === "All" ? "active" : ""}`} onClick={() => setActiveCategory("All")}>All {activeGender}</button>
            {GENDER_MAP[activeGender].map(cat => (
              <button key={cat} className={`filter-btn ${activeCategory === cat ? "active" : ""}`} onClick={() => setActiveCategory(cat)}>{cat}</button>
            ))}
          </div>

          {/* Filters row */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
            <button className={`filter-btn ${filtersOpen ? "active" : ""}`} onClick={() => setFiltersOpen(f => !f)}>
              ⊞ Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
            </button>
            {activeFilterCount > 0 && (
              <button className="filter-btn" onClick={clearFilters} style={{ color: "#b03030", borderColor: "#f0c0c0" }}>Clear All</button>
            )}
            <span style={{ fontSize: ".7rem", color: "#bbb", letterSpacing: ".1em", marginLeft: "auto" }}>{filtered.length} items</span>
          </div>

          <div className="filter-panel" style={{ maxHeight: filtersOpen ? "400px" : "0", padding: filtersOpen ? "20px" : "0 20px", marginBottom: filtersOpen ? "20px" : "0" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(188px,1fr))", gap: "18px" }}>
              {[
                { label: "Color",       value: color,       setter: setColor,       options: STATIC_COLORS    },
                { label: "Price Range", value: priceRange,  setter: setPriceRange,  options: PRICE_RANGES     },
                { label: "Fabric",      value: fabric,      setter: setFabric,      options: STATIC_FABRICS   },
                { label: "Occasion",    value: occasion,    setter: setOccasion,    options: STATIC_OCCASIONS },
              ].map(({ label, value, setter, options }) => (
                <div key={label}>
                  <div style={{ fontSize: ".6rem", letterSpacing: ".2em", textTransform: "uppercase", color: "#aaa", marginBottom: "8px" }}>{label}</div>
                  <select value={value} onChange={e => setter(e.target.value)} className="filter-btn" style={{ width: "100%", background: "#fff", cursor: "pointer" }}>
                    {options.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Product grid */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "#ccc" }}>
              <div style={{ fontSize: "3rem", marginBottom: "16px" }}>◌</div>
              <p style={{ fontSize: ".85rem", letterSpacing: ".1em" }}>No products found</p>
              <button className="filter-btn" onClick={clearFilters} style={{ marginTop: "16px" }}>Clear Filters</button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(248px,1fr))", gap: "20px" }}>
              {filtered.map((p, i) => (
                <ProductCard key={p.id} p={p} i={i} wishlist={wishlist} toggleWish={toggleWish} onClick={() => setSelectedProduct(p)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid #e8e0d8", padding: "40px 24px", textAlign: "center", background: "rgba(255,255,255,.55)" }}>
        <div className="wordmark" style={{ color: "#c9a96e", fontSize: "1.35rem", marginBottom: "6px" }}>Poshak.pk</div>
        <p style={{ fontSize: ".62rem", letterSpacing: ".15em", color: "#bbb", textTransform: "uppercase" }}>Pakistan's Fashion Discovery Engine · MVP v0.1</p>
      </footer>

      {/* ════════════════════════════════════════════
          PRODUCT MODAL
          ════════════════════════════════════════════ */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setSelectedProduct(null); }}>
          <div className="modal">

            {/* Hero image */}
            <div style={{ position: "relative" }}>
              <img src={selectedProduct.image} alt={selectedProduct.name}
                style={{ width: "100%", height: "420px", objectFit: "cover", display: "block" }} />
              <button className="modal-close" onClick={() => setSelectedProduct(null)}>✕</button>
              {selectedProduct.badge && (
                <div className="badge-pill" style={{ background: BADGE_COLORS[selectedProduct.badge] || "#888" }}>
                  {selectedProduct.badge}
                </div>
              )}
              {/* Gender label */}
              <div style={{ position: "absolute", bottom: "12px", left: "12px", background: "rgba(42,36,32,.72)", backdropFilter: "blur(4px)", borderRadius: "4px", padding: "4px 10px" }}>
                <span style={{ fontSize: ".6rem", letterSpacing: ".14em", textTransform: "uppercase", color: GENDER_ACCENT[selectedProduct.gender] || "#c9a96e" }}>
                  {GENDER_ICONS[selectedProduct.gender]} {selectedProduct.gender}
                </span>
              </div>
            </div>

            <div style={{ padding: "28px 32px 32px" }}>
              {/* Product title row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
                <div style={{ flex: 1, minWidth: 0, paddingRight: "16px" }}>
                  <div style={{ fontSize: ".62rem", letterSpacing: ".2em", textTransform: "uppercase", color: "#c9a96e", marginBottom: "6px" }}>{selectedProduct.brand}</div>
                  <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.8rem", fontWeight: 400, color: "#2a2420", lineHeight: 1.2 }}>{selectedProduct.name}</h2>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.55rem", color: "#2a2420" }}>Rs. {selectedProduct.price.toLocaleString()}</div>
                  <button onClick={e => toggleWish(selectedProduct.id, e)}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem", marginTop: "5px", color: wishlist.includes(selectedProduct.id) ? "#c9a96e" : "#ccc", letterSpacing: ".04em", fontFamily: "'DM Sans',sans-serif" }}>
                    {wishlist.includes(selectedProduct.id) ? "♥ Saved" : "♡ Save"}
                  </button>
                </div>
              </div>

              {/* Details grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "12px", background: "#f8f4ef", borderRadius: "8px", padding: "16px", marginBottom: "20px" }}>
                {[["Category", selectedProduct.category], ["Fabric", selectedProduct.fabric], ["Occasion", selectedProduct.occasion], ["Color", selectedProduct.color]].map(([l, v]) => (
                  <div key={l}>
                    <div style={{ fontSize: ".58rem", letterSpacing: ".18em", textTransform: "uppercase", color: "#bbb", marginBottom: "3px" }}>{l}</div>
                    <div style={{ fontSize: ".85rem", color: "#2a2420", fontWeight: 500 }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* ── LINK DISCLAIMER ── */}
              <LinkDisclaimer status={linkStatus} brand={selectedProduct.brand} />

              {/* CTA */}
              <a href={selectedProduct.product_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block", marginBottom: "30px" }}>
                <button className={`cta-btn ${linkStatus === "error" ? "err" : linkStatus === "warn" ? "warn" : ""}`}>
                  {linkStatus === "checking" && <span style={{ fontSize: ".8rem", opacity: .7 }}>⏳</span>}
                  {linkStatus === "error"    && "⚠ Link may be unavailable — Try on Brand Site →"}
                  {linkStatus === "warn"     && `⚠ View on ${selectedProduct.brand} (may be slow) →`}
                  {(linkStatus === "ok" || linkStatus === "unknown") && `View & Buy on ${selectedProduct.brand} →`}
                  {linkStatus === "checking" && `View & Buy on ${selectedProduct.brand} →`}
                </button>
              </a>

              {/* ── SIMILAR PRODUCTS — STRICT GENDER + CATEGORY ── */}
              {similar.length > 0 && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
                    <div className="section-rule" style={{ flex: 1 }} />
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.05rem", color: "#aaa", fontStyle: "italic", whiteSpace: "nowrap" }}>
                      More {selectedProduct.gender === "Accessories" ? selectedProduct.category : `for ${selectedProduct.gender}`}
                    </span>
                    <div className="section-rule" style={{ flex: 1 }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(126px,1fr))", gap: "10px" }}>
                    {similar.map(sp => (
                      <div key={sp.id} className="similar-card" onClick={() => setSelectedProduct(sp)}>
                        <img className="similar-card-img" src={sp.image} alt={sp.name} />
                        <div style={{ padding: "8px" }}>
                          <div style={{ fontSize: ".56rem", letterSpacing: ".12em", textTransform: "uppercase", color: "#c9a96e", marginBottom: "2px" }}>{sp.brand}</div>
                          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: ".82rem", color: "#2a2420", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "3px" }}>{sp.name}</div>
                          <div style={{ fontSize: ".7rem", color: "#aaa" }}>Rs. {sp.price.toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PRODUCT CARD ─────────────────────────────────────────────────────────────
function ProductCard({ p, i, wishlist, toggleWish, onClick }) {
  return (
    <div className="card animate-in" style={{ animationDelay: `${Math.min(i, 12) * 0.055}s` }} onClick={onClick}>
      <div style={{ position: "relative", overflow: "hidden" }}>
        <img className="card-img" src={p.image} alt={p.name} />
        {p.badge && <div className="badge-pill" style={{ background: BADGE_COLORS[p.badge] || "#888" }}>{p.badge}</div>}
        <button className="wish-btn" onClick={e => toggleWish(p.id, e)}>
          <span style={{ color: wishlist.includes(p.id) ? "#c9a96e" : "#ccc", fontSize: ".9rem" }}>
            {wishlist.includes(p.id) ? "♥" : "♡"}
          </span>
        </button>
      </div>
      <div style={{ padding: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: "8px" }}>
            <div style={{ fontSize: ".6rem", letterSpacing: ".14em", textTransform: "uppercase", color: "#c9a96e", marginBottom: "4px" }}>{p.brand}</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1rem", color: "#2a2420", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.name}</div>
          </div>
          <div style={{ fontSize: ".88rem", fontWeight: 500, color: "#2a2420", whiteSpace: "nowrap" }}>Rs. {p.price.toLocaleString()}</div>
        </div>
        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
          <span className="tag">{p.category}</span>
          <span className="tag">{p.occasion}</span>
        </div>
      </div>
    </div>
  );
}

// ─── LINK DISCLAIMER COMPONENT ────────────────────────────────────────────────
function LinkDisclaimer({ status, brand }) {
  const config = {
    checking: { cls: "info",  icon: "ℹ️", title: "Checking link…",          body: `We're verifying ${brand}'s page. This links to an external website — stock and pricing may vary at any time.` },
    ok:       { cls: "info",  icon: "ℹ️", title: "External brand link",     body: `This takes you to ${brand}'s official site. Items shown here may sell out — availability is controlled by the brand.` },
    unknown:  { cls: "info",  icon: "ℹ️", title: "External brand link",     body: `This takes you to ${brand}'s official site. Items shown here may sell out — availability is controlled by the brand.` },
    warn:     { cls: "warn",  icon: "⚠️", title: "Link response slow",      body: `${brand}'s page is responding slowly. The item may still be available — try opening anyway. Stock is managed by the brand.` },
    error:    { cls: "error", icon: "🚫", title: "Link may be unavailable", body: `We couldn't confirm this page on ${brand}'s site. The item may be out of stock or the URL may have changed. Try searching on ${brand}'s website directly.` },
  };
  const c = config[status] || config.ok;
  return (
    <div className={`disclaimer ${c.cls}`}>
      <span style={{ fontSize: "1rem", flexShrink: 0, lineHeight: 1.4 }}>{c.icon}</span>
      <div>
        <div style={{ fontSize: ".72rem", fontWeight: 600, color: c.cls === "error" ? "#b03030" : c.cls === "warn" ? "#9a6a30" : "#9a7a50", marginBottom: "3px" }}>{c.title}</div>
        <div style={{ fontSize: ".7rem", color: "#999", lineHeight: 1.55 }}>{c.body}</div>
      </div>
    </div>
  );
}
