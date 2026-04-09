import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";

export const metadata = {
  title: "Poshak.pk — Pakistan's Women's Fashion Discovery",
  description: "Find every women's dress across Pakistan's top brands — Khaadi, Sapphire, Gul Ahmed, Limelight, Maria B and more. Lawn, Pret, Unstitched, Bridal, Festive collections all in one place.",
  keywords: "Pakistani women fashion, lawn suits, pret wear, unstitched suits, Pakistani dresses, Khaadi, Sapphire, Gul Ahmed, Limelight, Maria B, online shopping Pakistan",
  icons: {
    icon: "/favicon.ico",
    apple: "/poshak_icon_512.png",
  },
  openGraph: {
    title: "Poshak.pk — Pakistan's Women's Fashion Discovery",
    description: "Find every women's dress across Pakistan's top brands in one place.",
    url: "https://theposhak.pk",
    siteName: "Poshak.pk",
    locale: "en_PK",
    type: "website",
  },
};

// Font preloading — declared at module level so Next.js puts in <head>
export const viewport = {
  themeColor: "#2a2420",
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Poshak",
  "url": "https://theposhak.pk",
  "description": "Pakistan's first women's fashion search engine — find products from Khaadi, Gul Ahmed, Maria B, Sana Safinaz and 15+ brands in one place.",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://theposhak.pk/search?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Poshak",
  "url": "https://theposhak.pk",
  "logo": "https://theposhak.pk/poshak_icon_512.png",
  "description": "Pakistan's first women's fashion search engine",
  "sameAs": [
    "https://www.instagram.com/poshak_pk_/",
    "https://www.facebook.com/profile.php?id=61574287538656",
    "https://www.tiktok.com/@poshak93"
  ]
};

export default function RootLayout({ children }) {
  const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap" />
        <style dangerouslySetInnerHTML={{__html:`
          *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
          body{font-family:'DM Sans',system-ui,sans-serif;background:#fdfcfb;color:#2a2420;}
        `}} />
      </head>
      <body>
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />

        {/* Google Analytics 4 */}
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
              `}
            </Script>
          </>
        )}

        {/* Meta Pixel */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1455331923057156');
            fbq('track', 'PageView');
          `}
        </Script>

        {children}

        {/* Vercel Analytics + Speed Insights */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
