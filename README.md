# Catalyst

Catalyst adalah prototype **watchlist change investigator** untuk investor discretionary event-driven IDX dan Sectors Hackathon Track 01. Ia membantu ritual pemeriksaan 10–30 saham setelah perubahan material: apa yang berubah, penjelasan mana yang paling kuat, dampak bisnis apa yang harus terlihat, dan bukti apa yang dapat membatalkannya. Enam emiten memiliki Research Case lengkap (broker summary dan laporan keuangan terekam); dua belas emiten lain tersedia sebagai coverage snapshot harga.

**Trace the move. Trust the evidence.**

Semua data pada prototype berasal dari **rekaman Sectors API** yang diambil sekali pada 11 September 2026 dan disimpan di `data/sectors/`. Tidak ada panggilan pasar langsung saat runtime, tidak ada LLM, scraping, penjadwalan, login, database, atau eksekusi transaksi.

Harga, volume, IHSG, foreign flow, broker summary, free float, laporan keuangan kuartalan, berita, dan filing semuanya adalah field mentah dari rekaman itu. Beta, return sektor, konsentrasi partisipan, dan robust z dihitung dari data tersebut, bukan diisi tangan.

## Jalankan lokal

```bash
pnpm install
pnpm dev
```

Untuk memperbarui data dari rekaman di `data/sectors/`:

```bash
python3 scripts/build_market_data.py    # menulis ulang lib/data/market.generated.ts
```

Buka `http://localhost:3000`, selesaikan setup dua langkah, lalu ikuti tur interaktif empat titik. Alur inti berjalan dari perubahan di Today menuju Research Case, causal Impact, dan Copilot dalam konteks case yang sama.

## Model produk

- `Research Case` memuat trigger, mandate, working thesis, priority, lifecycle, empat protokol uji, causal path, kontradiksi, counter-evidence, catatan user, source plan, dan unresolved questions.
- Perubahan mandate menyusun ulang hypothesis tree, source plan, observable contract, clarification gate, dan Business Impact Test yang terlihat di UI.
- Setiap protokol mengungkap klaim, bukti pendukung, bukti penyangkal, kondisi insufficient, pertanyaan berikutnya, formula, input, dan citation metadata.
- `Investor Research Playbook` menyimpan preferred comparables, materiality rules, known exposure, thesis assumptions, trusted sources, dan falsifiers yang ditulis eksplisit oleh user.
- Priority dan ranking menyebutkan Playbook rule yang diterapkan; rule tidak mengubah fakta, formula, atau verdict bukti.
- `Impact` membandingkan beberapa hipotesis terhadap observable yang sama. Setiap causal edge memiliki exposure, expected observable, alternative explanation, lag, confidence basis, invalidation condition, serta implikasi volume, pricing, margin, cash flow, balance sheet, atau valuation.
- `Case Resolution` menyimpan hipotesis akhir, bukti pembatal, asumsi yang salah, dan rule yang boleh digunakan ulang.
- Navigasi utama hanya berisi Today, Research Cases, Impact, dan Copilot. Company universe serta Compare menyatu ke Case picker; correction queue serta resolution memory menyatu ke Research Audit.

## Pemeriksaan

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Unit test memeriksa kalkulator, citation gate, language gate, mandate re-planning, Business Impact Test, competing hypotheses, human insight loop, dan watchlist scoping. Playwright memeriksa tutorial, lifecycle case, Playbook trace, Case Resolution, transparansi formula, komentar koreksi, falsification contract, Copilot kontekstual, Graphite Aubergine theme, breakpoint, serta WCAG A/AA otomatis.

## Interface

- `MarketDataProvider`: company list, daily series, broker evidence, ownership, dan event perusahaan.
- `NewsProvider`: Sectors news/filing serta fixture komoditas, makro, kebijakan, dan cuaca.
- `AgentEngine`: `analyzeCompany`, `mapEventImpact`, `buildCausalGraph`, dan `answerFollowUp`.
- `MemoryStore`: profil, research mandate, case status, Case Resolution, Playbook, catatan user, preferensi penyajian, dan reset.
- Route handler: `POST /api/analyze`, `POST /api/impact`, dan `POST /api/chat`.

Data live dapat dipasang kemudian dengan mengganti provider rekaman. Kalkulator, gate, tipe output, dan komponen UI tidak perlu membaca bentuk endpoint mentah.
