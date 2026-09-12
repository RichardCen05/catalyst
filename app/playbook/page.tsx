"use client";

import { useState } from "react";
import { BookOpenCheck, Check, Save } from "lucide-react";
import { companies } from "@/lib/data/fixtures";
import { useCatalystStore } from "@/lib/store";
import type { InvestorResearchPlaybook, SymbolCode } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { cn } from "@/lib/utils";

type ListKey = Exclude<keyof InvestorResearchPlaybook, "preferredComparables">;

const fields: Array<{ key: ListKey; label: string; hint: string }> = [
  { key: "materialityRules", label: "Materiality rules", hint: "Kapan sebuah perubahan layak membuka atau menaikkan prioritas case." },
  { key: "knownExposures", label: "Known company exposures", hint: "Tulis ticker dan driver yang Anda pahami; satu baris per exposure." },
  { key: "thesisAssumptions", label: "Thesis assumptions", hint: "Asumsi yang harus tetap benar agar thesis bertahan." },
  { key: "trustedSources", label: "Trusted sources", hint: "Urutan atau jenis sumber yang ingin diperiksa lebih dulu." },
  { key: "falsifiers", label: "Falsifiers", hint: "Bukti eksplisit yang akan membatalkan thesis; bukan sekadar sinyal negatif." },
];

export default function PlaybookPage() {
  const playbook = useCatalystStore((state) => state.playbook);
  const setPlaybookList = useCatalystStore((state) => state.setPlaybookList);
  const setPreferredComparables = useCatalystStore((state) => state.setPreferredComparables);
  const [activeSymbol, setActiveSymbol] = useState<SymbolCode>("ANTM");
  const [saved, setSaved] = useState(false);
  const analyzed = companies.filter((company) => company.analyzed);
  const comparables = playbook.preferredComparables[activeSymbol] ?? [];
  const activeCompany = companies.find((company) => company.symbol === activeSymbol);
  const comparableCandidates = companies.filter((company) => company.symbol !== activeSymbol && company.sector === activeCompany?.sector);

  return (
    <div>
      <PageHeader eyebrow="Human–agent contract" title="Investor Research Playbook" description="Ajarkan cara Anda menguji thesis secara eksplisit. Playbook mengubah fokus dan pertanyaan agent—tidak mengubah angka, formula, atau sumber." />
      <Panel className="mb-4">
        <PanelHeader eyebrow="Preferred comparables" title="Pembanding yang bermakna bagi Anda" />
        <div className="p-4">
          <label className="text-xs font-medium" htmlFor="playbook-symbol">Emiten utama</label>
          <select id="playbook-symbol" value={activeSymbol} onChange={(event) => setActiveSymbol(event.target.value as SymbolCode)} className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary sm:max-w-xs">{analyzed.map((company) => <option key={company.symbol} value={company.symbol}>{company.symbol} · {company.name}</option>)}</select>
          <fieldset className="mt-4"><legend className="text-xs text-muted-foreground">Pilih pembanding dari sektor yang sama</legend><div className="mt-2 flex flex-wrap gap-2">{comparableCandidates.map((company) => { const active = comparables.includes(company.symbol); return <button type="button" key={company.symbol} aria-pressed={active} onClick={() => setPreferredComparables(activeSymbol, active ? comparables.filter((item) => item !== company.symbol) : [...comparables, company.symbol])} className={cn("min-h-10 rounded-lg border px-3 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground")}>{company.symbol}</button>; })}</div></fieldset>
        </div>
      </Panel>

      <Panel>
        <PanelHeader eyebrow="Explicit research judgment" title="Aturan yang dapat dilihat dan diubah" />
        <div className="grid gap-5 p-4 lg:grid-cols-2">
          {fields.map((field) => <label key={field.key} className={field.key === "falsifiers" ? "lg:col-span-2" : undefined}><span className="text-xs font-medium">{field.label}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{field.hint}</span><textarea aria-label={field.label} rows={4} value={playbook[field.key].join("\n")} onChange={(event) => { setSaved(false); setPlaybookList(field.key, event.target.value.split("\n").map((item) => item.trim()).filter(Boolean)); }} className="mt-2 w-full resize-y rounded-lg border border-border bg-background p-3 text-sm leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-ring/25" /></label>)}
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-border p-4"><Button onClick={() => setSaved(true)}><Save aria-hidden="true" className="size-4" />Simpan playbook</Button>{saved ? <span role="status" className="inline-flex items-center gap-1 text-xs text-positive"><Check aria-hidden="true" className="size-3.5" />Playbook tersimpan</span> : null}<p className="ml-auto inline-flex items-center gap-2 text-xs text-muted-foreground"><BookOpenCheck aria-hidden="true" className="size-4 text-primary" />Semua field tersimpan lokal dan dapat dihapus lewat reset.</p></div>
      </Panel>
    </div>
  );
}
