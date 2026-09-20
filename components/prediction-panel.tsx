import { Panel, PanelHeader } from "@/components/ui/panel";
import { CALIBRATION_DIMENSION_LABELS, MIN_SAMPLE, type CalibrationBucket, type CalibrationDimension, type CalibrationReport } from "@/lib/agent/calibration";
import {
  PREDICTION_METRIC_LABELS,
  PREDICTION_VERDICT_LABELS,
  type PredictionClaim,
  type PredictionOutcome,
  type PredictionVerdict,
} from "@/lib/agent/prediction";
import { cn } from "@/lib/utils";

/**
 * Lapis 3 di layar: klaim yang Catalyst buat, vonis yang pasar berikan.
 *
 * Panel ini sengaja menonjolkan berapa banyak yang BELUM bisa dinilai. Sebuah
 * papan skor yang hanya menampilkan angka bagus adalah iklan; yang berguna
 * justru "23 tervonis, 37 masih menunggu, 3 kelompok cukup bukti". Bucket di
 * bawah MIN_SAMPLE tidak pernah menampilkan persentase — angka dari tiga
 * kejadian adalah derau yang menyamar jadi pengetahuan.
 */

const VERDICT_TONE: Record<PredictionVerdict, string> = {
  hit: "border-positive/35 bg-positive/10 text-positive",
  early: "border-attention/35 bg-attention/10 text-attention-foreground",
  late: "border-attention/35 bg-attention/10 text-attention-foreground",
  miss: "border-danger/30 bg-danger/8 text-danger",
  pending: "border-border bg-muted/50 text-muted-foreground",
  void: "border-border bg-muted/50 text-muted-foreground",
};

const DIMENSION_ORDER: CalibrationDimension[] = ["eventCategory", "relevanceBand", "sourceType", "selection", "metric"];

const DIMENSION_NOTES: Record<CalibrationDimension, string> = {
  eventCategory: "Jenis peristiwa yang memicu klaim.",
  relevanceBand: "Skor pengaruh yang Catalyst berikan sebelum tahu hasilnya. Kalau band tinggi dan rendah berperilaku sama, pembedanya tidak bekerja.",
  sourceType: "Asal beritanya. Keterbukaan emiten otomatis diberi skor tinggi — di sini ketahuan apakah itu pantas.",
  selection: "Termasuk berita yang kalah seleksi dan tidak pernah ditampilkan. Tanpa itu, angkanya hanya menilai berita yang sudah terlanjur dianggap penting.",
  metric: "Yang diperiksa: volume tidak wajar, atau gerak harga di luar yang dijelaskan IHSG.",
};

function percent(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

function VerdictChip({ verdict }: { verdict: PredictionVerdict }) {
  return (
    <span className={cn("rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider", VERDICT_TONE[verdict])}>
      {PREDICTION_VERDICT_LABELS[verdict]}
    </span>
  );
}

function BucketRow({ bucket }: { bucket: CalibrationBucket }) {
  return (
    <div className="px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{bucket.label}</span>
        {bucket.sufficient ? (
          <span className="font-mono text-sm tabular-nums text-positive">{percent(bucket.hitRate)} tepat</span>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">belum cukup bukti</span>
        )}
      </div>
      <p className="mt-1 font-mono text-[10px] text-muted-foreground">
        {bucket.n} tervonis{bucket.n < MIN_SAMPLE ? ` dari ${MIN_SAMPLE} yang dibutuhkan` : ""}
        {bucket.verdicts.pending ? ` · ${bucket.verdicts.pending} menunggu` : ""}
        {bucket.lag ? ` · biasanya terjadi di sesi ke-${bucket.lag.median.toFixed(0)}` : ""}
      </p>
      {bucket.sufficient ? (
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Kondisinya benar-benar terjadi pada {percent(bucket.occurrenceRate)} kasus; sisanya tidak pernah terjadi.
          Selisih antara dua angka itu adalah klaim yang benar arah tetapi salah waktu.
        </p>
      ) : null}
    </div>
  );
}

export function PredictionPanel({
  claims,
  outcomes,
  report,
}: {
  claims: PredictionClaim[];
  outcomes: PredictionOutcome[];
  report: CalibrationReport;
}) {
  const outcomeById = new Map(outcomes.map((outcome) => [outcome.claimId, outcome]));
  const graded = claims
    .map((claim) => ({ claim, outcome: outcomeById.get(claim.id) }))
    .filter((row): row is { claim: PredictionClaim; outcome: PredictionOutcome } =>
      Boolean(row.outcome) && row.outcome!.verdict !== "pending" && row.outcome!.verdict !== "void")
    .sort((a, b) => b.claim.issuedAt.localeCompare(a.claim.issuedAt))
    .slice(0, 10);

  const tiles = [
    { label: "Klaim dibuat", value: report.summary.claims, detail: "pernyataan yang bisa meleset" },
    { label: "Sudah dinilai", value: report.summary.graded, detail: "jendelanya sudah penuh" },
    { label: "Masih menunggu", value: report.summary.pending, detail: "rekaman belum cukup panjang" },
    { label: "Kelompok cukup bukti", value: report.summary.sufficientBuckets, detail: `minimal ${MIN_SAMPLE} klaim tervonis` },
  ];

  return (
    <section className="mt-4" aria-labelledby="prediction-title">
      <div className="mb-4">
        <p className="meta text-primary">Lapis 3 · belajar tanpa pengguna</p>
        <h2 id="prediction-title" className="editorial mt-1 text-2xl">Prediksi yang ditagih ke pasar</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Setiap berita membuat Catalyst mencatat satu pernyataan yang bisa salah: volume akan melampaui ambang, atau
          harga akan bergerak melebihi yang dijelaskan IHSG, dalam sekian hari bursa. Setelah jendela itu lewat, deret
          harga yang memutuskan — bukan Anda. Tidak ada masukan pengguna di bagian halaman ini.
        </p>
      </div>

      <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan prediksi">
        {tiles.map((tile) => (
          <Panel key={tile.label} className="p-4">
            <p className="font-mono text-2xl font-semibold tabular-nums">{tile.value}</p>
            <p className="mt-1 text-sm font-medium">{tile.label}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{tile.detail}</p>
          </Panel>
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <Panel className="overflow-hidden">
          <PanelHeader eyebrow="Vonis terbaru" title="Apa yang sudah ditagih" />
          {graded.length ? (
            <ul className="divide-y divide-border">
              {graded.map(({ claim, outcome }) => (
                <li key={claim.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] text-primary">{claim.symbol}</span>
                    <VerdictChip verdict={outcome.verdict} />
                    {claim.shadow ? (
                      <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                        kalah seleksi
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-sm leading-6">{PREDICTION_METRIC_LABELS[claim.metric]}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{outcome.note}</p>
                  <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                    dicatat {claim.issuedAt} · jendela {claim.windowSessions[0]}–{claim.windowSessions[1]} sesi · ambang {claim.threshold}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-sm leading-6 text-muted-foreground">
              Belum ada klaim yang jendelanya penuh. Rekaman perlu lebih banyak sesi setelah tanggal beritanya.
            </p>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel className="overflow-hidden">
            <PanelHeader eyebrow="Usulan koreksi" title="Yang ingin Catalyst ubah" />
            {report.lagSuggestions.length ? (
              <ul className="divide-y divide-border">
                {report.lagSuggestions.map((suggestion) => (
                  <li key={suggestion.category} className="p-4">
                    <p className="text-sm font-medium">
                      Jendela {suggestion.category}: {suggestion.current[0]}–{suggestion.current[1]} → {suggestion.suggested[0]}–{suggestion.suggested[1]} sesi
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{suggestion.reason}</p>
                    <p className="mt-2 font-mono text-[10px] text-muted-foreground">dari {suggestion.n} kejadian</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-4 text-sm leading-6 text-muted-foreground">
                Belum ada. Usulan baru muncul setelah satu kategori berita punya {MIN_SAMPLE} kejadian yang benar-benar
                terpenuhi — dan usulan pun tidak pernah diterapkan sendiri.
              </p>
            )}
          </Panel>

          <Panel className="p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Yang tidak dibuktikan</p>
            <p className="mt-2 text-sm leading-6">
              Vonis <strong>Tepat</strong> berarti kondisinya terjadi di jendela itu. Bukan berarti beritanya yang
              menyebabkan. Untuk membuktikan sebab dibutuhkan dunia pembanding tanpa berita itu, dan dunia itu tidak ada.
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Angka di sini dihitung mundur atas rekaman yang sudah ada: klaim dibuat dengan data sampai tanggal berita,
              lalu dinilai dengan sesi sesudahnya. Baseline tidak pernah menyentuh sesi masa depan.
            </p>
          </Panel>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {DIMENSION_ORDER.map((dimension) => {
          const buckets = report.buckets.filter((bucket) => bucket.dimension === dimension && (bucket.n > 0 || bucket.verdicts.pending > 0));
          if (!buckets.length) return null;
          return (
            <Panel key={dimension} className="overflow-hidden">
              <PanelHeader eyebrow="Kalibrasi" title={CALIBRATION_DIMENSION_LABELS[dimension]} />
              <p className="border-b border-border px-4 py-3 text-xs leading-5 text-muted-foreground">{DIMENSION_NOTES[dimension]}</p>
              <div className="divide-y divide-border">
                {buckets.map((bucket) => <BucketRow key={`${bucket.dimension}-${bucket.key}`} bucket={bucket} />)}
              </div>
            </Panel>
          );
        })}
      </div>
    </section>
  );
}
