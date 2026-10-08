import type { Metadata } from "next";
import { Geist, Geist_Mono, Urbanist } from "next/font/google";

import "../index.css";
import Providers from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const urbanist = Urbanist({
  variable: "--font-urbanist",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Nova HMS — Enterprise Hospital ERP",
  description: "Next-generation Hospital Management System & ERP Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${urbanist.variable} ${geistSans.variable} ${geistMono.variable} font-[family-name:var(--font-urbanist)] antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
