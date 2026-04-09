"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

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
    <div style={{ borderTop:"1px solid #f0ebe4" }}>
      <button onClick={() => setOpen(v=>!v)}
        style={{ width:"100%", padding:"12px 20px", background:"transparent", border:"none", textAlign:"left", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:".6rem", letterSpacing:".22em", textTransform:"uppercase", color:"#7a6a5a", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        {title}
        <span style={{ transition:"transform .2s", transform:open?"rotate(180deg)":"none", fontSize:".7rem" }}>▾</span>
      </button>
      {open && items.map(item => (
        <button key={item} onClick={() => onItemClick(item)}
          style={{ width:"100%", padding:"9px 20px", background:"transparent", border:"none", borderLeft:"3px solid transparent", textAlign:"left", cursor:"pointer", fontSize:".76rem", color:"#4a3a2a", fontFamily:"'DM Sans',sans-serif", transition:"all .15s", display:"block" }}
          onMouseOver={e => { e.currentTarget.style.color="#c9a96e"; e.currentTarget.style.borderLeftColor="#c9a96e"; e.currentTarget.style.background="#fff8ef"; }}
          onMouseOut={e => { e.currentTarget.style.color="#888"; e.currentTarget.style.borderLeftColor="transparent"; e.currentTarget.style.background="transparent"; }}>
          {item}
        </button>
      ))}
    </div>
  );
}

export default function SharedNav() {
  const router          = useRouter();
  const searchRef       = useRef(null);
  const [query,         setQuery]         = useState("");
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [showDropdown,  setShowDropdown]  = useState(false);
  const [allBrands,     setAllBrands]     = useState([]);
  const [popCategories, setPopCategories] = useState(CATEGORIES); // default to all, update from API
  const [wishCount,     setWishCount]     = useState(0);
  const [suggestions,   setSuggestions]   = useState([]);
  const [toast,         setToast]         = useState(null);
  const toastRef = useRef(null);

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
    fetch("/api/brands")
      .then(r => r.json())
      .then(j => { if (j.brands) setAllBrands(j.brands); })
      .catch(() => {});
  }, []);

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

  useEffect(() => {
    fetch("/api/homepage")
      .then(r => r.json())
      .then(j => {
        if (j.sections) {
          const withData = new Set(Object.keys(j.sections));
          setPopCategories(CATEGORIES.filter(c => withData.has(c)));
        }
      })
      .catch(() => {}); // fallback: keep showing all categories
  }, []);

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
        .poshak-nav{height:62px;border-bottom:1px solid #e8e0d8;display:grid;grid-template-columns:auto 1fr auto;align-items:center;padding:0 20px;position:sticky;top:0;z-index:200;background:rgba(253,252,251,.97);gap:12px;font-family:'DM Sans',sans-serif;}
        .poshak-wordmark{font-family:'Cormorant Garamond',serif;font-size:1.45rem;font-weight:300;letter-spacing:.18em;cursor:pointer;color:#2a2420;user-select:none;white-space:nowrap;}
        .poshak-hamburger{background:none;border:none;cursor:pointer;padding:8px;display:flex;flex-direction:column;gap:5px;flex-shrink:0;}
        .poshak-hamburger span{display:block;width:22px;height:1.5px;background:#2a2420;border-radius:2px;transition:all .22s;}
        .poshak-sb{position:fixed;top:0;left:0;height:100vh;width:268px;background:#fff;border-right:1px solid #ede8e0;z-index:300;transform:translateX(-100%);transition:transform .34s cubic-bezier(.4,0,.2,1);box-shadow:6px 0 40px rgba(0,0,0,.09);overflow-y:auto;display:flex;flex-direction:column;}
        .poshak-sb.open{transform:translateX(0);}
        .poshak-overlay{position:fixed;inset:0;background:rgba(20,14,8,.35);z-index:299;opacity:0;pointer-events:none;transition:opacity .28s;}
        .poshak-overlay.open{opacity:1;pointer-events:all;}
        .poshak-search-wrap{display:flex;align-items:center;background:#fff;border:1px solid #e0d8d0;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.04);width:100%;max-width:560px;margin:0 auto;position:relative;}
        .poshak-all-btn{height:46px;padding:0 12px;background:transparent;border:none;border-right:1px solid #e0d8d0;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.75rem;color:#2a2420;display:flex;align-items:center;gap:5px;white-space:nowrap;flex-shrink:0;}
        .poshak-search-input{flex:1;height:46px;border:none;outline:none;background:transparent;font-family:'DM Sans',sans-serif;font-size:.9rem;color:#2a2420;padding:0 12px;}
        .poshak-search-input::placeholder{color:#a89e94;}
        .poshak-dropdown{position:fixed;top:62px;left:50%;transform:translateX(-50%);background:#fff;border:1px solid #e0d8d0;border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.14);z-index:201;padding:20px 24px;display:flex;gap:32px;width:min(520px,94vw);max-height:80vh;overflow-y:auto;}
        .poshak-dd-col{flex:1;min-width:0;}
        .poshak-dd-title{font-size:.6rem;letter-spacing:.22em;text-transform:uppercase;color:#c9a96e;margin-bottom:12px;font-weight:600;}
        .poshak-dd-btn{display:block;width:100%;background:none;border:none;text-align:left;padding:5px 0;font-size:.78rem;color:#2a2420;font-family:'DM Sans',sans-serif;cursor:pointer;white-space:nowrap;transition:color .15s;}
        .poshak-dd-btn:hover{color:#c9a96e;}
        .poshak-suggestions{position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #e0d8d0;border-top:none;border-radius:0 0 10px 10px;box-shadow:0 8px 24px rgba(0,0,0,.1);z-index:202;max-height:280px;overflow-y:auto;}
        .poshak-sug-item{display:block;width:100%;padding:9px 14px;background:none;border:none;text-align:left;font-size:.82rem;color:#2a2420;font-family:'DM Sans',sans-serif;cursor:pointer;transition:background .12s;}
        .poshak-sug-item:hover{background:#fdf7ef;color:#9a6a30;}
        .poshak-sug-label{font-size:.6rem;letter-spacing:.14em;text-transform:uppercase;color:#c9a96e;padding:8px 14px 4px;display:block;}
        .poshak-toast{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#2a2420;color:#f5f0eb;padding:10px 20px;border-radius:24px;font-size:.78rem;font-family:'DM Sans',sans-serif;z-index:999;pointer-events:none;white-space:nowrap;border:1px solid #c9a96e;transition:opacity .3s;}
        @media(max-width:600px){
          .poshak-dropdown{gap:16px;padding:16px;}
          .poshak-dd-btn{font-size:.72rem;}
          .poshak-wish-label{display:none;}
          .poshak-search-wrap{min-width:0;}
          .poshak-search-input{font-size:16px;}
          .poshak-all-btn{font-size:16px;}
        }
      `}</style>

      {/* Sidebar overlay */}
      <div className={`poshak-overlay ${sidebarOpen?"open":""}`} onClick={() => setSidebarOpen(false)} />

      {/* Sidebar */}
      <aside className={`poshak-sb ${sidebarOpen?"open":""}`}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 20px", borderBottom:"1px solid #f0ebe4" }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"1.2rem", color:"#2a2420" }}>Browse</div>
          <button onClick={() => setSidebarOpen(false)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:"1.1rem", color:"#aaa" }}>✕</button>
        </div>
        <button onClick={() => { setSidebarOpen(false); router.push("/"); }}
          style={{ width:"100%", padding:"11px 20px", background:"transparent", border:"none", textAlign:"left", cursor:"pointer", fontSize:".8rem", color:"#2a2420", fontFamily:"'DM Sans',sans-serif" }}>
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
          style={{ background:"none", border:"none", cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", gap:"5px", color: wishCount>0?"#c9a96e":"#4a3a2a", fontFamily:"'DM Sans',sans-serif", fontSize:".75rem", padding:"4px 8px", whiteSpace:"nowrap" }}>
          <span style={{ fontSize:".9rem" }}>{wishCount>0?"♥":"♡"}</span>
          <span className="poshak-wish-label">Wishlist{wishCount>0?` (${wishCount})`:""}</span>
        </button>
      </nav>
      {toast && (
        <div className="poshak-toast">{toast}</div>
      )}
    </>
  );
}
