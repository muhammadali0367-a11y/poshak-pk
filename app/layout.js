import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import PWAInstallPrompt from "./PWAInstallPrompt";

export const metadata = {
  title: "Poshak.pk — Pakistan's Women's Fashion Discovery",
  description: "Find every women's dress across Pakistan's top brands — Khaadi, Sapphire, Gul Ahmed, Limelight, Maria B and more. Lawn, Pret, Unstitched, Bridal, Festive collections all in one place.",
  keywords: "Pakistani women fashion, lawn suits, pret wear, unstitched suits, Pakistani dresses, Khaadi, Sapphire, Gul Ahmed, Limelight, Maria B, online shopping Pakistan",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180" },
      { url: "/icons/apple-touch-icon-167x167.png", sizes: "167x167" },
    ],
  },
  openGraph: {
    title: "Poshak.pk — Pakistan's Women's Fashion Discovery",
    description: "Find every women's dress across Pakistan's top brands in one place.",
    url: "https://theposhak.pk",
    siteName: "Poshak.pk",
    locale: "en_PK",
    type: "website",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Poshak",
    "theme-color": "#2a2420",
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
  "logo": "https://theposhak.pk/icons/icon-512x512.png",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />

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

        <Script id="sw-register" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                  .catch(err => console.log('SW failed:', err));
              });
            }
          `}
        </Script>

        {children}

        <PWAInstallPrompt />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
