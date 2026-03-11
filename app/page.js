import { useState, useEffect, useRef } from "react";

// ─── CONFIGURATION ────────────────────────────────────────────────────────────
// Replace this URL with your own Google Sheet's published CSV URL.
// How to get it: File → Share → Publish to web → Sheet1 → CSV → Publish → Copy URL
const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQjuWejNvV1eOM9H1abXWMB-wAJMN2reQNNY1jWWx6dap-x2OTwdMzK5uK3DO05Bq6g0appKglzUDl4/pub?gid=0&single=true&output=csv";

// Fallback sample data (used when sheet isn't configured yet)
const FALLBACK_PRODUCTS = [
  { id: 1, name: "Embroidered Lawn 3-Piece", brand: "Khaadi", price: 4800, category: "Lawn", color: "White", fabric: "Lawn", occasion: "Eid", image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80", product_url: "https://www.khaadi.com/pk/women/", badge: "Bestseller" },
  { id: 2, name: "Printed Pret Kurta", brand: "Sapphire", price: 3200, category: "Pret", color: "Pink", fabric: "Cotton", occasion: "Casual", image: "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400&q=80", product_url: "https://pk.sapphireonline.pk/collections/pret", badge: "New" },
  { id: 3, name: "Formal Chiffon Suit", brand: "Gul Ahmed", price: 7500, category: "Formal", color: "Navy", fabric: "Chiffon", occasion: "Wedding", image: "https://images.unsplash.com/photo-1619086303291-0ef7699e4b31?w=400&q=80", product_url: "https://www.gulahmedshop.com/collections/formal", badge: null },
  { id: 4, name: "Casual Linen Co-ord", brand: "Limelight", price: 2800, category: "Casual", color: "Pastel", fabric: "Linen", occasion: "Casual", image: "https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=400&q=80", product_url: "https://www.limelightpk.com/collections/pret-wear", badge: "Sale" },
  { id: 5, name: "Luxury Eid Collection", brand: "Alkaram Studio", price: 9200, category: "Eid Collection", color: "Red", fabric: "Silk", occasion: "Eid", image: "https://images.unsplash.com/photo-1604671801908-6f0c6a092c05?w=400&q=80", product_url: "https://www.alkaramstudio.com/collections/festive", badge: "Exclusive" },
  { id: 6, name: "Black Embroidered Kurta", brand: "Khaadi", price: 5500, category: "Pret", color: "Black", fabric: "Cotton", occasion: "Party", image: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=400&q=80", product_url: "https://www.khaadi.com/pk/women/", badge: null },
  { id: 7, name: "Office Wear Lawn Set", brand: "Sapphire", price: 4100, category: "Lawn", color: "Multi", fabric: "Lawn", occasion: "Office", image: "https://images.unsplash.com/photo-1582142407894-ec85a1260cce?w=400&q=80", product_url: "https://pk.sapphireonline.pk/collections/lawn", badge: "New" },
  { id: 8, name: "Karandi Winter Suit", brand: "Gul Ahmed", price: 6800, category: "Formal", color: "Navy", fabric: "Karandi", occasion: "Formal", image: "https://images.unsplash.com/photo-1623091411395-09e79fdbfcf6?w=400&q=80", product_url: "https://www.gulahmedshop.com/collections/winter", badge: null },
  { id: 9, name: "Wedding Silk Gharara", brand: "Limelight", price: 12000, category: "Formal", color: "Red", fabric: "Silk", occasion: "Wedding", image: "https://images.unsplash.com/photo-1614886137799-1629b5a17c4c?w=400&q=80", product_url: "https://www.limelightpk.com/collections/formal-wear", badge: "Premium" },
  { id: 10, name: "Pastel Summer Pret", brand: "Alkaram Studio", price: 2500, category: "Pret", color: "Pastel", fabric: "Cotton", occasion: "Casual", image: "https://images.unsplash.com/photo-1571513722275-4b41940f54b8?w=400&q=80", product_url: "https://www.alkaramstudio.com/collections/summer", badge: "Sale" },
  { id: 11, name: "Chiffon Party Suit", brand: "Khaadi", price: 8900, category: "Formal", color: "Pink", fabric: "Chiffon", occasion: "Party", image: "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400&q=80", product_url: "https://www.khaadi.com/pk/women/", badge: null },
  { id: 12, name: "White Eid Luxury 3-Pc", brand: "Sapphire", price: 11500, category: "Eid Collection", color: "White", fabric: "Chiffon", occasion: "Eid", image: "https://images.unsplash.com/photo-1606503825008-909a67e63c3d?w=400&q=80", product_url: "https://pk.sapphireonline.pk/collections/eid", badge: "Trending" },
];

// ─── CSV PARSER ───────────────────────────────────────────────────────────────
// Parses CSV rows from Google Sheets into product objects
function parseCSV(csvText) {
  const lines = csvText.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
  return lines.slice(1).map((line, i) => {
    const values = line.match(/(".*?"|[^,]+)(?=,|$)/g) || [];
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (values[idx] || "").replace(/"/g, "").trim();
    });
    return {
      id: i + 1,
      name: obj.name || "",
      brand: obj.brand || "",
      price: parseInt(obj.price) || 0,
      category: obj.category || "",
      color: obj.color || "",
      fabric: obj.fabric || "",
      occasion: obj.occasion || "",
      image: obj.image_url || "",
      product_url: obj.product_url || "#",
      badge: obj.badge || null,
    };
  }).filter(p => p.name);
}

const PRICE_RANGES = ["All Prices", "Under 3,000", "3,000–6,000", "6,000–10,000", "10,000–20,000", "20,000+"];
const STATIC_CATEGORIES = ["All", "Unstitched", "Pret / Ready to Wear", "Luxury Pret", "Lawn", "Kurta", "Co-ords", "Shalwar Kameez", "Formal", "Bridal", "Winter Collection", "Festive / Eid"];
const STATIC_FABRICS = ["All Fabrics", "Lawn", "Cotton", "Chiffon", "Silk", "Organza", "Velvet", "Khaddar", "Karandi", "Linen", "Cambric", "Jacquard", "Net", "Raw Silk"];
const STATIC_OCCASIONS = ["All Occasions", "Casual / Everyday", "Office / Work", "Formal Event", "Wedding", "Eid / Festive", "Party", "Bridal", "Winter"];
const STATIC_COLORS = ["All", "Black", "White", "Navy", "Red", "Maroon", "Pink", "Peach", "Mint", "Teal", "Mustard", "Olive", "Grey", "Beige", "Pastel", "Multi / Printed"];

const BADGE_COLORS = {
  "Bestseller": "#d4915a",
  "New": "#5a9e7c",
  "Sale": "#c94040",
  "Exclusive": "#7c5aa0",
  "Premium": "#4a7ab5",
  "Trending": "#b5844a",
};

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
  const heroRef = useRef(null);

  useEffect(() => {
    const isConfigured = !GOOGLE_SHEET_CSV_URL.includes("YOUR_SHEET_ID");
    if (!isConfigured) { setTimeout(() => setLoaded(true), 100); return; }
    setDataSource("loading");
    fetch(GOOGLE_SHEET_CSV_URL)
      .then(res => res.text())
      .then(csv => {
        const parsed = parseCSV(csv);
        if (parsed.length > 0) { setProducts(parsed); setDataSource("sheets"); }
        else { setDataSource("fallback"); }
      })
      .catch(() => setDataSource("fallback"))
      .finally(() => setTimeout(() => setLoaded(true), 100));
  }, []);

  const BRANDS = ["All Brands", ...Array.from(new Set(products.map(p => p.brand))).sort()];
  const CATEGORIES = STATIC_CATEGORIES;
  const COLORS = STATIC_COLORS;
  const FABRICS = STATIC_FABRICS;
  const OCCASIONS = STATIC_OCCASIONS;

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
    return matchQ &&
      (brand === "All Brands" || p.brand === brand) &&
      (category === "All" || p.category === category) &&
      (color === "All" || p.color === color) &&
      (fabric === "All Fabrics" || p.fabric === fabric) &&
      (occasion === "All Occasions" || p.occasion === occasion) &&
      priceFilter(p.price);
  });

  const toggleWish = (id) => setWishlist(w => w.includes(id) ? w.filter(x => x !== id) : [...w, id]);
  const clearFilters = () => { setBrand("All Brands"); setCategory("All"); setColor("All"); setPriceRange("All Prices"); setFabric("All Fabrics"); setOccasion("All Occasions"); setQuery(""); };

  const activeFilterCount = [brand !== "All Brands", category !== "All", color !== "All", priceRange !== "All Prices", fabric !== "All Fabrics", occasion !== "All Occasions"].filter(Boolean).length;

  return (
    <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", background: "#0d0d0d", minHeight: "100vh", color: "#e8ddd0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #111; } ::-webkit-scrollbar-thumb { background: #c9a96e; border-radius: 2px; }
        .hero-fade { opacity: 0; transform: translateY(24px); transition: opacity 0.9s ease, transform 0.9s ease; }
        .hero-fade.in { opacity: 1; transform: translateY(0); }
        .card { background: #161616; border: 1px solid #2a2a2a; border-radius: 4px; overflow: hidden; transition: all 0.35s ease; cursor: pointer; position: relative; }
        .card:hover { border-color: #c9a96e; transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
        .card img { width: 100%; height: 280px; object-fit: cover; display: block; transition: transform 0.5s ease; filter: brightness(0.92); }
        .card:hover img { transform: scale(1.04); filter: brightness(1); }
        .search-input { background: transparent; border: none; outline: none; width: 100%; font-family: 'Cormorant Garamond', serif; font-size: 1.1rem; color: #e8ddd0; letter-spacing: 0.05em; }
        .search-input::placeholder { color: #666; }
        .filter-btn { background: #161616; border: 1px solid #2a2a2a; color: #aaa; padding: 8px 14px; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; border-radius: 2px; transition: all 0.2s; white-space: nowrap; }
        .filter-btn:hover, .filter-btn.active { border-color: #c9a96e; color: #c9a96e; background: #1a1710; }
        .pill-row { display: flex; flex-wrap: wrap; gap: 8px; }
        .wish-btn { position: absolute; top: 12px; right: 12px; background: rgba(13,13,13,0.85); border: 1px solid #333; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; font-size: 1rem; backdrop-filter: blur(4px); }
        .wish-btn:hover { border-color: #c9a96e; background: rgba(201,169,110,0.15); }
        .badge { position: absolute; top: 12px; left: 12px; font-family: 'DM Sans', sans-serif; font-size: 0.65rem; letter-spacing: 0.15em; text-transform: uppercase; padding: 4px 10px; border-radius: 2px; font-weight: 500; color: #fff; }
        .cta-btn { background: #c9a96e; color: #0d0d0d; border: none; padding: 12px 24px; font-family: 'DM Sans', sans-serif; font-size: 0.75rem; letter-spacing: 0.15em; text-transform: uppercase; font-weight: 500; cursor: pointer; border-radius: 2px; transition: all 0.2s; width: 100%; }
        .cta-btn:hover { background: #e0c080; }
        .filter-panel { background: #111; border-top: 1px solid #222; overflow: hidden; transition: max-height 0.4s ease, padding 0.3s ease; }
        .section-label { font-family: 'DM Sans', sans-serif; font-size: 0.65rem; letter-spacing: 0.2em; text-transform: uppercase; color: #666; margin-bottom: 10px; }
        .nav-logo span { color: #c9a96e; }
        .tag { display: inline-block; background: #1e1e1e; border: 1px solid #333; padding: 2px 8px; border-radius: 2px; font-family: 'DM Sans', sans-serif; font-size: 0.65rem; letter-spacing: 0.1em; text-transform: uppercase; color: #888; margin: 2px; }
        .animate-stagger { opacity: 0; transform: translateY(16px); animation: fadeUp 0.5s ease forwards; }
        @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
        .glow-line { width: 60px; height: 1px; background: linear-gradient(90deg, transparent, #c9a96e, transparent); margin: 0 auto; }
        select { appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23666'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 28px !important; }
      `}</style>

      {/* NAV */}
      <nav style={{ borderBottom: "1px solid #1e1e1e", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, background: "rgba(13,13,13,0.95)", backdropFilter: "blur(12px)" }}>
        <div className="nav-logo" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", fontWeight: 300, letterSpacing: "0.15em", textTransform: "uppercase" }}>
          Poshak<span>.</span>pk
        </div>
        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#666" }}>
            {products.length} Products · {BRANDS.length - 1} Brands
          {dataSource === "sheets" && <span style={{ color: "#5a9e7c", marginLeft: "8px" }}>● Live</span>}
          </span>
          {wishlist.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "0.7rem", color: "#c9a96e" }}>
              ♥ {wishlist.length}
            </div>
          )}
        </div>
      </nav>

      {/* HERO */}
      <div style={{ textAlign: "center", padding: "72px 24px 48px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(201,169,110,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div className={`hero-fade ${loaded ? "in" : ""}`} style={{ transitionDelay: "0s" }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.7rem", letterSpacing: "0.35em", textTransform: "uppercase", color: "#c9a96e", marginBottom: "16px" }}>Pakistan's Fashion Discovery Engine</p>
        </div>
        <div className={`hero-fade ${loaded ? "in" : ""}`} style={{ transitionDelay: "0.15s" }}>
          <h1 style={{ fontSize: "clamp(2.2rem, 6vw, 4.5rem)", fontWeight: 300, letterSpacing: "0.05em", lineHeight: 1.1, marginBottom: "8px" }}>
            Find Every Style,
          </h1>
          <h1 style={{ fontSize: "clamp(2.2rem, 6vw, 4.5rem)", fontWeight: 300, fontStyle: "italic", letterSpacing: "0.05em", lineHeight: 1.1, marginBottom: "32px", color: "#c9a96e" }}>
            Across Every Brand
          </h1>
        </div>
        <div className={`hero-fade ${loaded ? "in" : ""}`} style={{ transitionDelay: "0.3s" }}>
          <div className="glow-line" style={{ marginBottom: "40px" }} />
        </div>

        {/* SEARCH BAR */}
        <div className={`hero-fade ${loaded ? "in" : ""}`} style={{ transitionDelay: "0.4s", maxWidth: "680px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", background: "#161616", border: "1px solid #333", borderRadius: "4px", padding: "14px 20px", gap: "12px", transition: "border-color 0.2s" }} onFocus={(e) => e.currentTarget.style.borderColor = "#c9a96e"} onBlur={(e) => e.currentTarget.style.borderColor = "#333"}>
            <span style={{ color: "#666", fontSize: "1.1rem" }}>⊹</span>
            <input className="search-input" placeholder="Search black embroidered lawn, chiffon eid suit…" value={query} onChange={e => setQuery(e.target.value)} />
            {query && <button onClick={() => setQuery("")} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: "1rem" }}>✕</button>}
          </div>

          {/* QUICK TAGS */}
          <div style={{ marginTop: "16px", display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center" }}>
            {["Lawn 3-Piece", "Luxury Pret", "Unstitched", "Bridal", "Kurta", "Co-ords", "Festive", "Winter Shawl"].map(t => (
              <button key={t} className="tag" style={{ cursor: "pointer" }} onClick={() => setQuery(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FILTER TOGGLE */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button className={`filter-btn ${filtersOpen ? "active" : ""}`} onClick={() => setFiltersOpen(f => !f)}>
              ⊞ Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
            </button>
            {activeFilterCount > 0 && (
              <button className="filter-btn" onClick={clearFilters} style={{ color: "#c94040", borderColor: "#c94040" }}>
                Clear All
              </button>
            )}
          </div>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.7rem", letterSpacing: "0.1em", color: "#666" }}>
            {dataSource === "loading" ? "Loading…" : `${filtered.length} results`}
          </span>
        </div>

        {/* FILTER PANEL */}
        <div className="filter-panel" style={{ maxHeight: filtersOpen ? "500px" : "0", padding: filtersOpen ? "20px" : "0 20px", marginBottom: filtersOpen ? "16px" : "0", borderRadius: "4px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "20px" }}>
            {[
              { label: "Brand", value: brand, setter: setBrand, options: BRANDS },
              { label: "Category", value: category, setter: setCategory, options: CATEGORIES },
              { label: "Color", value: color, setter: setColor, options: COLORS },
              { label: "Price Range", value: priceRange, setter: setPriceRange, options: PRICE_RANGES },
              { label: "Fabric", value: fabric, setter: setFabric, options: FABRICS },
              { label: "Occasion", value: occasion, setter: setOccasion, options: OCCASIONS },
            ].map(({ label, value, setter, options }) => (
              <div key={label}>
                <div className="section-label">{label}</div>
                <select value={value} onChange={e => setter(e.target.value)} className="filter-btn" style={{ width: "100%", background: "#161616", cursor: "pointer" }}>
                  {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* BRAND PILLS */}
        <div className="pill-row" style={{ marginBottom: "28px" }}>
          {BRANDS.map((b, i) => (
            <button key={b} className={`filter-btn ${brand === b ? "active" : ""}`} onClick={() => setBrand(b)} style={{ animationDelay: `${i * 0.05}s` }}>
              {b}
            </button>
          ))}
        </div>

        {/* PRODUCT GRID */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#444" }}>
            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>◌</div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem", letterSpacing: "0.1em" }}>No products match your search</p>
            <button className="filter-btn" onClick={clearFilters} style={{ marginTop: "16px" }}>Clear Filters</button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "20px" }}>
            {filtered.map((p, i) => (
              <div key={p.id} className="card animate-stagger" style={{ animationDelay: `${i * 0.07}s` }}>
                <div style={{ position: "relative", overflow: "hidden" }}>
                  <img src={p.image} alt={p.name} />
                  {p.badge && (
                    <div className="badge" style={{ background: BADGE_COLORS[p.badge] || "#555" }}>{p.badge}</div>
                  )}
                  <button className="wish-btn" onClick={(e) => { e.stopPropagation(); toggleWish(p.id); }}>
                    <span style={{ color: wishlist.includes(p.id) ? "#c9a96e" : "#666" }}>
                      {wishlist.includes(p.id) ? "♥" : "♡"}
                    </span>
                  </button>
                </div>
                <div style={{ padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#c9a96e", marginBottom: "4px" }}>{p.brand}</div>
                      <div style={{ fontSize: "1rem", fontWeight: 400, color: "#e8ddd0", lineHeight: 1.3 }}>{p.name}</div>
                    </div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", fontWeight: 500, color: "#e8ddd0", whiteSpace: "nowrap", marginLeft: "8px" }}>
                      Rs. {p.price.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px", marginBottom: "14px", flexWrap: "wrap" }}>
                    <span className="tag">{p.fabric}</span>
                    <span className="tag">{p.occasion}</span>
                    <span className="tag">{p.color}</span>
                  </div>
                  <a href={p.product_url} target="_blank" rel="noopener noreferrer" style={{ display: "block", textDecoration: "none" }}>
                    <button className="cta-btn">View on {p.brand} →</button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid #1e1e1e", marginTop: "80px", padding: "40px 24px", textAlign: "center" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", fontWeight: 300, letterSpacing: "0.15em", color: "#c9a96e", marginBottom: "8px" }}>Poshak.pk</div>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.7rem", letterSpacing: "0.12em", color: "#444", textTransform: "uppercase" }}>Pakistan's Fashion Discovery Engine · MVP v0.1</p>
      </footer>
    </div>
  );
}
