import { Analytics } from '@vercel/analytics/next';

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

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
