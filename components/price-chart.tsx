"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { BarChart3, Expand, X } from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PricePoint } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";

function Chart({ data, height = 310 }: { data: PricePoint[]; height?: number }) {
  const normalized = data.map((point) => ({ ...point, stockIndex: Number((point.close / data[0].close * 100).toFixed(2)), ihsgIndex: Number((point.ihsg / data[0].ihsg * 100).toFixed(2)), shortDate: point.date.slice(5) }));
  return <div style={{ height }} className="w-full" aria-label="Grafik indeks harga saham versus IHSG dan volume harian"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={normalized} margin={{ top: 12, right: 4, left: -20, bottom: 0 }}><CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="shortDate" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={34} /><YAxis yAxisId="price" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} /><YAxis yAxisId="volume" orientation="right" hide domain={[0, "dataMax * 4"]} /><Tooltip contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 11 }} formatter={(value, name) => [name === "Volume" ? formatNumber(Number(value)) : `${Number(value).toFixed(2)} idx`, name]} labelFormatter={(value) => `Tanggal ${value}`} /><Legend wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)" }} /><Bar yAxisId="volume" dataKey="volume" name="Volume" fill="var(--attention)" opacity={0.24} radius={[2, 2, 0, 0]} isAnimationActive={false} /><Line yAxisId="price" type="monotone" dataKey="stockIndex" name="Saham (indeks)" stroke="var(--primary)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} /><Line yAxisId="price" type="monotone" dataKey="ihsgIndex" name="IHSG (indeks)" stroke="var(--muted-foreground)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} isAnimationActive={false} /></ComposedChart></ResponsiveContainer></div>;
}

export function PriceChart({ data, symbol }: { data: PricePoint[]; symbol: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-surface shadow-panel">
      <div className="flex items-center justify-between border-b border-border px-4 py-3"><div><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">45 hari bursa</p><h2 className="mt-1 text-base font-semibold">{symbol} vs IHSG</h2></div><Button variant="secondary" size="sm" onClick={() => setOpen(true)}><Expand aria-hidden="true" className="size-3.5" />Fokus chart</Button></div>
      <div className="p-3"><Chart data={data} /></div>
      <details className="border-t border-border px-4 py-3"><summary className="min-h-8 cursor-pointer font-mono text-xs text-primary">Buka tabel data alternatif</summary><div className="mt-3 max-h-72 overflow-auto"><table className="w-full text-left text-xs"><caption className="sr-only">Data harga {symbol}, IHSG, dan volume</caption><thead className="sticky top-0 bg-surface text-muted-foreground"><tr><th className="px-2 py-2">Tanggal</th><th className="px-2 py-2 text-right">Close</th><th className="px-2 py-2 text-right">IHSG</th><th className="px-2 py-2 text-right">Volume</th></tr></thead><tbody>{data.map((point) => <tr key={point.date} className="border-t border-border"><td className="px-2 py-2 font-mono">{point.date}</td><td className="px-2 py-2 text-right font-mono">{formatNumber(point.close)}</td><td className="px-2 py-2 text-right font-mono">{formatNumber(point.ihsg)}</td><td className="px-2 py-2 text-right font-mono">{formatNumber(point.volume)}</td></tr>)}</tbody></table></div></details>
      <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-100 bg-slate-950/75 backdrop-blur-sm" /><Dialog.Content className="fixed inset-3 z-100 overflow-auto rounded-xl border border-border bg-surface p-4 shadow-2xl focus:outline-none sm:inset-8"><div className="mb-4 flex items-start gap-3"><div className="grid size-9 place-items-center rounded-lg bg-primary/12 text-primary"><BarChart3 aria-hidden="true" className="size-5" /></div><div className="flex-1"><Dialog.Title className="text-lg font-semibold">{symbol} vs IHSG</Dialog.Title><Dialog.Description className="text-sm text-muted-foreground">Indeks 100 pada awal periode. Volume memakai sumbu terpisah.</Dialog.Description></div><Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Tutup chart"><X aria-hidden="true" className="size-4" /></Button></Dialog.Close></div><Chart data={data} height={520} /></Dialog.Content></Dialog.Portal></Dialog.Root>
    </div>
  );
}
