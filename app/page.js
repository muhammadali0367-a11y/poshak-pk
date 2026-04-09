"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import SharedNav from "./SharedNav";

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
const SORT_OPTIONS     = [
  { value:"price_desc", label:"Price: High to Low" },
  { value:"price_asc",  label:"Price: Low to High" },
  { value:"name_asc",   label:"Name: A to Z" },
  { value:"name_desc",  label:"Name: Z to A" },
];
// Colors/fabrics/occasions are now loaded dynamically from the database
const STATIC_FABRICS   = ["All Fabrics"];
const STATIC_OCCASIONS = ["All Occasions"];
const STATIC_COLORS    = ["All"];
const BADGE_COLORS     = { Bestseller:"#b07d4a",New:"#3d8a60",Sale:"#b03030",Exclusive:"#6a4a8a",Premium:"#3a6a9a",Trending:"#9a6a30",Festive:"#8a5a2a" };

// ── Category quick tags shown in hero ──
const QUICK_TAGS = ["Lawn","Bridal","Unstitched","Co-ords","Festive / Eid","Formal","Kurta","Winter Collection"];

function slugify(cat) {
  return (cat||"").toLowerCase().replace(/\s*\/\s*/g,"-").replace(/\s+/g,"-");
}

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
  .card-img{height:220px;}
  .product-grid{grid-template-columns:repeat(2,1fr)!important;gap:12px!important;}
  .card-info{padding:10px!important;}
  .card-tag{display:none!important;}
  .nav-desktop{display:none!important;}
}
`;

// ═══════════════════════════════════════════════════════════════════════════════
//  ROOT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const router = useRouter();
  const [mounted,         setMounted]         = useState(false);
  const [products,        setProducts]        = useState([]);
  const [homepageSections,setHomepageSections]= useState({});   // { "Lawn": [...4 products] }
  const [allBrands,        setAllBrands]        = useState([]);
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
  const [sort,            setSort]            = useState("price_desc");
  const [fabric,          setFabric]          = useState("All Fabrics");
  const [occasion,        setOccasion]        = useState("All Occasions");
  const [color,           setColor]           = useState("All");
  const [brand,           setBrand]           = useState("All Brands");
  const [wishlist,        setWishlist]        = useState([]);
  const [recentlyViewed,  setRecentlyViewed]  = useState([]);
  const [showBackToTop,   setShowBackToTop]   = useState(false);

  // Set mounted on client only — prevents hydration mismatch
  useEffect(() => {
    setMounted(true);
    // Load recently viewed from localStorage
    try {
      const rv = JSON.parse(localStorage.getItem("poshak_recently_viewed") || "[]");
      setRecentlyViewed(rv);
    } catch(e) {}
    // Back to top scroll listener
    const onScroll = () => setShowBackToTop(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Load wishlist from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("poshak_wishlist");
      if (saved) setWishlist(JSON.parse(saved));
    } catch(e) {}
  }, []);
  const [selectedProduct, setSelectedProduct] = useState(null);

  function openProduct(product) {
    setSelectedProduct(product);
    // Save to recently viewed (max 10)
    try {
      const rv = JSON.parse(localStorage.getItem("poshak_recently_viewed") || "[]");
      const filtered = rv.filter(p => p.id !== product.id);
      const updated = [product, ...filtered].slice(0, 10);
      localStorage.setItem("poshak_recently_viewed", JSON.stringify(updated));
      setRecentlyViewed(updated);
    } catch(e) {}
  }
  const [filtersOpen,     setFiltersOpen]     = useState(false);
  const [suggestions,     setSuggestions]     = useState([]);
  const [showSugg,        setShowSugg]        = useState(false);
  const [showAllDropdown, setShowAllDropdown] = useState(false);
  const [liveStock,       setLiveStock]       = useState("checking");
  const [dynamicColors,   setDynamicColors]   = useState([]);
  const [dynamicFabrics,  setDynamicFabrics]  = useState([]);
  const [dynamicOccasions,setDynamicOccasions]= useState([]);
  const searchRef = useRef(null);
  const sentinelRef = useRef(null);

  // ── Parse price range ──────────────────────────────────────────────────────
  function parsePriceRange(pr) {
    if (!pr || pr === "All Prices") return [null, null];
    // Format: "Under 3,000"
    const u = pr.match(/Under\s*([\d,]+)/);
    if (u) return [null, parseInt(u[1].replace(/,/g,''))];
    // Format: "3,000–6,000" or "3,000-6,000"
    const m = pr.match(/([\d,]+)\s*[\u2013-]\s*([\d,]+)/);
    if (m) return [parseInt(m[1].replace(/,/g,'')), parseInt(m[2].replace(/,/g,''))];
    // Format: "20,000+"
    const o = pr.match(/([\d,]+)\+/);
    if (o) return [parseInt(o[1].replace(/,/g,'')), null];
    return [null, null];
  }

  // ── Process raw product from API (derive category/color/fabric/etc) ────────
  function processProduct(p) {
    // Use stored DB values first — fall back to client-side derivation only if empty
    const dbCategory = (p.category || "").trim();
    const categories = dbCategory ? [dbCategory] : deriveCategory(p.product_type, p.tags, p.collection);
    const color      = p.color   || deriveColor(p.tags, p.name);
    const fabric     = p.fabric  || deriveFabric(p.tags, p.product_type, p.name);
    const occasion   = p.occasion || deriveOccasion(p.tags, p.collection, categories[0], p.name);
    const badge      = deriveBadge(p.tags, p.name, p.original_price, p.price);
    const price      = Number(p.price) || 0;
    const original_price = Number(p.original_price) || 0;
    return {
      ...p,
      price,
      original_price,
      categories,
      category:  categories[0],
      color, fabric, occasion, badge,
      image: p.image_url || "",
      in_stock: p.in_stock !== false,
    };
  }

  // ── Load homepage sections ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mounted) return;
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
  }, [mounted]);

  // ── Fetch all brands separately — always runs regardless of homepage cache ──
  useEffect(() => {
    fetch("/api/brands")
      .then(r => r.json())
      .then(json => { if (json.brands) setAllBrands(json.brands); })
      .catch(() => {});

    // Fetch dynamic filter options from database
    fetch("/api/filters")
      .then(r => r.json())
      .then(json => {
        if (json.colors)   setDynamicColors(["All", ...json.colors]);
        if (json.fabrics)  setDynamicFabrics(["All Fabrics", ...json.fabrics]);
        if (json.occasions) setDynamicOccasions(["All Occasions", ...json.occasions]);
      })
      .catch(() => {});
  }, []);

  // ── Load products when filter changes ────────────────────────────────────
  useEffect(() => {
    const hasFilter = brand !== "All Brands" || priceRange !== "All Prices" ||
                      color !== "All" || fabric !== "All Fabrics" || occasion !== "All Occasions";
    if (!hasFilter) return;

    setLoadingMore(true);
    setCurrentPage(1);

    const [minP, maxP] = parsePriceRange(priceRange);
    const params = new URLSearchParams({ page: 1 });
    if (brand   !== "All Brands")     params.set("brand",    brand);
    if (color   !== "All")            params.set("color",    color);
    if (fabric  !== "All Fabrics")    params.set("fabric",   fabric);
    if (occasion !== "All Occasions") params.set("occasion", occasion);
    if (minP) params.set("min_price", minP);
    if (maxP) params.set("max_price", maxP);
    params.set("sort", sort);

    fetch(`/api/products?${params}`)
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
  }, [brand, priceRange, color, fabric, occasion, sort]);

  // ── Infinite scroll — auto-load next page when sentinel comes into view ──
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && currentPage < totalPages) {
          const nextPage = currentPage + 1;
          setCurrentPage(nextPage);
          setLoadingMore(true);
          const [minP, maxP] = parsePriceRange(priceRange);
          const params = new URLSearchParams({ page: nextPage });
          if (query)                    params.set("q", query);
          if (activeCategory !== "All") params.set("category", activeCategory);
          if (brand !== "All Brands")   params.set("brand", brand);
          if (color !== "All")          params.set("color", color);
          if (fabric !== "All Fabrics") params.set("fabric", fabric);
          if (occasion !== "All Occasions") params.set("occasion", occasion);
          if (minP) params.set("min_price", minP);
          if (maxP) params.set("max_price", maxP);
          params.set("sort", sort);
          const endpoint = query ? "/api/search" : "/api/products";
          fetch(`${endpoint}?${params}`)
            .then(r => r.json())
            .then(json => {
              const more = (json.products || []).map(processProduct);
              setProducts(prev => [...prev, ...more]);
              setTotalPages(json.pages || 1);
            })
            .catch(() => {})
            .finally(() => setLoadingMore(false));
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadingMore, currentPage, totalPages, query, activeCategory, brand, color, fabric, occasion, priceRange, sort]);

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

  // ── Autocomplete suggestions (display only, no in-page filtering) ──
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
  const BRANDS   = useMemo(() => ["All Brands", ...allBrands], [allBrands]);

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

  const isFiltering = brand !== "All Brands" || priceRange !== "All Prices" || color !== "All" || fabric !== "All Fabrics" || occasion !== "All Occasions";

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

  const toggleWish = (id, e, product) => {
    e?.stopPropagation();
    setWishlist(w => {
      const isAdding = !w.includes(id);
      const updated = isAdding ? [...w,id] : w.filter(x=>x!==id);
      try { localStorage.setItem("poshak_wishlist", JSON.stringify(updated)); } catch(e) {}
      try {
        const stored = JSON.parse(localStorage.getItem("poshak_wishlist_products") || "[]");
        const updatedProds = isAdding
          ? product ? [...stored, product] : stored
          : stored.filter(p => p.id !== id);
        localStorage.setItem("poshak_wishlist_products", JSON.stringify(updatedProds));
      } catch(e) {}
      window.dispatchEvent(new Event("storage"));
      // Toast notification
      if (window.__poshakToast) window.__poshakToast(isAdding ? "♥ Added to Wishlist" : "Removed from Wishlist");
      return updated;
    });
  };
  const clearAll    = () => { setActiveCategory("All"); setColor("All"); setFabric("All Fabrics"); setOccasion("All Occasions"); setPriceRange("All Prices"); setBrand("All Brands"); setQuery(""); setSort("price_desc"); };
  const pickSugg    = (label) => { setQuery(label); setShowSugg(false); };

  // ── Stock display helpers ──
  const stockLabel = {
    checking: { dot:"checking", text:"Checking availability…", color:"#c9a96e" },
    in_stock: { dot:"in",       text:"In Stock",               color:"#3d8a60" },
    sold_out: { dot:"out",      text:"Sold Out",               color:"#b03030" },
    removed:  { dot:"removed",  text:"Product removed by brand", color:"#888"  },
    unknown:  { dot:"in",       text:"Check brand website",    color:"#888"    },
  };

  if (!mounted) return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:"#fdfcfb", minHeight:"100vh" }}>
      <SharedNav />
    </div>
  );

  return (
    <div suppressHydrationWarning style={{ fontFamily:"'DM Sans',sans-serif", background:"#fdfcfb", minHeight:"100vh", color:"#2a2420" }}>
      <style suppressHydrationWarning>{CSS}</style>

      {/* ── NAV (shared across all pages) ── */}
      <SharedNav />

      {/* ── LAYOUT ── */}
      <div>

          {/* HERO */}
          <section style={{ textAlign:"center", padding:"48px 32px 32px", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 75% 55% at 50% 0%,rgba(201,169,110,.09) 0%,transparent 72%)", pointerEvents:"none" }} />
            <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(2.4rem,6vw,4.2rem)", fontWeight:300, lineHeight:1, marginBottom:"8px", color:"#1a1210", letterSpacing:".18em", textTransform:"uppercase" }}>Poshak</h1>
            <div style={{ width:"48px", height:"1px", background:"#c9a96e", margin:"0 auto 14px" }} />
            <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(1rem,2.5vw,1.4rem)", fontWeight:300, fontStyle:"italic", color:"#a07840", marginBottom:"20px", letterSpacing:".06em" }}>Every brand. One place.</p>
            <p style={{ fontSize:".72rem", color:"#888", letterSpacing:".12em", textTransform:"uppercase" }}>
              Updated daily · 25,000+ products · 15+ brands
            </p>
            <div style={{ marginTop:"14px", display:"flex", justifyContent:"center", gap:"8px", flexWrap:"wrap" }}>
              <button onClick={() => router.push("/search?q=sale")}
                style={{ background:"#b03030", color:"#fff", border:"none", borderRadius:"20px", padding:"6px 16px", fontSize:".72rem", letterSpacing:".08em", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                On Sale
              </button>
              <button onClick={() => router.push("/new-arrivals")}
                style={{ background:"#3d8a60", color:"#fff", border:"none", borderRadius:"20px", padding:"6px 16px", fontSize:".72rem", letterSpacing:".08em", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                New Arrivals
              </button>

            </div>
          </section>

          {/* CATEGORY CAROUSEL */}
          <CategoryCarousel categories={POPULATED_CATEGORIES.filter(c=>c!=="All")} onNavigate={cat => router.push(`/category/${slugify(cat)}`)} activeCategory={activeCategory} />

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
                    <div className="product-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:"16px" }}>
                      {[1,2,3,4,5,6,7,8].map(i => (
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
                  { label:"Color",       value:color,     setter:setColor,     options:dynamicColors.length > 1 ? dynamicColors : STATIC_COLORS },
                  { label:"Price Range", value:priceRange,setter:setPriceRange,options:PRICE_RANGES },
                  { label:"Fabric",      value:fabric,    setter:setFabric,    options:dynamicFabrics.length > 1 ? dynamicFabrics : STATIC_FABRICS },
                  { label:"Occasion",    value:occasion,  setter:setOccasion,  options:dynamicOccasions.length > 1 ? dynamicOccasions : STATIC_OCCASIONS },
                ].map(({ label, value, setter, options }) => (
                  <div key={label}>
                    <div style={{ fontSize:".6rem", letterSpacing:".2em", textTransform:"uppercase", color:"#aaa", marginBottom:"8px" }}>{label}</div>
                    <select value={value} onChange={e => setter(e.target.value)} className="filter-btn" style={{ width:"100%", background:"#fff", cursor:"pointer" }}>
                      {options.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                <div>
                  <div style={{ fontSize:".6rem", letterSpacing:".2em", textTransform:"uppercase", color:"#aaa", marginBottom:"8px" }}>Sort By</div>
                  <select value={sort} onChange={e => { setSort(e.target.value); }} className="filter-btn" style={{ width:"100%", background:"#fff", cursor:"pointer" }}>
                    {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
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
                    <div className="product-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:"20px" }}>
                      {filtered.map((p, i) => (
                        <ProductCard key={p.id} p={p} i={i} wishlist={wishlist} toggleWish={toggleWish} onClick={() => router.push(`/product/${p.id}`)} />
                      ))}
                    </div>
                    {/* Infinite scroll sentinel */}
                    <div ref={sentinelRef} style={{ height:"40px", display:"flex", alignItems:"center", justifyContent:"center", marginTop:"24px" }}>
                      {loadingMore && (
                        <div style={{ fontSize:".75rem", color:"#c9a96e", letterSpacing:".1em" }}>Loading more…</div>
                      )}
                    </div>
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
                          <div style={{ display:"inline-flex", alignItems:"center", gap:"6px", background:"#fdf7ef", border:"1px solid #e8d5b0", borderRadius:"20px", padding:"2px 8px", fontSize:".65rem", color:"#9a6a30", marginBottom:"4px", letterSpacing:".04em" }}>
                            <span style={{ width:"5px", height:"5px", background:"#c9a96e", borderRadius:"50%", display:"inline-block" }}></span>
                            Updated daily
                          </div>
                          <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"1.55rem", fontWeight:400, color:"#2a2420", cursor:"pointer" }}
                            onClick={() => router.push(`/category/${slugify(cat)}`)}>
                            {cat}
                          </h2>
                          <p style={{ fontSize:".68rem", color:"#bbb", marginTop:"3px", letterSpacing:".08em" }}>
                            {catProducts.length} of many — <span style={{ color:"#c9a96e", cursor:"pointer" }} onClick={() => router.push(`/category/${slugify(cat)}`)}>view all</span>
                          </p>
                        </div>
                        <button
                          onClick={() => router.push(`/category/${slugify(cat)}`)}
                          className="filter-btn"
                          style={{ fontSize:".68rem", color:"#c9a96e", borderColor:"#e8d5b0" }}>
                          View All {cat} →
                        </button>
                      </div>
                      {/* Responsive grid: 2 cols mobile, 3 tablet, 6 desktop */}
                      <div className="product-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:"16px" }}>
                        {catProducts.slice(0,8).map((p, i) => (
                          <ProductCard key={p.id} p={p} i={i} wishlist={wishlist} toggleWish={toggleWish} onClick={() => router.push(`/product/${p.id}`)} />
                        ))}
                      </div>
                      {/* View all button */}
                      <div style={{ textAlign:"center", marginTop:"16px" }}>
                        <button
                          onClick={() => router.push(`/category/${slugify(cat)}`)}
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

      {/* FOOTER */}
      {/* Recently Viewed */}
      {recentlyViewed.length > 0 && (
        <div style={{ maxWidth:"1240px", margin:"0 auto", padding:"0 24px 40px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"16px", paddingBottom:"12px", borderBottom:"1px solid #e8e0d8" }}>
            <div>
              <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"1.4rem", fontWeight:300, color:"#2a2420" }}>Recently Viewed</h2>
              <p style={{ fontSize:".68rem", color:"#bbb", marginTop:"3px" }}>{recentlyViewed.length} items</p>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:"12px" }}>
            {recentlyViewed.slice(0, 6).map(p => (
              <div key={p.id} style={{ background:"#fff", border:"1px solid #e8e0d8", borderRadius:"8px", overflow:"hidden", cursor:"pointer" }}
                onClick={() => openProduct(p)}>
                <img src={p.image || p.image_url || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=300&q=70"}
                  alt={p.name} loading="lazy"
                  style={{ width:"100%", aspectRatio:"3/4", objectFit:"cover", display:"block", background:"#f5f0eb" }}
                  onError={e => { e.currentTarget.src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=300&q=70"; }} />
                <div style={{ padding:"8px" }}>
                  <div style={{ fontSize:".58rem", color:"#c9a96e", textTransform:"uppercase", letterSpacing:".1em", marginBottom:"2px" }}>{p.brand}</div>
                  <div style={{ fontSize:".78rem", color:"#2a2420", lineHeight:1.3, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{p.name}</div>
                  <div style={{ fontSize:".78rem", fontWeight:500, marginTop:"4px" }}>Rs. {Number(p.price).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Back to top */}
      <button className={`back-to-top ${showBackToTop?"visible":""}`}
        onClick={() => window.scrollTo({ top:0, behavior:"smooth" })}
        aria-label="Back to top">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 12V2M3 6l4-4 4 4" stroke="#c9a96e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <footer style={{ borderTop:"1px solid #e8e0d8", padding:"40px 24px 32px", background:"rgba(255,255,255,.55)" }}>
        <div style={{ maxWidth:"1240px", margin:"0 auto" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:"32px", marginBottom:"32px" }}>
            <div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"1.4rem", color:"#c9a96e", marginBottom:"8px", fontWeight:300 }}>Poshak</div>
              <p style={{ fontSize:".72rem", color:"#777", lineHeight:1.6, letterSpacing:".02em" }}>Every brand. One place.<br/>Pakistan's first women's fashion search engine.</p>
            </div>
            <div>
              <div style={{ fontSize:".6rem", letterSpacing:".2em", textTransform:"uppercase", color:"#c9a96e", marginBottom:"10px" }}>Top Brands</div>
              {["Khaadi","Gul Ahmed","Maria B","Sana Safinaz","Limelight","Beechtree"].map(b => (
                <div key={b} style={{ fontSize:".75rem", color:"#666", marginBottom:"5px", cursor:"pointer" }}
                  onClick={() => router.push(`/brand/${slugify(b)}`)}>{b}</div>
              ))}
            </div>
            <div>
              <div style={{ fontSize:".6rem", letterSpacing:".2em", textTransform:"uppercase", color:"#c9a96e", marginBottom:"10px" }}>Categories</div>
              {["Lawn","Bridal","Pret / Ready to Wear","Unstitched","Festive / Eid","Formal"].map(cat => (
                <div key={cat} style={{ fontSize:".75rem", color:"#666", marginBottom:"5px", cursor:"pointer" }}
                  onClick={() => router.push(`/category/${slugify(cat)}`)}>{cat}</div>
              ))}
            </div>
            <div>
              <div style={{ fontSize:".6rem", letterSpacing:".2em", textTransform:"uppercase", color:"#c9a96e", marginBottom:"10px" }}>About</div>
              <div style={{ fontSize:".75rem", color:"#666", marginBottom:"5px", cursor:"pointer" }}
                onClick={() => router.push("/about")}>About Poshak</div>
              <div style={{ fontSize:".75rem", color:"#666", marginBottom:"12px", cursor:"pointer" }}
                onClick={() => router.push("/about#contact")}>Contact</div>
              <div style={{ fontSize:".6rem", letterSpacing:".1em", textTransform:"uppercase", color:"#c9a96e", marginBottom:"6px" }}>Get in touch</div>
              <a href="mailto:hello@theposhak.pk"
                style={{ fontSize:".72rem", color:"#666", display:"block", marginBottom:"4px", textDecoration:"none" }}>
                hello@theposhak.pk
              </a>
              <a href="https://wa.me/923161200044"
                style={{ fontSize:".72rem", color:"#666", display:"block", textDecoration:"none" }}>
                +92 316 1200044
              </a>
            </div>
          </div>
          <div style={{ borderTop:"1px solid #e8e0d8", paddingTop:"16px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"8px" }}>
            <p style={{ fontSize:".62rem", letterSpacing:".12em", color:"#888", textTransform:"uppercase" }}>© 2026 Poshak · Pakistan's Women's Fashion Discovery</p>
            <p style={{ fontSize:".62rem", color:"#888" }}>Updated daily from 15+ brands</p>
          </div>
        </div>
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
                    Rs. {(selectedProduct.price||0).toLocaleString()}
                  </div>
                  {selectedProduct.original_price > selectedProduct.price && (
                    <div style={{ fontSize:".8rem", color:"#bbb", textDecoration:"line-through" }}>
                      Rs. {(selectedProduct.original_price||0).toLocaleString()}
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
                          <div style={{ fontSize:".7rem", color:"#aaa" }}>Rs. {(sp.price||0).toLocaleString()}</div>
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

// ─── SIDEBAR SECTION (collapsible) ───────────────────────────────────────────
function SidebarSection({ title, items, onItemClick }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop:"1px solid #f0ebe4", marginTop:"4px" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ width:"100%", padding:"12px 20px", background:"transparent", border:"none", textAlign:"left", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:".6rem", letterSpacing:".22em", textTransform:"uppercase", color:"#bbb", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        {title}
        <span style={{ transition:"transform .2s", transform: open?"rotate(180deg)":"none", fontSize:".7rem" }}>▾</span>
      </button>
      {open && (
        <div>
          {items.map(item => (
            <button key={item}
              onClick={() => onItemClick(item)}
              className="sb-cat-btn">
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CATEGORY CAROUSEL (static scrollable — no auto-scroll) ───────────────────
function CategoryCarousel({ categories, onNavigate, activeCategory }) {
  const COLORS = ["#f5ebe0","#e8f0f5","#f0ebe5","#e8f5ec","#f5e8f0","#f5f0e8","#e8eef5","#f0f5e8","#f5e8e8","#e8f5f5","#f0e8f5","#f5f5e8"];

  return (
    <div style={{ position:"relative", borderBottom:"1px solid #e8e0d8", borderTop:"1px solid #e8e0d8", background:"#fdfcfb" }}>
      <div style={{ position:"absolute", left:0, top:0, bottom:0, width:"24px", background:"linear-gradient(90deg,#fdfcfb,transparent)", zIndex:2, pointerEvents:"none" }} />
      <div style={{ position:"absolute", right:0, top:0, bottom:0, width:"24px", background:"linear-gradient(270deg,#fdfcfb,transparent)", zIndex:2, pointerEvents:"none" }} />
      <div style={{ display:"flex", overflowX:"auto", gap:0, userSelect:"none", scrollbarWidth:"none", msOverflowStyle:"none" }}>
        {categories.map((cat, i) => {
          const isActive = activeCategory === cat;
          return (
            <button key={cat}
              onClick={() => onNavigate(cat)}
              style={{
                flexShrink:0, padding:"13px 22px",
                background: isActive ? "#2a2420" : COLORS[i % COLORS.length],
                border:"none", borderRight:"1px solid #e8e0d8", cursor:"pointer",
                fontFamily:"'DM Sans',sans-serif", fontSize:".72rem", letterSpacing:".12em",
                textTransform:"uppercase",
                color: isActive ? "#c9a96e" : "#555",
                whiteSpace:"nowrap", transition:"background .18s, color .18s",
                fontWeight: isActive ? 500 : 400,
              }}
              onMouseOver={e => { if(!isActive){ e.currentTarget.style.background="#c9a96e"; e.currentTarget.style.color="#fff"; }}}
              onMouseOut={e => { if(!isActive){ e.currentTarget.style.background=COLORS[i % COLORS.length]; e.currentTarget.style.color="#555"; }}}>
              {cat}
            </button>
          );
        })}
      </div>
    </div>
  );
}
function ImageWithFallback({ src, alt, className, priority = false }) {
  const [imgSrc, setImgSrc] = useState(src);
  useEffect(() => { setImgSrc(src); }, [src]);
  return (
    <img
      className={className}
      src={imgSrc}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      onError={() => {
        setImgSrc("https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&q=80");
      }}
    />
  );
}

// ─── PRODUCT CARD ─────────────────────────────────────────────────────────────
function ProductCard({ p, i, wishlist, toggleWish, onClick }) {
  const priority = i < 4;
  return (
    <div
      className={`card animate-in ${!p.in_stock ? "sold-out" : ""}`}
      style={{ animationDelay:`${Math.min(i,12)*.055}s` }}
      onClick={onClick}>
      <div style={{ position:"relative", overflow:"hidden" }}>
        {/* Image — always show regardless of stock status */}
        <ImageWithFallback src={p.image} alt={p.name} className="card-img" priority={priority} />

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

        <button className="wish-btn" onClick={e => toggleWish(p.id, e, p)}>
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
            <div style={{ fontSize:".88rem", fontWeight:500, color:"#2a2420" }}>Rs. {(p.price||0).toLocaleString()}</div>
            {p.original_price > p.price && (
              <div style={{ fontSize:".72rem", color:"#bbb", textDecoration:"line-through" }}>Rs. {(p.original_price||0).toLocaleString()}</div>
            )}
          </div>
        </div>
        <div className="card-tag" style={{ display:"flex", gap:"5px", flexWrap:"wrap" }}>
          <span className="tag">{p.category}</span>
          <span className="tag">{p.occasion}</span>
        </div>
      </div>
    </div>
  );
}
