import { Analytics } from "@vercel/analytics/react";
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
    "https://www.instagram.com/poshak.pk",
    "https://www.facebook.com/poshak.pk",
    "https://www.tiktok.com/@poshak.pk"
  ]
};

export default function RootLayout({ children }) {
  const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="en">
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

        {children}

        {/* Vercel Analytics */}
        <Analytics />
      </body>
    </html>
  );
}

  return (
    <html lang="en">
      <body>
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

        {children}

        {/* Vercel Analytics */}
        <Analytics />
      </body>
    </html>
  );
}
