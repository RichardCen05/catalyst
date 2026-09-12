import { ShieldCheck } from "lucide-react";
import { Copilot } from "@/components/copilot";
import { PageHeader } from "@/components/page-header";

export default function CopilotPage() {
  return (
    <div data-tour="copilot-workspace">
      <PageHeader eyebrow="Asisten riset" title="Cari jawaban dari bukti" description="Tanyakan emiten, perbandingan, atau jalur dampak. Jawaban dibatasi data simulasi dan menyertakan sumber." />
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs leading-5 text-muted-foreground" aria-label="Batas asisten"><ShieldCheck aria-hidden="true" className="size-3.5 shrink-0 text-positive" />Tanpa bukti, asisten berhenti. Catatan Anda tetap menjadi hipotesis sampai diperiksa.</div>
      <div className="h-[calc(100dvh-220px)] min-h-[460px]"><Copilot workspace /></div>
    </div>
  );
}
