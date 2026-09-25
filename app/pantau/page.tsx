import type { Metadata } from "next";
import { WebWatchReview } from "@/components/web-watch-review";

export const metadata: Metadata = { title: "Pantau", description: "Sumber web yang diawasi, antrean tinjauan, dan peristiwa yang diterima ke analisis." };

export default function PantauPage() {
  return <WebWatchReview />;
}
