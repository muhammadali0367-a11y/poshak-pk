"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getBrandsCached, setBrandsCache } from "./lib/clientDataCache";

const CATEGORIES = [
  "Lawn","Kurta","Co-ords","Pret / Ready to Wear","Luxury Pret",
  "Unstitched","Shalwar Kameez","Formal","Bridal","Festive / Eid",
  "Winter Collection","Abaya",
];

function slugify(s) {
  return (s||"").toLowerCase().replace(/\s*\/\s*/g,"-").replace(/\s+/g,"-");
}

// Sidebar section - collapsible
function SidebarSection({ title, items, onItemClick }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop:"2px solid #dfdfdf" }}>
      <button onClick={() => setOpen(v=>!v)}
        style={{ width:"100%", padding:"12px 20px", background:"transparent", border:"none", textAlign:"left", cursor:"pointer", fontFamily:"'Jost','DM Sans',sans-serif", fontSize:".6rem", letterSpacing:".22em", textTransform:"uppercase", color:"#757575", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        {title}
        <span style={{ transition:"transform .2s", transform:open?"rotate(180deg)":"none", fontSize:".7rem" }}>▾</span>
      </button>
      {open && items.map(item => (
        <button key={item} onClick={() => onItemClick(item)}
          style={{ width:"100%", padding:"9px 20px", background:"transparent", border:"none", borderLeft:"2px solid transparent", textAlign:"left", cursor:"pointer", fontSize:".76rem", color:"#757575", fontFamily:"'Jost','DM Sans',sans-serif", transition:"all .15s", display:"block" }}
          onMouseOver={e => { e.currentTarget.style.color="#000000"; e.currentTarget.style.borderLeftColor="#000000"; e.currentTarget.style.background="#f2f2f2"; }}
          onMouseOut={e => { e.currentTarget.style.color="#757575"; e.currentTarget.style.borderLeftColor="transparent"; e.currentTarget.style.background="transparent"; }}>
          {item}
        </button>
      ))}
    </div>
  );
}

export default function SharedNav({ brands }) {
  const router          = useRouter();
  const searchRef       = useRef(null);
  const [query,         setQuery]         = useState("");
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [showDropdown,  setShowDropdown]  = useState(false);
  const [allBrands,     setAllBrands]     = useState([]);
  const [popCategories] = useState(CATEGORIES);
  const [wishCount,     setWishCount]     = useState(0);
  const [suggestions,   setSuggestions]   = useState([]);
  const [toast,         setToast]         = useState(null);
  const toastRef = useRef(null);

  useEffect(() => {
    console.log("SharedNav mounted");
  }, []);

  useEffect(() => {
    console.log("brands prop:", brands);
  }, [brands]);

  // Read wishlist count from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("poshak_wishlist");
      if (saved) setWishCount(JSON.parse(saved).length);
    } catch(e) {}
    // Update when storage changes (across tabs or from other pages)
    const handler = () => {
      try {
        const saved = localStorage.getItem("poshak_wishlist");
        setWishCount(saved ? JSON.parse(saved).length : 0);
      } catch(e) {}
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  useEffect(() => {
    if (Array.isArray(brands)) {
      setBrandsCache(brands);
      console.log("setAllBrands called with:", brands);
      setAllBrands(brands);
      if (brands.length > 0) return;
    }
    getBrandsCached().then((cachedBrands) => {
      console.log("fetched brands:", cachedBrands);
      console.log("setAllBrands called with:", cachedBrands);
      setAllBrands(cachedBrands);
    });
  }, [brands]);

  // Toast helper — expose globally so other components can call showToast("msg")
  useEffect(() => {
    window.__poshakToast = (msg) => {
      setToast(msg);
      if (toastRef.current) clearTimeout(toastRef.current);
      toastRef.current = setTimeout(() => setToast(null), 2500);
    };
    return () => { delete window.__poshakToast; };
  }, []);

  // Search suggestions — brand names + category names matching query
  function getSuggestions(q) {
    if (!q || q.length < 2) { setSuggestions([]); return; }
    const ql = q.toLowerCase();
    const brandMatches = allBrands.filter(b => b.toLowerCase().includes(ql)).slice(0, 4);
    const catMatches = CATEGORIES.filter(c => c.toLowerCase().includes(ql)).slice(0, 3);
    const popular = [
      "lawn suits","bridal dress","shalwar kameez","unstitched fabric",
      "festive collection","winter khaddar","pret kurta","co-ord set",
      "sale","new arrivals","black lawn","gulabi lawn","embroidered"
    ].filter(s => s.includes(ql)).slice(0, 3);
    setSuggestions({ brands: brandMatches, categories: catMatches, popular });
  }

  // Close dropdown on outside click
  useEffect(() => {
    const h = e => {
      if (!searchRef.current?.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function handleSearch(q) {
    const trimmed = (q || query).trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    setQuery("");
    setShowDropdown(false);
  }

  return (
    <>
      <style suppressHydrationWarning>{`
        .poshak-nav{min-height:74px;border-bottom:2px solid #dfdfdf;display:grid;grid-template-columns:auto auto 1fr auto;align-items:center;padding:0 30px;position:sticky;top:0;z-index:200;background:#ffffff;gap:12px;font-family:'Jost','DM Sans',sans-serif;}
        .poshak-wordmark{font-family:'Cormorant Garamond',serif;font-size:1.45rem;font-weight:300;letter-spacing:.18em;cursor:pointer;color:#000000;user-select:none;white-space:nowrap;}
        .poshak-hamburger{background:none;border:none;cursor:pointer;padding:8px;display:flex;flex-direction:column;gap:5px;flex-shrink:0;}
        .poshak-hamburger span{display:block;width:22px;height:1.5px;background:#000000;transition:all .22s;}
        .poshak-sb{position:fixed;top:0;left:0;height:100vh;width:268px;background:#fff;border-right:2px solid #dfdfdf;z-index:300;transform:translateX(-100%);transition:transform .34s cubic-bezier(.4,0,.2,1);overflow-y:auto;display:flex;flex-direction:column;}
        .poshak-sb.open{transform:translateX(0);}
        .poshak-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:299;opacity:0;pointer-events:none;transition:opacity .28s;}
        .poshak-overlay.open{opacity:1;pointer-events:all;}
        .poshak-search-wrap{display:flex;align-items:center;background:transparent;border-bottom:2px solid #000000;width:100%;max-width:560px;margin:0 auto;position:relative;}
        .poshak-all-btn{height:40px;padding:0 12px;background:transparent;border:none;border-right:1px solid #dfdfdf;cursor:pointer;font-family:'Jost','DM Sans',sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#757575;display:flex;align-items:center;gap:5px;white-space:nowrap;flex-shrink:0;}
        .poshak-search-input{flex:1;height:40px;border:none;outline:none;background:transparent;font-family:'Jost','DM Sans',sans-serif;font-size:14px;color:#000000;padding:0 12px;}
        .poshak-search-input::placeholder{color:#757575;}
        .poshak-dropdown{position:fixed;top:74px;left:50%;transform:translateX(-50%);background:#fff;border:2px solid #dfdfdf;z-index:201;padding:20px 24px;display:flex;gap:32px;width:min(520px,94vw);max-height:80vh;overflow-y:auto;}
        .poshak-dd-col{flex:1;min-width:0;}
        .poshak-dd-title{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#757575;margin-bottom:12px;font-weight:400;}
        .poshak-dd-btn{display:block;width:100%;background:none;border:none;text-align:left;padding:5px 0;font-size:14px;color:#757575;font-family:'Jost','DM Sans',sans-serif;cursor:pointer;white-space:nowrap;transition:color .15s;}
        .poshak-dd-btn:hover{color:#000000;}
        .poshak-suggestions{position:absolute;top:100%;left:0;right:0;background:#fff;border:2px solid #dfdfdf;border-top:none;z-index:202;max-height:280px;overflow-y:auto;}
        .poshak-sug-item{display:block;width:100%;padding:9px 14px;background:none;border:none;text-align:left;font-size:14px;color:#757575;font-family:'Jost','DM Sans',sans-serif;cursor:pointer;transition:background .12s;}
        .poshak-sug-item:hover{background:#f2f2f2;color:#000000;}
        .poshak-sug-label{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#757575;padding:8px 14px 4px;display:block;}
        .poshak-toast{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#000000;color:#ffffff;padding:10px 20px;font-size:12px;font-family:'Jost','DM Sans',sans-serif;z-index:999;pointer-events:none;white-space:nowrap;border:1px solid #dfdfdf;transition:opacity .3s;opacity:0;}
        @media(max-width:600px){
          .poshak-nav{padding:0 16px;}
          .poshak-dropdown{gap:16px;padding:16px;}
          .poshak-dd-btn{font-size:13px;}
          .poshak-wish-label{display:none;}
          .poshak-search-wrap{min-width:0;}
          .poshak-wordmark{display:none;}
          .poshak-nav{grid-template-columns:auto 1fr auto;}
          .poshak-search-input{font-size:16px;}
          .poshak-all-btn{font-size:14px;}
        }
      `}</style>

      {/* Sidebar overlay */}
      <div className={`poshak-overlay ${sidebarOpen?"open":""}`} onClick={() => setSidebarOpen(false)} />

      {/* Sidebar */}
      <aside className={`poshak-sb ${sidebarOpen?"open":""}`}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 20px", borderBottom:"2px solid #dfdfdf" }}>
          <div style={{ fontFamily:"'Jost','DM Sans',sans-serif", fontSize:"1.2rem", color:"#000000" }}>Browse</div>
          <button onClick={() => setSidebarOpen(false)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:"1.1rem", color:"#757575" }}>✕</button>
        </div>
        <button onClick={() => { setSidebarOpen(false); router.push("/"); }}
          style={{ width:"100%", padding:"11px 20px", background:"transparent", border:"none", textAlign:"left", cursor:"pointer", fontSize:".8rem", color:"#000000", fontFamily:"'Jost','DM Sans',sans-serif" }}>
          All Dresses
        </button>
        <SidebarSection title="Categories" items={popCategories}
          onItemClick={cat => { setSidebarOpen(false); router.push(`/category/${slugify(cat)}`); }} />
        <SidebarSection title="Brands" items={allBrands}
          onItemClick={b => { setSidebarOpen(false); router.push(`/brand/${slugify(b)}`); }} />
      </aside>

      {/* Nav */}
      <nav className="poshak-nav">
        {/* Hamburger + logo */}
        <button className="poshak-hamburger" onClick={() => setSidebarOpen(v=>!v)}>
          <span style={{ transform:sidebarOpen?"rotate(45deg) translate(4px,4px)":"none" }}/>
          <span style={{ opacity:sidebarOpen?0:1 }}/>
          <span style={{ transform:sidebarOpen?"rotate(-45deg) translate(4px,-4px)":"none" }}/>
        </button>
        <div className="poshak-wordmark" onClick={() => router.push("/")}>
          Poshak
        </div>

        {/* Search */}
        <div ref={searchRef} className="poshak-search-wrap">
          <button className="poshak-all-btn" onClick={() => setShowDropdown(v=>!v)}>
            All <span style={{ fontSize:".6rem", color:"#aaa", transform:showDropdown?"rotate(180deg)":"none", transition:"transform .2s", display:"inline-block" }}>▾</span>
          </button>
          <input className="poshak-search-input"
            placeholder="Search: black lawn, kala suit, bridal chiffon…"
            value={query}
            onChange={e => { setQuery(e.target.value); getSuggestions(e.target.value); }}
            onFocus={e => getSuggestions(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSearch(); }}
          />
          {query && (
            <button onClick={() => { setQuery(""); setSuggestions([]); }} style={{ background:"none", border:"none", color:"#ccc", cursor:"pointer", padding:"0 10px", flexShrink:0 }}>✕</button>
          )}

          {/* Search suggestions */}
          {query.length >= 2 && suggestions && (suggestions.brands?.length > 0 || suggestions.categories?.length > 0 || suggestions.popular?.length > 0) && !showDropdown && (
            <div className="poshak-suggestions">
              {suggestions.popular?.length > 0 && <>
                <span className="poshak-sug-label">Popular</span>
                {suggestions.popular.map(s => (
                  <button key={s} className="poshak-sug-item" onClick={() => { handleSearch(s); setSuggestions([]); }}>
                    {s}
                  </button>
                ))}
              </>}
              {suggestions.brands?.length > 0 && <>
                <span className="poshak-sug-label">Brands</span>
                {suggestions.brands.map(b => (
                  <button key={b} className="poshak-sug-item" onClick={() => { setShowDropdown(false); setSuggestions([]); setQuery(""); router.push(`/brand/${slugify(b)}`); }}>
                    {b}
                  </button>
                ))}
              </>}
              {suggestions.categories?.length > 0 && <>
                <span className="poshak-sug-label">Categories</span>
                {suggestions.categories.map(cat => (
                  <button key={cat} className="poshak-sug-item" onClick={() => { setShowDropdown(false); setSuggestions([]); setQuery(""); router.push(`/category/${slugify(cat)}`); }}>
                    {cat}
                  </button>
                ))}
              </>}
            </div>
          )}

          {/* Mega dropdown */}
          {showDropdown && (
            <div className="poshak-dropdown">
              <div className="poshak-dd-col">
                <div className="poshak-dd-title">Categories</div>
                {popCategories.map(cat => (
                  <button key={cat} className="poshak-dd-btn"
                    onClick={() => { setShowDropdown(false); router.push(`/category/${slugify(cat)}`); }}>
                    {cat}
                  </button>
                ))}
              </div>
              <div className="poshak-dd-col">
                <div className="poshak-dd-title">Brands</div>
                {allBrands.map(b => (
                  <button key={b} className="poshak-dd-btn"
                    onClick={() => { setShowDropdown(false); router.push(`/brand/${slugify(b)}`); }}>
                    {b}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* Wishlist button */}
        <button onClick={() => router.push("/wishlist")}
          style={{ background:"none", border:"none", cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", gap:"5px", color: wishCount>0?"#000000":"#757575", fontFamily:"'Jost','DM Sans',sans-serif", fontSize:".75rem", padding:"4px 8px", whiteSpace:"nowrap" }}>
          <span style={{ fontSize:".9rem" }}>{wishCount>0?"♥":"♡"}</span>
          <span className="poshak-wish-label">Wishlist{wishCount>0?` (${wishCount})`:""}</span>
        </button>
      </nav>
      <div className="poshak-toast" style={{ opacity: toast ? 1 : 0 }}>
        {toast || ""}
      </div>
    </>
  );
}
