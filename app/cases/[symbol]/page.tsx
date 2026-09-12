import { notFound } from "next/navigation";
import { companies } from "@/lib/data/fixtures";
import { CompanyDetailClient } from "@/app/companies/[symbol]/company-detail-client";

export function generateStaticParams() {
  return companies.filter((company) => company.analyzed).map((company) => ({ symbol: company.symbol }));
}

export default async function ResearchCasePage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const company = companies.find((item) => item.symbol === symbol.toUpperCase() && item.analyzed);
  if (!company) notFound();
  return <CompanyDetailClient symbol={company.symbol} />;
}
