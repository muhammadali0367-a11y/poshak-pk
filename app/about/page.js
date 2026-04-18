"use client";
import { useRouter } from "next/navigation";
import SharedNav from "../SharedNav";

const BRANDS = [
  "Khaadi","Gul Ahmed","Maria B","Sana Safinaz","Limelight",
  "Beechtree","Alkaram","Asim Jofa","Baroque","Ethnic by Outfitters",
  "Bonanza Satrangi","Saya","So Kamal","Stylo","Zellbury",
];

export default function AboutPage() {
  const router = useRouter();

  return (
    <div style={{ fontFamily:"'Jost','DM Sans',sans-serif", background:"#ffffff", minHeight:"100vh", color:"#000000" }}>
      <style>{`
        .about-section{padding:60px 24px;max-width:760px;margin:0 auto;}
        .brand-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-top:20px;}
        .brand-pill{background:#ffffff;border:2px solid #dfdfdf;padding:10px 14px;font-size:.78rem;color:#757575;cursor:pointer;transition:border-color .18s,color .18s;text-align:center;font-family:'Jost','DM Sans',sans-serif;}
        .brand-pill:hover{border-color:#000000;color:#000000;}
        .contact-card{background:#ffffff;border:2px solid #dfdfdf;padding:28px 32px;margin-top:20px;}
        @media(max-width:600px){.about-section{padding:40px 20px;}.contact-card{padding:20px;}}
      `}</style>

      <SharedNav />

      {/* Hero */}
      <section style={{ textAlign:"center", padding:"64px 24px 48px", borderBottom:"2px solid #dfdfdf" }}>
        <p style={{ fontSize:".65rem", letterSpacing:".38em", textTransform:"uppercase", color:"#757575", marginBottom:"14px" }}>About us</p>
        <h1 style={{ fontFamily:"'Jost','DM Sans',sans-serif", fontSize:"clamp(2rem,5vw,3.2rem)", fontWeight:400, lineHeight:1.1, color:"#000000", marginBottom:"6px" }}>
          Every brand. One place.
        </h1>
      </section>

      {/* What is Poshak */}
      <div className="about-section">
        <p style={{ fontSize:".65rem", letterSpacing:".28em", textTransform:"uppercase", color:"#757575", marginBottom:"12px" }}>What is Poshak</p>
        <h2 style={{ fontFamily:"'Jost','DM Sans',sans-serif", fontSize:"1.8rem", fontWeight:400, color:"#000000", marginBottom:"16px", lineHeight:1.3 }}>
          Pakistan's first women's fashion search engine
        </h2>
        <div style={{ width:"48px", height:"2px", background:"#dfdfdf", margin:"24px 0" }} />
        <p style={{ fontSize:".88rem", lineHeight:1.8, color:"#757575", marginBottom:"16px" }}>
          Poshak was built to solve one problem — Pakistani women love fashion, but finding what they want means visiting 15 different brand websites, one by one.
        </p>
        <p style={{ fontSize:".88rem", lineHeight:1.8, color:"#757575", marginBottom:"16px" }}>
          Poshak brings together 25,000+ products from 15+ of Pakistan's top fashion brands into a single, searchable platform. Search in English or Urdu, filter by brand, price, color, fabric, or occasion — and click through to buy directly on the brand's website.
        </p>
        <p style={{ fontSize:".88rem", lineHeight:1.8, color:"#757575" }}>
          We are not a store. We don't hold inventory or process payments. We are a discovery engine — built purely to make Pakistani fashion easier to find.
        </p>
      </div>

      {/* How it works */}
      <div style={{ background:"#ffffff", borderTop:"2px solid #dfdfdf", borderBottom:"2px solid #dfdfdf" }}>
        <div className="about-section" style={{ paddingTop:"48px", paddingBottom:"48px" }}>
          <p style={{ fontSize:".65rem", letterSpacing:".28em", textTransform:"uppercase", color:"#757575", marginBottom:"12px" }}>How it works</p>
          <h2 style={{ fontFamily:"'Jost','DM Sans',sans-serif", fontSize:"1.8rem", fontWeight:400, color:"#000000", marginBottom:"16px" }}>
            Simple. Fast. Free.
          </h2>
          <div style={{ width:"48px", height:"2px", background:"#dfdfdf", margin:"24px 0" }} />
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:"24px", marginTop:"8px" }}>
            {[
              { step:"01", title:"Search", desc:"Type what you're looking for — in English, Urdu, or Roman Urdu. Our AI understands." },
              { step:"02", title:"Discover", desc:"Browse results from all 15+ brands at once. Filter by price, color, fabric, and more." },
              { step:"03", title:"Buy", desc:"Click any product and you're taken directly to the brand's website to complete your purchase." },
            ].map(({ step, title, desc }) => (
              <div key={step}>
                <div style={{ fontFamily:"'Jost','DM Sans',sans-serif", fontSize:"2rem", color:"#dfdfdf", fontWeight:400, marginBottom:"8px" }}>{step}</div>
                <div style={{ fontSize:".8rem", fontWeight:400, color:"#000000", marginBottom:"6px", letterSpacing:".06em", textTransform:"uppercase" }}>{title}</div>
                <p style={{ fontSize:".82rem", lineHeight:1.7, color:"#757575" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Brands */}
      <div className="about-section">
        <p style={{ fontSize:".65rem", letterSpacing:".28em", textTransform:"uppercase", color:"#757575", marginBottom:"12px" }}>Our brands</p>
        <h2 style={{ fontFamily:"'Jost','DM Sans',sans-serif", fontSize:"1.8rem", fontWeight:400, color:"#000000", marginBottom:"6px" }}>
          15+ of Pakistan's finest
        </h2>
        <p style={{ fontSize:".82rem", color:"#757575", marginBottom:"4px" }}>Updated nightly. New brands added regularly.</p>
        <div style={{ width:"48px", height:"2px", background:"#dfdfdf", margin:"24px 0" }} />
        <div className="brand-grid">
          {BRANDS.map(b => (
            <div key={b} className="brand-pill"
              onClick={() => router.push(`/brand/${b.toLowerCase().replace(/\s+/g,"-")}`)}>
              {b}
            </div>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div style={{ background:"#ffffff", borderTop:"2px solid #dfdfdf" }} id="contact">
        <div className="about-section" style={{ paddingTop:"48px", paddingBottom:"48px" }}>
          <p style={{ fontSize:".65rem", letterSpacing:".28em", textTransform:"uppercase", color:"#757575", marginBottom:"12px" }}>Get in touch</p>
          <h2 style={{ fontFamily:"'Jost','DM Sans',sans-serif", fontSize:"1.8rem", fontWeight:400, color:"#000000", marginBottom:"6px" }}>
            We'd love to hear from you
          </h2>
          <div style={{ width:"48px", height:"2px", background:"#dfdfdf", margin:"24px 0" }} />
          <p style={{ fontSize:".85rem", lineHeight:1.8, color:"#757575", marginBottom:"20px" }}>
            Have a question, a brand you'd like us to add, or just want to say hello? Reach out any time.
          </p>
          <div className="contact-card">
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:"24px" }}>
              <div>
                <div style={{ fontSize:".6rem", letterSpacing:".2em", textTransform:"uppercase", color:"#757575", marginBottom:"8px" }}>Email</div>
                <a href="mailto:hello@theposhak.pk"
                  style={{ fontSize:".88rem", color:"#000000", textDecoration:"none", fontWeight:400 }}>
                  hello@theposhak.pk
                </a>
                <p style={{ fontSize:".72rem", color:"#757575", marginTop:"4px" }}>We reply within 24 hours</p>
              </div>
              <div>
                <div style={{ fontSize:".6rem", letterSpacing:".2em", textTransform:"uppercase", color:"#757575", marginBottom:"8px" }}>WhatsApp</div>
                <a href="https://wa.me/923161200044"
                  style={{ fontSize:".88rem", color:"#000000", textDecoration:"none", fontWeight:400 }}>
                  +92 316 1200044
                </a>
                <p style={{ fontSize:".72rem", color:"#757575", marginTop:"4px" }}>Mon–Sat, 10am–8pm PKT</p>
              </div>
              <div>
                <div style={{ fontSize:".6rem", letterSpacing:".2em", textTransform:"uppercase", color:"#757575", marginBottom:"8px" }}>Follow us</div>
                <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                  <a href="https://www.instagram.com/poshak_pk_/" target="_blank"
                    style={{ fontSize:".82rem", color:"#757575", textDecoration:"none", display:"flex", alignItems:"center", gap:"8px" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="0" ry="0"/>
                      <circle cx="12" cy="12" r="4"/>
                      <circle cx="17.5" cy="6.5" r="1" fill="#000000" stroke="none"/>
                    </svg>
                    @poshak_pk_
                  </a>
                  <a href="https://www.facebook.com/profile.php?id=61574287538656" target="_blank"
                    style={{ fontSize:".82rem", color:"#757575", textDecoration:"none", display:"flex", alignItems:"center", gap:"8px" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                    </svg>
                    Poshak on Facebook
                  </a>
                  <a href="https://www.tiktok.com/@poshak93" target="_blank"
                    style={{ fontSize:".82rem", color:"#757575", textDecoration:"none", display:"flex", alignItems:"center", gap:"8px" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/>
                    </svg>
                    @poshak93
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer style={{ borderTop:"2px solid #dfdfdf", padding:"24px", textAlign:"center", background:"#ffffff" }}>
        <div style={{ fontFamily:"'Jost','DM Sans',sans-serif", fontSize:"1.2rem", color:"#000000", marginBottom:"6px", fontWeight:400 }}>Poshak</div>
        <p style={{ fontSize:".62rem", letterSpacing:".12em", color:"#757575", textTransform:"uppercase" }}>Every brand. One place. · theposhak.pk</p>
      </footer>
    </div>
  );
}
