import type { Metadata, Viewport } from "next";
import { Anton, Instrument_Serif, Inter } from "next/font/google";
import "./globals.css";
import { business } from "@/lib/site";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { AuthProvider } from "@/components/account/AuthProvider";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { WhatsAppFab } from "@/components/layout/WhatsAppFab";
import { SmoothScroll } from "@/components/motion/SmoothScroll";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://duhcutebarbearia.com.br";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${business.name} — ${business.city}/${business.state} | Corte, barba e assinatura`,
    template: `%s | ${business.shortName}`,
  },
  description:
    "Barbearia em Vila Nova, Jaraguá do Sul/SC. Corte, barba e sobrancelha com hora marcada, Clube do Assinante e produtos da casa. 5,0 no Google com 123 avaliações.",
  keywords: [
    "barbearia Jaraguá do Sul",
    "corte de cabelo Vila Nova",
    "barba Jaraguá do Sul",
    "degradê Jaraguá",
    "assinatura de corte",
    "Duh Corte Barbearia",
  ],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName: business.name,
    title: `${business.name} — ${business.tagline}`,
    description: "Corte, barba e assinatura com hora marcada em Vila Nova, Jaraguá do Sul.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: business.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${business.name} — ${business.tagline}`,
    description: "Corte, barba e assinatura com hora marcada em Jaraguá do Sul.",
    images: ["/opengraph-image"],
  },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "HairSalon",
  name: business.name,
  description: "Barbearia com corte, barba, sobrancelha e Clube do Assinante em Vila Nova, Jaraguá do Sul.",
  image: `${siteUrl}/opengraph-image`,
  telephone: business.phone,
  address: {
    "@type": "PostalAddress",
    streetAddress: business.address.street,
    addressLocality: business.address.city,
    addressRegion: business.address.state,
    postalCode: business.address.zip,
    addressCountry: "BR",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: business.rating.value,
    reviewCount: business.rating.count,
    bestRating: 5,
  },
  sameAs: [business.instagram],
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "19:00",
    },
  ],
  priceRange: "R$$",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${anton.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-ink text-bone">
        <AuthProvider>
        <link rel="preload" as="image" href="/brand/wordmark-bone.png" fetchPriority="high" />
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD estatico do proprio negocio
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <SmoothScroll />
        <a
          href="#conteúdo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-full focus:bg-gold focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-ink"
        >
          Pular para o conteúdo
        </a>
        <SiteHeader />
        <main id="conteúdo" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <WhatsAppFab />
        </AuthProvider>
      </body>
    </html>
  );
}
