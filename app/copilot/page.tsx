import { ShieldCheck } from "lucide-react";
import { Copilot } from "@/components/copilot";
import { DATA_AS_OF_LABEL } from "@/lib/data/fixtures";
import { PageHeader } from "@/components/page-header";
import { IconGate, IconNote, IconSearch } from "@/components/ui/icons";

const limits = [
  { icon: IconSearch, text: "Pencarian lintas rekaman" },
  { icon: IconGate, text: "Fail-closed tanpa bukti" },
  { icon: IconNote, text: "Catatan user jadi hipotesis" },
];

export default function CopilotPage() {
  return (
    <div data-tour="copilot-workspace" className="xl:flex xl:h-[calc(100dvh-116px)] xl:flex-col">
      <PageHeader title="Asisten" description={`Tanyakan emiten, perbandingan, atau jalur dampak. Jawaban dibatasi rekaman ${DATA_AS_OF_LABEL} dan selalu menyertakan sumber.`} />
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs leading-5 text-muted-foreground xl:shrink-0" aria-label="Batas asisten"><ShieldCheck aria-hidden="true" className="size-3.5 shrink-0 text-positive" />Tanpa bukti, asisten berhenti. Catatan Anda tetap menjadi hipotesis sampai diperiksa.</div>
      <div className="h-[calc(100dvh-220px)] min-h-[460px] xl:h-auto xl:min-h-0 xl:flex-1"><Copilot workspace /></div>
    </div>
  );
}
