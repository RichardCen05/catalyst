import { events, WINDOW_SESSIONS } from "@/lib/data/fixtures";
import { PageHeader } from "@/components/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Reveal } from "@/components/ui/reveal";
import { IconCheck, IconCode, IconDraftData, IconGate, IconScales, IconSource, IconVerified } from "@/components/ui/icons";

const CATALYST_SOURCE_LABELS: Record<string, string> = {
  sectors: "Sectors news",
  filing: "filing",
  macro: "makro",
  commodity: "komoditas",
  weather: "cuaca BMKG",
  policy: "kebijakan",
};

const catalystInputs = Array.from(new Set(events.map((event) => event.sourceType))).map((sourceType) => CATALYST_SOURCE_LABELS[sourceType] ?? sourceType);

const pillars = [
  { name: "Konsentrasi", input: "Broker summary, registry, foreign flow, free float", formula: "Top share, HHI, effective participants, float absorbed", output: "Concentrated Flow, Broad Participation, Foreign Alignment, Source Conflict" },
  { name: "Volume", input: `Daily volume dan baseline ${WINDOW_SESSIONS} hari bursa`, formula: "Median dan MAD robust z-score, lalu liquidity gate", output: "Normal, Elevated, Extreme, Insufficient Data" },
  { name: "Momentum", input: "Daily close, IHSG, beta, pembanding sektor", formula: "Return 3 hari dikurangi beta × return IHSG", output: "Market-aligned, Sector-led, Idiosyncratic, Mixed" },
  { name: "Katalis", input: catalystInputs.join(", "), formula: "Sumber ∩ eksposur ∩ timing ∩ jalur sebab-akibat yang dapat diuji", output: "Supported, Adverse, Mixed, Unrelated, Unverified" },
];

const stages = [
  "Resolver membatasi ticker, watchlist, atau pasar.",
  "Planner membentuk tiga sampai enam hipotesis.",
  "Tool layer memilih rekaman endpoint yang diperlukan.",
  "Kalkulator menghasilkan metrik dari data.",
  "Contradiction gate membandingkan origin dan foreign flow.",
  "Citation gate memeriksa provider, endpoint, field, asOf, dan tujuan tautan.",
  "Language gate menahan advisory dan atribusi motif.",
  "Human-review gate menambahkan koreksi user sebagai hipotesis terbuka.",
  "Personalizer mengatur ranking serta kedalaman.",
  "Renderer membentuk kartu, causal chain, atau jawaban chat.",
];

const limits = [
  { icon: IconCode, title: "Rekaman statis", text: "Sectors API direkam sekali lalu diputar ulang. Tidak ada panggilan live, LLM, scraping, atau cron pada versi ini." },
  { icon: IconDraftData, title: "Tanpa intraday", text: "Chart memakai daily close dan volume. Order book tidak tersedia." },
  { icon: IconScales, title: "Tanpa motif", text: "Kode broker ditampilkan sebagai fakta transaksi, bukan atribusi niat." },
  { icon: IconGate, title: "Tanpa aksi", text: "Output berhenti pada bukti, konflik, dan informasi yang belum ada." },
];

export default function MethodPage() {
  return (
    <div className="mx-auto max-w-[1180px]">
      <PageHeader eyebrow="Method and limits" title="Cara Catalyst menyusun bukti" description="Prototype memakai rekaman Sectors API dan kalkulator deterministik. Halaman ini menjelaskan rumus, sumber, batas personalisasi, dan kondisi saat agent harus berhenti." />
      <Panel>
        <PanelHeader eyebrow="Four-pillar model" title="Tidak ada skor daya tarik gabungan" />
        <div className="grid gap-px bg-border md:grid-cols-2">{pillars.map((pillar, index) => <article key={pillar.name} className="bg-surface p-4 sm:p-5"><div className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-md bg-primary/10 font-mono text-xs font-semibold text-primary">{index + 1}</span><h2 className="font-semibold">{pillar.name}</h2></div><dl className="mt-4 space-y-3 text-sm"><div><dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Input produksi yang direpresentasikan</dt><dd className="mt-1 leading-6">{pillar.input}</dd></div><div><dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Proses</dt><dd className="mt-1 leading-6">{pillar.formula}</dd></div><div><dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Output</dt><dd className="mt-1 leading-6 text-muted-foreground">{pillar.output}</dd></div></dl></article>)}</div>
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel><PanelHeader eyebrow="Orchestration" title="Sepuluh tahap agent" /><ol className="divide-y divide-border px-4">{["Resolver membatasi ticker, watchlist, atau pasar.", "Planner membentuk tiga sampai enam hipotesis.", "Tool layer memilih rekaman endpoint yang diperlukan.", "Kalkulator menghasilkan metrik dari data.", "Contradiction gate membandingkan origin dan foreign flow.", "Citation gate memeriksa provider, endpoint, field, asOf, dan tujuan tautan.", "Language gate menahan advisory dan atribusi motif.", "Human-review gate menambahkan koreksi user sebagai hipotesis terbuka.", "Personalizer mengatur ranking serta kedalaman.", "Renderer membentuk kartu, causal chain, atau jawaban chat."].map((item, index) => <li key={item} className="flex gap-3 py-3 text-sm leading-6"><span className="font-mono text-xs text-primary">{String(index + 1).padStart(2, "0")}</span><span>{item}</span></li>)}</ol></Panel>
        <div className="space-y-4">
          <Panel><PanelHeader eyebrow="Data contract" title="Citation gate" /><div className="p-4"><div className="flex gap-3 rounded-lg border border-primary/20 bg-primary/8 p-3"><IconSource aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" /><p className="text-sm leading-6">Setiap angka output harus membawa provider, endpoint, field, dan asOf. Tautan diberi label direct, provider, atau dokumentasi agar pembaca tahu mana yang membuka sumber aslinya.</p></div><pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-background p-3 font-mono text-[11px] leading-5 text-muted-foreground"><code>{`{ provider, endpoint, field, asOf, url, access }`}</code></pre></div></Panel>
          <Panel><PanelHeader eyebrow="Human collaboration" title="Terlihat, dapat dibalik, dapat dihapus" /><div className="space-y-3 p-4">{["Koreksi user disimpan sebagai hipotesis terbuka", "Status review dapat dikembalikan ke antrean", "Catatan tidak mengubah fakta atau formula", "Resolution memory dapat ditinjau dari Research Audit"].map((item) => <div key={item} className="flex items-center gap-2 text-sm"><IconCheck aria-hidden="true" className="size-4 text-positive" />{item}</div>)}</div></Panel>
        </div>
      </div>

      <Reveal className="mt-6">
        <Panel>
          <PanelHeader eyebrow="Known limits" title="Faktor yang belum diperiksa" />
          <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
            {limits.map((item) => (
              <article key={item.title} className="bg-surface px-5 py-6">
                <item.icon className="size-4.5 text-muted-foreground" />
                <h3 className="mt-4 text-[13.5px] font-medium">{item.title}</h3>
                <p className="mt-2 text-[12.5px] leading-[1.65] text-muted-foreground">{item.text}</p>
              </article>
            ))}
          </div>
          <p className="border-t border-border px-6 py-6 text-[13px] leading-[1.75]">
            <strong className="font-medium">Disclaimer.</strong> Catalyst adalah alat riset prototype. Data berasal dari rekaman Sectors API per 11 September 2026, bukan kondisi pasar terkini. Output tidak menilai tindakan transaksi, target harga, atau hasil investasi.
          </p>
        </Panel>
      </Reveal>
    </div>
  );
}
