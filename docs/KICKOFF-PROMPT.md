# Prompt untuk sesi baru

Salin seluruh blok di bawah ini ke sesi Claude Code yang baru di
`/Users/af/dumpProject/catalyst`.

---

Kerjakan rencana di `docs/PLAN-REAL-DATA-AGENT-DEPLOY.md`. Baca dokumen itu lengkap sebelum
menyentuh file apa pun — di dalamnya ada inventaris dummy per tier, rencana P0–P6, disiplin
kredit, dan tabel verifikasi 26 klaim.

## Konteks yang tidak ada di dokumen

- Repo: `/Users/af/dumpProject/catalyst`, branch `feat/alief/wire-ui`, ada ~35 file
  belum di-commit dari sesi sebelumnya. Jangan commit apa pun kecuali saya minta.
- Sesi sebelumnya sudah: mengganti seluruh fixture karangan dengan rekaman Sectors API nyata
  (18 emiten, 28 sesi bursa, 61 event dari berita dan filing asli), memperbaiki merge yang
  rusak sehingga repo bisa build lagi, dan membuat `.env.example` + `.env.local`.
- Riset pendukung ada di repo lain: `/Users/af/dumpProject/Sectors`. Di sana ada dokumen API
  (`research/docs/api/`), aturan hackathon (`research/docs/hackathon/`), harness capture
  (`research/harness/`), dan rekaman mentah (`research/harness/recorded/`, 180+ file).
  Baca dari sana, jangan menebak.
- Pola sitasi yang akan dipinjam ada di repo ketiga: `/Users/af/dumpProject/ReguLens`.
  Baca `api/app/core/citations.py` dan `web/app/documents/[id]/SourceText.tsx` sebelum
  menulis versi Catalyst-nya.
- Diagram chain di halaman Impact **sudah** memakai React Flow (`@xyflow/react` v12.11.6,
  `components/causal-chain.tsx`). Jangan menggantinya dengan pustaka lain dan jangan
  menulis ulang dari nol.

## Aturan keras

1. **Jangan ubah desain UI.** Layout, komponen, token warna, spacing tidak boleh bergeser.
   Yang boleh berubah hanya data dan teks yang sekarang salah secara faktual.
2. **Jangan pernah menulis tangan `lib/data/market.generated.ts`.** File itu keluaran
   `python3 scripts/build_market_data.py`. Ubah generator-nya, lalu jalankan ulang.
3. **Kredit Sectors: 619 sisa dari 1.000, tidak bisa diisi ulang, hangus saat event selesai.**
   Ledger di `/Users/af/dumpProject/Sectors/research/harness/recorded/_ledger.jsonl`.
   Sebelum panggilan live apa pun: tulis plan JSON, `--dry-run`, rehearse ke
   `mock_server.py`, **bersihkan artefak rehearsal**, minta persetujuan saya, baru live.
   Rehearsal menulis file mock ke `recorded/` dan menandainya selesai — kalau tidak
   dibersihkan, run live akan melewatinya.
4. **LLM tidak pernah mengeluarkan angka.** Setiap angka tetap lahir dari
   `lib/agent/metrics.ts` dan tetap membawa citation. Lapisan Gemini hanya menulis rencana,
   jalur eksposur, penilaian, jawaban, dan verifikasi.
5. **Sitasi tidak boleh menebak.** Span yang tidak ditemukan dilaporkan sebagai `not_found`,
   bukan diarahkan ke paragraf terdekat. Menyorot kalimat yang salah lebih buruk daripada
   tidak menyorot apa pun.
6. **Gate harus hijau sebelum pindah fase**: `pnpm lint`, `pnpm typecheck`, `pnpm test`,
   `pnpm test:e2e`, `pnpm build`. Kalau tesnya mengunci teks yang sekarang dinamis,
   perbaiki tesnya supaya menguji perilaku, bukan string.
7. **Jangan tambah dependensi tanpa alasan yang ditulis.** Satu-satunya yang direncanakan:
   `@google/genai`, plus satu pustaka layouting graf (Dagre atau ELK) untuk P1b.
8. Baca `AGENTS.md` — versi Next.js di repo ini punya breaking change; panduannya di
   `node_modules/next/dist/docs/`.

## Urutan

Kerjakan **P0, P1, dan P1b lebih dulu — ketiganya nol kredit** — lalu berhenti dan laporkan
sebelum lanjut.

- **P0** — perbaiki lima klaim yang sekarang salah (baseline "45 hari bursa" padahal 27,
  klaim input BMKG/BI-Rate/JISDOR di halaman method, header chart, filter sumber yang selalu
  kosong, quick prompt nikel). Semuanya harus jadi turunan data, bukan literal baru.
- **P1** — pakai tujuh rekaman yang sudah ada tapi menganggur: `shareholders-composition`,
  `corporate-actions`, `get-segments`, harga komoditas Coal dan Gold, `subsector_report`
  `sections=statistics`, `suspensions`, `most-traded`. Salin ke `data/sectors/`, perluas
  generator, dan pindahkan `sectorReturn` dari rata-rata 18 emiten ke statistik subsektor.

- **P1b** — sitasi tingkat kalimat. Port `locate()` dari ReguLens ke
  `lib/agent/citations.ts` beserta tesnya (tiga status: `exact`, `approximate`, `not_found`;
  `not_found` adalah jawaban yang sah, bukan kegagalan). Simpan `body` berita dan filing ke
  `market.generated.ts`. Tambah `Citation.span` opsional. Buat komponen `SourceText` yang
  menyorot span di body sumber, sambungkan ke `CitationDialog` yang sudah ada, dan buat edge
  React Flow bisa diklik sampai ke span yang mendasari `rationale`-nya. Sekalian pindahkan
  layout chain ke Dagre atau ELK dan pasang minimap.

Setelah P0+P1+P1b hijau, laporkan dan tunggu. P2 (lapisan Gemini) baru jalan setelah saya
mengonfirmasi dua hal yang masih terbuka di dokumen:

- **U1** — ID model Gemini yang berlaku. Jangan ditebak; cek `await ai.models.list()` atau
  AI Studio, lalu isi `GEMINI_MODEL` di `.env.local`.
- **U3** — kuota RPM/RPD free tier dan ketentuan penggunaan datanya.

## LLM

Google AI free tier, SDK `@google/genai`, kunci di `.env.local` sebagai `GOOGLE_API_KEY`.
Jangan pernah menaruh kunci di variabel berawalan `NEXT_PUBLIC_`. Jangan pernah mengirim isi
memory pengguna ke model. `AGENT_MODE=deterministic` adalah default dan harus tetap membuat
seluruh aplikasi jalan penuh tanpa satu pun panggilan model — itu rem darurat saat kuota habis
dan itu juga yang dipakai test.

## Yang belum perlu dikerjakan

Cloud Build dan deploy (P5) ditunda. Jangan buat objek GCP apa pun.

Kalau ada bagian rencana yang menurutmu salah setelah membaca kodenya, bilang sebelum
mengerjakannya — jangan diam-diam menyimpang.
