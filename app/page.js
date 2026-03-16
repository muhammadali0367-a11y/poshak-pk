"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
//  POSHAK.PK  —  v4.0  Women's Edition
//  • Women's dresses only
//  • Live stock check when product opens
//  • World-class search (color, Urdu, typo tolerance, autocomplete)
// ═══════════════════════════════════════════════════════════════════════════════

// ── Replace YOUR_SHEET_ID with your Google Sheet published CSV ID ──
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
      color: normalizedColor,
      _idx: [
        p.name, p.brand,
        (p.categories || [p.category]).join(" "),  // all categories searchable
        normalizedColor, normalizedColor.toLowerCase(),
        p.fabric, p.occasion, p.badge || "",
        colorSyns, fabricSyns, occasionSyns,
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
  if (f.category && f.category !== "All") {
    const cats = p.categories || [p.category];
    if (!cats.includes(f.category)) return false;
  }
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
//  AUTO-DERIVE HELPERS
//  These run client-side on every sheet load.
//  Input: product_type, tags, collection from the sheet
//  Output: category, color, fabric, occasion, badge
// ═══════════════════════════════════════════════════════════════════════════════

function deriveCategory(product_type, tags, collection) {
  const col  = (collection   || "").toLowerCase();
  const tag  = (tags         || "").toLowerCase();
  const pt   = (product_type || "").toLowerCase();
  const all  = `${col} ${tag} ${pt}`;

  const categories = new Set();

  // ── Collection handle → primary category ──────────────────────────────────
  const COLL_MAP = [
    [["formal-pret","formal-wear","formals","3-piece-formal","semi-formal","evening-wear","chiffon-collection"], "Formal"],
    [["luxury-pret","luxury-pret-collection","premium-pret","signature-collection","glam"], "Luxury Pret"],
    [["bridal","wedding-festive","wedding-collection","bridal-couture","wedding-wear"], "Bridal"],
    [["eid-collection","festive","festive-pret","eid-festive","eid-pret","eid"], "Festive / Eid"],
    [["winter-pret","khaddar-collection","karandi","winter-suits","winter-collection","winter"], "Winter Collection"],
    [["unstitched","luxury-unstitched"], "Unstitched"],
    [["lawn","lawn-collection","printed-lawn","embroidered-lawn","lawn-pret","summer-lawn","printed-pret-3","printed-pret-lawn","embroidered-pret-lawn"], "Lawn"],
    [["abaya"], "Abaya"],
    [["co-ord","coord-set"], "Co-ords"],
    [["kurta","embroidered-kurta"], "Kurta"],
    [["shalwar-kameez"], "Shalwar Kameez"],
    [["pret","ready-to-wear","rtw","casual-pret","summer-pret"], "Pret / Ready to Wear"],
  ];
  for (const [keys, cat] of COLL_MAP) {
    if (keys.some(k => col.includes(k))) categories.add(cat);
  }

  // ── Tags — a product can match multiple categories ─────────────────────────
  if (all.includes("unstitched"))                                      categories.add("Unstitched");
  if (all.includes("luxury pret") || all.includes("luxury-pret"))     categories.add("Luxury Pret");
  if (all.match(/bridal|bride|gharara|sharara|lehenga|wedding festive/)) categories.add("Bridal");
  if (all.includes("abaya"))                                           categories.add("Abaya");
  if (all.match(/\bco-ord\b|coord set/))                              categories.add("Co-ords");
  if (all.match(/\bfestive\b|\beid\b/))                               categories.add("Festive / Eid");
  if (all.match(/khaddar|karandi|\bwinter\b/))                        categories.add("Winter Collection");
  if (all.includes("lawn"))                                            categories.add("Lawn");
  if (all.match(/\bkurta\b|\bkurti\b/))                               categories.add("Kurta");
  if (all.match(/shalwar|kameez/))                                     categories.add("Shalwar Kameez");
  if (all.match(/\bformal\b|evening wear|chiffon suit/))              categories.add("Formal");

  // Default if nothing matched
  if (categories.size === 0) categories.add("Pret / Ready to Wear");

  return [...categories];
}

function deriveColor(tags, name) {
  const text = `${tags} ${name}`.toLowerCase();
  const COLOR_CHECKS = [
    // Multi-word first
    ["off white","Beige"], ["jet black","Black"], ["hot pink","Pink"],
    ["baby pink","Pink"], ["dark red","Maroon"], ["royal blue","Navy"],
    ["dark blue","Navy"], ["navy blue","Navy"], ["bottle green","Mint"],
    ["olive green","Olive"], ["army green","Olive"], ["raw silk","Beige"],
    // Single word
    ["black","Black"], ["white","White"], ["ivory","Beige"], ["cream","Beige"],
    ["beige","Beige"], ["nude","Beige"], ["champagne","Beige"],
    ["navy","Navy"], ["cobalt","Navy"], ["indigo","Navy"], ["blue","Navy"],
    ["maroon","Maroon"], ["burgundy","Maroon"], ["wine","Maroon"],
    ["crimson","Red"], ["scarlet","Red"], ["red","Red"], ["lal","Red"],
    ["pink","Pink"], ["rose","Pink"], ["blush","Pink"], ["gulabi","Pink"],
    ["fuchsia","Pink"], ["magenta","Pink"],
    ["peach","Peach"], ["coral","Peach"], ["salmon","Peach"], ["apricot","Peach"],
    ["mint","Mint"], ["sage","Mint"], ["emerald","Mint"], ["jade","Mint"],
    ["green","Mint"], ["hara","Mint"],
    ["olive","Olive"], ["khaki","Olive"],
    ["teal","Teal"], ["turquoise","Teal"], ["ferozi","Teal"], ["aqua","Teal"],
    ["mustard","Mustard"], ["yellow","Mustard"], ["saffron","Mustard"], ["zard","Mustard"],
    ["grey","Grey"], ["gray","Grey"], ["charcoal","Grey"], ["slate","Grey"],
    ["lilac","Pastel"], ["lavender","Pastel"], ["purple","Pastel"],
    ["violet","Pastel"], ["mauve","Pastel"],
    ["multi","Multi / Printed"], ["printed","Multi / Printed"],
    ["floral","Multi / Printed"], ["digital","Multi / Printed"],
  ];
  for (const [kw, color] of COLOR_CHECKS) {
    if (text.includes(kw)) return color;
  }
  return "Multi / Printed";
}

function deriveFabric(tags, product_type, name) {
  const text = `${tags} ${product_type} ${name}`.toLowerCase();
  const FABRIC_CHECKS = [
    ["raw silk","Raw Silk"], ["rawsilk","Raw Silk"], ["tissue silk","Silk"],
    ["boski","Silk"], ["charmeuse","Silk"], ["satin","Silk"], ["tissue","Silk"],
    ["khaddar","Khaddar"], ["khaddi","Khaddar"],
    ["karandi","Karandi"],
    ["organza","Organza"],
    ["chiffon","Chiffon"], ["georgette","Chiffon"], ["crepe","Chiffon"], ["viscose","Chiffon"],
    ["velvet","Velvet"],
    ["jacquard","Jacquard"], ["self jacquard","Jacquard"],
    ["net","Net"], ["cotton net","Net"],
    ["cambric","Cambric"],
    ["lawn","Lawn"],
    ["linen","Linen"],
    ["silk","Silk"],
    ["cotton","Cotton"], ["slub","Cotton"], ["dobby","Cotton"],
    ["marina","Cotton"], ["khaddi","Khaddar"],
  ];
  for (const [kw, fabric] of FABRIC_CHECKS) {
    if (text.includes(kw)) return fabric;
  }
  return "Cotton";
}

function deriveOccasion(tags, collection, category, name) {
  // Category overrides first
  if (category === "Bridal")            return "Bridal";
  if (category === "Festive / Eid")     return "Eid / Festive";
  if (category === "Winter Collection") return "Winter";
  if (category === "Formal")            return "Formal Event";

  const text = `${tags} ${collection} ${name}`.toLowerCase();
  if (text.match(/bridal|bride|dulhan/))          return "Bridal";
  if (text.match(/wedding|barat|walima|shaadi/))  return "Wedding";
  if (text.match(/eid|festive/))                  return "Eid / Festive";
  if (text.match(/formal|evening|semi.formal/))   return "Formal Event";
  if (text.match(/office|work|daily wear/))       return "Office / Work";
  if (text.match(/party|dawat/))                  return "Party";
  if (text.match(/winter|khaddar|karandi/))       return "Winter";
  return "Casual / Everyday";
}

function deriveBadge(tags, name, original_price, price) {
  const text = `${tags} ${name}`.toLowerCase();
  if (original_price > price)                              return "Sale";
  if (text.match(/\bnew\b|new.arrival|just.in/))          return "New";
  if (text.match(/sale|discount|clearance/))              return "Sale";
  if (text.match(/luxury|premium|couture/))               return "Premium";
  if (text.match(/exclusive|limited|signature/))          return "Exclusive";
  if (text.match(/eid|festive/))                          return "Festive";
  if (text.match(/bestseller|best.seller/))               return "Bestseller";
  if (text.match(/trending/))                             return "Trending";
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CSV PARSER
//  Reads: id, name, brand, price, original_price, product_type, tags, collection
//  + image_url, product_url, in_stock (if present)
//  Auto-derives: category, color, fabric, occasion, badge
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
    headers.forEach((h, idx) => { obj[h] = (vals[idx] || "").replace(/^"|"$/g,"").trim(); });

    // Core fields from sheet
    const name           = obj.name          || "";
    const brand          = obj.brand         || "";
    const price          = parseInt(obj.price)          || 0;
    const original_price = parseInt(obj.original_price) || 0;
    const product_type   = obj.product_type  || obj.type || "";
    const tags           = obj.tags          || "";
    const collection     = obj.collection    || "";

    // Find image URL — check image_url column first, then scan all fields
    let image = "";
    const directImg = obj.image_url || obj.image || "";
    if (directImg.startsWith("http")) {
      image = directImg;
    } else {
      for (const val of Object.values(obj)) {
        if (val && (val.includes("cdn.shopify.com") || val.includes("unsplash.com") ||
            (val.startsWith("http") && (val.includes(".jpg") || val.includes(".png") || val.includes(".webp"))))) {
          image = val;
          break;
        }
      }
    }

    const product_url = (obj.product_url || "").startsWith("http") ? obj.product_url : "#";
    const in_stock    = !["false","FALSE","0","no","out of stock","sold out"]
                          .includes((obj.in_stock||"").trim().toLowerCase());

    // ── Auto-derive the 5 fields ──────────────────────────────────────────────
    const categories = deriveCategory(product_type, tags, collection);
    const color    = deriveColor(tags, name);
    const fabric   = deriveFabric(tags, product_type, name);
    const occasion = deriveOccasion(tags, collection, categories[0], name);
    const badge    = deriveBadge(tags, name, original_price, price);

    if (!name) return null;
    return { id: i+1, name, brand, price, original_price,
             categories,                    // array e.g. ["Lawn","Festive / Eid"]
             category: categories[0],       // primary category (for display on card tag)
             color, fabric, occasion, image, product_url, badge, in_stock,
             collection, tags };
  }).filter(Boolean);
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
  // Brand sites block CORS so a true live check isn't possible from the browser.
  // We use the in_stock value set by the importer instead, which is accurate
  // at the time of the last import run.
  return product.in_stock ? "in_stock" : "sold_out";
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
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
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
  const [products,        setProducts]        = useState([]);
  const [homepageSections,setHomepageSections]= useState({});   // { "Lawn": [...4 products] }
  const [loading,         setLoading]         = useState(true);
  const [loadingMore,     setLoadingMore]     = useState(false);
  const [totalResults,    setTotalResults]    = useState(0);
  const [currentPage,     setCurrentPage]     = useState(1);
  const [totalPages,      setTotalPages]      = useState(1);
  const [dataSource,      setDataSource]      = useState("loading");
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
  const [liveStock,       setLiveStock]       = useState("checking");
  const searchRef = useRef(null);

  // ── Parse price range ──────────────────────────────────────────────────────
  function parsePriceRange(pr) {
    if (!pr || pr === "All Prices") return [null, null];
    const m = pr.match(/Rs\s*([\d,]+)\s*–\s*Rs\s*([\d,]+)/);
    if (m) return [parseInt(m[1].replace(/,/g,'')), parseInt(m[2].replace(/,/g,''))];
    const u = pr.match(/Under Rs\s*([\d,]+)/);
    if (u) return [null, parseInt(u[1].replace(/,/g,''))];
    const o = pr.match(/Over Rs\s*([\d,]+)/);
    if (o) return [parseInt(o[1].replace(/,/g,'')), null];
    return [null, null];
  }

  // ── Process raw product from API (derive category/color/fabric/etc) ────────
  function processProduct(p) {
    const categories = deriveCategory(p.product_type, p.tags, p.collection);
    const color      = deriveColor(p.tags, p.name);
    const fabric     = deriveFabric(p.tags, p.product_type, p.name);
    const occasion   = deriveOccasion(p.tags, p.collection, categories[0], p.name);
    const badge      = deriveBadge(p.tags, p.name, p.original_price, p.price);
    return {
      ...p,
      categories,
      category:  categories[0],
      color, fabric, occasion, badge,
      image: p.image_url,
      in_stock: p.in_stock !== false,
    };
  }

  // ── Load homepage sections ─────────────────────────────────────────────────
  useEffect(() => {
    const CACHE_KEY = "poshak_homepage_v2";
    const CACHE_TTL = 30 * 60 * 1000;

    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          setHomepageSections(data);
          setLoading(false);
          // Refresh in background
          fetch("/api/homepage")
            .then(r => r.json())
            .then(json => {
              if (json.sections) {
                const processed = {};
                for (const [cat, prods] of Object.entries(json.sections)) {
                  processed[cat] = prods.map(processProduct);
                }
                setHomepageSections(processed);
                sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: processed, timestamp: Date.now() }));
              }
            }).catch(() => {});
          return;
        }
      }
    } catch(e) {}

    fetch("/api/homepage")
      .then(r => r.json())
      .then(json => {
        if (json.sections) {
          const processed = {};
          for (const [cat, prods] of Object.entries(json.sections)) {
            processed[cat] = prods.map(processProduct);
          }
          setHomepageSections(processed);
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: processed, timestamp: Date.now() }));
          } catch(e) {}
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Load products when filter/search/category changes ─────────────────────
  useEffect(() => {
    if (activeCategory === "All" && !query && !color && !fabric && !occasion && !priceRange && !brand) return;
    if (activeCategory === "All" && !query) return;

    setLoadingMore(true);
    setCurrentPage(1);

    const [minP, maxP] = parsePriceRange(priceRange);

    const isSearching = query.trim().length > 0;
    const endpoint = isSearching ? "/api/search" : "/api/products";
    const params = new URLSearchParams({ page: 1 });

    if (isSearching)              params.set("q", query.trim());
    if (activeCategory !== "All") params.set("category", activeCategory);
    if (brand !== "All Brands")   params.set("brand", brand);
    if (minP)                     params.set("min_price", minP);
    if (maxP)                     params.set("max_price", maxP);

    fetch(`${endpoint}?${params}`)
      .then(r => r.json())
      .then(json => {
        const prods = (json.products || []).map(processProduct);
        setProducts(prods);
        setTotalResults(json.total || prods.length);
        setTotalPages(json.pages || 1);
        setDataSource("supabase");
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [query, activeCategory, color, fabric, occasion, priceRange, brand]);

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

  // ── Derived state ──────────────────────────────────────────────────────────
  // For search/filter views use the loaded products
  // For homepage use homepageSections
  const allHomepageProducts = useMemo(() =>
    Object.values(homepageSections).flat(), [homepageSections]);

  const indexed  = useMemo(() => buildIndex(products.length > 0 ? products : allHomepageProducts), [products, allHomepageProducts]);
  const BRANDS   = useMemo(() => ["All Brands", ...Array.from(new Set(allHomepageProducts.map(p => p.brand))).sort()], [allHomepageProducts]);

  // Client-side filter on loaded products (color/fabric/occasion filters)
  const filtered = useMemo(() => {
    if (products.length === 0) return [];
    return products.filter(p => {
      if (color !== "All" && p.color !== color) return false;
      if (fabric !== "All Fabrics" && p.fabric !== fabric) return false;
      if (occasion !== "All Occasions" && p.occasion !== occasion) return false;
      return true;
    });
  }, [products, color, fabric, occasion]);

  const POPULATED_CATEGORIES = useMemo(() => {
    const withProducts = new Set(Object.keys(homepageSections));
    return CATEGORIES.filter(cat => cat === "All" || withProducts.has(cat));
  }, [homepageSections]);

  // For similar products use homepage data
  const similar = selectedProduct
    ? allHomepageProducts.filter(p => {
        if (p.id === selectedProduct.id) return false;
        const pCats = p.categories || [p.category];
        const sCats = selectedProduct.categories || [selectedProduct.category];
        return pCats.some(c => sCats.includes(c));
      }).slice(0, 6)
    : [];

  const isFiltering = query || activeCategory !== "All" || color !== "All" || fabric !== "All Fabrics" || occasion !== "All Occasions" || priceRange !== "All Prices" || brand !== "All Brands";

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
    checking: { dot:"checking", text:"Checking…",                    color:"#c9a96e" },
    in_stock: { dot:"in",       text:"In Stock (at last import)",    color:"#3d8a60" },
    sold_out: { dot:"out",      text:"Sold Out (at last import)",    color:"#b03030" },
    removed:  { dot:"removed",  text:"Product removed by brand",     color:"#888"    },
    unknown:  { dot:"in",       text:"Check brand site for stock",   color:"#888"    },
  };

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:"linear-gradient(160deg,#fdfcfb 0%,#f5f0eb 40%,#ede8e0 100%)", minHeight:"100vh", color:"#2a2420" }}>
      <style>{CSS}</style>

      {/* ── NAV ── */}
      <nav className="nav">
        <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
          <button className="hamburger" onClick={() => setSidebarOpen(v => !v)} aria-label="Toggle categories">
            <span style={{ transform: sidebarOpen ? "rotate(45deg) translate(4px,4px)" : "none", transition:"transform .22s" }}/>
            <span style={{ opacity: sidebarOpen ? 0 : 1, transition:"opacity .22s" }}/>
            <span style={{ transform: sidebarOpen ? "rotate(-45deg) translate(4px,-4px)" : "none", transition:"transform .22s" }}/>
          </button>
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

      {/* ── LAYOUT: LEFT PANEL + MAIN CONTENT ── */}
      <div style={{ display:"flex", alignItems:"flex-start" }}>

        {/* ── LEFT CATEGORY PANEL ── */}
        <aside style={{
          width: sidebarOpen ? "220px" : "0",
          minWidth: sidebarOpen ? "220px" : "0",
          overflow:"hidden",
          transition:"width .32s cubic-bezier(.4,0,.2,1), min-width .32s cubic-bezier(.4,0,.2,1)",
          background:"#fff",
          borderRight:"1px solid #e8e0d8",
          position:"sticky",
          top:"60px",
          height:"calc(100vh - 60px)",
          overflowY:"auto",
          flexShrink:0,
          boxShadow: sidebarOpen ? "2px 0 12px rgba(0,0,0,.04)" : "none",
        }}>
          <div style={{ width:"220px", padding:"20px 0 40px" }}>
            {/* All */}
            <button
              onClick={() => setActiveCategory("All")}
              style={{
                width:"100%", padding:"10px 20px", background:activeCategory==="All"?"#fdf7ef":"transparent",
                border:"none", borderLeft:`3px solid ${activeCategory==="All"?"#c9a96e":"transparent"}`,
                textAlign:"left", cursor:"pointer", fontSize:".8rem", letterSpacing:".06em",
                color:activeCategory==="All"?"#c9a96e":"#555", fontFamily:"'DM Sans',sans-serif",
                fontWeight:activeCategory==="All"?"500":"400", transition:"all .15s",
              }}>
              All Dresses
              <span style={{ float:"right", fontSize:".7rem", color:"#bbb" }}>{products.length}</span>
            </button>

            <div style={{ padding:"14px 20px 6px", fontSize:".58rem", letterSpacing:".22em", textTransform:"uppercase", color:"#bbb" }}>
              Categories
            </div>

            {/* Only populated categories */}
            {POPULATED_CATEGORIES.filter(c => c !== "All").map(cat => {
              const count = products.filter(p => (p.categories || [p.category]).includes(cat)).length;
              const isActive = activeCategory === cat;
              return (
                <button key={cat}
                  onClick={() => setActiveCategory(isActive ? "All" : cat)}
                  style={{
                    width:"100%", padding:"9px 20px", background:isActive?"#fdf7ef":"transparent",
                    border:"none", borderLeft:`3px solid ${isActive?"#c9a96e":"transparent"}`,
                    textAlign:"left", cursor:"pointer", fontSize:".78rem", letterSpacing:".04em",
                    color:isActive?"#c9a96e":"#666", fontFamily:"'DM Sans',sans-serif",
                    fontWeight:isActive?"500":"400", transition:"all .15s", display:"flex",
                    alignItems:"center", justifyContent:"space-between",
                  }}>
                  <span>{cat}</span>
                  <span style={{ fontSize:".68rem", color:isActive?"#c9a96e":"#bbb" }}>{count}</span>
                </button>
              );
            })}

            <div style={{ padding:"14px 20px 6px", fontSize:".58rem", letterSpacing:".22em", textTransform:"uppercase", color:"#bbb", marginTop:"8px", borderTop:"1px solid #f0ebe4" }}>
              Brands
            </div>
            {BRANDS.filter(b => b !== "All Brands").map(b => {
              const isActive = brand === b;
              return (
                <button key={b}
                  onClick={() => setBrand(isActive ? "All Brands" : b)}
                  style={{
                    width:"100%", padding:"8px 20px", background:isActive?"#fdf7ef":"transparent",
                    border:"none", borderLeft:`3px solid ${isActive?"#c9a96e":"transparent"}`,
                    textAlign:"left", cursor:"pointer", fontSize:".75rem", letterSpacing:".04em",
                    color:isActive?"#c9a96e":"#777", fontFamily:"'DM Sans',sans-serif",
                    fontWeight:isActive?"500":"400", transition:"all .15s",
                  }}>
                  {b}
                </button>
              );
            })}
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <div style={{ flex:1, minWidth:0 }}>

          {/* HERO */}
          <section style={{ textAlign:"center", padding:"56px 32px 40px", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 75% 55% at 50% 0%,rgba(201,169,110,.09) 0%,transparent 72%)", pointerEvents:"none" }} />
            <p style={{ fontSize:".65rem", letterSpacing:".38em", textTransform:"uppercase", color:"#c9a96e", marginBottom:"14px" }}>Pakistan's Women's Fashion Discovery</p>
            <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(1.8rem,4vw,3.2rem)", fontWeight:300, lineHeight:1.1, marginBottom:"4px" }}>Find Every Dress,</h1>
            <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(1.8rem,4vw,3.2rem)", fontWeight:300, fontStyle:"italic", lineHeight:1.1, marginBottom:"24px", color:"#c9a96e" }}>Across Every Brand</h1>
            <div style={{ width:"48px", height:"1px", background:"linear-gradient(90deg,transparent,#c9a96e,transparent)", margin:"0 auto 28px" }} />

            {/* SEARCH */}
            <div style={{ maxWidth:"580px", margin:"0 auto 16px" }}>
              <div ref={searchRef} style={{ position:"relative" }}>
                <div style={{ display:"flex", alignItems:"center", background:"#fff", border:"1px solid #e0d8d0", borderRadius:"8px", padding:"12px 18px", gap:"12px", boxShadow:"0 4px 22px rgba(0,0,0,.06)" }}>
                  <span style={{ color:"#ccc", fontSize:"1.1rem" }}>⊹</span>
                  <input className="search-box"
                    placeholder="Search: black lawn, kala suit, bridal chiffon…"
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

            {/* QUICK TAGS */}
            <div style={{ display:"flex", flexWrap:"wrap", gap:"8px", justifyContent:"center" }}>
              {QUICK_TAGS.filter(t => POPULATED_CATEGORIES.includes(t)).map(t => (
                <button key={t} className={`quick-tag ${activeCategory===t?"active":""}`}
                  onClick={() => { setActiveCategory(activeCategory===t?"All":t); setQuery(""); }}>
                  {t}
                </button>
              ))}
            </div>
          </section>

          {/* ── PRODUCTS AREA ── */}
          <div style={{ padding:"0 24px 60px" }}>

            {/* LOADING SKELETON */}
            {loading && (
              <div>
                <div style={{ display:"flex", gap:"10px", marginBottom:"24px" }}>
                  {[1,2,3].map(i => (
                    <div key={i} style={{ height:"32px", width:"80px", background:"#f0ebe4", borderRadius:"4px", animation:"shimmer 1.4s infinite" }} />
                  ))}
                </div>
                {[1,2].map(section => (
                  <div key={section} style={{ marginBottom:"48px" }}>
                    <div style={{ height:"28px", width:"180px", background:"#f0ebe4", borderRadius:"4px", marginBottom:"8px", animation:"shimmer 1.4s infinite" }} />
                    <div style={{ height:"14px", width:"80px", background:"#f5f0eb", borderRadius:"4px", marginBottom:"20px", animation:"shimmer 1.4s infinite" }} />
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:"20px" }}>
                      {[1,2,3,4].map(i => (
                        <div key={i} style={{ background:"#fff", border:"1px solid #e8e0d8", borderRadius:"10px", overflow:"hidden" }}>
                          <div style={{ height:"300px", background:"linear-gradient(90deg,#f5f0eb 25%,#ede8e0 50%,#f5f0eb 75%)", backgroundSize:"200% 100%", animation:"shimmer 1.4s infinite" }} />
                          <div style={{ padding:"14px" }}>
                            <div style={{ height:"10px", width:"60px", background:"#f0ebe4", borderRadius:"3px", marginBottom:"8px", animation:"shimmer 1.4s infinite" }} />
                            <div style={{ height:"16px", width:"90%", background:"#f0ebe4", borderRadius:"3px", marginBottom:"6px", animation:"shimmer 1.4s infinite" }} />
                            <div style={{ height:"14px", width:"50%", background:"#f5f0eb", borderRadius:"3px", animation:"shimmer 1.4s infinite" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && (<>

            {/* FILTER ROW */}
            <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"14px", flexWrap:"wrap" }}>
              <button className={`filter-btn ${filtersOpen?"active":""}`} onClick={() => setFiltersOpen(f=>!f)}>
                ⊞ Filters {activeFilterCount>0 && `(${activeFilterCount})`}
              </button>
              {activeFilterCount>0 && (
                <button className="filter-btn" onClick={clearAll} style={{ color:"#b03030", borderColor:"#f0c0c0" }}>Clear All</button>
              )}
              <span style={{ fontSize:".7rem", color:"#bbb", marginLeft:"auto", letterSpacing:".08em" }}>
                {isFiltering ? `${totalResults} dresses` : ""}
              </span>
            </div>

            {/* FILTER PANEL */}
            <div className="filter-panel" style={{ maxHeight:filtersOpen?"420px":"0", padding:filtersOpen?"20px":"0 20px", marginBottom:filtersOpen?"20px":"0" }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))", gap:"18px" }}>
                {[
                  { label:"Brand",       value:brand,     setter:setBrand,     options:BRANDS },
                  { label:"Color",       value:color,     setter:setColor,     options:STATIC_COLORS },
                  { label:"Price Range", value:priceRange,setter:setPriceRange,options:PRICE_RANGES },
                  { label:"Fabric",      value:fabric,    setter:setFabric,    options:STATIC_FABRICS },
                  { label:"Occasion",    value:occasion,  setter:setOccasion,  options:STATIC_OCCASIONS },
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

            {/* ── SEARCH/FILTER RESULTS — flat grid ── */}
            {isFiltering ? (
              <>
                {loadingMore ? (
                  <div style={{ textAlign:"center", padding:"60px 0", color:"#c9a96e" }}>
                    <div style={{ fontSize:"1.5rem", marginBottom:"12px" }}>◌</div>
                    <p style={{ fontSize:".8rem", letterSpacing:".1em" }}>Searching...</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"80px 0", color:"#ccc" }}>
                    <div style={{ fontSize:"3rem", marginBottom:"16px" }}>◌</div>
                    <p style={{ fontSize:".85rem" }}>No dresses found</p>
                    <p style={{ fontSize:".75rem", color:"#bbb", marginTop:"8px" }}>Try clearing filters or searching differently</p>
                    <button className="filter-btn" onClick={clearAll} style={{ marginTop:"16px" }}>Clear All</button>
                  </div>
                ) : (
                  <>
                    {activeCategory !== "All" && (
                      <div style={{ marginBottom:"20px" }}>
                        <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"1.6rem", fontWeight:400, color:"#2a2420" }}>
                          {activeCategory}
                        </h2>
                        <p style={{ fontSize:".7rem", color:"#aaa", marginTop:"4px", letterSpacing:".08em" }}>{totalResults} dresses</p>
                      </div>
                    )}
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:"20px" }}>
                      {filtered.map((p, i) => (
                        <ProductCard key={p.id} p={p} i={i} wishlist={wishlist} toggleWish={toggleWish} onClick={() => setSelectedProduct(p)} />
                      ))}
                    </div>
                    {totalPages > currentPage && (
                      <div style={{ textAlign:"center", marginTop:"32px" }}>
                        <button
                          onClick={() => {
                            const nextPage = currentPage + 1;
                            setCurrentPage(nextPage);
                            const [minP, maxP] = parsePriceRange(priceRange);
                            const params = new URLSearchParams({ page: nextPage });
                            if (query)                    params.set("q", query);
                            if (activeCategory !== "All") params.set("category", activeCategory);
                            if (brand !== "All Brands")   params.set("brand", brand);
                            if (minP) params.set("min_price", minP);
                            if (maxP) params.set("max_price", maxP);
                            const endpoint = query ? "/api/search" : "/api/products";
                            fetch(`${endpoint}?${params}`)
                              .then(r => r.json())
                              .then(json => {
                                const more = (json.products || []).map(processProduct);
                                setProducts(prev => [...prev, ...more]);
                                setTotalPages(json.pages || 1);
                              });
                          }}
                          className="filter-btn"
                          style={{ padding:"12px 40px", fontSize:".75rem" }}>
                          Load More
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              /* ── HOMEPAGE — category sections with 4 products + View All ── */
              <div>
                {POPULATED_CATEGORIES.filter(c => c !== "All").map(cat => {
                  const catProducts = homepageSections[cat] || [];
                  if (catProducts.length === 0) return null;
                  return (
                    <div key={cat} style={{ marginBottom:"48px" }}>
                      {/* Section header */}
                      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:"16px", paddingBottom:"12px", borderBottom:"1px solid #e8e0d8" }}>
                        <div>
                          <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"1.55rem", fontWeight:400, color:"#2a2420" }}>{cat}</h2>
                          <p style={{ fontSize:".68rem", color:"#bbb", marginTop:"3px", letterSpacing:".08em" }}>{catProducts.length} dresses</p>
                        </div>
                        <button
                          onClick={() => setActiveCategory(cat)}
                          className="filter-btn"
                          style={{ fontSize:".68rem", color:"#c9a96e", borderColor:"#e8d5b0" }}>
                          View All {cat} →
                        </button>
                      </div>
                      {/* 4 product preview */}
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:"20px" }}>
                        {catProducts.map((p, i) => (
                          <ProductCard key={p.id} p={p} i={i} wishlist={wishlist} toggleWish={toggleWish} onClick={() => setSelectedProduct(p)} />
                        ))}
                      </div>
                      {/* View all button */}
                      <div style={{ textAlign:"center", marginTop:"16px" }}>
                        <button
                          onClick={() => setActiveCategory(cat)}
                          style={{ background:"none", border:"1px solid #e0d8d0", borderRadius:"4px", padding:"10px 28px", cursor:"pointer", fontSize:".72rem", letterSpacing:".14em", textTransform:"uppercase", color:"#888", fontFamily:"'DM Sans',sans-serif", transition:"all .2s" }}
                          onMouseOver={e => { e.target.style.borderColor="#c9a96e"; e.target.style.color="#c9a96e"; }}
                          onMouseOut={e => { e.target.style.borderColor="#e0d8d0"; e.target.style.color="#888"; }}>
                          View all {cat} dresses →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </>)}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{ borderTop:"1px solid #e8e0d8", padding:"40px 24px", textAlign:"center", background:"rgba(255,255,255,.55)" }}>
        <div className="wordmark" style={{ color:"#c9a96e", fontSize:"1.35rem", marginBottom:"6px" }}>Poshak.pk</div>
        <p style={{ fontSize:".62rem", letterSpacing:".15em", color:"#bbb", textTransform:"uppercase" }}>Pakistan's Women's Fashion Discovery · v4.0</p>
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
                <span style={{ fontSize:".65rem", color:"#bbb", marginLeft:"auto" }}>Last import</span>
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
  const [imgSrc, setImgSrc] = useState(src);
  useEffect(() => { setImgSrc(src); }, [src]);
  return (
    <img
      className={className}
      src={imgSrc}
      alt={alt}
      loading="lazy"
      onError={() => {
        setImgSrc("https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&q=80");
      }}
    />
  );
}

// ─── PRODUCT CARD ─────────────────────────────────────────────────────────────
function ProductCard({ p, i, wishlist, toggleWish, onClick }) {
  return (
    <div
      className={`card animate-in ${!p.in_stock ? "sold-out" : ""}`}
      style={{ animationDelay:`${Math.min(i,12)*.055}s` }}
      onClick={onClick}>
      <div style={{ position:"relative", overflow:"hidden" }}>
        {/* Image — always show regardless of stock status */}
        <ImageWithFallback src={p.image} alt={p.name} className="card-img" />

        {/* Sold Out badge — top-right, small, doesn't cover image */}
        {!p.in_stock && (
          <div style={{
            position:"absolute", top:"10px", right:"10px",
            background:"rgba(42,36,32,.85)", backdropFilter:"blur(4px)",
            color:"#fff", fontSize:".58rem", letterSpacing:".12em",
            textTransform:"uppercase", padding:"4px 8px",
            borderRadius:"3px", zIndex:4, fontWeight:500,
          }}>
            Sold Out
          </div>
        )}

        {/* Regular badge — top-left, only if in stock */}
        {p.in_stock && p.badge && (
          <div className="badge-pill" style={{ background:BADGE_COLORS[p.badge]||"#888" }}>{p.badge}</div>
        )}

        {/* Sale % */}
        {p.original_price > p.price && (
          <div style={{
            position:"absolute", top: p.in_stock && p.badge ? "38px" : "10px", left:"10px",
            background:BADGE_COLORS.Sale, color:"#fff", fontSize:".56rem",
            letterSpacing:".12em", textTransform:"uppercase", padding:"3px 8px",
            borderRadius:"20px", fontWeight:600, zIndex:2,
          }}>
            -{Math.round((1 - p.price/p.original_price)*100)}% Off
          </div>
        )}

        <button className="wish-btn" onClick={e => toggleWish(p.id, e)}>
          <span style={{ color:wishlist.includes(p.id)?"#c9a96e":"#ccc", fontSize:".9rem" }}>
            {wishlist.includes(p.id) ? "♥" : "♡"}
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
  );
}
