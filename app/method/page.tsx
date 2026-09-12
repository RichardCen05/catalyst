import { AlertTriangle, Braces, CheckCircle2, Database, FileWarning, Scale, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";

const pillars = [
  { name: "Konsentrasi", input: "Broker summary, registry, foreign flow, free float", formula: "Top share, HHI, effective participants, float absorbed", output: "Concentrated Flow, Broad Participation, Foreign Alignment, Source Conflict" },
  { name: "Volume", input: "Daily volume dan baseline 45 hari bursa", formula: "Median dan MAD robust z-score, lalu liquidity gate", output: "Normal, Elevated, Extreme, Insufficient Data" },
  { name: "Momentum", input: "Daily close, IHSG, beta, pembanding sektor", formula: "Return 3 hari dikurangi beta × return IHSG", output: "Market-aligned, Sector-led, Idiosyncratic, Mixed" },
  { name: "Katalis", input: "Sectors news, filing, komoditas, BI-Rate/JISDOR, kebijakan, dan cuaca BMKG", formula: "Sumber ∩ eksposur ∩ timing ∩ jalur sebab-akibat yang dapat diuji", output: "Supported, Adverse, Mixed, Unrelated, Unverified" },
];

export default function MethodPage() {
  return (
    <div>
      <PageHeader eyebrow="Method and limits" title="Cara Catalyst menyusun bukti" description="Prototype memakai fixture statis dan kalkulator deterministik. Halaman ini menjelaskan rumus, sumber, batas personalisasi, dan kondisi saat agent harus berhenti." />
      <Panel>
        <PanelHeader eyebrow="Two evidence layers" title="Empat pemeriksaan, dua pertanyaan berbeda" />
        <div className="grid gap-px border-b border-border bg-border md:grid-cols-2"><section className="bg-surface p-4 sm:p-5"><p className="font-mono text-[10px] uppercase tracking-wider text-primary">Layer 01</p><h2 className="editorial mt-1 text-2xl">Market Confirmation</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Konsentrasi, Volume, dan Momentum menjawab apakah perubahan benar-benar tampak pada perilaku pasar.</p></section><section className="bg-surface p-4 sm:p-5"><p className="font-mono text-[10px] uppercase tracking-wider text-primary">Layer 02</p><h2 className="editorial mt-1 text-2xl">Business Transmission</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Katalis, exposure, dan financial observable menjawab apakah perubahan dapat mencapai bisnis perusahaan.</p></section></div>
        <div className="grid gap-px bg-border md:grid-cols-2">{pillars.map((pillar, index) => <article key={pillar.name} className="bg-surface p-4 sm:p-5"><div className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-md bg-primary/10 font-mono text-xs font-semibold text-primary">{index + 1}</span><h2 className="font-semibold">{pillar.name}</h2></div><dl className="mt-4 space-y-3 text-sm"><div><dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Input produksi yang direpresentasikan</dt><dd className="mt-1 leading-6">{pillar.input}</dd></div><div><dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Proses</dt><dd className="mt-1 leading-6">{pillar.formula}</dd></div><div><dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Output</dt><dd className="mt-1 leading-6 text-muted-foreground">{pillar.output}</dd></div></dl></article>)}</div>
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel><PanelHeader eyebrow="Orchestration" title="Sepuluh tahap agent" /><ol className="divide-y divide-border px-4">{["Resolver membatasi ticker, watchlist, atau pasar.", "Planner membentuk tiga sampai enam hipotesis.", "Tool simulator memilih fixture yang diperlukan.", "Kalkulator menghasilkan metrik dari data.", "Contradiction gate membandingkan origin dan foreign flow.", "Citation gate memeriksa provider, endpoint, field, asOf, dan tujuan tautan.", "Language gate menahan advisory dan atribusi motif.", "Human-review gate menambahkan koreksi user sebagai hipotesis terbuka.", "Personalizer mengatur ranking serta kedalaman.", "Renderer membentuk kartu, causal chain, atau jawaban chat."].map((item, index) => <li key={item} className="flex gap-3 py-3 text-sm leading-6"><span className="font-mono text-xs text-primary">{String(index + 1).padStart(2, "0")}</span><span>{item}</span></li>)}</ol></Panel>
        <div className="space-y-4">
          <Panel><PanelHeader eyebrow="Data contract" title="Citation gate" /><div className="p-4"><div className="flex gap-3 rounded-lg border border-primary/20 bg-primary/8 p-3"><Database aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" /><p className="text-sm leading-6">Setiap angka output harus membawa provider, endpoint, field, dan asOf. Tautan fixture diberi label provider/dokumentasi agar tidak disalahartikan sebagai bukti event aktual.</p></div><pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-background p-3 font-mono text-[11px] leading-5 text-muted-foreground"><code>{`{ provider, endpoint, field, asOf, url, access }`}</code></pre></div></Panel>
          <Panel><PanelHeader eyebrow="Human collaboration" title="Belajar hanya setelah disetujui" /><div className="space-y-3 p-4">{["Koreksi user disimpan sebagai hipotesis terbuka", "Status review dapat dikembalikan ke antrean", "Catatan tidak mengubah fakta atau formula", "Resolution menghasilkan proposal rule, bukan perubahan otomatis", "User menerima atau menolak proposal dari Research Audit"].map((item) => <div key={item} className="flex items-center gap-2 text-sm"><CheckCircle2 aria-hidden="true" className="size-4 text-positive" />{item}</div>)}</div></Panel>
        </div>
      </div>

      <Panel className="mt-4">
        <PanelHeader eyebrow="Known limits" title="Faktor yang belum diperiksa" />
        <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">{[
          { icon: Braces, title: "Fixture statis", text: "Tidak ada panggilan Sectors API, LLM, scraping, atau cron pada versi ini." },
          { icon: FileWarning, title: "Tanpa intraday", text: "Chart memakai daily close dan volume. Order book tidak tersedia." },
          { icon: Scale, title: "Tanpa motif", text: "Kode broker ditampilkan sebagai fakta transaksi, bukan atribusi niat." },
          { icon: AlertTriangle, title: "Tanpa aksi", text: "Output berhenti pada bukti, konflik, dan informasi yang belum ada." },
        ].map((item) => <article key={item.title} className="bg-surface p-4"><item.icon aria-hidden="true" className="size-5 text-attention" /><h3 className="mt-3 font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p></article>)}</div>
        <div className="flex gap-3 border-t border-border bg-background p-4"><ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" /><p className="text-sm leading-6"><strong>Disclaimer:</strong> Catalyst adalah alat riset prototype. Data bersifat simulasi dan bukan kondisi pasar terkini. Output tidak menilai tindakan transaksi, target harga, atau hasil investasi.</p></div>
      </Panel>
    </div>
  );
}
