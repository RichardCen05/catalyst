import { ChevronDown } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/utils";

/**
 * Beginner-facing explainer for the three learning layers.
 *
 * The page below it shows *what* Catalyst remembered; this says *why* there
 * are different kinds of memory at all, and — the part readers get wrong —
 * which of them can move without the user.
 *
 * Layer 3 carries a caveat rather than a plain "on": the measuring half runs
 * (claims are issued and scored against the recording, see the panel further
 * down the page) but nothing is corrected automatically. Calling that
 * "belajar" without qualification would overstate it by exactly the distance
 * between noticing an error and fixing it.
 *
 * Written for someone who does not follow the market. Every term that is not
 * everyday Indonesian ("sesi", "idiosinkratik") is either avoided or spelled
 * out in the sentence that uses it.
 */

type Teacher = "Anda" | "Pasar";

interface Layer {
  index: number;
  name: string;
  teacher: Teacher;
  /** Ditampilkan sebagai badge bila ada; tanpa ini lapisnya dianggap berjalan penuh. */
  caveat?: { badge: string; detail: string };
  question: string;
  analogy: string;
  example: string;
  changes: string;
  keeps: string;
}

const LAYERS: Layer[] = [
  {
    index: 1,
    name: "Preferensi",
    teacher: "Anda",
    question: "Apa yang Anda pedulikan?",
    analogy: "Seperti barista langganan yang hafal pesanan Anda. Dia tidak jadi ahli kopi — dia hafal selera. Dan selera tidak bisa salah.",
    example: "Anda menandai kartu volume perbankan “kurang relevan” beberapa kali. Kasus serupa turun dari urutan atas.",
    changes: "Urutan kasus dan panjang penjelasan.",
    keeps: "Angka, sumber, dan kesimpulan analisis.",
  },
  {
    index: 2,
    name: "Aturan",
    teacher: "Anda",
    question: "Apa yang Anda anggap penting?",
    analogy: "Seperti memberi tahu asisten baru: “kalau nilainya di bawah sekian, tidak usah naik ke meja saya.” Itu cara kerja yang Anda tetapkan, bukan fakta tentang dunia.",
    example: "Anda menutup kasus dengan catatan “kenaikan harga nikel di bawah dua minggu belum berarti apa-apa”. Catalyst mengusulkan aturannya; Anda yang menerima.",
    changes: "Aturan yang dipakai analisis berikutnya.",
    keeps: "Fakta pasar. Koreksi Anda tetap hipotesis sampai sumber memverifikasinya.",
  },
  {
    index: 3,
    name: "Kalibrasi",
    teacher: "Pasar",
    caveat: {
      badge: "mengukur, belum mengoreksi",
      detail: "Catalyst sudah mencatat klaimnya dan menagihnya ke rekaman harga — hasilnya ada di bagian “Prediksi yang ditagih ke pasar” di bawah. Yang belum: mengubah ambang atau jendelanya sendiri. Koreksi muncul sebagai usulan, dan Anda yang memutuskan.",
    },
    question: "Seberapa sering tebakan Catalyst tepat?",
    analogy: "Seperti ramalan cuaca. BMKG bilang besok 70% hujan; besok langit yang menjawab. Tidak perlu ada yang komplain supaya ketahuan ramalannya terlalu percaya diri.",
    example: "Catalyst mencatat “volume ANTM akan melampaui ambang dalam 1–10 hari bursa”, lalu memeriksanya sendiri setelah jendela itu lewat. Data volume yang memutuskan, bukan pengguna.",
    changes: "Ambang dan perkiraan jeda waktu yang dipakai Catalyst — setelah Anda menyetujui usulannya.",
    keeps: "Apa yang penting bagi Anda — itu tetap datang dari Anda.",
  },
];

function TeacherBadge({ teacher }: { teacher: Teacher }) {
  return (
    <span
      className={cn(
        "rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
        teacher === "Pasar" ? "border-positive/35 bg-positive/10 text-positive" : "border-primary/35 bg-primary/10 text-primary",
      )}
    >
      guru: {teacher}
    </span>
  );
}

export function LearningLayers() {
  return (
    <Panel className="mb-4 overflow-hidden">
      <details open className="group">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
          <span className="min-w-0">
            <span className="meta mb-1.5 block text-muted-foreground">Sebelum membaca daftar di bawah</span>
            <span className="editorial block text-[17px] text-foreground">Tiga cara Catalyst belajar</span>
          </span>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-primary transition-transform group-open:rotate-180" />
        </summary>

        <p className="border-t border-border px-5 py-4 text-sm leading-6 text-muted-foreground">
          Belajar berarti perilakunya berubah karena ada informasi baru. Informasi itu datang dari tiga arah yang berbeda,
          dan masing-masing mengajarkan hal yang berbeda pula. Dua yang pertama mustahil tanpa Anda. Yang ketiga berjalan
          sendiri.
        </p>

        <div className="grid gap-px border-t border-border bg-border lg:grid-cols-3">
          {LAYERS.map((layer) => (
            <article key={layer.index} className="bg-surface p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="grid size-8 place-items-center rounded-md bg-primary/10 font-mono text-xs font-semibold text-primary">
                  {layer.index}
                </span>
                <h3 className="font-semibold">{layer.name}</h3>
                <TeacherBadge teacher={layer.teacher} />
                {layer.caveat ? (
                  <span className="rounded border border-attention/35 bg-attention/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-attention-foreground">
                    {layer.caveat.badge}
                  </span>
                ) : null}
              </div>

              <p className="mt-3 text-sm font-medium">{layer.question}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{layer.analogy}</p>

              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Contoh</dt>
                  <dd className="mt-1 leading-6 text-muted-foreground">{layer.example}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-positive">Yang berubah</dt>
                  <dd className="mt-1 leading-6">{layer.changes}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Yang tidak berubah</dt>
                  <dd className="mt-1 leading-6 text-muted-foreground">{layer.keeps}</dd>
                </div>
              </dl>

              {layer.caveat ? (
                <p className="mt-4 rounded-lg border border-attention/25 bg-attention/8 p-3 text-xs leading-5">
                  {layer.caveat.detail}
                </p>
              ) : null}
            </article>
          ))}
        </div>

        <div className="border-t border-border bg-background px-5 py-4">
          <p className="text-sm leading-6">
            <strong>Ringkasnya:</strong> Lapis 1 dan 2 mengajari Catalyst apa yang penting bagi Anda — itu selamanya
            butuh Anda. Lapis 3 mengajari Catalyst seberapa sering tebakannya sendiri tepat, dan itu tidak butuh siapa-siapa.
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Catalyst tidak pernah menyimpulkan bahwa sebuah berita <em>menyebabkan</em> pergerakan harga. Yang bisa
            diperiksa hanya seberapa sering keduanya berbarengan.
          </p>
        </div>
      </details>
    </Panel>
  );
}
