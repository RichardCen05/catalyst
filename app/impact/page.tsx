"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GitBranch } from "lucide-react";
import { companies, events } from "@/lib/data/fixtures";
import type { SymbolCode } from "@/lib/types";
import { Panel } from "@/components/ui/panel";

function ImpactRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested = (searchParams.get("case") ?? searchParams.get("company"))?.toUpperCase() as SymbolCode | undefined;
  const event = events.find((item) => item.id === searchParams.get("event"));
  const eventSymbol = event?.impactLinks.find((link) => companies.some((company) => company.symbol === link.symbol && company.analyzed))?.symbol;
  const symbol = companies.some((company) => company.symbol === requested && company.analyzed) ? requested! : eventSymbol ?? "ANTM";

  useEffect(() => {
    router.replace(`/cases/${symbol}?tab=hypotheses`);
  }, [router, symbol]);

  return <Panel className="mx-auto max-w-xl p-8 text-center" role="status"><GitBranch aria-hidden="true" className="mx-auto size-6 text-primary" /><h1 className="mt-3 text-lg font-semibold">Membuka competing hypotheses</h1><p className="mt-1 text-sm text-muted-foreground">Causal Impact sekarang berada di dalam Research Case {symbol}.</p></Panel>;
}

export default function ImpactPage() {
  return <Suspense fallback={<Panel className="mx-auto h-40 max-w-xl animate-pulse bg-muted" aria-label="Membuka Research Case" />}><ImpactRedirect /></Suspense>;
}
