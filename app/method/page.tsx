import { DATA_AS_OF, DATA_AS_OF_LABEL, events, WINDOW_SESSIONS } from "@/lib/data/fixtures";
import { RESEARCH_LIFECYCLE } from "@/lib/agent/lifecycle";
import { PageHeader } from "@/components/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Reveal } from "@/components/ui/reveal";
import { IconAttention, IconCheck, IconCode, IconDraftData, IconGate, IconScales, IconSource, IconVerified } from "@/components/ui/icons";

const CATALYST_SOURCE_LABELS: Record<string, string> = {
  sectors: "Sectors news",
  filing: "filing",
  macro: "makro",
  commodity: "komoditas",
  weather: "cuaca BMKG",
  policy: "kebijakan",
};

/** Counts written out, so a heading can name a number the data decides. */
const COUNT_WORDS: Record<number, string> = { 1: "Satu", 2: "Dua", 3: "Tiga", 4: "Empat", 5: "Lima", 6: "Enam", 7: "Tujuh", 8: "Delapan" };
const STAGE_COUNT_WORD = COUNT_WORDS[RESEARCH_LIFECYCLE.length] ?? String(RESEARCH_LIFECYCLE.length);

const catalystInputs = Array.from(new Set(events.map((event) => event.sourceType))).map((sourceType) => CATALYST_SOURCE_LABELS[sourceType] ?? sourceType);

const pillars = [
  { name: "Konsentrasi", input: "Ringkasan broker, asal broker, arus asing, saham publik", formula: "Porsi terbesar, HHI, peserta efektif, saham publik terserap", output: "Arus terkonsentrasi, partisipasi luas, arus asing selaras, konflik sumber" },
  { name: "Volume", input: `Volume harian dan pembanding ${WINDOW_SESSIONS} hari bursa`, formula: "Median dan skor z berbasis MAD, lalu batas likuiditas", output: "Normal, meningkat, ekstrem, data belum cukup" },
  { name: "Momentum", input: "Harga penutupan, IHSG, beta, pembanding sektor", formula: "Imbal hasil 3 hari dikurangi beta × imbal hasil IHSG", output: "Mengikuti pasar, dipengaruhi sektor, khusus emiten, bercampur" },
  { name: "Katalis", input: catalystInputs.length ? catalystInputs.join(", ") : "Belum ada masukan terekam", formula: "Sumber ∩ eksposur ∩ waktu ∩ jalur sebab akibat yang dapat diuji", output: "Mendukung, berlawanan, bercampur, tidak terkait, belum terverifikasi" },
];

export default function MethodPage() {
  const recordDate = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(DATA_AS_OF));
  return (
    <div>
      <PageHeader eyebrow="Metode dan batas" title="Cara Catalyst menyusun bukti" description={`Prototipe memakai rekaman ${recordDate} dan perhitungan tetap. Halaman ini menjelaskan rumus, sumber, dan kondisi saat Catalyst harus berhenti.`} />
      <Panel>
        <PanelHeader eyebrow="Dua lapisan bukti" title={`${COUNT_WORDS[pillars.length] ?? pillars.length} pemeriksaan, dua pertanyaan`} />
        <div className="grid gap-px border-b border-border bg-border md:grid-cols-2"><section className="bg-surface p-4 sm:p-5"><p className="font-mono text-[10px] uppercase tracking-wider text-primary">Lapisan 1</p><h2 className="editorial mt-1 text-2xl">Konfirmasi pasar</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Konsentrasi, volume, dan momentum menunjukkan apakah perubahan terlihat di pasar.</p></section><section className="bg-surface p-4 sm:p-5"><p className="font-mono text-[10px] uppercase tracking-wider text-primary">Lapisan 2</p><h2 className="editorial mt-1 text-2xl">Dampak ke bisnis</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Katalis, eksposur, dan indikator keuangan menunjukkan apakah perubahan dapat mencapai bisnis.</p></section></div>
        <div className="grid gap-px bg-border md:grid-cols-2">{pillars.map((pillar, index) => <article key={pillar.name} className="bg-surface p-4 sm:p-5"><div className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-md bg-primary/10 font-mono text-xs font-semibold text-primary">{index + 1}</span><h2 className="font-semibold">{pillar.name}</h2></div><dl className="mt-4 space-y-3 text-sm"><div><dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Masukan yang diwakili</dt><dd className="mt-1 leading-6">{pillar.input}</dd></div><div><dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Proses</dt><dd className="mt-1 leading-6">{pillar.formula}</dd></div><div><dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Hasil</dt><dd className="mt-1 leading-6 text-muted-foreground">{pillar.output}</dd></div></dl></article>)}</div>
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* The stages and their count come from RESEARCH_LIFECYCLE, the same
            list the engine emits and the case page draws. This panel used to
            claim six hand-written stages that matched none of the five the app
            actually runs. */}
        <Panel><PanelHeader eyebrow="Alur analisis" title={`${STAGE_COUNT_WORD} tahap pemeriksaan`} /><ol className="divide-y divide-border px-4">{RESEARCH_LIFECYCLE.map((stage, index) => <li key={stage.key} className="flex gap-3 py-3 text-sm leading-6"><span className="font-mono text-xs text-primary">{String(index + 1).padStart(2, "0")}</span><span><strong className="font-medium">{stage.label}.</strong> {stage.detail}</span></li>)}</ol></Panel>
        <div className="space-y-4">
          <Panel><PanelHeader eyebrow="Kontrak data" title="Pemeriksaan sumber" /><div className="p-4"><div className="flex gap-3 rounded-lg border border-primary/20 bg-primary/8 p-3"><IconSource aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" /><p className="text-sm leading-6">Setiap angka membawa penyedia, lokasi data, nama data, dan waktu sumber. Tautan bukan bukti bahwa peristiwa benar-benar terjadi.</p></div><pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-background p-3 font-mono text-[11px] leading-5 text-muted-foreground"><code>{`{ penyedia, lokasi, data, waktu, tautan }`}</code></pre></div></Panel>
          <Panel><PanelHeader eyebrow="Kolaborasi manusia" title="Belajar hanya setelah disetujui" /><div className="space-y-3 p-4">{["Koreksi Anda disimpan sebagai hipotesis terbuka", "Catatan dapat dikembalikan ke antrean", "Catatan tidak mengubah fakta atau rumus", "Hasil kasus membuat usulan aturan", "Anda menerima atau menolak usulan", "AI Learning menyimpan memori personal; tidak melatih ulang model"].map((item) => <div key={item} className="flex items-center gap-2 text-sm"><IconVerified aria-hidden="true" className="size-4 text-positive" />{item}</div>)}</div></Panel>
        </div>
      </div>

      <Panel className="mt-4">
        <PanelHeader eyebrow="Batas yang diketahui" title="Faktor yang belum diperiksa" />
        <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">{[
          { icon: IconCode, title: "Data statis", text: `Angka dihitung dari rekaman ${DATA_AS_OF_LABEL}. Lapisan opsional (model bahasa, pengambilan web, memori GCS) aktif bila dikonfigurasi, dan selalu jatuh ke hasil deterministik bila gagal.` },
          { icon: IconAttention, title: "Tanpa data intrahari", text: "Grafik memakai harga penutupan dan volume harian. Antrean transaksi tidak tersedia." },
          { icon: IconScales, title: "Tanpa motif", text: "Kode broker ditampilkan sebagai fakta transaksi, bukan atribusi niat." },
          { icon: IconDraftData, title: "Relevansi adalah peringkat Catalyst", text: "Angka \u201cRelevansi n/100\u201d pada rantai sebab akibat dihitung oleh Catalyst dari tag dan sebaran simbol pada rekaman — bukan skor yang diberikan penyedia data. Pakai sebagai urutan pemeriksaan, bukan sebagai bukti." },
          { icon: IconSource, title: "Sumber dihitung per angka", text: "Jumlah sumber pada tiap metrik hanya menghitung rekaman yang menghasilkan angka itu. Dua metrik pada satu kartu dapat berbeda jumlah sumbernya." },
          { icon: IconAttention, title: "Tanpa aksi", text: "Hasil berhenti pada bukti, konflik, dan informasi yang belum ada." },
        ].map((item) => <article key={item.title} className="bg-surface p-4"><item.icon aria-hidden="true" className="size-5 text-attention" /><h3 className="mt-3 font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p></article>)}</div>
        <div className="flex gap-3 border-t border-border bg-background p-4"><IconGate aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" /><p className="text-sm leading-6"><strong>Penafian:</strong> Catalyst adalah prototipe alat riset. Data adalah rekaman {DATA_AS_OF_LABEL} dan bukan kondisi pasar live. Hasil tidak menilai tindakan transaksi, target harga, atau hasil investasi.</p></div>
      </Panel>
    </div>
  );
}
