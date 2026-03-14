"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
//  POSHAK.PK  —  v4.0  Women's Edition
//  • Women's dresses only
//  • Live stock check when product opens
//  • World-class search (color, Urdu, typo tolerance, autocomplete)
// ═══════════════════════════════════════════════════════════════════════════════

// ── Replace YOUR_SHEET_ID with your Google Sheet published CSV ID ──
const GOOGLE_SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQjuWejNvV1eOM9H1abXWMB-wAJMN2reQNNY1jWWx6dap-x2OTwdMzK5uK3DO05Bq6g0appKglzUDl4/pub?gid=0&single=true&output=csv";

// ── Women's categories only ──
const CATEGORIES = [
  "All","Lawn","Kurta","Co-ords","Pret / Ready to Wear","Luxury Pret",
  "Unstitched","Shalwar Kameez","Formal","Bridal","Festive / Eid",
  "Winter Collection","Abaya",
];

const PRICE_RANGES     = ["All Prices","Under 3,000","3,000–6,000","6,000–10,000","10,000–20,000","20,000+"];
const STATIC_FABRICS   = ["All Fabrics","Lawn","Cotton","Chiffon","Silk","Organza","Velvet","Khaddar","Karandi","Linen","Cambric","Jacquard","Net","Raw Silk"];
const STATIC_OCCASIONS = ["All Occasions","Casual / Everyday","Office / Work","Formal Event","Wedding","Eid / Festive","Party","Bridal","Winter"];
const STATIC_COLORS    = ["All","Black","White","Navy","Red","Maroon","Pink","Peach","Mint","Teal","Mustard","Olive","Grey","Beige","Pastel","Multi / Printed"];
const BADGE_COLORS     = { Bestseller:"#b07d4a",New:"#3d8a60",Sale:"#b03030",Exclusive:"#6a4a8a",Premium:"#3a6a9a",Trending:"#9a6a30",Festive:"#8a5a2a" };

// ── Category quick tags shown in hero ──
const QUICK_TAGS = ["Lawn","Bridal","Unstitched","Co-ords","Festive / Eid","Formal","Kurta","Winter Collection"];

// ═══════════════════════════════════════════════════════════════════════════════
//  SEARCH ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

const COLOR_SYNONYMS = {
  "black":"Black","kala":"Black","kali":"Black","سیاہ":"Black",
  "jet black":"Black","charcoal":"Black","koyla":"Black","onyx":"Black",
  "white":"White","safed":"White","safaid":"White","سفید":"White","snow":"White",
  "off white":"Beige","cream":"Beige","ivory":"Beige","dhoodh":"White",
  "red":"Red","lal":"Red","surkh":"Red","سرخ":"Red","crimson":"Red","scarlet":"Red",
  "maroon":"Maroon","dark red":"Maroon","wine":"Maroon","burgundy":"Maroon","gehra lal":"Maroon",
  "pink":"Pink","gulabi":"Pink","گلابی":"Pink","hot pink":"Pink","rose":"Pink","blush":"Pink","baby pink":"Pink",
  "navy":"Navy","blue":"Navy","neela":"Navy","نیلا":"Navy","cobalt":"Navy","royal blue":"Navy","dark blue":"Navy","indigo":"Navy",
  "beige":"Beige","nude":"Beige","skin":"Beige","champagne":"Beige",
  "mint":"Mint","green":"Mint","hara":"Mint","ہرا":"Mint","sage":"Mint","emerald":"Mint",
  "olive":"Olive","khaki":"Olive","army green":"Olive",
  "teal":"Teal","turquoise":"Teal","ferozi":"Teal","فیروزی":"Teal","aqua":"Teal",
  "mustard":"Mustard","yellow":"Mustard","zard":"Mustard","زرد":"Mustard",
  "grey":"Grey","gray":"Grey","slate":"Grey","ash":"Grey",
  "peach":"Peach","coral":"Peach","salmon":"Peach","apricot":"Peach",
  "pastel":"Pastel","purple":"Pastel","violet":"Pastel","lilac":"Pastel","lavender":"Pastel",
  "multi":"Multi / Printed","printed":"Multi / Printed","floral":"Multi / Printed",
  "digital":"Multi / Printed","abstract":"Multi / Printed","rangeen":"Multi / Printed",
};

const FABRIC_SYNONYMS = {
  "lawn":"Lawn","laan":"Lawn","لان":"Lawn",
  "cotton":"Cotton","suti":"Cotton","سوتی":"Cotton",
  "chiffon":"Chiffon","shifon":"Chiffon",
  "silk":"Silk","resham":"Silk","ریشم":"Silk",
  "khaddar":"Khaddar","khaddi":"Khaddar",
  "karandi":"Karandi","crinkle":"Karandi",
  "velvet":"Velvet","makhmal":"Velvet",
  "linen":"Linen","organza":"Organza","net":"Net",
  "jacquard":"Jacquard","cambric":"Cambric","raw silk":"Raw Silk",
  "georgette":"Chiffon","crepe":"Chiffon",
};

const OCCASION_SYNONYMS = {
  "eid":"Eid / Festive","festive":"Eid / Festive","عید":"Eid / Festive",
  "wedding":"Wedding","shaadi":"Wedding","شادی":"Wedding","barat":"Wedding","walima":"Wedding","mehndi":"Wedding",
  "casual":"Casual / Everyday","rozana":"Casual / Everyday","روزانہ":"Casual / Everyday","everyday":"Casual / Everyday",
  "office":"Office / Work","work":"Office / Work","daftar":"Office / Work",
  "party":"Party","dawat":"Party","دعوت":"Party",
  "bridal":"Bridal","bride":"Bridal","dulhan":"Bridal","دلہن":"Bridal",
  "formal":"Formal Event","ceremony":"Formal Event",
  "winter":"Winter","sardi":"Winter","سردی":"Winter",
};

const URDU_MAP = {
  "kala":"black","kali":"black","سیاہ":"black",
  "safed":"white","سفید":"white",
  "lal":"red","surkh":"red","سرخ":"red",
  "neela":"blue","نیلا":"blue",
  "hara":"green","ہرا":"green",
  "gulabi":"pink","گلابی":"pink",
  "zard":"yellow","زرد":"yellow",
  "ferozi":"teal","فیروزی":"teal",
  "jora":"suit","جوڑا":"suit",
  "libas":"dress","لباس":"dress",
  "poshak":"dress","پوشاک":"dress",
  "shalwar":"shalwar","شلوار":"shalwar",
  "kameez":"kameez","قمیض":"kameez",
  "kurta":"kurta","کرتا":"kurta",
  "lawn":"lawn","لان":"lawn",
  "شادی":"wedding","عید":"eid","دلہن":"bridal",
  "دعوت":"party","روزانہ":"casual",
};

function levenshtein(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const m = a.length, n = b.length;
  const dp = [];
  for (let i = 0; i <= m; i++) { dp[i] = [i]; }
  for (let j = 0; j <= n; j++) { dp[0][j] = j; }
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function buildIndex(products) {
  return products.map(p => {
    // Normalize color to canonical form (case-insensitive lookup)
    const normalizedColor = (() => {
      const raw = (p.color || "").trim();
      // Direct match first
      const validColors = ["Black","White","Navy","Red","Maroon","Pink","Peach",
        "Mint","Teal","Mustard","Olive","Grey","Beige","Pastel","Multi / Printed"];
      if (validColors.includes(raw)) return raw;
      // Case-insensitive match
      const lower = raw.toLowerCase();
      const found = validColors.find(c => c.toLowerCase() === lower);
      if (found) return found;
      // Synonym lookup
      return COLOR_SYNONYMS[lower] || "Multi / Printed";
    })();

    const colorSyns    = Object.entries(COLOR_SYNONYMS).filter(([,v]) => v === normalizedColor).map(([k]) => k).join(" ");
    const fabricSyns   = Object.entries(FABRIC_SYNONYMS).filter(([,v]) => v === p.fabric).map(([k]) => k).join(" ");
    const occasionSyns = Object.entries(OCCASION_SYNONYMS).filter(([,v]) => v === p.occasion).map(([k]) => k).join(" ");

    return {
      ...p,
      color: normalizedColor, // always use normalized color
      _idx: [
        p.name, p.brand, p.category,
        normalizedColor,        // canonical: "Black"
        normalizedColor.toLowerCase(), // lowercase: "black"
        p.fabric, p.occasion, p.badge || "",
        colorSyns,   // all synonyms: "kala kali koyla charcoal jet black"
        fabricSyns,
        occasionSyns,
      ].join(" ").toLowerCase(),
    };
  });
}

function normalizeQuery(raw) {
  let q = raw.toLowerCase().trim();
  for (const [u, e] of Object.entries(URDU_MAP))
    q = q.replace(new RegExp(u.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi"), e);
  const tokens = q.split(/\s+/).filter(Boolean);
  const colors=[], fabrics=[], occasions=[], keywords=[];
  for (let i = 0; i < tokens.length-1; i++) {
    const bi = `${tokens[i]} ${tokens[i+1]}`;
    if (COLOR_SYNONYMS[bi])    { colors.push(COLOR_SYNONYMS[bi]);    tokens[i]=""; tokens[i+1]=""; continue; }
    if (FABRIC_SYNONYMS[bi])   { fabrics.push(FABRIC_SYNONYMS[bi]);  tokens[i]=""; tokens[i+1]=""; continue; }
    if (OCCASION_SYNONYMS[bi]) { occasions.push(OCCASION_SYNONYMS[bi]); tokens[i]=""; tokens[i+1]=""; continue; }
  }
  for (const t of tokens) {
    if (!t) continue;
    if (COLOR_SYNONYMS[t])    colors.push(COLOR_SYNONYMS[t]);
    else if (FABRIC_SYNONYMS[t])   fabrics.push(FABRIC_SYNONYMS[t]);
    else if (OCCASION_SYNONYMS[t]) occasions.push(OCCASION_SYNONYMS[t]);
    else keywords.push(t);
  }
  return { raw, normalized:q, colors:[...new Set(colors)], fabrics:[...new Set(fabrics)], occasions:[...new Set(occasions)], keywords };
}

function smartSearch(indexed, raw, filters={}) {
  if (!raw.trim()) return indexed.filter(p => hardFilter(p, filters));
  const intent = normalizeQuery(raw);

  // Fast path: pure color search (e.g. "black", "kala", "gulabi")
  // Return ALL products of that color, no score threshold
  const isColorOnly = intent.colors.length > 0 &&
    intent.fabrics.length === 0 &&
    intent.occasions.length === 0 &&
    intent.keywords.length === 0;

  if (isColorOnly) {
    return indexed
      .filter(p => hardFilter(p, filters) && intent.colors.includes(p.color))
      .sort((a, b) => {
        const order = { Bestseller:0, Trending:1, New:2, Exclusive:3, Premium:4, Festive:5, Sale:6 };
        return (order[a.badge]??7) - (order[b.badge]??7);
      });
  }

  return indexed.map(p => {
    if (!hardFilter(p, filters)) return null;
    let score = 0;
    const idx = p._idx;

    if (intent.colors.length) {
      if (intent.colors.includes(p.color))                              score += 20;
      else if (intent.colors.some(c => idx.includes(c.toLowerCase()))) score += 8;
      else if (idx.includes(intent.raw.toLowerCase()))                  score += 4;
      else return null; // color was specified, this product doesn't match → exclude
    }
    if (intent.fabrics.length) {
      if (intent.fabrics.includes(p.fabric))                              score += 15;
      else if (intent.fabrics.some(f => idx.includes(f.toLowerCase()))) score += 6;
    }
    if (intent.occasions.length) {
      if (intent.occasions.includes(p.occasion))                              score += 12;
      else if (intent.occasions.some(o => idx.includes(o.toLowerCase()))) score += 5;
    }
    for (const kw of intent.keywords) {
      if (idx.includes(kw)) {
        score += 5;
        if (p.name.toLowerCase().includes(kw)) score += 5;
      } else {
        for (const w of p.name.toLowerCase().split(/\s+/))
          if (w.length > 3 && levenshtein(kw, w) === 1) score += 2;
      }
    }
    // General keyword fallback (no specific intent detected)
    if (!intent.colors.length && !intent.fabrics.length && !intent.occasions.length) {
      if (idx.includes(intent.raw.toLowerCase()))                  score += 10;
      if (p.name.toLowerCase().includes(intent.raw.toLowerCase())) score += 8;
    }
    if (p.badge === "Bestseller") score += 2;
    if (p.badge === "Trending")   score += 1;
    return score > 0 ? { ...p, _score:score } : null;
  }).filter(Boolean).sort((a, b) => b._score - a._score);
}

function hardFilter(p, f={}) {
  if (f.category && f.category !== "All" && p.category !== f.category) return false;
  if (f.color    && f.color    !== "All" && p.color    !== f.color)    return false;
  if (f.fabric   && f.fabric   !== "All Fabrics"   && p.fabric   !== f.fabric)   return false;
  if (f.occasion && f.occasion !== "All Occasions" && p.occasion !== f.occasion) return false;
  if (f.brand    && f.brand    !== "All Brands"    && p.brand    !== f.brand)    return false;
  if (f.priceRange && f.priceRange !== "All Prices") {
    const pr = p.price;
    if (f.priceRange === "Under 3,000"   && pr >= 3000)              return false;
    if (f.priceRange === "3,000–6,000"   && (pr < 3000  || pr > 6000))  return false;
    if (f.priceRange === "6,000–10,000"  && (pr <= 6000 || pr > 10000)) return false;
    if (f.priceRange === "10,000–20,000" && (pr <= 10000|| pr > 20000)) return false;
    if (f.priceRange === "20,000+"       && pr <= 20000)             return false;
  }
  return true;
}

function getSuggestions(q, indexed) {
  if (!q || q.length < 2) return [];
  const ql = q.toLowerCase();
  const seen = new Set(), results = [];
  for (const k of Object.keys(COLOR_SYNONYMS))
    if (k.startsWith(ql) && !seen.has(k)) { results.push({label:k, type:"color"}); seen.add(k); }
  for (const k of Object.keys(OCCASION_SYNONYMS))
    if (k.startsWith(ql) && !seen.has(k)) { results.push({label:k, type:"occasion"}); seen.add(k); }
  for (const p of indexed) {
    if (p.name.toLowerCase().includes(ql) && !seen.has(p.name)) {
      results.push({label:p.name, type:"product", brand:p.brand}); seen.add(p.name);
    }
    if (p.brand.toLowerCase().startsWith(ql) && !seen.has(p.brand)) {
      results.push({label:p.brand, type:"brand"}); seen.add(p.brand);
    }
  }
  return results.slice(0, 7);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CSV PARSER
// ═══════════════════════════════════════════════════════════════════════════════

function parseCSV(csvText) {
  const lines   = csvText.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().replace(/"/g,"").toLowerCase());

  return lines.slice(1).map((line, i) => {
    // Robust CSV parser — handles commas inside quoted fields
    const vals = [];
    let cur = "", inQuote = false;
    for (let ci = 0; ci < line.length; ci++) {
      const ch = line[ci];
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === "," && !inQuote) { vals.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    vals.push(cur.trim());

    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (vals[idx] || "").replace(/"/g,"").trim(); });

    // Validate image_url — must be a real URL not a CDN path fragment
    const rawImage = obj.image_url || obj.image || "";
    const image = rawImage.startsWith("http") ? rawImage : "";

    // Validate product_url — must start with https
    const rawUrl = obj.product_url || "";
    const product_url = rawUrl.startsWith("http") ? rawUrl : "#";

    // Validate category — must be one of our known categories
    const validCategories = ["Lawn","Kurta","Co-ords","Pret / Ready to Wear","Luxury Pret",
      "Unstitched","Shalwar Kameez","Formal","Bridal","Festive / Eid","Winter Collection","Abaya"];
    const rawCat = obj.category || "";
    const category = validCategories.includes(rawCat) ? rawCat : "Pret / Ready to Wear";

    // Validate color — must be one of our known colors
    const validColors = ["Black","White","Navy","Red","Maroon","Pink","Peach","Mint",
      "Teal","Mustard","Olive","Grey","Beige","Pastel","Multi / Printed"];
    const rawColor = obj.color || "";
    const color = validColors.includes(rawColor) ? rawColor : "Multi / Printed";

    return {
      id:             i + 1,
      name:           obj.name           || "",
      brand:          obj.brand          || "",
      price:          parseInt(obj.price) || 0,
      original_price: parseInt(obj.original_price) || 0,
      category,
      color,
      fabric:         obj.fabric         || "Cotton",
      occasion:       obj.occasion       || "Casual / Everyday",
      image,
      product_url,
      badge:          obj.badge          || null,
      in_stock:       obj.in_stock !== "false",
      handle:         obj.handle         || "",
    };
  }).filter(p => p.name); // Don't filter by image — show placeholder if missing
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LIVE STOCK CHECKER
//  Hits /products/[handle].json on the brand site to check real-time stock
// ═══════════════════════════════════════════════════════════════════════════════

// Maps brand name → Shopify base URL
const BRAND_URLS = {
  "Khaadi":          "https://pk.khaadi.com",
  "Sapphire":        "https://pk.sapphireonline.pk",
  "Gul Ahmed":       "https://www.gulahmedshop.com",
  "Limelight":       "https://www.limelight.pk",
  "Alkaram Studio":  "https://www.alkaramstudio.com",
  "Bonanza Satrangi":"https://www.bonanzaonline.com",
  "Beechtree":       "https://beechtree.pk",
  "Zellbury":        "https://www.zellbury.com",
  "Cross Stitch":    "https://www.crossstitchworld.com",
  "Nishat Linen":    "https://www.nishat.net",
  "Maria B":         "https://www.mariab.pk",
  "Sana Safinaz":    "https://www.sanasafinaz.com",
  "Asim Jofa":       "https://www.asimjofa.com",
  "Baroque":         "https://baroque.pk",
  "So Kamal":        "https://www.sokamal.com",
};

// Cache results so we don't re-check the same product in the same session
const _stockCache = {};

async function checkLiveStock(product) {
  const cacheKey = `${product.brand}::${product.handle}`;
  if (_stockCache[cacheKey] !== undefined) return _stockCache[cacheKey];

  const baseUrl = BRAND_URLS[product.brand];
  if (!baseUrl || !product.handle) {
    _stockCache[cacheKey] = null;
    return null;
  }

  try {
    const url = `${baseUrl}/products/${product.handle}.json`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const resp = await fetch(url, { signal: ctrl.signal, mode: "cors" });
    clearTimeout(timer);

    if (!resp.ok) {
      // 404 = product removed from brand site
      _stockCache[cacheKey] = resp.status === 404 ? "removed" : null;
      return _stockCache[cacheKey];
    }

    const data = await resp.json();
    const variants = data?.product?.variants || [];
    const anyAvailable = variants.some(v => v.available);
    _stockCache[cacheKey] = anyAvailable ? "in_stock" : "sold_out";
    return _stockCache[cacheKey];
  } catch (e) {
    // CORS block or timeout — fall back to sheet data
    _stockCache[cacheKey] = null;
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  FALLBACK PRODUCTS (shown if sheet not configured)
// ═══════════════════════════════════════════════════════════════════════════════
const FALLBACK_PRODUCTS = [
  { id:1,  name:"Embroidered Lawn 3-Piece",  brand:"Khaadi",        price:4800,  original_price:0, category:"Lawn",                color:"White",          fabric:"Lawn",    occasion:"Eid / Festive",    image:"https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&q=80", product_url:"https://pk.khaadi.com/products/embroidered-lawn", badge:"Bestseller", in_stock:true,  handle:"embroidered-lawn-3-piece" },
  { id:2,  name:"Printed Pret Kurta",        brand:"Sapphire",      price:3200,  original_price:0, category:"Pret / Ready to Wear",color:"Pink",           fabric:"Cotton",  occasion:"Casual / Everyday",image:"https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=500&q=80", product_url:"https://pk.sapphireonline.pk/products/printed-pret", badge:"New",  in_stock:true,  handle:"printed-pret-kurta" },
  { id:3,  name:"Formal Chiffon Suit",       brand:"Gul Ahmed",     price:7500,  original_price:0, category:"Formal",              color:"Navy",           fabric:"Chiffon", occasion:"Wedding",          image:"https://images.unsplash.com/photo-1619086303291-0ef7699e4b31?w=500&q=80", product_url:"https://www.gulahmedshop.com/products/formal-chiffon", badge:null, in_stock:true,  handle:"formal-chiffon-suit" },
  { id:4,  name:"Casual Linen Co-ord",       brand:"Limelight",     price:2800,  original_price:3500, category:"Co-ords",          color:"Pastel",         fabric:"Linen",   occasion:"Casual / Everyday",image:"https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=500&q=80", product_url:"https://www.limelight.pk/products/casual-linen", badge:"Sale",      in_stock:true,  handle:"casual-linen-coord" },
  { id:5,  name:"Luxury Eid Collection",     brand:"Alkaram Studio",price:9200,  original_price:0, category:"Festive / Eid",       color:"Red",            fabric:"Silk",    occasion:"Eid / Festive",    image:"https://images.unsplash.com/photo-1604671801908-6f0c6a092c05?w=500&q=80", product_url:"https://www.alkaramstudio.com/products/luxury-eid", badge:"Exclusive",in_stock:true,  handle:"luxury-eid-collection" },
  { id:6,  name:"Black Embroidered Kurta",   brand:"Khaadi",        price:5500,  original_price:0, category:"Kurta",               color:"Black",          fabric:"Cotton",  occasion:"Party",            image:"https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=500&q=80", product_url:"https://pk.khaadi.com/products/black-kurta", badge:null,           in_stock:true,  handle:"black-embroidered-kurta" },
  { id:7,  name:"Office Wear Lawn Set",      brand:"Sapphire",      price:4100,  original_price:0, category:"Lawn",                color:"Multi / Printed",fabric:"Lawn",    occasion:"Office / Work",    image:"https://images.unsplash.com/photo-1582142407894-ec85a1260cce?w=500&q=80", product_url:"https://pk.sapphireonline.pk/products/office-lawn", badge:"New",       in_stock:true,  handle:"office-wear-lawn" },
  { id:8,  name:"Karandi Winter Suit",       brand:"Gul Ahmed",     price:6800,  original_price:0, category:"Winter Collection",   color:"Navy",           fabric:"Karandi", occasion:"Winter",           image:"https://images.unsplash.com/photo-1623091411395-09e79fdbfcf6?w=500&q=80", product_url:"https://www.gulahmedshop.com/products/karandi-winter", badge:null,       in_stock:false, handle:"karandi-winter-suit" },
  { id:9,  name:"Wedding Silk Gharara",      brand:"Limelight",     price:12000, original_price:0, category:"Bridal",              color:"Red",            fabric:"Silk",    occasion:"Wedding",          image:"https://images.unsplash.com/photo-1614886137799-1629b5a17c4c?w=500&q=80", product_url:"https://www.limelight.pk/products/wedding-gharara", badge:"Premium",   in_stock:true,  handle:"wedding-silk-gharara" },
  { id:10, name:"Pastel Summer Pret",        brand:"Alkaram Studio",price:2500,  original_price:3200, category:"Pret / Ready to Wear",color:"Pastel",       fabric:"Cotton",  occasion:"Casual / Everyday",image:"https://images.unsplash.com/photo-1571513722275-4b41940f54b8?w=500&q=80", product_url:"https://www.alkaramstudio.com/products/pastel-pret", badge:"Sale",      in_stock:true,  handle:"pastel-summer-pret" },
  { id:11, name:"Luxury Bridal Chiffon",     brand:"Khaadi",        price:18900, original_price:0, category:"Bridal",              color:"Pink",           fabric:"Chiffon", occasion:"Bridal",           image:"https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=500&q=80", product_url:"https://pk.khaadi.com/products/bridal-chiffon", badge:"Exclusive",   in_stock:true,  handle:"luxury-bridal-chiffon" },
  { id:12, name:"White Eid Luxury 3-Pc",     brand:"Sapphire",      price:11500, original_price:0, category:"Festive / Eid",       color:"White",          fabric:"Chiffon", occasion:"Eid / Festive",    image:"https://images.unsplash.com/photo-1606503825008-909a67e63c3d?w=500&q=80", product_url:"https://pk.sapphireonline.pk/products/eid-luxury", badge:"Trending",   in_stock:true,  handle:"white-eid-luxury" },
  { id:13, name:"Black Chiffon Formal",      brand:"Gul Ahmed",     price:8200,  original_price:0, category:"Formal",              color:"Black",          fabric:"Chiffon", occasion:"Formal Event",     image:"https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500&q=80", product_url:"https://www.gulahmedshop.com/products/black-formal", badge:"New",        in_stock:true,  handle:"black-chiffon-formal" },
  { id:14, name:"Black Lawn 3-Piece",        brand:"Sapphire",      price:4600,  original_price:0, category:"Lawn",                color:"Black",          fabric:"Lawn",    occasion:"Casual / Everyday",image:"https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=500&q=80", product_url:"https://pk.sapphireonline.pk/products/black-lawn", badge:null,          in_stock:true,  handle:"black-lawn-3-piece" },
  { id:15, name:"Black Velvet Co-ord",       brand:"Limelight",     price:6200,  original_price:0, category:"Co-ords",             color:"Black",          fabric:"Velvet",  occasion:"Party",            image:"https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=500&q=80", product_url:"https://www.limelight.pk/products/black-velvet", badge:"Trending",    in_stock:false, handle:"black-velvet-coord" },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  CSS
// ═══════════════════════════════════════════════════════════════════════════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{overflow-x:hidden;}
::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:#f0ebe4;}::-webkit-scrollbar-thumb{background:#c9a96e;border-radius:2px;}

/* NAV */
.nav{height:62px;border-bottom:1px solid #e8e0d8;display:flex;align-items:center;padding:0 28px;position:sticky;top:0;z-index:200;background:rgba(253,252,251,.97);backdrop-filter:blur(14px);justify-content:space-between;}
.wordmark{font-family:'Cormorant Garamond',serif;font-size:1.5rem;font-weight:300;letter-spacing:.18em;cursor:pointer;color:#2a2420;user-select:none;}
.hamburger{background:none;border:none;cursor:pointer;padding:8px;display:flex;flex-direction:column;gap:5px;}
.hamburger span{display:block;width:22px;height:1.5px;background:#2a2420;border-radius:2px;}

/* SIDEBAR */
.sb{position:fixed;top:0;left:0;height:100vh;width:268px;background:#fff;border-right:1px solid #ede8e0;z-index:300;transform:translateX(-100%);transition:transform .34s cubic-bezier(.4,0,.2,1);box-shadow:6px 0 40px rgba(0,0,0,.09);overflow-y:auto;display:flex;flex-direction:column;}
.sb.open{transform:translateX(0);}
.sb-overlay{position:fixed;inset:0;background:rgba(20,14,8,.35);z-index:299;opacity:0;pointer-events:none;transition:opacity .28s;backdrop-filter:blur(2px);}
.sb-overlay.open{opacity:1;pointer-events:all;}
.sb-cat-btn{width:100%;padding:11px 20px;background:transparent;border:none;border-left:3px solid transparent;text-align:left;cursor:pointer;font-size:.76rem;color:#888;transition:all .15s;font-family:'DM Sans',sans-serif;letter-spacing:.04em;}
.sb-cat-btn:hover{color:#777;background:#fafaf8;}
.sb-cat-btn.active{color:#c9a96e;border-left-color:#c9a96e;background:#fff8ef;font-weight:500;}

/* CARDS */
.card{background:#fff;border:1px solid #e8e0d8;border-radius:10px;overflow:hidden;cursor:pointer;position:relative;box-shadow:0 2px 10px rgba(0,0,0,.04);transition:transform .28s,box-shadow .28s,border-color .2s;}
.card:hover{border-color:#c9a96e;transform:translateY(-5px);box-shadow:0 18px 44px rgba(180,140,90,.14);}
.card-img{width:100%;height:300px;object-fit:cover;display:block;background:#f0ebe4;transition:transform .48s;}
.card-img-placeholder{width:100%;height:300px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#f5f0eb,#ede8e0);flex-direction:column;gap:8px;}
.card:hover .card-img{transform:scale(1.04);}
.card.sold-out .card-img{ opacity:.95; }
.card.sold-out .card-img-placeholder{ opacity:.95; }

/* BADGES */
.badge-pill{position:absolute;top:10px;left:10px;font-family:'DM Sans',sans-serif;font-size:.58rem;letter-spacing:.14em;text-transform:uppercase;padding:3px 9px;border-radius:20px;font-weight:600;color:#fff;z-index:2;}
.sold-out-badge{position:absolute;top:10px;left:10px;background:rgba(40,30,20,.75);font-family:'DM Sans',sans-serif;font-size:.58rem;letter-spacing:.14em;text-transform:uppercase;padding:3px 9px;border-radius:20px;font-weight:600;color:#e8e0d8;z-index:2;backdrop-filter:blur(4px);}
.wish-btn{position:absolute;top:10px;right:10px;background:rgba(255,255,255,.94);border:1px solid #e8e0d8;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;backdrop-filter:blur(4px);z-index:2;}
.wish-btn:hover{border-color:#c9a96e;}

/* STOCK INDICATOR */
.stock-dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:5px;flex-shrink:0;}
.stock-dot.in{background:#3d8a60;}
.stock-dot.out{background:#b03030;}
.stock-dot.checking{background:#c9a96e;animation:pulse .8s infinite;}
.stock-dot.removed{background:#888;}
@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}

/* FILTER / BUTTONS */
.filter-btn{background:#fff;border:1px solid #e0d8d0;color:#777;padding:7px 14px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;border-radius:3px;transition:all .2s;white-space:nowrap;}
.filter-btn:hover,.filter-btn.active{border-color:#c9a96e;color:#9a6a30;background:#fdf7ef;}
.cta-btn{background:#2a2420;color:#fff;border:none;padding:14px 24px;font-family:'DM Sans',sans-serif;font-size:.78rem;letter-spacing:.14em;text-transform:uppercase;font-weight:500;cursor:pointer;border-radius:4px;transition:all .22s;width:100%;display:flex;align-items:center;justify-content:center;gap:8px;}
.cta-btn:hover{background:#c9a96e;}
.cta-btn.sold-out-btn{background:#888;cursor:not-allowed;}
.cta-btn.removed-btn{background:#b03030;}
.tag{display:inline-block;background:#f5f0eb;border:1px solid #e8e2d8;padding:3px 10px;border-radius:20px;font-size:.62rem;letter-spacing:.07em;text-transform:uppercase;color:#999;}
.quick-tag{background:#f5f0eb;border:1px solid #e0d8d0;padding:5px 14px;border-radius:20px;font-family:'DM Sans',sans-serif;font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;color:#999;cursor:pointer;transition:all .2s;}
.quick-tag:hover,.quick-tag.active{background:#fdf7ef;border-color:#c9a96e;color:#9a6a30;}

/* SEARCH */
.search-box{background:transparent;border:none;outline:none;width:100%;font-family:'DM Sans',sans-serif;font-size:.95rem;color:#2a2420;}
.search-box::placeholder{color:#c8c0b8;}
.ac-box{position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #e0d8d0;border-top:none;border-radius:0 0 8px 8px;box-shadow:0 8px 24px rgba(0,0,0,.08);z-index:50;max-height:280px;overflow-y:auto;}
.ac-item{display:flex;align-items:center;gap:10px;padding:10px 16px;cursor:pointer;transition:background .15s;}
.ac-item:hover{background:#fdf7ef;}
.ac-item-type{font-size:.58rem;letter-spacing:.14em;text-transform:uppercase;color:#c9a96e;background:#fdf7ef;padding:2px 6px;border-radius:10px;flex-shrink:0;}

/* FILTER PANEL */
.filter-panel{background:#fff;border:1px solid #e8e0d8;border-radius:8px;overflow:hidden;transition:max-height .4s,padding .3s;box-shadow:0 4px 18px rgba(0,0,0,.04);}
select{appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23aaa'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;padding-right:28px !important;}

/* MODAL */
.modal-overlay{position:fixed;inset:0;background:rgba(20,14,8,.52);backdrop-filter:blur(7px);z-index:1000;display:flex;align-items:flex-start;justify-content:center;padding:28px 16px;overflow-y:auto;animation:mFadeIn .2s ease;}
@keyframes mFadeIn{from{opacity:0}to{opacity:1}}
.modal{background:linear-gradient(158deg,#fdfcfb 0%,#f8f3ed 100%);border-radius:14px;width:100%;max-width:900px;overflow:hidden;animation:mSlide .3s ease;box-shadow:0 48px 120px rgba(0,0,0,.22);}
@keyframes mSlide{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
.modal-close{position:absolute;top:14px;right:14px;background:rgba(255,255,255,.92);border:1px solid #e8e0d8;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:1rem;color:#888;transition:all .2s;backdrop-filter:blur(4px);z-index:10;}
.modal-close:hover{border-color:#c9a96e;color:#9a6a30;}

/* MISC */
.animate-in{opacity:0;transform:translateY(12px);animation:aIn .42s ease forwards;}
@keyframes aIn{to{opacity:1;transform:translateY(0)}}
.section-rule{height:1px;background:linear-gradient(90deg,transparent,#c9a96e 30%,#c9a96e 70%,transparent);}
.pill-row{display:flex;flex-wrap:wrap;gap:8px;}
.disclaimer{border-radius:8px;padding:11px 14px;margin-bottom:16px;display:flex;gap:11px;align-items:flex-start;}
.disclaimer.info{background:#fffbf0;border:1px solid #f0e0b0;}
.disclaimer.warn{background:#fff8f0;border:1px solid #f0cca0;}
.disclaimer.error{background:#fff4f4;border:1px solid #f0b0b0;}
.similar-card{background:#fff;border:1px solid #e8e0d8;border-radius:6px;overflow:hidden;cursor:pointer;transition:all .22s;}
.similar-card:hover{border-color:#c9a96e;transform:translateY(-3px);box-shadow:0 8px 24px rgba(180,140,90,.1);}
.similar-card-img{width:100%;height:148px;object-fit:cover;display:block;background:#f5f0eb;}

@media(max-width:768px){
  .card-img{height:240px;}
  .nav-desktop{display:none!important;}
}
`;

// ═══════════════════════════════════════════════════════════════════════════════
//  ROOT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [products,        setProducts]        = useState(FALLBACK_PRODUCTS);
  const [dataSource,      setDataSource]      = useState("fallback");
  const [sidebarOpen,     setSidebarOpen]     = useState(false);
  const [activeCategory,  setActiveCategory]  = useState("All");
  const [query,           setQuery]           = useState("");
  const [priceRange,      setPriceRange]      = useState("All Prices");
  const [fabric,          setFabric]          = useState("All Fabrics");
  const [occasion,        setOccasion]        = useState("All Occasions");
  const [color,           setColor]           = useState("All");
  const [brand,           setBrand]           = useState("All Brands");
  const [wishlist,        setWishlist]        = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [filtersOpen,     setFiltersOpen]     = useState(false);
  const [suggestions,     setSuggestions]     = useState([]);
  const [showSugg,        setShowSugg]        = useState(false);
  // Live stock state for open product
  const [liveStock,       setLiveStock]       = useState("checking"); // checking|in_stock|sold_out|removed|unknown
  const searchRef = useRef(null);

  // ── Load products from Google Sheet ──
  useEffect(() => {
    if (GOOGLE_SHEET_CSV_URL.includes("YOUR_SHEET_ID")) return;
    fetch(GOOGLE_SHEET_CSV_URL)
      .then(r => r.text())
      .then(csv => {
        const p = parseCSV(csv);
        if (p.length) { setProducts(p); setDataSource("sheets"); }
      })
      .catch(() => {});
  }, []);

  // ── Lock scroll when modal open + trigger live stock check ──
  useEffect(() => {
    document.body.style.overflow = selectedProduct ? "hidden" : "";
    if (selectedProduct) {
      setLiveStock("checking");
      checkLiveStock(selectedProduct).then(result => {
        setLiveStock(result || "unknown");
      });
    }
    return () => { document.body.style.overflow = ""; };
  }, [selectedProduct]);

  // ── Autocomplete ──
  useEffect(() => {
    if (query.length >= 2) { setSuggestions(getSuggestions(query, indexed)); setShowSugg(true); }
    else { setSuggestions([]); setShowSugg(false); }
  }, [query]);

  useEffect(() => {
    const h = e => { if (!searchRef.current?.contains(e.target)) setShowSugg(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Derived state ──
  const indexed  = useMemo(() => buildIndex(products), [products]);
  const BRANDS   = useMemo(() => ["All Brands", ...Array.from(new Set(products.map(p => p.brand))).sort()], [products]);
  const filters  = { category:activeCategory, color, fabric, occasion, priceRange, brand };
  const filtered = useMemo(() => smartSearch(indexed, query, filters), [indexed, query, activeCategory, color, fabric, occasion, priceRange, brand]);

  // Only show categories that actually have products — auto-hides empty ones
  const POPULATED_CATEGORIES = useMemo(() => {
    const withProducts = new Set(products.map(p => p.category));
    return CATEGORIES.filter(cat => cat === "All" || withProducts.has(cat));
  }, [products]);

  const similar = selectedProduct
    ? products.filter(p => p.id !== selectedProduct.id && p.category === selectedProduct.category).slice(0,6)
    : [];

  const activeFilterCount = [activeCategory!=="All", color!=="All", fabric!=="All Fabrics", occasion!=="All Occasions", priceRange!=="All Prices", brand!=="All Brands"].filter(Boolean).length;

  const searchHint = useMemo(() => {
    if (!query) return null;
    const i = normalizeQuery(query);
    const parts = [];
    if (i.colors.length)    parts.push(`color: ${i.colors.join(", ")}`);
    if (i.fabrics.length)   parts.push(`fabric: ${i.fabrics.join(", ")}`);
    if (i.occasions.length) parts.push(`occasion: ${i.occasions.join(", ")}`);
    return parts.length ? parts.join(" · ") : null;
  }, [query]);

  const toggleWish  = (id, e) => { e?.stopPropagation(); setWishlist(w => w.includes(id) ? w.filter(x=>x!==id) : [...w,id]); };
  const clearAll    = () => { setActiveCategory("All"); setColor("All"); setFabric("All Fabrics"); setOccasion("All Occasions"); setPriceRange("All Prices"); setBrand("All Brands"); setQuery(""); };
  const pickSugg    = (label) => { setQuery(label); setShowSugg(false); };

  // ── Stock display helpers ──
  const stockLabel = {
    checking: { dot:"checking", text:"Checking stock…",      color:"#c9a96e" },
    in_stock: { dot:"in",       text:"In Stock",              color:"#3d8a60" },
    sold_out: { dot:"out",      text:"Sold Out on brand site",color:"#b03030" },
    removed:  { dot:"removed",  text:"Product removed by brand", color:"#888" },
    unknown:  { dot:"in",       text:"Check brand site for stock", color:"#888" },
  };

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:"linear-gradient(160deg,#fdfcfb 0%,#f5f0eb 40%,#ede8e0 100%)", minHeight:"100vh", color:"#2a2420" }}>
      <style>{CSS}</style>

      {/* SIDEBAR OVERLAY */}
      <div className={`sb-overlay ${sidebarOpen?"open":""}`} onClick={() => setSidebarOpen(false)} />

      {/* SIDEBAR */}
      <aside className={`sb ${sidebarOpen?"open":""}`}>
        <div style={{ padding:"20px 20px 14px", borderBottom:"1px solid #f0ebe4", flexShrink:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div className="wordmark" style={{ fontSize:"1.2rem" }}>Poshak<span style={{ color:"#c9a96e" }}>.</span>pk</div>
              <div style={{ fontSize:".6rem", letterSpacing:".15em", textTransform:"uppercase", color:"#ccc", marginTop:"3px" }}>Women's Fashion</div>
            </div>
            <button onClick={() => setSidebarOpen(false)} style={{ background:"none", border:"1px solid #e8e0d8", borderRadius:"50%", width:"30px", height:"30px", cursor:"pointer", color:"#aaa", fontSize:".85rem" }}>✕</button>
          </div>
        </div>

        {/* Category list */}
        <div style={{ padding:"8px 0" }}>
          <div style={{ padding:"8px 20px 6px", fontSize:".6rem", letterSpacing:".2em", textTransform:"uppercase", color:"#bbb" }}>Categories</div>
          {POPULATED_CATEGORIES.map(cat => (
            <button key={cat} className={`sb-cat-btn ${activeCategory===cat?"active":""}`}
              onClick={() => { setActiveCategory(cat); setSidebarOpen(false); }}>
              {cat}
            </button>
          ))}
        </div>

        {/* Brand list */}
        <div style={{ padding:"8px 0", borderTop:"1px solid #f0ebe4" }}>
          <div style={{ padding:"8px 20px 6px", fontSize:".6rem", letterSpacing:".2em", textTransform:"uppercase", color:"#bbb" }}>Brands</div>
          {BRANDS.map(b => (
            <button key={b} className={`sb-cat-btn ${brand===b?"active":""}`}
              onClick={() => { setBrand(b); setSidebarOpen(false); }}>
              {b}
            </button>
          ))}
        </div>

        <div style={{ marginTop:"auto", padding:"14px 20px", borderTop:"1px solid #f0ebe4", fontSize:".62rem", letterSpacing:".1em", textTransform:"uppercase", color:"#ccc", textAlign:"center" }}>
          {products.length} Dresses
          {dataSource === "sheets" && <span style={{ color:"#3d8a60", marginLeft:"8px" }}>● Live</span>}
        </div>
      </aside>

      {/* NAV */}
      <nav className="nav">
        <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
          <button className="hamburger" onClick={() => setSidebarOpen(true)}><span/><span/><span/></button>
          <div className="wordmark" onClick={clearAll}>Poshak<span style={{ color:"#c9a96e" }}>.</span>pk</div>
        </div>
        <div className="nav-desktop" style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
          {POPULATED_CATEGORIES.filter(c=>c!=="All").slice(0,6).map(cat => (
            <button key={cat} className={`filter-btn ${activeCategory===cat?"active":""}`}
              style={{ fontSize:".65rem", padding:"5px 12px" }}
              onClick={() => setActiveCategory(activeCategory===cat?"All":cat)}>
              {cat}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", gap:"16px", alignItems:"center" }}>
          {dataSource==="sheets" && <span style={{ fontSize:".66rem", color:"#3d8a60" }}>● Live</span>}
          {wishlist.length>0 && <span style={{ fontSize:".72rem", color:"#c9a96e" }}>♥ {wishlist.length}</span>}
        </div>
      </nav>

      {/* HERO */}
      <section style={{ textAlign:"center", padding:"64px 24px 48px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 75% 55% at 50% 0%,rgba(201,169,110,.09) 0%,transparent 72%)", pointerEvents:"none" }} />
        <p style={{ fontSize:".65rem", letterSpacing:".38em", textTransform:"uppercase", color:"#c9a96e", marginBottom:"14px" }}>Pakistan's Women's Fashion Discovery</p>
        <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(2rem,5.5vw,3.8rem)", fontWeight:300, lineHeight:1.1, marginBottom:"4px" }}>Find Every Dress,</h1>
        <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(2rem,5.5vw,3.8rem)", fontWeight:300, fontStyle:"italic", lineHeight:1.1, marginBottom:"28px", color:"#c9a96e" }}>Across Every Brand</h1>
        <div style={{ width:"48px", height:"1px", background:"linear-gradient(90deg,transparent,#c9a96e,transparent)", margin:"0 auto 32px" }} />

        {/* SEARCH */}
        <div style={{ maxWidth:"640px", margin:"0 auto 18px" }}>
          <div ref={searchRef} style={{ position:"relative" }}>
            <div style={{ display:"flex", alignItems:"center", background:"#fff", border:"1px solid #e0d8d0", borderRadius:"8px", padding:"13px 20px", gap:"12px", boxShadow:"0 4px 22px rgba(0,0,0,.06)" }}>
              <span style={{ color:"#ccc", fontSize:"1.1rem" }}>⊹</span>
              <input className="search-box"
                placeholder="Search: black lawn, kala suit, bridal chiffon, eid dress…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => query.length>=2 && setShowSugg(true)}
              />
              {query && <button onClick={() => { setQuery(""); setSuggestions([]); }} style={{ background:"none", border:"none", color:"#ccc", cursor:"pointer" }}>✕</button>}
            </div>
            {showSugg && suggestions.length>0 && (
              <div className="ac-box">
                {suggestions.map((s,i) => (
                  <div key={i} className="ac-item" onClick={() => pickSugg(s.label)}>
                    <span className="ac-item-type">{s.type}</span>
                    <span style={{ fontSize:".82rem", color:"#2a2420" }}>{s.label}</span>
                    {s.brand && <span style={{ fontSize:".7rem", color:"#bbb", marginLeft:"auto" }}>{s.brand}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
          {searchHint && query && (
            <div style={{ fontSize:".68rem", color:"#c9a96e", letterSpacing:".06em", marginTop:"8px", textAlign:"left", paddingLeft:"4px" }}>
              ✦ Searching for: {searchHint}
            </div>
          )}
        </div>

        {/* QUICK CATEGORY TAGS */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:"8px", justifyContent:"center" }}>
          {QUICK_TAGS.map(t => (
            <button key={t} className={`quick-tag ${activeCategory===t?"active":""}`}
              onClick={() => { setActiveCategory(activeCategory===t?"All":t); setQuery(""); }}>
              {t}
            </button>
          ))}
        </div>
      </section>

      {/* MAIN CONTENT */}
      <div style={{ maxWidth:"1240px", margin:"0 auto", padding:"0 24px 60px" }}>

        {/* FILTER ROW */}
        <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"14px", flexWrap:"wrap" }}>
          <button className={`filter-btn ${filtersOpen?"active":""}`} onClick={() => setFiltersOpen(f=>!f)}>
            ⊞ Filters {activeFilterCount>0 && `(${activeFilterCount})`}
          </button>
          {activeFilterCount>0 && (
            <button className="filter-btn" onClick={clearAll} style={{ color:"#b03030", borderColor:"#f0c0c0" }}>Clear All</button>
          )}
          <span style={{ fontSize:".7rem", color:"#bbb", marginLeft:"auto", letterSpacing:".08em" }}>
            {filtered.length} dresses
          </span>
        </div>

        {/* FILTER PANEL */}
        <div className="filter-panel" style={{ maxHeight:filtersOpen?"420px":"0", padding:filtersOpen?"20px":"0 20px", marginBottom:filtersOpen?"20px":"0" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))", gap:"18px" }}>
            {[
              { label:"Category",    value:activeCategory, setter:setActiveCategory, options:POPULATED_CATEGORIES },
              { label:"Brand",       value:brand,          setter:setBrand,          options:BRANDS },
              { label:"Color",       value:color,          setter:setColor,          options:STATIC_COLORS },
              { label:"Price Range", value:priceRange,     setter:setPriceRange,     options:PRICE_RANGES },
              { label:"Fabric",      value:fabric,         setter:setFabric,         options:STATIC_FABRICS },
              { label:"Occasion",    value:occasion,       setter:setOccasion,       options:STATIC_OCCASIONS },
            ].map(({ label, value, setter, options }) => (
              <div key={label}>
                <div style={{ fontSize:".6rem", letterSpacing:".2em", textTransform:"uppercase", color:"#aaa", marginBottom:"8px" }}>{label}</div>
                <select value={value} onChange={e => setter(e.target.value)} className="filter-btn" style={{ width:"100%", background:"#fff", cursor:"pointer" }}>
                  {options.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* PRODUCT GRID */}
        {filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"80px 0", color:"#ccc" }}>
            <div style={{ fontSize:"3rem", marginBottom:"16px" }}>◌</div>
            <p style={{ fontSize:".85rem", letterSpacing:".1em" }}>No dresses found</p>
            <p style={{ fontSize:".75rem", color:"#bbb", marginTop:"8px" }}>Try "black lawn", "bridal", or clear your filters</p>
            <button className="filter-btn" onClick={clearAll} style={{ marginTop:"16px" }}>Clear All Filters</button>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:"20px" }}>
            {filtered.map((p, i) => (
              <div key={p.id} className={`card animate-in ${!p.in_stock?"sold-out":""}`}
                style={{ animationDelay:`${Math.min(i,12)*.055}s` }}
                onClick={() => setSelectedProduct(p)}>
                <div style={{ position:"relative", overflow:"hidden" }}>
                  {/* Image — always show, sold-out does NOT hide or grey out the image */}
                  {p.image ? (
                    <ImageWithFallback
                      src={p.image}
                      alt={p.name}
                      className="card-img"
                    />
                  ) : (
                    <div className="card-img-placeholder">
                      <div style={{ fontSize:"2rem", opacity:.3 }}>👗</div>
                      <div style={{ fontSize:".65rem", color:"#bbb", letterSpacing:".1em", textTransform:"uppercase" }}>{p.brand}</div>
                    </div>
                  )}
                  {/* Sold Out — small badge top-right, doesn't cover the image */}
                  {!p.in_stock && (
                    <div style={{
                      position:"absolute", top:"10px", right:"10px",
                      background:"rgba(42,36,32,.85)", backdropFilter:"blur(4px)",
                      color:"#fff", fontSize:".58rem", letterSpacing:".12em",
                      textTransform:"uppercase", padding:"4px 8px",
                      borderRadius:"3px", zIndex:4, fontWeight:500
                    }}>
                      Sold Out
                    </div>
                  )}
                  {/* Regular badge — top-left (only show if in stock) */}
                  {p.in_stock && p.badge && (
                    <div className="badge-pill" style={{ background:BADGE_COLORS[p.badge]||"#888" }}>{p.badge}</div>
                  )}
                  {/* Sale % ribbon */}
                  {p.original_price > p.price && (
                    <div style={{ position:"absolute", top:p.badge?"38px":"10px", left:"10px", background:BADGE_COLORS.Sale, color:"#fff", fontSize:".56rem", letterSpacing:".12em", textTransform:"uppercase", padding:"3px 8px", borderRadius:"20px", fontWeight:600, zIndex:2 }}>
                      -{Math.round((1 - p.price/p.original_price)*100)}% Off
                    </div>
                  )}
                  <button className="wish-btn" onClick={e => toggleWish(p.id, e)}>
                    <span style={{ color:wishlist.includes(p.id)?"#c9a96e":"#ccc", fontSize:".9rem" }}>
                      {wishlist.includes(p.id)?"♥":"♡"}
                    </span>
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
                        <div style={{ fontSize:".72rem", color:"#bbb", textDecoration:"line-through" }}>Rs. {p.original_price.toLocaleString()}</div>
                      )}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:"5px", flexWrap:"wrap" }}>
                    <span className="tag">{p.category}</span>
                    <span className="tag">{p.occasion}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer style={{ borderTop:"1px solid #e8e0d8", padding:"40px 24px", textAlign:"center", background:"rgba(255,255,255,.55)" }}>
        <div className="wordmark" style={{ color:"#c9a96e", fontSize:"1.35rem", marginBottom:"6px" }}>Poshak.pk</div>
        <p style={{ fontSize:".62rem", letterSpacing:".15em", color:"#bbb", textTransform:"uppercase" }}>Pakistan's Women's Fashion Discovery Engine · v4.0</p>
        <p style={{ fontSize:".6rem", color:"#ccc", marginTop:"6px" }}>All products link to official brand websites. Stock availability is checked live.</p>
      </footer>

      {/* ════ PRODUCT MODAL ════ */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) setSelectedProduct(null); }}>
          <div className="modal">
            <div style={{ position:"relative" }}>
              <img src={selectedProduct.image} alt={selectedProduct.name}
                style={{ width:"100%", height:"420px", objectFit:"cover", display:"block",
                  filter: liveStock==="sold_out" ? "grayscale(25%)" : "none",
                  transition:"filter .3s" }} />
              <button className="modal-close" onClick={() => setSelectedProduct(null)}>✕</button>
              {selectedProduct.badge && liveStock !== "sold_out" && (
                <div className="badge-pill" style={{ background:BADGE_COLORS[selectedProduct.badge]||"#888" }}>{selectedProduct.badge}</div>
              )}
              {liveStock === "sold_out" && (
                <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", background:"rgba(20,14,8,.75)", color:"#f0ebe3", fontFamily:"'Cormorant Garamond',serif", fontSize:"1.6rem", fontWeight:300, letterSpacing:".1em", padding:"16px 32px", borderRadius:"4px", backdropFilter:"blur(4px)" }}>
                  Sold Out
                </div>
              )}
              {selectedProduct.original_price > selectedProduct.price && (
                <div style={{ position:"absolute", top:"10px", left: selectedProduct.badge?"46px":"10px", background:BADGE_COLORS.Sale, color:"#fff", fontSize:".56rem", letterSpacing:".12em", textTransform:"uppercase", padding:"3px 9px", borderRadius:"20px", fontWeight:600 }}>
                  -{Math.round((1-selectedProduct.price/selectedProduct.original_price)*100)}% Off
                </div>
              )}
            </div>

            <div style={{ padding:"28px 32px 32px" }}>
              {/* Title + price */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"14px" }}>
                <div style={{ flex:1, minWidth:0, paddingRight:"16px" }}>
                  <div style={{ fontSize:".62rem", letterSpacing:".2em", textTransform:"uppercase", color:"#c9a96e", marginBottom:"6px" }}>{selectedProduct.brand}</div>
                  <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"1.8rem", fontWeight:400, color:"#2a2420", lineHeight:1.2 }}>{selectedProduct.name}</h2>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"1.55rem", color:"#2a2420" }}>
                    Rs. {selectedProduct.price.toLocaleString()}
                  </div>
                  {selectedProduct.original_price > selectedProduct.price && (
                    <div style={{ fontSize:".8rem", color:"#bbb", textDecoration:"line-through" }}>
                      Rs. {selectedProduct.original_price.toLocaleString()}
                    </div>
                  )}
                  <button onClick={e => toggleWish(selectedProduct.id, e)}
                    style={{ background:"none", border:"none", cursor:"pointer", fontSize:".95rem", marginTop:"6px", color:wishlist.includes(selectedProduct.id)?"#c9a96e":"#ccc", fontFamily:"'DM Sans',sans-serif" }}>
                    {wishlist.includes(selectedProduct.id)?"♥ Saved":"♡ Save"}
                  </button>
                </div>
              </div>

              {/* LIVE STOCK STATUS */}
              <div style={{ display:"flex", alignItems:"center", marginBottom:"16px", padding:"10px 14px", background:"#f8f4ef", borderRadius:"6px", gap:"8px" }}>
                <span className={`stock-dot ${stockLabel[liveStock]?.dot||"checking"}`} />
                <span style={{ fontSize:".72rem", color:stockLabel[liveStock]?.color||"#888", fontWeight:500 }}>
                  {stockLabel[liveStock]?.text || "Checking…"}
                </span>
                <span style={{ fontSize:".65rem", color:"#bbb", marginLeft:"auto" }}>Live check</span>
              </div>

              {/* Product details */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:"12px", background:"#f8f4ef", borderRadius:"8px", padding:"16px", marginBottom:"20px" }}>
                {[["Category",selectedProduct.category],["Fabric",selectedProduct.fabric],["Occasion",selectedProduct.occasion],["Color",selectedProduct.color]].map(([l,v]) => (
                  <div key={l}>
                    <div style={{ fontSize:".58rem", letterSpacing:".18em", textTransform:"uppercase", color:"#bbb", marginBottom:"3px" }}>{l}</div>
                    <div style={{ fontSize:".85rem", color:"#2a2420", fontWeight:500 }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Disclaimer */}
              <div className={`disclaimer ${liveStock==="removed"?"error":liveStock==="sold_out"?"warn":"info"}`}>
                <span style={{ fontSize:"1rem", flexShrink:0 }}>
                  {liveStock==="removed"?"🚫":liveStock==="sold_out"?"⚠️":"ℹ️"}
                </span>
                <div style={{ fontSize:".7rem", color:"#888", lineHeight:1.6 }}>
                  {liveStock==="removed"
                    ? `This product appears to have been removed from ${selectedProduct.brand}'s website. Try searching for it directly on their site.`
                    : liveStock==="sold_out"
                      ? `This item is currently sold out on ${selectedProduct.brand}'s website. You can still visit to check for restocks or similar items.`
                      : `This links to ${selectedProduct.brand}'s official website. Final availability and pricing is controlled by the brand.`
                  }
                </div>
              </div>

              {/* CTA */}
              <a href={selectedProduct.product_url} target="_blank" rel="noopener noreferrer"
                style={{ textDecoration:"none", display:"block", marginBottom:"28px" }}
                onClick={e => liveStock==="removed" && e.preventDefault()}>
                <button className={`cta-btn ${liveStock==="sold_out"?"sold-out-btn":liveStock==="removed"?"removed-btn":""}`}
                  disabled={liveStock==="removed"}>
                  {liveStock==="sold_out"
                    ? `View on ${selectedProduct.brand} (Sold Out) →`
                    : liveStock==="removed"
                      ? "Product No Longer Available"
                      : `View & Buy on ${selectedProduct.brand} →`
                  }
                </button>
              </a>

              {/* Similar products */}
              {similar.length > 0 && (
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:"14px", marginBottom:"16px" }}>
                    <div className="section-rule" style={{ flex:1 }} />
                    <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"1.05rem", color:"#aaa", fontStyle:"italic", whiteSpace:"nowrap" }}>
                      More {selectedProduct.category}
                    </span>
                    <div className="section-rule" style={{ flex:1 }} />
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(126px,1fr))", gap:"10px" }}>
                    {similar.map(sp => (
                      <div key={sp.id} className="similar-card" onClick={() => setSelectedProduct(sp)}>
                        <img className="similar-card-img" src={sp.image} alt={sp.name} />
                        <div style={{ padding:"8px" }}>
                          <div style={{ fontSize:".56rem", letterSpacing:".12em", textTransform:"uppercase", color:"#c9a96e", marginBottom:"2px" }}>{sp.brand}</div>
                          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:".82rem", color:"#2a2420", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:"3px" }}>{sp.name}</div>
                          <div style={{ fontSize:".7rem", color:"#aaa" }}>Rs. {sp.price.toLocaleString()}</div>
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

// ─── IMAGE WITH FALLBACK ──────────────────────────────────────────────────────
function ImageWithFallback({ src, alt, className }) {
  const [broken, setBroken] = useState(false);
  if (broken || !src) {
    return (
      <div className="card-img-placeholder">
        <div style={{ fontSize:"2.5rem", opacity:.2 }}>👗</div>
        <div style={{ fontSize:".6rem", color:"#ccc", letterSpacing:".1em", textTransform:"uppercase", marginTop:"4px", textAlign:"center", padding:"0 16px" }}>
          {alt?.split(" ").slice(0,4).join(" ")}
        </div>
      </div>
    );
  }
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setBroken(true)}
    />
  );
}
