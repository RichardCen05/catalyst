import { Panel, PanelHeader } from "@/components/ui/panel";
import { CalibrationChart, VerdictChart, type CalibrationDatum, type VerdictDatum } from "@/components/prediction-charts";
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
 *
 * Tata letaknya satu kolom penuh, bertingkat dari yang paling ringkas ke yang
 * paling rinci. Versi sebelumnya menaruh daftar vonis di kolom kiri dan dua
 * panel pendek di kanan: kirinya berjalan tiga layar sementara kanannya habis
 * di layar pertama, dan pembaca membaca satu kolom sambil melewati ruang
 * kosong selebar sepertiga halaman.
 *
 * Kalimat yang menerangkan arti dua persentase itu ditulis SEKALI sebagai
 * keterangan di atas tabel kalibrasi. Sebelumnya kalimat yang sama diulang di
 * bawah setiap bucket yang cukup bukti — sepuluh salinan paragraf identik,
 * yang membuat halaman ini terlihat seperti derau.
 */

const VERDICT_TONE: Record<PredictionVerdict, string> = {
  hit: "border-positive/35 bg-positive/10 text-positive",
  early: "border-attention/35 bg-attention/10 text-attention-foreground",
  late: "border-attention/35 bg-attention/10 text-attention-foreground",
  miss: "border-danger/30 bg-danger/8 text-danger",
  pending: "border-border bg-muted/50 text-muted-foreground",
  void: "border-border bg-muted/50 text-muted-foreground",
};

const VERDICT_CHART_TONE: Record<PredictionVerdict, VerdictDatum["tone"]> = {
  hit: "positive",
  early: "attention",
  late: "attention",
  miss: "danger",
  pending: "muted",
  void: "muted",
};

/** Vonis yang layak masuk grafik sebaran: yang sudah punya jawaban. */
const GRADED_VERDICTS: PredictionVerdict[] = ["hit", "early", "late", "miss"];

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
    <span className={cn("shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider", VERDICT_TONE[verdict])}>
      {PREDICTION_VERDICT_LABELS[verdict]}
    </span>
  );
}

/**
 * Satu baris kalibrasi: label, dua persentase, dan seberapa banyak bukti di
 * belakangnya. Batangnya digambar dari `hitRate` — bukan lebar tetap yang
 * kebetulan terlihat mirip angkanya — dan bucket tanpa cukup bukti tidak
 * menggambar batang sama sekali.
 */
function BucketRow({ bucket }: { bucket: CalibrationBucket }) {
  return (
    <div className="grid items-center gap-x-4 gap-y-1.5 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_128px_minmax(0,1.1fr)]">
      <p className="min-w-0 text-sm">{bucket.label}</p>

      {bucket.sufficient ? (
        <span className="font-mono text-xs tabular-nums text-positive">{percent(bucket.hitRate)} tepat waktu</span>
      ) : (
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">belum cukup bukti</span>
      )}

      <p className="min-w-0 font-mono text-[10px] text-muted-foreground">
        {bucket.sufficient ? `terjadi ${percent(bucket.occurrenceRate)} · ` : ""}
        {bucket.n} tervonis{bucket.n < MIN_SAMPLE ? `/${MIN_SAMPLE}` : ""}
        {bucket.verdicts.pending ? ` · ${bucket.verdicts.pending} menunggu` : ""}
        {bucket.lag ? ` · median sesi ke-${bucket.lag.median.toFixed(0)}` : ""}
      </p>
    </div>
  );
}

/** Satu klaim, satu baris — dipakai baik di daftar ringkas maupun di lipatannya. */
function ClaimRow({ row }: { row: { claim: PredictionClaim; outcome: PredictionOutcome } }) {
  const { claim, outcome } = row;
  return (
    <li className="grid gap-x-4 gap-y-1.5 px-4 py-3 md:grid-cols-[92px_minmax(0,1.1fr)_minmax(0,1fr)_200px] md:items-baseline">
      <span className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] font-semibold text-primary">{claim.symbol}</span>
        <VerdictChip verdict={outcome.verdict} />
      </span>
      <span className="min-w-0 text-sm leading-6">
        {PREDICTION_METRIC_LABELS[claim.metric]}
        {claim.shadow ? <span className="ml-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">kalah seleksi</span> : null}
      </span>
      <span className="min-w-0 text-xs leading-5 text-muted-foreground">{outcome.note}</span>
      <span className="min-w-0 font-mono text-[10px] text-muted-foreground">
        {claim.issuedAt} · {claim.windowSessions[0]}–{claim.windowSessions[1]} sesi · {claim.threshold}
      </span>
    </li>
  );
}

/** Berapa vonis yang terbuka sebelum pembaca meminta sisanya. */
const VISIBLE_CLAIMS = 4;

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

  const visibleGraded = graded.slice(0, VISIBLE_CLAIMS);
  const restGraded = graded.slice(VISIBLE_CLAIMS);

  const tiles = [
    { label: "Klaim dibuat", value: report.summary.claims, detail: "pernyataan yang bisa meleset" },
    { label: "Sudah dinilai", value: report.summary.graded, detail: "jendelanya sudah penuh" },
    { label: "Masih menunggu", value: report.summary.pending, detail: "rekaman belum cukup panjang" },
    { label: "Kelompok cukup bukti", value: report.summary.sufficientBuckets, detail: `minimal ${MIN_SAMPLE} klaim tervonis` },
  ];

  // Semua seri grafik diturunkan di sini, dari laporan yang sama yang mengisi
  // tabel di bawahnya — bukan dihitung ulang di dalam komponen grafik.
  const verdictCounts = outcomes.reduce((total, outcome) => {
    total.set(outcome.verdict, (total.get(outcome.verdict) ?? 0) + 1);
    return total;
  }, new Map<PredictionVerdict, number>());
  const verdictData: VerdictDatum[] = GRADED_VERDICTS
    .filter((verdict) => (verdictCounts.get(verdict) ?? 0) > 0)
    .map((verdict) => ({
      label: PREDICTION_VERDICT_LABELS[verdict],
      value: verdictCounts.get(verdict) ?? 0,
      tone: VERDICT_CHART_TONE[verdict],
    }));

  const dimensions = DIMENSION_ORDER
    .map((dimension) => ({
      dimension,
      buckets: report.buckets.filter((bucket) => bucket.dimension === dimension && (bucket.n > 0 || bucket.verdicts.pending > 0)),
    }))
    .filter((entry) => entry.buckets.length);

  const calibrationData: CalibrationDatum[] = dimensions
    .flatMap(({ dimension, buckets }) => buckets
      .filter((bucket) => bucket.sufficient)
      .map((bucket) => ({
        label: bucket.label,
        dimension: CALIBRATION_DIMENSION_LABELS[dimension],
        hitRate: Math.round((bucket.hitRate ?? 0) * 100),
        occurrenceRate: Math.round((bucket.occurrenceRate ?? 0) * 100),
        n: bucket.n,
      })))
    .sort((first, second) => second.hitRate - first.hitRate);

  const bucketCount = dimensions.reduce((total, entry) => total + entry.buckets.length, 0);
  const insufficientCount = bucketCount - calibrationData.length;

  const gradedShare = report.summary.claims ? report.summary.graded / report.summary.claims : 0;

  return (
    <section aria-label="Belajar dari pasar">
      {/* Angka ringkasan dan batangnya satu panel: keduanya menjawab
          pertanyaan yang sama, dan dipisah membuat panel kiri berakhir
          setengah tinggi grafik di sebelahnya. */}
      <div className="mb-4 grid items-stretch gap-4 lg:grid-cols-2">
        <Panel className="overflow-hidden" aria-label="Ringkasan prediksi">
          <PanelHeader eyebrow="Jendela penilaian" title="Berapa yang sudah bisa dinilai" />
          <div className="p-4">
            {/* Lebar batangnya adalah pangsa klaim yang jendelanya sudah
                penuh, bukan lebar tetap yang kebetulan mirip. */}
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={`${report.summary.graded} dari ${report.summary.claims} klaim sudah dinilai`}>
              <span className="block h-full bg-positive" style={{ width: `${Math.round(gradedShare * 100)}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs">
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="size-2 rounded-full bg-positive" />
                <span className="font-mono tabular-nums">{report.summary.graded}</span> sudah dinilai
              </span>
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <span aria-hidden="true" className="size-2 rounded-full bg-muted-foreground/60" />
                <span className="font-mono tabular-nums">{report.summary.pending}</span> menunggu rekaman lebih panjang
              </span>
            </div>

            <dl className="mt-4 grid gap-x-4 gap-y-3 border-t border-border pt-4 sm:grid-cols-2">
              {tiles.map((tile) => (
                <div key={tile.label}>
                  <dt className="text-xs font-medium">
                    <span className="mr-2 font-mono text-lg font-semibold tabular-nums">{tile.value}</span>
                    {tile.label}
                  </dt>
                  <dd className="mt-0.5 text-xs leading-5 text-muted-foreground">{tile.detail}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Panel>

        <Panel className="overflow-hidden">
          <PanelHeader eyebrow="Sebaran vonis" title="Hasil klaim yang sudah ditagih" />
          {verdictData.length ? (
            <VerdictChart data={verdictData} />
          ) : (
            <p className="p-4 text-sm leading-6 text-muted-foreground">Belum ada klaim yang jendelanya penuh.</p>
          )}
        </Panel>
      </div>

      {/* Dua panel pendek disandingkan — keduanya habis dalam satu layar, jadi
          tidak ada kolom yang berjalan sendirian. */}
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
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

        <Panel className="overflow-hidden">
          <PanelHeader eyebrow="Batas klaim" title="Yang tidak dibuktikan" />
          <div className="p-4">
            <p className="text-sm leading-6">
              Vonis <strong>Tepat</strong> berarti kondisinya terjadi di jendela itu. Bukan berarti beritanya yang
              menyebabkan. Untuk membuktikan sebab dibutuhkan dunia pembanding tanpa berita itu, dan dunia itu tidak ada.
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Angka di sini dihitung mundur atas rekaman yang sudah ada: klaim dibuat dengan data sampai tanggal berita,
              lalu dinilai dengan sesi sesudahnya. Baseline tidak pernah menyentuh sesi masa depan.
            </p>
          </div>
        </Panel>
      </div>

      {/* Satu baris = satu klaim. Judul metrik berulang-ulang, jadi yang
          dibedakan di kolom kiri adalah emitennya, bukan kalimatnya. */}
      <Panel className="mb-4 overflow-hidden">
        <PanelHeader eyebrow="Vonis terbaru" title="Apa yang sudah ditagih" />
        {graded.length ? (
          <>
            <div className="hidden grid-cols-[92px_minmax(0,1.1fr)_minmax(0,1fr)_200px] gap-4 border-b border-border bg-muted/40 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground md:grid">
              <span>Saham</span>
              <span>Klaim</span>
              <span>Hasilnya</span>
              <span>Dicatat · jendela · ambang</span>
            </div>
            <ul className="divide-y divide-border">
              {visibleGraded.map((row) => <ClaimRow key={row.claim.id} row={row} />)}
            </ul>
            {restGraded.length ? (
              <details className="group border-t border-border">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-xs font-medium text-primary hover:bg-muted/40">
                  <span className="group-open:hidden">Lihat {restGraded.length} vonis lainnya</span>
                  <span className="hidden group-open:inline">Sembunyikan {restGraded.length} vonis lainnya</span>
                </summary>
                <ul className="divide-y divide-border border-t border-border">
                  {restGraded.map((row) => <ClaimRow key={row.claim.id} row={row} />)}
                </ul>
              </details>
            ) : null}
          </>
        ) : (
          <p className="p-6 text-sm leading-6 text-muted-foreground">
            Belum ada klaim yang jendelanya penuh. Rekaman perlu lebih banyak sesi setelah tanggal beritanya.
          </p>
        )}
      </Panel>

      <Panel className="overflow-hidden">
        <PanelHeader eyebrow="Kalibrasi" title="Di mana tebakannya tepat, di mana tidak" />
        <p className="border-b border-border px-4 py-3 text-xs leading-5 text-muted-foreground">
          <strong className="text-foreground">Tepat waktu</strong> berarti kondisinya terjadi di dalam jendela yang
          diperkirakan. <strong className="text-foreground">Terjadi, kapan pun</strong> mengabaikan waktunya — selisih
          keduanya adalah klaim yang benar arah tetapi salah waktu. Kelompok dengan kurang dari {MIN_SAMPLE} klaim
          tervonis tidak digambar dan tidak menampilkan persentase sama sekali.
        </p>

        {calibrationData.length ? (
          <div className="border-b border-border pt-4">
            <div className="mb-1 flex flex-wrap gap-x-5 gap-y-1 px-4 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="size-2 rounded-sm bg-positive" />Tepat waktu
              </span>
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="size-2 rounded-sm bg-primary/45" />Terjadi, kapan pun
              </span>
            </div>
            <CalibrationChart data={calibrationData} />
          </div>
        ) : null}
        {/* Kelompok yang belum cukup bukti jumlahnya jauh lebih banyak daripada
            yang sudah — belasan baris "belum cukup bukti" berderet menenggelamkan
            tiga baris yang benar-benar punya angka. Mereka tetap ada, terlipat,
            karena yang belum terjawab juga sebuah jawaban. */}
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 border-b border-border px-4 text-xs font-medium text-primary hover:bg-muted/40">
            <span className="group-open:hidden">Lihat rincian {bucketCount} kelompok, termasuk {insufficientCount} yang belum cukup bukti</span>
            <span className="hidden group-open:inline">Sembunyikan rincian per kelompok</span>
          </summary>
          <div className="divide-y divide-border">
            {dimensions.map(({ dimension, buckets }) => (
              <section key={dimension} aria-label={CALIBRATION_DIMENSION_LABELS[dimension]}>
                <div className="bg-background px-4 py-2.5">
                  <h3 className="text-sm font-semibold">{CALIBRATION_DIMENSION_LABELS[dimension]}</h3>
                  <p className="mt-0.5 max-w-3xl text-xs leading-5 text-muted-foreground">{DIMENSION_NOTES[dimension]}</p>
                </div>
                <div className="divide-y divide-border border-t border-border">
                  {buckets.map((bucket) => <BucketRow key={`${bucket.dimension}-${bucket.key}`} bucket={bucket} />)}
                </div>
              </section>
            ))}
          </div>
        </details>
      </Panel>
    </section>
  );
}
