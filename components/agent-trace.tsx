"use client";

import * as Tabs from "@radix-ui/react-tabs";
import type { HypothesisTrace } from "@/lib/types";
import { IconAttention, IconInspect, IconUnknown, IconVerified } from "@/components/ui/icons";

export function AgentTrace({ traces }: { traces: HypothesisTrace[] }) {
  return (
    <Tabs.Root defaultValue="0" className="rounded-lg border border-border bg-surface shadow-panel">
      <div className="border-b border-border px-4 py-3"><p className="text-xs text-muted-foreground font-medium">Jejak asisten</p><h2 className="mt-1 text-base font-semibold">Rencana → Cari → Periksa → Ringkas</h2></div>
      <Tabs.List aria-label="Hipotesis asisten" className="flex gap-1 overflow-x-auto border-b border-border p-2">
        {traces.map((trace, index) => <Tabs.Trigger key={trace.id} value={String(index)} className="min-h-10 shrink-0 cursor-pointer rounded-lg px-3 font-mono text-xs text-muted-foreground transition-colors data-[state=active]:bg-primary/12 data-[state=active]:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">H{index + 1}</Tabs.Trigger>)}
      </Tabs.List>
      {traces.map((trace, index) => <Tabs.Content key={trace.id} value={String(index)} className="p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><div className="flex items-start gap-3"><span className="mt-0.5">{trace.outcome === "supported" ? <IconVerified aria-hidden="true" className="size-5 text-positive" /> : trace.outcome === "challenged" ? <IconAttention aria-hidden="true" className="size-5 text-attention" /> : <IconUnknown aria-hidden="true" className="size-5 text-muted-foreground" />}</span><div><h3 className="font-medium">{trace.hypothesis}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{trace.verification}</p></div></div><div className="mt-4 flex gap-2 rounded-lg bg-background p-3"><IconInspect aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" /><div><p className=" text-xs text-muted-foreground">Pencarian data rekaman</p><p className="mt-1 text-xs leading-5">{trace.query}</p></div></div></Tabs.Content>)}
    </Tabs.Root>
  );
}
