import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@xyflow/react/dist/style.css";
import "blobatar/motion.css";
import "blobatar/gaze.css";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/app-shell";

const sans = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Catalyst", template: "%s | Catalyst" },
  description: "Pemeriksa perubahan saham untuk menguji apa yang berubah, penyebabnya, dan bukti pembatalnya.",
  icons: { icon: "/catalyst-mark.png", apple: "/catalyst-mark.png" },
};

/** `cover` lets the bottom navigation reach the phone's edge and pad itself by
 *  the home-indicator inset; without it that inset reads as zero. The
 *  keyboard resizes the layout, so the assistant's input stays above it. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${sans.variable} ${mono.variable} font-[family-name:var(--font-sans)] antialiased`}>
        <Providers><AppShell>{children}</AppShell></Providers>
      </body>
    </html>
  );
}
