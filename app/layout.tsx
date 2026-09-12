import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
// React Flow's stylesheet first, so the overrides in globals.css win without
// needing to fight it on specificity.
import "@xyflow/react/dist/style.css";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/app-shell";

const sans = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
const editorial = Newsreader({ subsets: ["latin"], variable: "--font-editorial", weight: ["400", "500"], style: ["normal", "italic"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Catalyst", template: "%s | Catalyst" },
  description: "Prototype agent riset IDX berbasis empat pilar bukti.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${sans.variable} ${mono.variable} ${editorial.variable} font-[family-name:var(--font-sans)] antialiased`}>
        <Providers><AppShell>{children}</AppShell></Providers>
      </body>
    </html>
  );
}
