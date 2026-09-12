# Catalyst

Catalyst adalah prototype agent riset IDX untuk Sectors Hackathon Track 01. Enam emiten memiliki analisis lengkap berdasarkan Konsentrasi, Volume, Momentum, dan Katalis. Dua belas emiten lain menunjukkan state data yang belum cukup.

Semua data pada prototype berupa fixture statis. Tidak ada panggilan pasar langsung, LLM, scraping, penjadwalan, login, database, atau eksekusi transaksi.

## Jalankan lokal

```bash
pnpm install
pnpm dev
```

Buka `http://localhost:3000`, selesaikan setup empat langkah, lalu gunakan halaman Today, Companies, Causal Impact, Copilot, Agent, dan Method.

## Pemeriksaan

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Unit test memeriksa kalkulator, citation gate, language gate, personalisasi, causal graph, human insight loop, dan watchlist scoping. Playwright memeriksa setup, transparansi formula, komentar koreksi, causal impact, Copilot, dua profil, theme persistence, breakpoint, serta WCAG A/AA otomatis.

## Interface

- `MarketDataProvider`: company list, daily series, broker evidence, ownership, dan event perusahaan.
- `NewsProvider`: Sectors news/filing serta fixture komoditas, makro, kebijakan, dan cuaca.
- `AgentEngine`: `analyzeCompany`, `mapEventImpact`, dan `answerFollowUp`.
- `MemoryStore`: profil, feedback, preferensi, perbandingan profil, dan reset.
- Route handler: `POST /api/analyze`, `POST /api/impact`, dan `POST /api/chat`.

Data produksi dapat dipasang kemudian dengan mengganti provider fixture. Kalkulator, gate, tipe output, dan komponen UI tidak perlu membaca bentuk endpoint mentah.
