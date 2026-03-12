"use client";

import { useState, useEffect, useRef } from "react";

const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQjuWejNvV1eOM9H1abXWMB-wAJMN2reQNNY1jWWx6dap-x2OTwdMzK5uK3DO05Bq6g0appKglzUDl4/pub?gid=0&single=true&output=csv";

const FALLBACK_PRODUCTS = [
  { id: 1, name: "Embroidered Lawn 3-Piece", brand: "Khaadi", price: 4800, category: "Lawn", color: "White", fabric: "Lawn", occasion: "Eid", image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80", product_url: "https://www.khaadi.com/pk/women/", badge: "Bestseller" },
  { id: 2, name: "Printed Pret Kurta", brand: "Sapphire", price: 3200, category: "Pret / Ready to Wear", color: "Pink", fabric: "Cotton", occasion: "Casual / Everyday", image: "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400&q=80", product_url: "https://pk.sapphireonline.pk/collections/pret", badge: "New" },
  { id: 3, name: "Formal Chiffon Suit", brand: "Gul Ahmed", price: 7500, category: "Formal", color: "Navy", fabric: "Chiffon", occasion: "Wedding", image: "https://images.unsplash.com/photo-1619086303291-0ef7699e4b31?w=400&q=80", product_url: "https://www.gulahmedshop.com/collections/formal", badge: null },
  { id: 4, name: "Casual Linen Co-ord", brand: "Limelight", price: 2800, category: "Co-ords", color: "Pastel", fabric: "Linen", occasion: "Casual / Everyday", image: "https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=400&q=80", product_url: "https://www.limelightpk.com/collections/pret-wear", badge: "Sale" },
  { id: 5, name: "Luxury Eid Collection", brand: "Alkaram Studio", price: 9200, category: "Festive / Eid", color: "Red", fabric: "Silk", occasion: "Eid / Festive", image: "https://images.unsplash.com/photo-1604671801908-6f0c6a092c05?w=400&q=80", product_url: "https://www.alkaramstudio.com/collections/festive", badge: "Exclusive" },
  { id: 6, name: "Black Embroidered Kurta", brand: "Khaadi", price: 5500, category: "Kurta", color: "Black", fabric: "Cotton", occasion: "Party", image: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=400&q=80", product_url: "https://www.khaadi.com/pk/women/", badge: null },
  { id: 7, name: "Office Wear Lawn Set", brand: "Sapphire", price: 4100, category: "Lawn", color: "Multi / Printed", fabric: "Lawn", occasion: "Office / Work", image: "https://images.unsplash.com/photo-1582142407894-ec85a1260cce?w=400&q=80", product_url: "https://pk.sapphireonline.pk/collections/lawn", badge: "New" },
  { id: 8, name: "Karandi Winter Suit", brand: "Gul Ahmed", price: 6800, category: "Winter Collection", color: "Navy", fabric: "Karandi", occasion: "Winter", image: "https://images.unsplash.com/photo-1623091411395-09e79fdbfcf6?w=400&q=80", product_url: "https://www.gulahmedshop.com/collections/winter", badge: null },
  { id: 9, name: "Wedding Silk Gharara", brand: "Limelight", price: 12000, category: "Formal", color: "Red", fabric: "Silk", occasion: "Wedding", image: "https://images.unsplash.com/photo-1614886137799-1629b5a17c4c?w=400&q=80", product_url: "https://www.limelightpk.com/collections/formal-wear", badge: "Premium" },
  { id: 10, name: "Pastel Summer Pret", brand: "Alkaram Studio", price: 2500, category: "Pret / Ready to Wear", color: "Pastel", fabric: "Cotton", occasion: "Casual / Everyday", image: "https://images.unsplash.com/photo-1571513722275-4b41940f54b8?w=400&q=80", product_url: "https://www.alkaramstudio.com/collections/summer", badge: "Sale" },
  { id: 11, name: "Chiffon Party Suit", brand: "Khaadi", price: 8900, category: "Formal", color: "Pink", fabric: "Chiffon", occasion: "Party", image: "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400&q=80", product_url: "https://www.khaadi.com/pk/women/", badge: null },
  { id: 12, name: "White Eid Luxury 3-Pc", brand: "Sapphire", price: 11500, category: "Festive / Eid", color: "White", fabric: "Chiffon", occasion: "Eid / Festive", image: "https://images.unsplash.com/photo-1606503825008-909a67e63c3d?w=400&q=80", product_url: "https://pk.sapphireonline.pk/collections/eid", badge: "Trending" },
];

function parseCSV(csvText) {
  const lines = csvText.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
  return lines.slice(1).map((line, i) => {
    const values = line.match(/(".*?"|[^,]+)(?=,|$)/g) || [];
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (values[idx] || "").replace(/"/g, "").trim(); });
    return { id: i + 1, name: obj.name || "", brand: obj.brand || "", price: parseInt(obj.price) || 0, category: obj.category || "", color: obj.color || "", fabric: obj.fabric || "", occasion: obj.occasion || "", image: obj.image_url || "", product_url: obj.product_url || "#", badge: obj.badge || null };
  }).filter(p => p.name);
}

const PRICE_RANGES = ["All Prices", "Under 3,000", "3,000–6,000", "6,000–10,000", "10,000–20,000", "20,000+"];
const STATIC_CATEGORIES = ["All", "Unstitched", "Pret / Ready to Wear", "Luxury Pret", "Lawn", "Kurta", "Co-ords", "Shalwar Kameez", "Formal", "Bridal", "Winter Collection", "Festive / Eid"];
const STATIC_FABRICS = ["All Fabrics", "Lawn", "Cotton", "Chiffon", "Silk", "Organza", "Velvet", "Khaddar", "Karandi", "Linen", "Cambric", "Jacquard", "Net", "Raw Silk"];
const STATIC_OCCASIONS = ["All Occasions", "Casual / Everyday", "Office / Work", "Formal Event", "Wedding", "Eid / Festive", "Party", "Bridal", "Winter"];
const STATIC_COLORS = ["All", "Black", "White", "Navy", "Red", "Maroon", "Pink", "Peach", "Mint", "Teal", "Mustard", "Olive", "Grey", "Beige", "Pastel", "Multi / Printed"];

const BADGE_COLORS = { "Bestseller": "#b07d4a", "New": "#3d8a60", "Sale": "#b03030", "Exclusive": "#6a4a8a", "Premium": "#3a6a9a", "Trending": "#9a6a30", "Festive": "#8a5a2a" };

function getSimilar(product, allProducts) {
  return allProducts
    .filter(p => p.id !== product.id)
    .map(p => {
      let score = 0;
      if (p.category === product.category) score += 3;
      if (p.occasion === product.occasion) score += 2;
      if (p.fabric === product.fabric) score += 2;
      if (p.brand === product.brand) score += 1;
      if (p.color === product.color) score += 1;
      const priceDiff = Math.abs(p.price - product.price);
      if (priceDiff < 2000) score += 1;
      return { ...p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

export default function App() {
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("All Brands");
  const [category, setCategory] = useState("All");
  const [color, setColor] = useState("All");
  const [priceRange, setPriceRange] = useState("All Prices");
  const [fabric, setFabric] = useState("All Fabrics");
  const [occasion, setOccasion] = useState("All Occasions");
  const [wishlist, setWishlist] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [products, setProducts] = useState(FALLBACK_PRODUCTS);
  const [dataSource, setDataSource] = useState("fallback");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const modalRef = useRef(null);

  useEffect(() => {
    const isConfigured = !GOOGLE_SHEET_CSV_URL.includes("YOUR_SHEET_ID");
    if (!isConfigured) { setTimeout(() => setLoaded(true), 100); return; }
    setDataSource("loading");
    fetch(GOOGLE_SHEET_CSV_URL)
      .then(res => res.text())
      .then(csv => {
        const parsed = parseCSV(csv);
        if (parsed.length > 0) { setProducts(parsed); setDataSource("sheets"); }
        else setDataSource("fallback");
      })
      .catch(() => setDataSource("fallback"))
      .finally(() => setTimeout(() => setLoaded(true), 100));
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      document.body.style.overflow = "hidden";
      setTimeout(() => modalRef.current?.scrollTo({ top: 0 }), 50);
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [selectedProduct]);

  const BRANDS = ["All Brands", ...Array.from(new Set(products.map(p => p.brand))).sort()];

  const priceFilter = (price) => {
    if (priceRange === "All Prices") return true;
    if (priceRange === "Under 3,000") return price < 3000;
    if (priceRange === "3,000–6,000") return price >= 3000 && price <= 6000;
    if (priceRange === "6,000–10,000") return price > 6000 && price <= 10000;
    if (priceRange === "10,000–20,000") return price > 10000 && price <= 20000;
    if (priceRange === "20,000+") return price > 20000;
    return true;
  };

  const filtered = products.filter(p => {
    const q = query.toLowerCase();
    const matchQ = !q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.fabric.toLowerCase().includes(q) || p.occasion.toLowerCase().includes(q);
    return matchQ && (brand === "All Brands" || p.brand === brand) && (category === "All" || p.category === category) && (color === "All" || p.color === color) && (fabric === "All Fabrics" || p.fabric === fabric) && (occasion === "All Occasions" || p.occasion === occasion) && priceFilter(p.price);
  });

  const toggleWish = (id, e) => { e?.stopPropagation(); setWishlist(w => w.includes(id) ? w.filter(x => x !== id) : [...w, id]); };
  const clearFilters = () => { setBrand("All Brands"); setCategory("All"); setColor("All"); setPriceRange("All Prices"); setFabric("All Fabrics"); setOccasion("All Occasions"); setQuery(""); };
  const activeFilterCount = [brand !== "All Brands", category !== "All", color !== "All", priceRange !== "All Prices", fabric !== "All Fabrics", occasion !== "All Occasions"].filter(Boolean).length;

  const similar = selectedProduct ? getSimilar(selectedProduct, products) : [];

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "linear-gradient(160deg, #fdfcfb 0%, #f5f0eb 40%, #ede8e0 100%)", minHeight: "100vh", color: "#2a2420" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #f0ebe4; } ::-webkit-scrollbar-thumb { background: #c9a96e; border-radius: 2px; }
        .hero-fade { opacity: 0; transform: translateY(20px); transition: opacity 0.8s ease, transform 0.8s ease; }
        .hero-fade.in { opacity: 1; transform: translateY(0); }
        .card { background: #fff; border: 1px solid #e8e0d8; border-radius: 6px; overflow: hidden; transition: all 0.3s ease; cursor: pointer; position: relative; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
        .card:hover { border-color: #c9a96e; transform: translateY(-4px); box-shadow: 0 12px 32px rgba(180,140,90,0.12); }
        .card img { width: 100%; height: 280px; object-fit: cover; display: block; transition: transform 0.5s ease; }
        .card:hover img { transform: scale(1.03); }
        .search-input { background: transparent; border: none; outline: none; width: 100%; font-family: 'DM Sans', sans-serif; font-size: 1rem; color: #2a2420; }
        .search-input::placeholder { color: #bbb; }
        .filter-btn { background: #fff; border: 1px solid #e0d8d0; color: #666; padding: 8px 14px; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 0.75rem; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 3px; transition: all 0.2s; white-space: nowrap; }
        .filter-btn:hover, .filter-btn.active { border-color: #c9a96e; color: #9a6a30; background: #fdf7ef; }
        .wish-btn { position: absolute; top: 12px; right: 12px; background: rgba(255,255,255,0.92); border: 1px solid #e8e0d8; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; font-size: 1rem; backdrop-filter: blur(4px); }
        .wish-btn:hover { border-color: #c9a96e; }
        .badge-pill { position: absolute; top: 12px; left: 12px; font-family: 'DM Sans', sans-serif; font-size: 0.62rem; letter-spacing: 0.15em; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; font-weight: 500; color: #fff; }
        .cta-btn { background: #2a2420; color: #fff; border: none; padding: 12px 24px; font-family: 'DM Sans', sans-serif; font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 500; cursor: pointer; border-radius: 3px; transition: all 0.2s; width: 100%; }
        .cta-btn:hover { background: #c9a96e; }
        .filter-panel { background: #fff; border: 1px solid #e8e0d8; border-radius: 6px; overflow: hidden; transition: max-height 0.4s ease, padding 0.3s ease; box-shadow: 0 4px 16px rgba(0,0,0,0.04); }
        .section-label { font-family: 'DM Sans', sans-serif; font-size: 0.62rem; letter-spacing: 0.2em; text-transform: uppercase; color: #aaa; margin-bottom: 10px; }
        .tag { display: inline-block; background: #f5f0eb; border: 1px solid #e0d8d0; padding: 3px 10px; border-radius: 20px; font-family: 'DM Sans', sans-serif; font-size: 0.65rem; letter-spacing: 0.08em; text-transform: uppercase; color: #888; }
        .tag-btn { background: #f5f0eb; border: 1px solid #e0d8d0; padding: 5px 14px; border-radius: 20px; font-family: 'DM Sans', sans-serif; font-size: 0.68rem; letter-spacing: 0.08em; text-transform: uppercase; color: #888; cursor: pointer; transition: all 0.2s; }
        .tag-btn:hover { background: #fdf7ef; border-color: #c9a96e; color: #9a6a30; }
        .animate-stagger { opacity: 0; transform: translateY(12px); animation: fadeUp 0.45s ease forwards; }
        @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
        .divider { width: 48px; height: 1px; background: linear-gradient(90deg, transparent, #c9a96e, transparent); margin: 0 auto; }
        select { appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23aaa'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 28px !important; }

        /* MODAL */
        .modal-overlay { position: fixed; inset: 0; background: rgba(30,20,10,0.45); backdrop-filter: blur(6px); z-index: 1000; display: flex; align-items: flex-start; justify-content: center; padding: 24px 16px; overflow-y: auto; animation: fadeIn 0.2s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .modal { background: linear-gradient(160deg, #fdfcfb 0%, #f8f4ef 100%); border-radius: 12px; width: 100%; max-width: 860px; overflow: hidden; animation: slideUp 0.3s ease; box-shadow: 0 32px 80px rgba(0,0,0,0.18); }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .modal-img { width: 100%; height: 420px; object-fit: cover; display: block; }
        .modal-body { padding: 32px; }
        .modal-close { position: absolute; top: 16px; right: 16px; background: rgba(255,255,255,0.9); border: 1px solid #e8e0d8; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 1.1rem; color: #666; transition: all 0.2s; backdrop-filter: blur(4px); }
        .modal-close:hover { border-color: #c9a96e; color: #9a6a30; }
        .similar-card { background: #fff; border: 1px solid #e8e0d8; border-radius: 6px; overflow: hidden; cursor: pointer; transition: all 0.25s; }
        .similar-card:hover { border-color: #c9a96e; transform: translateY(-3px); box-shadow: 0 8px 24px rgba(180,140,90,0.1); }
        .similar-card img { width: 100%; height: 160px; object-fit: cover; }
        .pill-row { display: flex; flex-wrap: wrap; gap: 8px; }
      `}</style>

      {/* NAV */}
      <nav style={{ borderBottom: "1px solid #e8e0d8", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, background: "rgba(253,252,251,0.95)", backdropFilter: "blur(12px)" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", fontWeight: 300, letterSpacing: "0.15em", textTransform: "uppercase", color: "#2a2420" }}>
          Poshak<span style={{ color: "#c9a96e" }}>.</span>pk
        </div>
        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <span style={{ fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#bbb" }}>
            {products.length} Products · {BRANDS.length - 1} Brands
            {dataSource === "sheets" && <span style={{ color: "#3d8a60", marginLeft: "8px" }}>● Live</span>}
          </span>
          {wishlist.length > 0 && (
            <span style={{ fontSize: "0.7rem", color: "#c9a96e" }}>♥ {wishlist.length}</span>
          )}
        </div>
      </nav>

      {/* HERO */}
      <div style={{ textAlign: "center", padding: "72px 24px 48px", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(201,169,110,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div className={`hero-fade ${loaded ? "in" : ""}`} style={{ transitionDelay: "0s" }}>
          <p style={{ fontSize: "0.68rem", letterSpacing: "0.35em", textTransform: "uppercase", color: "#c9a96e", marginBottom: "16px" }}>Pakistan's Fashion Discovery Engine</p>
        </div>
        <div className={`hero-fade ${loaded ? "in" : ""}`} style={{ transitionDelay: "0.15s" }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(2.2rem, 6vw, 4.2rem)", fontWeight: 300, lineHeight: 1.1, marginBottom: "6px", color: "#2a2420" }}>Find Every Style,</h1>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(2.2rem, 6vw, 4.2rem)", fontWeight: 300, fontStyle: "italic", lineHeight: 1.1, marginBottom: "32px", color: "#c9a96e" }}>Across Every Brand</h1>
        </div>
        <div className={`hero-fade ${loaded ? "in" : ""}`} style={{ transitionDelay: "0.28s" }}>
          <div className="divider" style={{ marginBottom: "36px" }} />
        </div>
        <div className={`hero-fade ${loaded ? "in" : ""}`} style={{ transitionDelay: "0.38s", maxWidth: "660px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", background: "#fff", border: "1px solid #e0d8d0", borderRadius: "6px", padding: "14px 20px", gap: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", transition: "box-shadow 0.2s, border-color 0.2s" }} onFocus={e => e.currentTarget.style.borderColor = "#c9a96e"} onBlur={e => e.currentTarget.style.borderColor = "#e0d8d0"}>
            <span style={{ color: "#ccc", fontSize: "1.1rem" }}>⊹</span>
            <input className="search-input" placeholder="Search lawn suit, chiffon eid dress, bridal…" value={query} onChange={e => setQuery(e.target.value)} />
            {query && <button onClick={() => setQuery("")} style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer" }}>✕</button>}
          </div>
          <div style={{ marginTop: "14px", display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
            {["Lawn 3-Piece", "Luxury Pret", "Unstitched", "Bridal", "Kurta", "Co-ords", "Festive", "Winter"].map(t => (
              <button key={t} className="tag-btn" onClick={() => setQuery(t)}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className={`filter-btn ${filtersOpen ? "active" : ""}`} onClick={() => setFiltersOpen(f => !f)}>
              ⊞ Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
            </button>
            {activeFilterCount > 0 && <button className="filter-btn" onClick={clearFilters} style={{ color: "#b03030", borderColor: "#f0c0c0" }}>Clear All</button>}
          </div>
          <span style={{ fontSize: "0.7rem", letterSpacing: "0.1em", color: "#aaa" }}>
            {dataSource === "loading" ? "Loading…" : `${filtered.length} results`}
          </span>
        </div>

        <div className="filter-panel" style={{ maxHeight: filtersOpen ? "500px" : "0", padding: filtersOpen ? "20px" : "0 20px", marginBottom: filtersOpen ? "16px" : "0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "20px" }}>
            {[
              { label: "Brand", value: brand, setter: setBrand, options: BRANDS },
              { label: "Category", value: category, setter: setCategory, options: STATIC_CATEGORIES },
              { label: "Color", value: color, setter: setColor, options: STATIC_COLORS },
              { label: "Price Range", value: priceRange, setter: setPriceRange, options: PRICE_RANGES },
              { label: "Fabric", value: fabric, setter: setFabric, options: STATIC_FABRICS },
              { label: "Occasion", value: occasion, setter: setOccasion, options: STATIC_OCCASIONS },
            ].map(({ label, value, setter, options }) => (
              <div key={label}>
                <div className="section-label">{label}</div>
                <select value={value} onChange={e => setter(e.target.value)} className="filter-btn" style={{ width: "100%", background: "#fff", cursor: "pointer" }}>
                  {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* BRAND PILLS */}
        <div className="pill-row" style={{ marginBottom: "28px" }}>
          {BRANDS.map(b => (
            <button key={b} className={`filter-btn ${brand === b ? "active" : ""}`} onClick={() => setBrand(b)}>{b}</button>
          ))}
        </div>

        {/* PRODUCT GRID */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#ccc" }}>
            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>◌</div>
            <p style={{ fontSize: "0.85rem", letterSpacing: "0.1em" }}>No products match your search</p>
            <button className="filter-btn" onClick={clearFilters} style={{ marginTop: "16px" }}>Clear Filters</button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "20px" }}>
            {filtered.map((p, i) => (
              <div key={p.id} className="card animate-stagger" style={{ animationDelay: `${i * 0.06}s` }} onClick={() => setSelectedProduct(p)}>
                <div style={{ position: "relative", overflow: "hidden" }}>
                  <img src={p.image} alt={p.name} />
                  {p.badge && <div className="badge-pill" style={{ background: BADGE_COLORS[p.badge] || "#888" }}>{p.badge}</div>}
                  <button className="wish-btn" onClick={e => toggleWish(p.id, e)}>
                    <span style={{ color: wishlist.includes(p.id) ? "#c9a96e" : "#ccc" }}>{wishlist.includes(p.id) ? "♥" : "♡"}</span>
                  </button>
                </div>
                <div style={{ padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div>
                      <div style={{ fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#c9a96e", marginBottom: "4px" }}>{p.brand}</div>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.05rem", fontWeight: 400, color: "#2a2420", lineHeight: 1.3 }}>{p.name}</div>
                    </div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 500, color: "#2a2420", whiteSpace: "nowrap", marginLeft: "8px" }}>Rs. {p.price.toLocaleString()}</div>
                  </div>
                  <div style={{ display: "flex", gap: "5px", marginBottom: "14px", flexWrap: "wrap" }}>
                    <span className="tag">{p.fabric}</span>
                    <span className="tag">{p.occasion}</span>
                    <span className="tag">{p.color}</span>
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#bbb", letterSpacing: "0.08em", textAlign: "center" }}>Tap to view details</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid #e8e0d8", marginTop: "80px", padding: "40px 24px", textAlign: "center", background: "rgba(255,255,255,0.5)" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", fontWeight: 300, letterSpacing: "0.15em", color: "#c9a96e", marginBottom: "6px" }}>Poshak.pk</div>
        <p style={{ fontSize: "0.68rem", letterSpacing: "0.12em", color: "#bbb", textTransform: "uppercase" }}>Pakistan's Fashion Discovery Engine · MVP v0.1</p>
      </footer>

      {/* PRODUCT DETAIL MODAL */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setSelectedProduct(null); }}>
          <div className="modal" ref={modalRef}>
            <div style={{ position: "relative" }}>
              <img className="modal-img" src={selectedProduct.image} alt={selectedProduct.name} />
              <button className="modal-close" onClick={() => setSelectedProduct(null)}>✕</button>
              {selectedProduct.badge && (
                <div className="badge-pill" style={{ background: BADGE_COLORS[selectedProduct.badge] || "#888", top: 16, left: 16, position: "absolute" }}>{selectedProduct.badge}</div>
              )}
            </div>

            <div className="modal-body">
              {/* Product Info */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                <div>
                  <div style={{ fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#c9a96e", marginBottom: "6px" }}>{selectedProduct.brand}</div>
                  <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.8rem", fontWeight: 400, color: "#2a2420", lineHeight: 1.2 }}>{selectedProduct.name}</h2>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", color: "#2a2420" }}>Rs. {selectedProduct.price.toLocaleString()}</div>
                  <button onClick={e => toggleWish(selectedProduct.id, e)} style={{ background: "none", border: "none", cursor: "pointer", color: wishlist.includes(selectedProduct.id) ? "#c9a96e" : "#ccc", fontSize: "1.4rem", marginTop: "4px" }}>
                    {wishlist.includes(selectedProduct.id) ? "♥ Saved" : "♡ Save"}
                  </button>
                </div>
              </div>

              {/* Details Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "24px", background: "#f8f4ef", borderRadius: "8px", padding: "16px" }}>
                {[
                  { label: "Category", value: selectedProduct.category },
                  { label: "Fabric", value: selectedProduct.fabric },
                  { label: "Occasion", value: selectedProduct.occasion },
                  { label: "Color", value: selectedProduct.color },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#bbb", marginBottom: "3px" }}>{label}</div>
                    <div style={{ fontSize: "0.85rem", color: "#2a2420", fontWeight: 500 }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <a href={selectedProduct.product_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block", marginBottom: "32px" }}>
                <button className="cta-btn" style={{ fontSize: "0.85rem", padding: "16px" }}>
                  View & Buy on {selectedProduct.brand} →
                </button>
              </a>

              {/* SIMILAR PRODUCTS */}
              {similar.length > 0 && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
                    <div className="divider" style={{ flex: 1, margin: 0 }} />
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem", fontWeight: 300, color: "#888", whiteSpace: "nowrap", fontStyle: "italic" }}>You might also like</div>
                    <div className="divider" style={{ flex: 1, margin: 0 }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "10px" }}>
                    {similar.map(sp => (
                      <div key={sp.id} className="similar-card" onClick={() => setSelectedProduct(sp)}>
                        <img src={sp.image} alt={sp.name} />
                        <div style={{ padding: "8px" }}>
                          <div style={{ fontSize: "0.58rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#c9a96e", marginBottom: "2px" }}>{sp.brand}</div>
                          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "0.82rem", color: "#2a2420", lineHeight: 1.3, marginBottom: "3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sp.name}</div>
                          <div style={{ fontSize: "0.72rem", color: "#888" }}>Rs. {sp.price.toLocaleString()}</div>
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
