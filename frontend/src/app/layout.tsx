import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { routing } from "@/i18n/routing";
import { getAbsoluteUrl, getSiteUrl, SITE_NAME } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  applicationName: SITE_NAME,
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  publisher: SITE_NAME,
  creator: SITE_NAME,
  category: "Sports",
  referrer: "origin-when-cross-origin",
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    images: [
      {
        url: getAbsoluteUrl("/logo/tzdraft-logo-solid.png"),
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} logo`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [getAbsoluteUrl("/logo/tzdraft-logo-solid.png")],
  },
  icons: {
    icon: "/logo/tzdraft-logo-solid.png",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("NEXT_LOCALE")?.value;
  const lang = routing.locales.includes(localeCookie as "sw" | "en")
    ? localeCookie
    : routing.defaultLocale;

  return (
    <html lang={lang}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
