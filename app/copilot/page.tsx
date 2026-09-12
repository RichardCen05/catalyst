import { Bot, Search, ShieldCheck } from "lucide-react";
import { Copilot } from "@/components/copilot";
import { PageHeader } from "@/components/page-header";

export default function CopilotPage() {
  return (
    <div>
      <PageHeader eyebrow="AI research desk" title="Cari jawaban dari bukti yang sudah diperiksa" description="Tanyakan ticker, bandingkan dua emiten, atau telusuri dampak berita, cuaca, komoditas, rupiah, dan kebijakan. Jawaban tetap dibatasi fixture dan menyertakan ledger sumber." />
      <div className="mb-3 grid gap-2 sm:grid-cols-3" aria-label="Batas copilot">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted-foreground"><Search aria-hidden="true" className="size-3.5 text-primary" />Pencarian lintas fixture</div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted-foreground"><ShieldCheck aria-hidden="true" className="size-3.5 text-positive" />Fail-closed tanpa bukti</div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted-foreground"><Bot aria-hidden="true" className="size-3.5 text-attention" />Catatan user jadi hipotesis</div>
      </div>
      <div className="h-[calc(100dvh-255px)] min-h-[460px]"><Copilot workspace /></div>
    </div>
  );
}
