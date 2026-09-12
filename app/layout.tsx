import type { Metadata } from "next";
import { Fira_Code, Fira_Sans } from "next/font/google";
import "./globals.css";
import "@xyflow/react/dist/style.css";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/app-shell";

const firaSans = Fira_Sans({ subsets: ["latin"], variable: "--font-sans", weight: ["400", "500", "600", "700"], display: "swap" });
const firaCode = Fira_Code({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500", "600"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Catalyst", template: "%s | Catalyst" },
  description: "Prototype agent riset IDX berbasis empat pilar bukti.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${firaSans.variable} ${firaCode.variable} font-[family-name:var(--font-sans)] antialiased`}>
        <Providers><AppShell>{children}</AppShell></Providers>
      </body>
    </html>
  );
}
