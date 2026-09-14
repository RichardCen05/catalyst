# Implementation Plan — No Dummy / Everything Wired

Status: dilaksanakan. Typecheck ✓, lint 0 error, unit 96/96 ✓, build ✓,
e2e 13 passed / 12 failed — 12 gagal identik dengan baseline pra-perubahan
(pre-existing di branch ini, bukan regresi).

## Prinsip

1. Angka hanya dari `data/sectors/` → `market.generated.ts` (via `scripts/build_market_data.py`).
2. Aturan deterministik (kategori → lag, band relevansi) didokumentasikan sebagai
   heuristik terekam, bukan model live — dan ambangnya bisa diubah user.
3. Cakupan diturunkan dari ketersediaan data, bukan daftar tangan.
4. Tidak ada nilai baru yang dikarang: ekspansi cakupan tanpa rekaman = dilarang.

## A. Klaim basi → dinamis (selesai)

- `lib/agent/engine.ts`: semua literal "45 hari bursa" / "44 pengamatan" /
  "median 45 hari" / `V₄₅` diganti `windowLabel()` / `windowBaselineCount()`
  dari `WINDOW_SESSIONS` (28 sesi). Baru: `windowLabel()`, `DEFAULT_RELEVANCE_FLOOR`,
  `relevanceFloorFor(playbook)`.
- `components/research-case-workspace.tsx`: "Buka timeline 45 hari" →
  "Buka timeline {WINDOW_SESSIONS} hari".
- `app/method/page.tsx`: input pilar Katalis memakai `catalystInputs` dinamis
  (dulu klaim BI-Rate/JISDOR/BMKG tanpa event); kartu "Data statis" jujur soal
  lapisan opsional (LLM/web/GCS).
- `lib/web-watch/seeds.ts`: `src-bmkg-forecast-sample` → `enabled: false`,
  label NONAKTIF; hanya salinan per-wilayah tambang dengan adm4 terverifikasi
  yang boleh diaktifkan.
- `tests/e2e/catalyst.spec.ts`, `tests/engine.test.ts`: ekspektasi literal →
  regex dinamis.

## B. Engine de-hardcode (selesai)

- `mandateFocus` + `clarificationFocus` (peta per-simbol) → `sectorDefaultFocus()`
  dari sektor terekam (Basic Materials/Energy→pricing, Financials→margin,
  Technology/Infrastructure→cash-flow, Consumer→volume); keyword eksplisit
  (`explicitMandateFocus`) selalu menang.
- Materialitas: konstanta `>= 85` → `relevanceFloorFor(playbook)`; tanpa jalur
  eksposur kini `Low` (dulu `Medium`), sehingga `dismiss` terjangkau.
  `confidenceFor` dan status hipotesis saingan mengikuti ambang user
  (`floor+5` / `floor-10`).
- `InvestorResearchPlaybook.relevanceFloor?` (default 85): tipe (`lib/types.ts`),
  validasi (`lib/schemas.ts`), store + setter `setRelevanceFloor` + migrasi
  backfill (`lib/store.ts`), slider di `app/playbook/page.tsx`.
- `components/causal-chain.tsx`: lebar edge ambang `>= 85` → skala kontinu
  dari relevansi.
- Rumus relevansi di `scripts/build_market_data.py` diberi komentar jujur
  (heuristik terekam, filing=95, decay per spread) — nilai tidak diubah.

## C. Profil/playbook/ingatan (selesai)

- `lib/memory-store.ts`: `compareProfiles()` mengembalikan profil aktif dari
  store (dulu `demoProfiles` statis).
- `demoProfiles`/`defaultPlaybook` tetap sebagai seed awal lokal (diperlukan
  untuk first-run), tapi watchlist/owned/ambang/pembanding sepenuhnya dapat
  diubah user dan tersimpan (persist + GCS memory API).

## D. Cakupan dari data, bukan daftar (selesai)

- `lib/data/fixtures.ts`: `ANALYZED_SYMBOLS` hardcoded 6 → derivasi
  (punya `priceSeries` + `brokerEvidence`).
- `scripts/build_market_data.py`: `CASES` hardcoded → `[s for s in SYMBOLS if
  rekaman broker-summary ada]`. Re-run terverifikasi: 6 broker sets, sama.
  Ekspansi ke 12 emiten lain TIDAK dilakukan — tanpa rekaman broker itu
  akan jadi data dummy.

## E. Improve UX (selesai)

- Today (`app/page.tsx`): filter Semua/Dimiliki/Konflik, badge Dimiliki,
  banner staleness ("Rekaman N hari lalu — bukan pasar live"), tanggal dinamis.
- Impact (`app/impact/page.tsx`): klarifikasi inline (pilih fokus tanpa
  navigasi) + refresh.
- Kasus (`app/cases/page.tsx`): matriks banding + HHI, skor-z, residual,
  imbal hasil sektor, materialitas.
- Ringkasan kasus: "Salin ringkasan riset" (clipboard deterministik),
  "Jadikan item pantauan" (monitor → antrean insight `missing-context`).
- Workspace: peer strip sektor + pembanding, badge Fokus pada baris keuangan
  sesuai `researchPlan.focus`.

## F. Verifikasi

- `pnpm typecheck` ✓ · `pnpm lint` 0 error (43 warning pre-existing) ·
  `pnpm test` 96/96 ✓ · `pnpm build` ✓ · regen script ✓ (6 broker sets).
- E2E: 13 passed / 12 failed, set gagal = baseline. Satu regresi WCAG sempat
  muncul (`button` di `div>dl`) dan sudah diperbaiki — WCAG kini lolos.
- 12 gagal pre-existing (tutorial, gating klarifikasi, timeline, causal,
  koreksi, formula) adalah drift spec-vs-app di branch ini dan di luar
  lingkup perubahan ini; butuh perbaikan spec terpisah.

## G. Audit ulang — temuan & perbaikan tambahan

- `components/onboarding-wizard.tsx`: `commodityDesk` daftar 6 simbol →
  derivasi sektor terekam (`Basic Materials`/`Energy` ∩ `analyzed`).
- `app/playbook/page.tsx`: tidak ada editor watchlist/owned pasca-onboarding
  (`setWatchlist` hanya dipakai onboarding; `toggleOwned` tidak dipakai di
  mana pun) → panel "Daftar pantauan" baru: checkbox watchlist + tombol
  Dimiliki per emiten, terhubung ke store. Preferensi yang dipelajari kini
  ditampilkan dengan switch `togglePreference` (sebelumnya write-only).
- `README.md`: klaim "data simulasi komoditas, makro, kebijakan, cuaca"
  diluruskan — tipe sumber terekam yang benar-benar ada hanya `sectors`,
  `filing`, `commodity`; `macro`/`weather`/`policy` hanya dari overlay
  web-watch yang disetujui. Relevansi didokumentasikan sebagai heuristik
  terekam + ambang playbook.
- Diverifikasi jujur tapi dipertahankan sebagai seed/labeled demo (dapat
  diubah user, bukan angka pasar): `demoProfiles`, `defaultPlaybook`
  exposures, tur ANTM, `RELEVANCE_BAND_SCORE`, skor tampil 100/85,
  `defaultProfile` (dead export, tidak dipakai di mana pun).
- PGAS: fokus default sektor menjadi `pricing` (dulu tebakan `margin`) —
  konsisten dengan status Energy/komoditas; tidak ada test yang mengunci
  nilai lama.
- Verifikasi akhir: typecheck ✓, lint 0 error, unit 96/96 ✓, build ✓,
  smoke 7 rute (SSR + nol pageerror/console-error).
