# Catalyst

Catalyst adalah prototype **watchlist change investigator** untuk investor discretionary event-driven IDX dan Sectors Hackathon Track 01. Wedge awalnya adalah enam emiten commodity-sensitive—nikel, timah, gas, dan batu bara—karena perubahan harga komoditas, FX, cuaca, produksi, dan regulasi dapat diuji melalui causal contract yang konkret.

**Trace the move. Trust the evidence.**

Semua data pada prototype berupa fixture statis. Tidak ada panggilan pasar langsung, LLM, scraping, penjadwalan, login, database, atau eksekusi transaksi.

## Jalankan lokal

```bash
pnpm install
pnpm dev
```

Buka `http://localhost:3000`, selesaikan setup dua langkah, lalu ikuti tujuh aksi pada guided tour. Spotlight menyorot kontrol nyata dan tur hanya maju setelah user membuka case, menyelesaikan clarification gate, memeriksa Market Confirmation dan Business Transmission, membandingkan hipotesis, lalu membawa konteksnya ke Copilot.

## Model produk

- `Research Case` memuat material-change contract, trigger, mandate, working thesis, priority, lifecycle, dua lapisan bukti, causal path, kontradiksi, counter-evidence, disposition, catatan user, source plan, dan unresolved questions.
- Perubahan mandate menyusun ulang hypothesis tree, source plan, observable contract, clarification gate, dan Business Impact Test yang terlihat di UI.
- Setiap protokol mengungkap klaim, bukti pendukung, bukti penyangkal, kondisi insufficient, pertanyaan berikutnya, formula, input, dan citation metadata.
- `Investor Research Playbook` menyimpan preferred comparables, materiality rules, known exposure, thesis assumptions, trusted sources, dan falsifiers yang ditulis eksplisit oleh user.
- Priority dan ranking menyebutkan Playbook rule yang diterapkan; rule tidak mengubah fakta, formula, atau verdict bukti.
- Tab `Hypotheses` di dalam Research Case membandingkan beberapa penyebab terhadap observable yang sama. Setiap causal edge memiliki exposure, expected observable, alternative explanation, lag, confidence basis, invalidation condition, serta implikasi volume, pricing, margin, cash flow, balance sheet, atau valuation.
- `Case Resolution` menyimpan hipotesis akhir, bukti pembatal, asumsi yang salah, dan rule yang boleh digunakan ulang.
- Navigasi utama hanya berisi Today, Research Cases, dan Copilot. Impact menyatu ke tab Hypotheses; Company universe serta Compare menyatu ke Case picker; correction queue, resolution memory, dan rule proposals menyatu ke Research Audit.
- Clarification gate memblokir plan ketika mandate tidak menyebut outcome bisnis. Agent menawarkan dua interpretasi beserta konsekuensi sumber dan observable sebelum melanjutkan.
- Setiap case berakhir pada Research Disposition: `Escalate research`, `Monitor observable`, atau `Dismiss trigger`, dengan alasan dan kondisi pembuka kembali.
- Case Resolution membuat proposal materiality rule atau falsifier. Proposal tidak pernah mengubah Playbook sampai user menerimanya di Research Audit.

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

Data produksi dapat dipasang kemudian dengan mengganti provider fixture. Kalkulator, gate, tipe output, dan komponen UI tidak perlu membaca bentuk endpoint mentah.
