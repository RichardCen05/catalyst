import { notFound } from "next/navigation";
import { companies } from "@/lib/data/fixtures";
import { CompanyDetailClient } from "./company-detail-client";

export function generateStaticParams() {
  return companies.map((company) => ({ symbol: company.symbol }));
}

export default async function CompanyDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const company = companies.find((item) => item.symbol === symbol.toUpperCase());
  if (!company) notFound();
  return <CompanyDetailClient symbol={company.symbol} />;
}
