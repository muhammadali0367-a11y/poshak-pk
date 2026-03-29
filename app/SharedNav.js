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
        style={{ width:"100%", padding:"12px 20px", background:"transparent", border:"none", textAlign:"left", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:".6rem", letterSpacing:".22em", textTransform:"uppercase", color:"#bbb", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        {title}
        <span style={{ transition:"transform .2s", transform:open?"rotate(180deg)":"none", fontSize:".7rem" }}>▾</span>
      </button>
      {open && items.map(item => (
        <button key={item} onClick={() => onItemClick(item)}
          style={{ width:"100%", padding:"9px 20px", background:"transparent", border:"none", borderLeft:"3px solid transparent", textAlign:"left", cursor:"pointer", fontSize:".76rem", color:"#888", fontFamily:"'DM Sans',sans-serif", transition:"all .15s", display:"block" }}
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
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        .poshak-nav{height:62px;border-bottom:1px solid #e8e0d8;display:flex;align-items:center;padding:0 20px;position:sticky;top:0;z-index:200;background:rgba(253,252,251,.97);backdrop-filter:blur(14px);gap:12px;font-family:'DM Sans',sans-serif;}
        .poshak-wordmark{font-family:'Cormorant Garamond',serif;font-size:1.45rem;font-weight:300;letter-spacing:.18em;cursor:pointer;color:#2a2420;user-select:none;white-space:nowrap;}
        .poshak-hamburger{background:none;border:none;cursor:pointer;padding:8px;display:flex;flex-direction:column;gap:5px;flex-shrink:0;}
        .poshak-hamburger span{display:block;width:22px;height:1.5px;background:#2a2420;border-radius:2px;transition:all .22s;}
        .poshak-sb{position:fixed;top:0;left:0;height:100vh;width:268px;background:#fff;border-right:1px solid #ede8e0;z-index:300;transform:translateX(-100%);transition:transform .34s cubic-bezier(.4,0,.2,1);box-shadow:6px 0 40px rgba(0,0,0,.09);overflow-y:auto;display:flex;flex-direction:column;}
        .poshak-sb.open{transform:translateX(0);}
        .poshak-overlay{position:fixed;inset:0;background:rgba(20,14,8,.35);z-index:299;opacity:0;pointer-events:none;transition:opacity .28s;}
        .poshak-overlay.open{opacity:1;pointer-events:all;}
        .poshak-search-wrap{flex:1;display:flex;align-items:center;background:#fff;border:1px solid #e0d8d0;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.04);max-width:620px;position:relative;}
        .poshak-all-btn{height:44px;padding:0 12px;background:transparent;border:none;border-right:1px solid #e0d8d0;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.75rem;color:#555;display:flex;align-items:center;gap:5px;white-space:nowrap;flex-shrink:0;}
        .poshak-search-input{flex:1;height:44px;border:none;outline:none;background:transparent;font-family:'DM Sans',sans-serif;font-size:.88rem;color:#2a2420;padding:0 12px;}
        .poshak-search-input::placeholder{color:#c8c0b8;}
        .poshak-dropdown{position:fixed;top:62px;left:50%;transform:translateX(-50%);background:#fff;border:1px solid #e0d8d0;border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.14);z-index:201;padding:20px 24px;display:flex;gap:32px;width:min(520px,94vw);max-height:80vh;overflow-y:auto;}
        .poshak-dd-col{flex:1;min-width:0;}
        .poshak-dd-title{font-size:.6rem;letter-spacing:.22em;text-transform:uppercase;color:#c9a96e;margin-bottom:12px;font-weight:600;}
        .poshak-dd-btn{display:block;width:100%;background:none;border:none;text-align:left;padding:5px 0;font-size:.78rem;color:#555;font-family:'DM Sans',sans-serif;cursor:pointer;white-space:nowrap;transition:color .15s;}
        .poshak-dd-btn:hover{color:#c9a96e;}
        @media(max-width:600px){
          .poshak-wordmark{font-size:1.1rem;letter-spacing:.1em;}
          .poshak-dropdown{gap:16px;padding:16px;}
          .poshak-dd-btn{font-size:.72rem;}
          .poshak-wish-label{display:none;}
          .poshak-search-wrap{min-width:0;}
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
          style={{ width:"100%", padding:"11px 20px", background:"transparent", border:"none", textAlign:"left", cursor:"pointer", fontSize:".8rem", color:"#555", fontFamily:"'DM Sans',sans-serif" }}>
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
          Poshak<span style={{color:"#c9a96e"}}>.</span>pk
        </div>

        {/* Search */}
        <div ref={searchRef} className="poshak-search-wrap">
          <button className="poshak-all-btn" onClick={() => setShowDropdown(v=>!v)}>
            All <span style={{ fontSize:".6rem", color:"#aaa", transform:showDropdown?"rotate(180deg)":"none", transition:"transform .2s", display:"inline-block" }}>▾</span>
          </button>
          <input className="poshak-search-input"
            placeholder="Search: black lawn, kala suit, bridal chiffon…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSearch(); }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ background:"none", border:"none", color:"#ccc", cursor:"pointer", padding:"0 10px", flexShrink:0 }}>✕</button>
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
          style={{ background:"none", border:"none", cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", gap:"5px", color: wishCount>0?"#c9a96e":"#888", fontFamily:"'DM Sans',sans-serif", fontSize:".75rem", padding:"4px 8px", whiteSpace:"nowrap" }}>
          <span style={{ fontSize:".9rem" }}>{wishCount>0?"♥":"♡"}</span>
          <span className="poshak-wish-label">Wishlist{wishCount>0?` (${wishCount})`:""}</span>
        </button>
      </nav>
    </>
  );
}
