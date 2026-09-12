# Catalyst

Catalyst adalah prototype **watchlist change investigator** untuk Sectors Hackathon Track 01. Ia menjawab tiga hal: apa yang berubah, mengapa mungkin berubah, dan bukti apa yang dapat membatalkannya. Enam emiten memiliki Research Case lengkap; dua belas emiten lain tetap tersedia sebagai fixture coverage.

**Trace the move. Trust the evidence.**

Semua data pada prototype berupa fixture statis. Tidak ada panggilan pasar langsung, LLM, scraping, penjadwalan, login, database, atau eksekusi transaksi.

## Jalankan lokal

```bash
pnpm install
pnpm dev
```

Buka `http://localhost:3000`, selesaikan setup dua langkah, lalu ikuti tur interaktif lima titik. Alur inti berjalan dari perubahan di Today menuju Research Case, causal Impact, dan Copilot dalam konteks case yang sama.

## Model produk

- `Research Case` memuat trigger, mandate, working thesis, priority, lifecycle, empat protokol uji, causal path, kontradiksi, counter-evidence, catatan user, source plan, dan unresolved questions.
- Setiap protokol mengungkap klaim, bukti pendukung, bukti penyangkal, kondisi insufficient, pertanyaan berikutnya, formula, input, dan citation metadata.
- `Investor Research Playbook` menyimpan preferred comparables, materiality rules, known exposure, thesis assumptions, trusted sources, dan falsifiers yang ditulis eksplisit oleh user.
- Setiap causal edge memiliki exposure, expected observable, alternative explanation, lag, confidence basis, dan invalidation condition.
- Navigasi utama hanya berisi Today, Research Cases, Impact, dan Copilot. Universe, correction queue, Method, tema, dan tur berada di Settings.

## Pemeriksaan

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Unit test memeriksa kalkulator, citation gate, language gate, kontrak Research Case, causal graph, human insight loop, dan watchlist scoping. Playwright memeriksa tutorial, lifecycle case, Playbook persistence, transparansi formula, komentar koreksi, falsification contract, Copilot kontekstual, Graphite Aubergine theme, breakpoint, serta WCAG A/AA otomatis.

## Interface

- `MarketDataProvider`: company list, daily series, broker evidence, ownership, dan event perusahaan.
- `NewsProvider`: Sectors news/filing serta fixture komoditas, makro, kebijakan, dan cuaca.
- `AgentEngine`: `analyzeCompany`, `mapEventImpact`, `buildCausalGraph`, dan `answerFollowUp`.
- `MemoryStore`: profil, research mandate, case status, Playbook, catatan user, preferensi penyajian, dan reset.
- Route handler: `POST /api/analyze`, `POST /api/impact`, dan `POST /api/chat`.

Data produksi dapat dipasang kemudian dengan mengganti provider fixture. Kalkulator, gate, tipe output, dan komponen UI tidak perlu membaca bentuk endpoint mentah.
