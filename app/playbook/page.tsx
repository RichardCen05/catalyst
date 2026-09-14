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

type ListKey = Exclude<keyof InvestorResearchPlaybook, "preferredComparables" | "relevanceFloor">;

const fields: Array<{ key: ListKey; label: string; hint: string }> = [
  { key: "materialityRules", label: "Aturan materialitas", hint: "Kapan perubahan layak membuka atau menaikkan prioritas kasus." },
  { key: "knownExposures", label: "Eksposur emiten", hint: "Tulis kode saham dan penggerak yang Anda pahami, satu baris per eksposur." },
  { key: "thesisAssumptions", label: "Asumsi tesis", hint: "Asumsi yang harus tetap benar agar tesis bertahan." },
  { key: "trustedSources", label: "Sumber tepercaya", hint: "Sumber yang ingin diperiksa lebih dulu." },
  { key: "falsifiers", label: "Kondisi pembatal", hint: "Bukti yang akan membatalkan tesis, bukan sekadar sinyal negatif." },
];

export default function PlaybookPage() {
  const playbook = useCatalystStore((state) => state.playbook);
  const setPlaybookList = useCatalystStore((state) => state.setPlaybookList);
  const setPreferredComparables = useCatalystStore((state) => state.setPreferredComparables);
  const setRelevanceFloor = useCatalystStore((state) => state.setRelevanceFloor);
  const relevanceFloor = playbook.relevanceFloor ?? 85;
  const profile = useCatalystStore((state) => state.profile);
  const setWatchlist = useCatalystStore((state) => state.setWatchlist);
  const toggleOwned = useCatalystStore((state) => state.toggleOwned);
  const preferences = useCatalystStore((state) => state.preferences);
  const togglePreference = useCatalystStore((state) => state.togglePreference);
  const [activeSymbol, setActiveSymbol] = useState<SymbolCode>("ANTM");
  const [saved, setSaved] = useState(false);
  const analyzed = companies.filter((company) => company.analyzed);
  const comparables = playbook.preferredComparables[activeSymbol] ?? [];
  const activeCompany = companies.find((company) => company.symbol === activeSymbol);
  const comparableCandidates = companies.filter((company) => company.symbol !== activeSymbol && company.sector === activeCompany?.sector);

  return (
    <div>
      <PageHeader eyebrow="Aturan kolaborasi" title="Aturan riset investor" description="Tulis cara Anda menguji tesis. Aturan ini mengubah fokus dan urutan penjelasan, bukan angka, rumus, atau sumber." />
      <Panel className="mb-4">
        <PanelHeader eyebrow="Daftar pantauan" title="Saham yang dipantau dan dimiliki" />
        <div className="grid gap-2 p-4 sm:grid-cols-2">
          {companies.map((company) => {
            const watched = profile.watchlist.includes(company.symbol);
            const owned = profile.owned.includes(company.symbol);
            return (
              <div key={company.symbol} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
                <input
                  type="checkbox"
                  id={`watch-${company.symbol}`}
                  checked={watched}
                  onChange={() => setWatchlist(watched ? profile.watchlist.filter((item) => item !== company.symbol) : [...profile.watchlist, company.symbol])}
                  className="size-4 cursor-pointer accent-[var(--primary)]"
                  aria-label={`Pantau ${company.symbol}`}
                />
                <label htmlFor={`watch-${company.symbol}`} className="min-w-0 flex-1 cursor-pointer">
                  <span className="font-mono text-sm font-semibold text-primary">{company.symbol}</span>
                  <span className="ml-2 truncate text-xs text-muted-foreground">{company.name}{company.analyzed ? "" : " · ringkas"}</span>
                </label>
                <button
                  type="button"
                  onClick={() => toggleOwned(company.symbol)}
                  aria-pressed={owned}
                  title={owned ? "Hapus tanda dimiliki" : "Tandai dimiliki"}
                  className={cn("min-h-9 rounded-lg border px-2.5 font-mono text-[10px] uppercase tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", owned ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}
                >
                  {owned ? "Dimiliki" : "Tandai"}
                </button>
              </div>
            );
          })}
        </div>
        <p className="border-t border-border px-4 py-3 text-xs leading-5 text-muted-foreground">Hanya emiten berlabel kasus penuh yang membuka analisis; sisanya tampil sebagai data ringkas.</p>
      </Panel>

      <Panel className="mb-4">
        <PanelHeader eyebrow="Pembanding pilihan" title="Pembanding yang bermakna bagi Anda" />
        <div className="p-4">
          <label className="text-xs font-medium" htmlFor="playbook-symbol">Emiten utama</label>
          <select id="playbook-symbol" value={activeSymbol} onChange={(event) => setActiveSymbol(event.target.value as SymbolCode)} className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary sm:max-w-xs">{analyzed.map((company) => <option key={company.symbol} value={company.symbol}>{company.symbol} · {company.name}</option>)}</select>
          <fieldset className="mt-4"><legend className="text-xs text-muted-foreground">Pilih pembanding dari sektor yang sama</legend><div className="mt-2 flex flex-wrap gap-2">{comparableCandidates.map((company) => { const active = comparables.includes(company.symbol); return <button type="button" key={company.symbol} aria-pressed={active} onClick={() => setPreferredComparables(activeSymbol, active ? comparables.filter((item) => item !== company.symbol) : [...comparables, company.symbol])} className={cn("min-h-10 rounded-lg border px-3 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground")}>{company.symbol}</button>; })}</div></fieldset>
        </div>
      </Panel>

      <Panel>
        <PanelHeader eyebrow="Penilaian riset" title="Aturan yang dapat dilihat dan diubah" />
        <div className="border-b border-border p-4">
          <label htmlFor="relevance-floor" className="text-xs font-medium">Ambang relevansi materialitas: <span className="font-mono text-primary">{relevanceFloor}</span></label>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Eksposur dengan relevansi di atas ambang ini menandai kasus High. Kasus tanpa jalur eksposur tetap Low.</p>
          <input id="relevance-floor" type="range" min={40} max={97} step={1} value={relevanceFloor} onChange={(event) => { setSaved(false); setRelevanceFloor(Number(event.target.value)); }} className="mt-3 w-full max-w-md accent-[var(--primary)]" aria-valuetext={`${relevanceFloor} dari 100`} />
        </div>
        <div className="grid gap-5 p-4 lg:grid-cols-2">
          {fields.map((field) => <label key={field.key} className={field.key === "falsifiers" ? "lg:col-span-2" : undefined}><span className="text-xs font-medium">{field.label}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{field.hint}</span><textarea aria-label={field.label} rows={4} value={playbook[field.key].join("\n")} onChange={(event) => { setSaved(false); setPlaybookList(field.key, event.target.value.split("\n").map((item) => item.trim()).filter(Boolean)); }} className="mt-2 w-full resize-y rounded-lg border border-border bg-background p-3 text-sm leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-ring/25" /></label>)}
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-border p-4"><Button onClick={() => setSaved(true)}><Save aria-hidden="true" className="size-4" />Simpan aturan</Button>{saved ? <span role="status" className="inline-flex items-center gap-1 text-xs text-positive"><Check aria-hidden="true" className="size-3.5" />Aturan tersimpan</span> : null}<p className="ml-auto inline-flex items-center gap-2 text-xs text-muted-foreground"><BookOpenCheck aria-hidden="true" className="size-4 text-primary" />Semua data tersimpan lokal dan dapat dihapus melalui atur ulang.</p></div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader eyebrow="Preferensi yang dipelajari" title="Cara penyajian yang Anda pilih" />
        {preferences.length ? <div className="divide-y divide-border">{preferences.map((preference) => <div key={preference.id} className="flex items-center gap-3 px-4 py-3"><button type="button" role="switch" aria-checked={preference.active} aria-label={preference.label} onClick={() => togglePreference(preference.id)} className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", preference.active ? "bg-primary" : "bg-muted")}><span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", preference.active ? "left-[22px]" : "left-0.5")} /></button><div className="min-w-0"><p className="text-sm font-medium">{preference.label}</p><p className="truncate text-xs text-muted-foreground">{preference.explanation}</p></div></div>)}</div> : <p className="px-4 py-5 text-sm text-muted-foreground">Belum ada preferensi. Masukan dan catatan Anda akan muncul di sini.</p>}
      </Panel>
    </div>
  );
}
