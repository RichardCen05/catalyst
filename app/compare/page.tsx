import { redirect } from "next/navigation";

export default async function LegacyComparePage({ searchParams }: { searchParams: Promise<{ symbols?: string }> }) {
  const { symbols } = await searchParams;
  const query = symbols ? `&compare=${encodeURIComponent(symbols)}` : "";
  redirect(`/cases?view=picker${query}`);
}
