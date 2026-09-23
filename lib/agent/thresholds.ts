import type { InvestorResearchPlaybook } from "@/lib/types";

/**
 * Satu tabel default untuk semua ambang penilaian riset.
 * Satu resolver (resolveThresholds), tidak ada default tersebar di call site.
 *
 * volumeZFloor default 2.5 — bukan 3 seperti draf plan — karena nilai live
 * di lib/agent/metrics.ts:58 adalah Elevated >= 2.5 / Extreme >= 5.
 * signal-history memakai 3/2 yang tidak konsisten; keduanya kini di-thread
 * lewat resolver ini (C5).
 *
 * ASAL SETIAP ANGKA — lihat THRESHOLD_PROVENANCE di bawah. Ringkasnya: semua
 * entri di tabel ini berstatus `guess`. Tidak satu pun pernah diukur terhadap
 * pasar Indonesia; nilainya dipilih supaya konsisten dengan nilai live yang
 * sudah ada di kode. Itu bukan pembelaan, itu catatan konsistensi — dan
 * itulah sebabnya tabel ini adalah permukaan belajar Lapis 3
 * (docs/KONSEP-BELAJAR-AI.md).
 *
 * Ambang momentum (`momentum*Floor`) dan `foreignContradictionShare` dulu
 * hardcode di lib/agent/metrics.ts. Keduanya memberi label ke setiap kasus
 * tanpa pernah muncul di ruleTrace, sehingga panel audit menyebut lebih
 * sedikit penentu daripada yang sebenarnya bekerja. Diangkat ke sini supaya
 * dapat ditelusuri, digeser pengguna, dan — nanti — dinilai.
 */
export const DEFAULT_THRESHOLDS = {
  relevanceFloor: 85,
  /** Ambang relevansi awal untuk peta sebab akibat: di bawah ini sisi graf
   *  disembunyikan. Dulu literal `useState(60)` di dua halaman sekaligus. */
  chainRelevanceFloor: 60,
  concentrationFloor: 0.42,
  volumeZFloor: 2.5,
  volumeExtremeFloor: 5,
  contagionDropFloor: 0.04,
  contagionCorrelationFloor: 0.5,
  distributionValueFloor: 1e11,
  /** |residual| di bawah ini = "Mengikuti pasar". */
  momentumAlignedFloor: 0.012,
  /** |selisih sektor| di bawah ini = "Dipengaruhi sektor". */
  momentumSectorFloor: 0.015,
  /** |residual| di atas ini = "Khusus emiten" — gerak yang tidak dijelaskan pasar. */
  momentumIdiosyncraticFloor: 0.03,
  /** Porsi nilai beli broker asing sebelum arus asing negatif dianggap konflik sumber. */
  foreignContradictionShare: 0.55,
  /** Skor minimum sebelum sebuah handler boleh menjawab. Di bawah ini Copilot
   *  menampilkan menu kemampuannya, bukan jawaban. */
  handlerScoreFloor: 0.35,
  /** Skor minimum satu entri rekaman agar ikut diambil sama sekali. Lebih
   *  rendah daripada handlerScoreFloor: entri dikumpulkan dulu, gabungannya
   *  yang dinilai. */
  retrievalScoreFloor: 0.18,
  /** Tambahan skor untuk entri bermateri milik pembaca ketika pertanyaannya
   *  memang menyebut pembaca ("kasusku", "pantauan saya"). Aditif, bukan
   *  penyaring: pertanyaan cakupan registry dari halaman mana pun tetap
   *  sampai ke materi registry. Nilainya harus cukup untuk mengangkat satu
   *  entri melewati handlerScoreFloor dari kecocokan satu kata, dan tidak
   *  lebih. */
  retrievalScopeBoost: 0.3,
  /** Entri yang dimuat untuk pertanyaan non-agregat. */
  retrievalTopK: 6,
  /** Batas teks bukti yang masuk prompt, dalam karakter. Nilai inilah yang
   *  menentukan biaya token masuk per pertanyaan. */
  retrievalContextCharCap: 6000,
  /** Batas ukuran satu patch memori yang diterima `/api/memory`, dalam byte.
   *  Objek memori dibaca dan ditulis ulang utuh pada setiap sinkronisasi, dan
   *  `GCS_REQUEST_TIMEOUT_MS` 8 detik berlaku untuk keduanya — objek yang
   *  membengkak membuat memori seorang pembaca "unavailable" secara permanen,
   *  bukan lambat. Angka ini jauh di atas snapshot mana pun yang dihasilkan
   *  store hari ini dan jauh di bawah ukuran yang membuat satu round-trip
   *  melewati batas waktu. */
  memoryPatchMaxBytes: 262144,
  /** Giliran percakapan terakhir yang dikirim ke model. Dipakai dua kali:
   *  panel memotong di angka ini sebelum mengirim, dan skema permintaan
   *  menolak di angka yang sama. Dulu skema memakai literal 12, jadi panel
   *  mengirim 6 sementara server menerima 12 dan tidak ada yang gagal. */
  copilotHistoryTurns: 6,
  /** Berapa simbol yang boleh dibawa satu giliran riwayat. Satu jawaban
   *  daftar menyebut paling banyak satu watchlist; angka ini memberi ruang
   *  untuk itu tanpa menerima daftar sepanjang apa pun dari klien. */
  copilotHistorySymbols: 12,
  /** Panjang minimum sebuah kata sebelum akhiran -ku/-mu/-nya/-lah/-kah/-pun
   *  boleh dilepas. Di bawah ini pelepasan lebih sering memotong kata utuh
   *  daripada menemukan bentuk dasarnya. */
  encliticMinTokenChars: 5,
  /** Panjang minimum sisa kata setelah akhiran dilepas. Sisa yang lebih
   *  pendek bukan kata yang diindeks korpus mana pun. */
  encliticMinStemChars: 3,
  /** Panjang maksimum satu giliran riwayat, dalam karakter. Batas ini
   *  memotong, tidak menolak: jawaban agregat ("semua kasus…") lebih panjang
   *  daripada angka mana pun yang bisa dipilih di sini, jadi menolaknya
   *  berarti pertanyaan lanjutan gagal terkirim justru setelah jawaban yang
   *  paling lengkap. Yang dijaga batas ini adalah volume teks dari klien,
   *  bukan kebenaran jawaban. */
  copilotHistoryTurnChars: 4000,
  /** Berapa chip "periksa ulang catatan" yang ditawarkan sekaligus, satu per
   *  emiten yang punya catatan terbuka. Dulu literal `.slice(0, 2)` di
   *  components/copilot.tsx. */
  copilotInsightPrompts: 2,
  /** Panjang minimum satu pertanyaan, dalam karakter. Dipakai composer untuk
   *  menahan kiriman yang pasti ditolak skema: satu karakter bukan
   *  pertanyaan, dan memberitahu pembaca "layanan menolak permintaan"
   *  menyalahkan layanan atas ketukan yang belum selesai. */
  copilotQuestionMinChars: 2,
  /** Panjang maksimum satu pertanyaan, dalam karakter. Dipakai dua kali:
   *  composer berhenti menerima ketukan di angka ini, dan permintaan yang
   *  tetap datang lebih panjang dipotong di batas yang sama alih-alih
   *  ditolak. */
  copilotQuestionChars: 500,
  /** Token keluaran maksimum untuk satu jawaban chat: satu objek JSON pendek
   *  berisi maksimal 4 kalimat. Completion terukur untuk jawaban semacam ini
   *  jauh di bawah 200 token dengan thinking mati, jadi 1024 adalah lima kali
   *  ruang gerak sekaligus batas atas waktu generasi pada tier gratis yang
   *  lambat — ekor yang membuat satu jawaban retrieved memakan 28 detik
   *  padahal plafon 2048-nya tidak pernah dibutuhkan. Call site yang butuh
   *  lebih (tidak ada saat ini) mengoper maxOutputTokens eksplisit alih-alih
   *  menaikkan ini. */
  answerMaxTokens: 1024,
  /** Batas entri memo analisis per instance, supaya Map tingkat modul pada
   *  instance Cloud Run berumur panjang tidak tumbuh tanpa henti. */
  retrievalMemoMaxEntries: 64,
  /** Berapa dimensi dampak bisnis yang diuji satu kasus sekaligus. Dulu
   *  `.slice(0, 2)` di dalam gerbang klarifikasi: pembaca memilih satu dari
   *  dua. Gerbang itu hilang, keduanya kini diuji bersama — angkanya tetap
   *  satu nilai supaya rencana, sumber, dan tabel dampak tidak bisa berbeda. */
  caseFocusCount: 2,
  /** Berapa sesi minimum yang harus ada di pembanding sebelum sebuah ukuran
   *  tahan-pencilan boleh dibacakan. Dulu `baseline.length < 8` diketik di
   *  metrics.ts, prediction.ts, dan signal-history.ts, sementara protokol
   *  Volume di engine.ts mengatakan "kurang dari 30 pengamatan" — teks
   *  menjanjikan penjaga yang tiga kali lebih ketat daripada kode. */
  comparatorMinObservations: 8,
  /** Triage web-watch: karakter minimum dalam kalimat utuh sebelum teks hasil
   *  ambil dianggap berisi. Kerangka navigasi yang dirender JS (kasus
   *  peringatan dini BMKG) lolos `MIN_FETCH_CHARS` karena menunya panjang,
   *  tetapi hampir tidak punya kalimat. Terukur 2026-09-24 pada salinan antrean
   *  produksi: teks berita tertipis (halaman video) berisi 188 karakter kalimat,
   *  jadi 150 tidak mengarsipkan satu pun berita yang ada. */
  webWatchProseMinChars: 150,
  /** Kata minimum agar satu potongan berakhiran titik dihitung kalimat, bukan
   *  label menu. */
  webWatchProseSentenceMinWords: 8,
  /** Alias nama emiten (`SYMBOL_ALIASES`) yang muncul di lebih dari porsi ini
   *  dari seluruh kandidat antrean dipakai sebagai kata biasa, bukan nama, dan
   *  tidak dihitung sebagai kecocokan. Terukur 2026-09-24 pada 163 kandidat
   *  produksi: "asia" 23%, "rakyat" 10%, "resources" 7% — sementara nama yang
   *  benar-benar nama ("timah", "mandiri", "telkom") di bawah 4%. */
  webWatchAliasMaxDocShare: 0.05,
  /** Jumlah kandidat minimum sebelum porsi di atas dihitung. Pada antrean
   *  sekecil ini porsi tidak berarti apa-apa, jadi kata nama tetap dipakai —
   *  lebih baik satu kandidat berlebih ditinjau daripada satu diarsipkan salah. */
  webWatchAliasMinCorpus: 50,
  /** Curah hujan per langkah prakiraan BMKG (3 jam), mm, yang membuat
   *  prakiraan lokasi tambang layak ditinjau. */
  webWatchRainMmPerStep: 10,
  /** Kode cuaca BMKG mulai dari mana sebuah langkah prakiraan dianggap
   *  peringatan. 63 = hujan lebat; kode di atasnya hujan lokal dan badai petir. */
  webWatchWarningWeatherCode: 63,
  /** Kecepatan angin per langkah prakiraan, km/jam, yang dianggap peringatan
   *  (jendela pengapalan dan tongkang). */
  webWatchWindKmh: 40,
  /** Magnitudo minimum gempa di wilayah aset pantauan agar ditinjau. */
  webWatchQuakeMinMagnitude: 5,
  /** Magnitudo di atas ini selalu ditinjau walau teks wilayahnya tidak
   *  menyebut wilayah aset: pencocokan teks bisa luput kabupaten tetangga. */
  webWatchQuakeAlwaysReviewMagnitude: 6,
  /** Kandidat terarsip yang disimpan di queue.json. Objek antrean dibaca dan
   *  ditulis utuh setiap keputusan; batas ini menjaga ukurannya. */
  webWatchArchiveMax: 200,
  /** Keputusan reviewer terakhir yang ikut ke prompt draf pemetaan sebagai
   *  contoh. Lebih banyak contoh = lebih banyak token per panggilan. */
  webWatchFewShotMax: 6,
  /** Kata minimum alasan penolakan agar ikut sebagai contoh. "jelek" dan
   *  "gk ngaruh" tercatat di antrean produksi dan tidak mengajarkan apa pun. */
  webWatchFewShotReasonMinWords: 3,
  /** Panggilan model paling banyak dalam satu sapuan untuk draf pemetaan.
   *  Sisanya tetap di review biasa dan dicoba pada sapuan berikutnya. */
  webWatchSweepLlmCalls: 20,
  /** Emiten paling banyak yang didrafkan per kandidat. Sumber resmi bank
   *  sentral mendeklarasikan lima; tanpa batas ini satu siaran pers memakan
   *  seperempat jatah sapuan. */
  webWatchDraftSymbolsMax: 3,
  /** Waktu paling lama, ms, yang boleh dipakai draf dalam satu sapuan. Job
   *  Cloud Scheduler `catalyst-web-watch` punya tenggat 180 detik dan layanan
   *  300 detik; sapuan sumber sendiri memakan sisanya. */
  webWatchDraftTimeBudgetMs: 60000,
  /** Karakter teks kandidat (judul dan kalimat utuh) yang masuk prompt draf. */
  webWatchDraftContextChars: 2000,
} as const;

/**
 * Asal-usul tiap ambang, dicatat supaya tidak ada yang mengira angka tebakan
 * adalah angka terukur.
 *
 *   derived    — turunan matematis, tidak ada yang bisa dipelajari
 *                (mis. 0.6745 di metrics.ts: konstanta MAD→sigma, Φ⁻¹(0.75))
 *   convention — penjaga kualitas data, bukan ambang keputusan
 *   guess      — nilai awal yang dipilih manusia; kandidat Lapis 3
 */
/**
 * Nama pilar dalam bahasa pembaca.
 *
 * Dulu tabel lokal di dalam `insightTraces` (lib/agent/engine.ts), tidak
 * terlihat dari mana pun. Indeks korpus membutuhkan nama yang sama supaya
 * "berapa ambang konsentrasi" menemukan `concentrationFloor` — kunci ambang
 * ditulis dalam bahasa Inggris, pertanyaan pembaca tidak.
 */
/**
 * How a reader says "cut-off".
 *
 * A threshold has the same value whichever case is open, so a question
 * carrying one of these words is not a question about a case — it used to be
 * answered with "which case do you mean?" because it also named a figure.
 */
export const THRESHOLD_WORDS = ["ambang", "batas", "floor", "cutoff", "cut-off"] as const;

/** Whether a question is asking for a cut-off rather than about a case. */
export function namesAThreshold(question: string): boolean {
  const lowered = ` ${question.toLowerCase()} `;
  return THRESHOLD_WORDS.some((word) => lowered.includes(` ${word} `) || lowered.includes(`${word} `));
}

export const PILLAR_LABELS: Record<string, string> = {
  concentration: "Konsentrasi",
  volume: "Volume",
  momentum: "Momentum",
  catalyst: "Katalis",
};

export const THRESHOLD_PROVENANCE: Record<keyof typeof DEFAULT_THRESHOLDS, "derived" | "convention" | "guess"> = {
  relevanceFloor: "guess",
  chainRelevanceFloor: "guess",
  concentrationFloor: "guess",
  volumeZFloor: "guess",
  volumeExtremeFloor: "guess",
  contagionDropFloor: "guess",
  contagionCorrelationFloor: "guess",
  distributionValueFloor: "guess",
  momentumAlignedFloor: "guess",
  momentumSectorFloor: "guess",
  momentumIdiosyncraticFloor: "guess",
  foreignContradictionShare: "guess",
  // Dua ambang di bawah memutuskan apakah pembaca menerima jawaban sama
  // sekali, jadi keduanya keputusan — bukan penjaga kapasitas.
  handlerScoreFloor: "guess",
  retrievalScoreFloor: "guess",
  retrievalScopeBoost: "guess",
  // Sisanya menjaga ukuran, bukan menilai bukti: berapa entri dimuat, berapa
  // karakter masuk prompt, berapa giliran diingat, berapa entri disimpan.
  retrievalTopK: "convention",
  retrievalContextCharCap: "convention",
  memoryPatchMaxBytes: "convention",
  copilotHistoryTurns: "convention",
  copilotHistorySymbols: "convention",
  copilotHistoryTurnChars: "convention",
  encliticMinTokenChars: "convention",
  encliticMinStemChars: "convention",
  copilotQuestionChars: "convention",
  copilotQuestionMinChars: "convention",
  copilotInsightPrompts: "convention",
  answerMaxTokens: "convention",
  retrievalMemoMaxEntries: "convention",
  caseFocusCount: "convention",
  comparatorMinObservations: "convention",
  // Triage web-watch. Ambang cuaca dan kata nama memutuskan kandidat mana yang
  // sampai ke reviewer, jadi `guess`; sisanya penjaga kualitas dan ukuran.
  webWatchProseMinChars: "convention",
  webWatchProseSentenceMinWords: "convention",
  webWatchAliasMaxDocShare: "guess",
  webWatchAliasMinCorpus: "convention",
  webWatchRainMmPerStep: "guess",
  webWatchWarningWeatherCode: "guess",
  webWatchWindKmh: "guess",
  webWatchQuakeMinMagnitude: "guess",
  webWatchQuakeAlwaysReviewMagnitude: "guess",
  webWatchArchiveMax: "convention",
  webWatchFewShotMax: "convention",
  webWatchFewShotReasonMinWords: "convention",
  webWatchSweepLlmCalls: "convention",
  webWatchDraftSymbolsMax: "convention",
  webWatchDraftTimeBudgetMs: "convention",
  webWatchDraftContextChars: "convention",
};

/**
 * Jendela pemeriksaan dan bobot relevansi hasil — dulu diketik ulang di lima
 * call site lib/agent/engine.ts ("1-10 sesi", "1-3 bulan", "0-3 sesi", 100,
 * 85). Satu nilai diubah di satu tempat, empat tempat lain tetap memakai yang
 * lama, dan tidak ada tes yang gagal. Angkanya hidup sekali di sini; label
 * dirakit oleh formatter di bawah supaya teks dan nilai tidak bisa berbeda.
 *
 * Status provenance seluruh tabel ini: `guess` — belum pernah diukur.
 */
export const OBSERVATION_WINDOWS = {
  /** Jendela baku untuk indikator operasional, dalam sesi bursa. */
  defaultSessions: [1, 10],
  /** Dampak valuasi butuh jendela lebih panjang, dalam bulan. */
  valuationMonths: [1, 3],
  /** Perkiraan jeda per jenis peristiwa, dalam sesi bursa. */
  eventLagSessions: {
    company: [0, 3],
    weather: [0, 5],
    rates: [5, 20],
    sentiment: [1, 5],
  } as Record<string, [number, number]>,
} as const;

/**
 * Relevance score for each ordinal band.
 *
 * There used to be two of these. `lib/web-watch/queue.ts` scored a band a
 * reviewer picked at 85 / 70 / 50, and `lib/agent/llm/exposure.ts` scored a
 * band the model picked at 90 / 65 / 40, so "high" meant a different number
 * depending on who said it — and calibration bucketed both by the first table
 * only. One table now, read by the review queue, the model exposure path, the
 * calibration buckets, and the Pantau form.
 *
 * The reviewer's values were kept because they are the ones already stored on
 * accepted web-watch events and the ones calibration cut on. Against the
 * default floors nothing moves: high still clears `relevanceFloor` (85),
 * medium still clears `chainRelevanceFloor` (60) and low still does not.
 *
 * Provenance: `guess`, like every decision entry above.
 */
export const RELEVANCE_BANDS = ["high", "medium", "low"] as const;
export type RelevanceBand = (typeof RELEVANCE_BANDS)[number];
export const RELEVANCE_BAND_SCORE: Readonly<Record<RelevanceBand, number>> = { high: 85, medium: 70, low: 50 };
export const RELEVANCE_BAND_PROVENANCE = "guess" as const;

/** The band a stored relevance score falls in, cut at the table above. */
export function bandForRelevance(relevance: number): RelevanceBand {
  if (relevance >= RELEVANCE_BAND_SCORE.high) return "high";
  if (relevance >= RELEVANCE_BAND_SCORE.medium) return "medium";
  return "low";
}

/** Bobot relevansi hasil uji pada rantai sebab akibat. */
export const OUTCOME_RELEVANCE = {
  primaryTest: 100,
  supporting: 85,
} as const;

export const sessionWindowLabel = (range: readonly [number, number] | number[]): string => `${range[0]}-${range[1]} sesi`;
export const monthWindowLabel = (range: readonly [number, number] | number[]): string => `${range[0]}-${range[1]} bulan`;
/** Jendela baku dalam kalimat panjang ("1–10 hari bursa"). */
export const sessionWindowSentence = (range: readonly [number, number] | number[]): string => `${range[0]}\u2013${range[1]} hari bursa`;

export type ResolvedThresholds = {
  [K in keyof typeof DEFAULT_THRESHOLDS]: number;
};

type PlaybookLike = Pick<InvestorResearchPlaybook, "relevanceFloor" | "thresholds">;

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Kembalikan objek thresholds yang terisi penuh; aman untuk partial/absent (C7). */
export function resolveThresholds(playbook?: PlaybookLike | null): ResolvedThresholds {
  const t = playbook?.thresholds ?? {};
  return {
    relevanceFloor: num(playbook?.relevanceFloor, DEFAULT_THRESHOLDS.relevanceFloor),
    chainRelevanceFloor: num(t.chainRelevanceFloor, DEFAULT_THRESHOLDS.chainRelevanceFloor),
    concentrationFloor: num(t.concentrationFloor, DEFAULT_THRESHOLDS.concentrationFloor),
    volumeZFloor: num(t.volumeZFloor, DEFAULT_THRESHOLDS.volumeZFloor),
    volumeExtremeFloor: num(t.volumeExtremeFloor, DEFAULT_THRESHOLDS.volumeExtremeFloor),
    contagionDropFloor: num(t.contagionDropFloor, DEFAULT_THRESHOLDS.contagionDropFloor),
    contagionCorrelationFloor: num(t.contagionCorrelationFloor, DEFAULT_THRESHOLDS.contagionCorrelationFloor),
    distributionValueFloor: num(t.distributionValueFloor, DEFAULT_THRESHOLDS.distributionValueFloor),
    momentumAlignedFloor: num(t.momentumAlignedFloor, DEFAULT_THRESHOLDS.momentumAlignedFloor),
    momentumSectorFloor: num(t.momentumSectorFloor, DEFAULT_THRESHOLDS.momentumSectorFloor),
    momentumIdiosyncraticFloor: num(t.momentumIdiosyncraticFloor, DEFAULT_THRESHOLDS.momentumIdiosyncraticFloor),
    foreignContradictionShare: num(t.foreignContradictionShare, DEFAULT_THRESHOLDS.foreignContradictionShare),
    // Nilai lapisan retrieval selalu jatuh ke default: playbook pembaca tidak
    // memuatnya, dan memang tidak seharusnya. Ambang konsentrasi adalah
    // pendapat tentang pasar; berapa karakter yang masuk prompt bukan.
    // Keduanya tetap lewat sini supaya satu objek ini benar-benar berisi
    // setiap ambang yang dibaca mesin, seperti yang dijanjikan namanya.
    handlerScoreFloor: DEFAULT_THRESHOLDS.handlerScoreFloor,
    retrievalScoreFloor: DEFAULT_THRESHOLDS.retrievalScoreFloor,
    retrievalScopeBoost: DEFAULT_THRESHOLDS.retrievalScopeBoost,
    retrievalTopK: DEFAULT_THRESHOLDS.retrievalTopK,
    retrievalContextCharCap: DEFAULT_THRESHOLDS.retrievalContextCharCap,
    memoryPatchMaxBytes: DEFAULT_THRESHOLDS.memoryPatchMaxBytes,
    copilotHistoryTurns: DEFAULT_THRESHOLDS.copilotHistoryTurns,
    copilotHistorySymbols: DEFAULT_THRESHOLDS.copilotHistorySymbols,
    copilotHistoryTurnChars: DEFAULT_THRESHOLDS.copilotHistoryTurnChars,
    encliticMinTokenChars: DEFAULT_THRESHOLDS.encliticMinTokenChars,
    encliticMinStemChars: DEFAULT_THRESHOLDS.encliticMinStemChars,
    copilotQuestionChars: DEFAULT_THRESHOLDS.copilotQuestionChars,
    copilotQuestionMinChars: DEFAULT_THRESHOLDS.copilotQuestionMinChars,
    copilotInsightPrompts: DEFAULT_THRESHOLDS.copilotInsightPrompts,
    answerMaxTokens: DEFAULT_THRESHOLDS.answerMaxTokens,
    retrievalMemoMaxEntries: DEFAULT_THRESHOLDS.retrievalMemoMaxEntries,
    caseFocusCount: DEFAULT_THRESHOLDS.caseFocusCount,
    comparatorMinObservations: DEFAULT_THRESHOLDS.comparatorMinObservations,
    webWatchProseMinChars: DEFAULT_THRESHOLDS.webWatchProseMinChars,
    webWatchProseSentenceMinWords: DEFAULT_THRESHOLDS.webWatchProseSentenceMinWords,
    webWatchAliasMaxDocShare: DEFAULT_THRESHOLDS.webWatchAliasMaxDocShare,
    webWatchAliasMinCorpus: DEFAULT_THRESHOLDS.webWatchAliasMinCorpus,
    webWatchRainMmPerStep: DEFAULT_THRESHOLDS.webWatchRainMmPerStep,
    webWatchWarningWeatherCode: DEFAULT_THRESHOLDS.webWatchWarningWeatherCode,
    webWatchWindKmh: DEFAULT_THRESHOLDS.webWatchWindKmh,
    webWatchQuakeMinMagnitude: DEFAULT_THRESHOLDS.webWatchQuakeMinMagnitude,
    webWatchQuakeAlwaysReviewMagnitude: DEFAULT_THRESHOLDS.webWatchQuakeAlwaysReviewMagnitude,
    webWatchArchiveMax: DEFAULT_THRESHOLDS.webWatchArchiveMax,
    webWatchFewShotMax: DEFAULT_THRESHOLDS.webWatchFewShotMax,
    webWatchFewShotReasonMinWords: DEFAULT_THRESHOLDS.webWatchFewShotReasonMinWords,
    webWatchSweepLlmCalls: DEFAULT_THRESHOLDS.webWatchSweepLlmCalls,
    webWatchDraftSymbolsMax: DEFAULT_THRESHOLDS.webWatchDraftSymbolsMax,
    webWatchDraftTimeBudgetMs: DEFAULT_THRESHOLDS.webWatchDraftTimeBudgetMs,
    webWatchDraftContextChars: DEFAULT_THRESHOLDS.webWatchDraftContextChars,
  };
}

/** Materiality floor dari playbook user; nama dipertahankan agar call site tidak pecah. */
export const relevanceFloorFor = (playbook?: Pick<InvestorResearchPlaybook, "relevanceFloor"> | null): number =>
  resolveThresholds(playbook).relevanceFloor;
