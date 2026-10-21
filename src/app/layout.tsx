import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, DM_Serif_Display } from "next/font/google";
import { site } from "@/lib/site";
import { SwRegister } from "@/components/sw-register";
import "./globals.css";
const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const brand = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-brand",
});
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.title}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  keywords: [...site.keywords],
  applicationName: site.name,
  authors: [{ name: site.name }],
  category: "finance",
  alternates: {
    canonical: "/",
  },
  icons: { icon: "/icon.svg" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: site.name,
    title: `${site.name} — ${site.title}`,
    description: site.description,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.title}`,
    description: site.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};
export const viewport: Viewport = {
  themeColor: "#ffffff",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geist.variable} ${mono.variable} ${brand.variable} antialiased`}
      >
        <SwRegister />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
