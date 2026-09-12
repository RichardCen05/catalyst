import { PageHeader } from "@/components/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Reveal } from "@/components/ui/reveal";
import { IconCode, IconDraftData, IconGate, IconScales, IconSource, IconVerified } from "@/components/ui/icons";

const pillars = [
  { name: "Konsentrasi", input: "Broker summary, registry, foreign flow, free float", formula: "Top share, HHI, effective participants, float absorbed", output: "Concentrated Flow, Broad Participation, Foreign Alignment, Source Conflict" },
  { name: "Volume", input: "Daily volume dan baseline 45 hari bursa", formula: "Median dan MAD robust z-score, lalu liquidity gate", output: "Normal, Elevated, Extreme, Insufficient Data" },
  { name: "Momentum", input: "Daily close, IHSG, beta, pembanding sektor", formula: "Return 3 hari dikurangi beta × return IHSG", output: "Market-aligned, Sector-led, Idiosyncratic, Mixed" },
  { name: "Katalis", input: "Sectors news, filing, komoditas, BI-Rate/JISDOR, kebijakan, dan cuaca BMKG", formula: "Sumber ∩ eksposur ∩ timing ∩ jalur sebab-akibat yang dapat diuji", output: "Supported, Adverse, Mixed, Unrelated, Unverified" },
];

const stages = [
  "Resolver membatasi ticker, watchlist, atau pasar.",
  "Planner membentuk tiga sampai enam hipotesis.",
  "Tool simulator memilih fixture yang diperlukan.",
  "Kalkulator menghasilkan metrik dari data.",
  "Contradiction gate membandingkan origin dan foreign flow.",
  "Citation gate memeriksa provider, endpoint, field, asOf, dan tujuan tautan.",
  "Language gate menahan advisory dan atribusi motif.",
  "Human-review gate menambahkan koreksi user sebagai hipotesis terbuka.",
  "Personalizer mengatur ranking serta kedalaman.",
  "Renderer membentuk kartu, causal chain, atau jawaban chat.",
];

const limits = [
  { icon: IconCode, title: "Fixture statis", text: "Tidak ada panggilan Sectors API, LLM, scraping, atau cron pada versi ini." },
  { icon: IconDraftData, title: "Tanpa intraday", text: "Chart memakai daily close dan volume. Order book tidak tersedia." },
  { icon: IconScales, title: "Tanpa motif", text: "Kode broker ditampilkan sebagai fakta transaksi, bukan atribusi niat." },
  { icon: IconGate, title: "Tanpa aksi", text: "Output berhenti pada bukti, konflik, dan informasi yang belum ada." },
];

export default function MethodPage() {
  return (
    <div className="mx-auto max-w-[1180px]">
      <PageHeader eyebrow="Method and limits" title="Cara Catalyst menyusun bukti" description="Prototype memakai fixture statis dan kalkulator deterministik. Halaman ini menjelaskan rumus, sumber, batas personalisasi, dan kondisi saat agent harus berhenti." />

      <Reveal>
        <Panel>
          <PanelHeader eyebrow="Four-pillar model" title="Tidak ada skor daya tarik gabungan" />
          <div className="grid gap-px bg-border md:grid-cols-2">
            {pillars.map((pillar, index) => (
              <article key={pillar.name} className="bg-surface px-6 py-6">
                <div className="flex items-baseline gap-3.5">
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                  <h2 className="editorial text-[21px]">{pillar.name}</h2>
                </div>
                <dl className="mt-5 space-y-4 text-[13px]">
                  <div>
                    <dt className="meta text-muted-foreground">Input produksi yang direpresentasikan</dt>
                    <dd className="mt-1.5 leading-[1.65]">{pillar.input}</dd>
                  </div>
                  <div>
                    <dt className="meta text-muted-foreground">Proses</dt>
                    <dd className="mt-1.5 leading-[1.65]">{pillar.formula}</dd>
                  </div>
                  <div>
                    <dt className="meta text-muted-foreground">Output</dt>
                    <dd className="mt-1.5 leading-[1.65] text-muted-foreground">{pillar.output}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </Panel>
      </Reveal>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Reveal>
          <Panel className="h-full">
            <PanelHeader eyebrow="Orchestration" title="Sepuluh tahap agent" />
            <ol className="divide-y divide-border">
              {stages.map((item, index) => (
                <li key={item} className="flex gap-4 px-5 py-3.5 text-[13px] leading-[1.65]">
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </Reveal>

        <div className="space-y-6">
          <Reveal index={1}>
            <Panel>
              <PanelHeader eyebrow="Data contract" title="Citation gate" />
              <div className="px-5 py-5">
                <p className="flex gap-3 text-[13px] leading-[1.7]">
                  <IconSource className="mt-1 size-4 shrink-0 text-muted-foreground" />
                  Setiap angka output harus membawa provider, endpoint, field, dan asOf. Tautan fixture diberi label provider/dokumentasi agar tidak disalahartikan sebagai bukti event aktual.
                </p>
                <pre tabIndex={0} className="mt-4 overflow-x-auto rounded-[6px] bg-muted px-3.5 py-3 font-mono text-[11.5px] leading-[1.7] text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><code>{`{ provider, endpoint, field, asOf, url, access }`}</code></pre>
              </div>
            </Panel>
          </Reveal>

          <Reveal index={2}>
            <Panel>
              <PanelHeader eyebrow="Human collaboration" title="Terlihat, dapat dibalik, dapat dihapus" />
              <ul className="divide-y divide-border">
                {["Koreksi user disimpan sebagai hipotesis terbuka", "Status review dapat dikembalikan ke antrean", "Catatan tidak mengubah fakta atau formula", "Seluruh memori dapat dihapus dari Agent Studio"].map((item) => (
                  <li key={item} className="flex items-center gap-3 px-5 py-3 text-[13px]">
                    <IconVerified className="size-3.5 shrink-0 text-positive" />{item}
                  </li>
                ))}
              </ul>
            </Panel>
          </Reveal>
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
            <strong className="font-medium">Disclaimer.</strong> Catalyst adalah alat riset prototype. Data bersifat simulasi dan bukan kondisi pasar terkini. Output tidak menilai tindakan transaksi, target harga, atau hasil investasi.
          </p>
        </Panel>
      </Reveal>
    </div>
  );
}
