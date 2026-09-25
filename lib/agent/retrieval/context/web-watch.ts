import { SEED_SOURCES } from "@/lib/web-watch/seeds";
import { getOverlayEvents, getOverlayStats } from "@/lib/web-watch/queue";
import { TRIAGE_RULE_LABEL, TRIAGE_RULES } from "@/lib/web-watch/triage";
import { extractNumerals } from "@/lib/agent/llm/verify";
import { resolveThresholds } from "@/lib/agent/thresholds";
import { EVENT_MARKER_LABEL, EVENT_MARKERS } from "@/lib/types";
import { isAutoDecideEnabled } from "@/lib/settings";
import type { ContextBundle } from "@/lib/agent/retrieval/types";

/**
 * The addresses Catalyst watches, and what is waiting to be reviewed.
 *
 * The watch list is the registry itself, so registering a source adds it to
 * what the assistant can answer about without anyone editing this file.
 * Counts are grouped rather than listed one by one: a reader asking what is
 * being watched wants the shape of the list, and the cap in `bundle.ts`
 * would truncate a full one anyway.
 */
export async function buildWebWatchBundle(): Promise<ContextBundle> {
  const enabled = SEED_SOURCES.filter((source) => source.enabled);
  const byKind = new Map<string, number>();
  for (const source of enabled) byKind.set(source.kind, (byKind.get(source.kind) ?? 0) + 1);
  const byCategory = new Map<string, number>();
  for (const source of enabled) byCategory.set(source.category, (byCategory.get(source.category) ?? 0) + 1);

  // The overlay is whatever review has already accepted. Reading it here is
  // safe with no queue loaded: it answers empty rather than throwing.
  const accepted = getOverlayEvents();
  const stats = getOverlayStats();
  const auto = await isAutoDecideEnabled().catch(() => ({ enabled: false }));

  const body = [
    `Halaman Pantau menampilkan sumber web yang diawasi, antrean review, dan peristiwa yang sudah diterima engine.`,
    `Sumber bawaan: ${SEED_SOURCES.length}, aktif ${enabled.length}.`,
    `Menurut jenis: ${[...byKind.entries()].map(([kind, count]) => `${kind} ${count}`).join(", ")}.`,
    `Menurut kategori peristiwa: ${[...byCategory.entries()].map(([category, count]) => `${category} ${count}`).join(", ")}.`,
    `Antrean review: ${stats.pending} calon menunggu keputusan, ${stats.decided} sudah diputus.`,
    `Setiap malam penyaring berbasis model NLI lokal membaca calon yang menunggu. Calon yang belum bisa ia putuskan ditinggalkan untuk reviewer di bagian Perlu keputusan beserta alasannya: ${stats.residual}. Keputusan reviewer atas calon itu dipakai untuk mengkalibrasi penyaring.`,
    `Sebelum sampai ke reviewer, setiap calon lewat triase berbasis aturan: duplikat, teks tanpa kalimat utuh, cuaca atau gempa di bawah ambang peringatan, dan calon yang tidak menyebut satu pun emiten terekam atau sumbernya tidak mendeklarasikan emiten disisihkan ke arsip beserta alasannya. Arsip tidak dihapus, tetapi final: calon yang diarsipkan tidak dikembalikan ke antrean.`,
    `Diarsipkan otomatis: ${stats.archived}${
      stats.archived
        ? ` (${TRIAGE_RULES.filter((rule) => stats.archivedByRule[rule]).map((rule) => `${TRIAGE_RULE_LABEL[rule]} ${stats.archivedByRule[rule]}`).join(", ")})`
        : ""
    }.`,
    `Calon yang lolos triase bisa membawa usulan pemetaan dari model (arah, band relevansi, jalur eksposur). Usulan hanya disimpan bila lolos pemeriksaan: emiten ada di registri dan cocok dengan triase, setiap angka ada di teks calon, dan tanpa bahasa saran transaksi. Calon dengan usulan saat ini: ${stats.proposals}.`,
    auto.enabled
      ? `Sakelar keputusan otomatis menyala: pada langkah putus, usulan diterima tanpa reviewer hanya bila setiap emitennya punya arah menguatkan atau menekan dan disebut di teks calon dengan band tinggi atau sedang, atau dideklarasikan sumbernya dengan band tinggi, paling banyak ${resolveThresholds().webWatchAutoAcceptDailyMax} dalam 24 jam. Selebihnya menunggu reviewer. Setiap penerimaan otomatis bisa dibatalkan di Pantau dan calon itu kembali ke antrean. Diterima otomatis sejauh ini: ${stats.autoAccepted}. Penyaring juga menolak tanpa reviewer calon yang jelas rumor, berjudul menyesatkan, tanpa isi konkret, bertentangan dengan angka rekaman, atau tidak relevan; penolakan itu final dan tercatat bersama pemeriksaan yang memutuskan serta kalimat yang dibacanya. Ditolak otomatis sejauh ini: ${stats.autoRejected}.`
      : `Sakelar keputusan otomatis mati: tidak ada calon yang diterima atau ditolak tanpa reviewer. Ditolak otomatis sebelum sakelar dimatikan: ${stats.autoRejected}.`,
    `Peristiwa hasil review yang sudah diterima dan dipakai engine: ${accepted.length}.`,
    `Peristiwa yang diterima bisa membawa penanda dari penyaring (${EVENT_MARKERS.map((marker) => EVENT_MARKER_LABEL[marker]).join(", ")}); penanda itu tampil di rantai sebab akibat. Saat ini: ${EVENT_MARKERS.map((marker) => `${EVENT_MARKER_LABEL[marker]} ${accepted.filter((event) => event.markers?.includes(marker)).length}`).join(", ")}.`,
    auto.enabled
      ? `Perubahan pada sumber tidak langsung jadi peristiwa: setiap calon lewat triase dan pemeriksaan usulan dulu, dan hanya sebagian kecil yang boleh diterima tanpa reviewer.`
      : `Perubahan pada sumber tidak langsung jadi peristiwa: setiap calon harus lewat review manusia dulu.`,
    ...enabled.slice(0, 12).map((source) => `- ${source.label} (${source.kind}, kategori ${source.category}, dicek tiap ${source.checkIntervalHours} jam)`),
  ].join("\n");

  return {
    id: "view:pantau",
    kind: "view",
    title: "Pantau web",
    body,
    figures: extractNumerals(body),
    citations: [],
    symbols: [],
  };
}
