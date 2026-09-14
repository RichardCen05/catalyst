# Catalyst

Catalyst adalah prototype **watchlist change investigator** untuk investor discretionary event-driven IDX dan Sectors Hackathon Track 01. Ia membantu ritual pemeriksaan 10–30 saham setelah perubahan material: apa yang berubah, penjelasan mana yang paling kuat, dampak bisnis apa yang harus terlihat, dan bukti apa yang dapat membatalkannya. Enam emiten memiliki Research Case lengkap (broker summary dan laporan keuangan terekam); dua belas emiten lain tersedia sebagai coverage snapshot harga.

**Lacak perubahan. Periksa buktinya.**

Semua data pada prototype berasal dari **rekaman Sectors API** yang diambil sekali pada 11 September 2026 dan disimpan di `data/sectors/`. Tidak ada panggilan pasar langsung saat runtime, tidak ada LLM wajib, scraping, penjadwalan, login, database, atau eksekusi transaksi.

Harga, volume, IHSG, foreign flow, broker summary, free float, laporan keuangan kuartalan, berita, dan filing semuanya adalah field mentah dari rekaman itu. Beta, return sektor, konsentrasi partisipan, dan robust z dihitung dari data tersebut, bukan diisi tangan. Tipe sumber terekam yang benar-benar ada: `sectors`, `filing`, dan `commodity` (batu bara/emas). Tipe `macro`, `weather`, dan `policy` hanya muncul bila temuan web-watch disetujui reviewer — tidak ada di rekaman dasar. Skor relevansi eksposur adalah heuristik terekam yang didokumentasikan di `scripts/build_market_data.py`, disaring oleh ambang relevansi playbook milik pengguna.

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

- Hari ini menunjukkan perubahan baru, pembanding, alasan material, dan tindakan riset.
- Kasus memisahkan ringkasan, konfirmasi pasar, dampak bisnis, dan tinjauan agar informasi tidak menumpuk.
- Sebab akibat menjadi ruang utama untuk membandingkan penyebab dan menelusuri jalur sampai indikator bisnis.
- Setiap hubungan memiliki eksposur, indikator yang dicari, penjelasan lain, jeda, dan kondisi pembatal.
- Pertanyaan yang belum jelas harus ditentukan fokusnya sebelum rencana analisis dibuat.
- Setiap kasus berakhir pada satu tindakan riset: lanjutkan riset, pantau indikator, atau abaikan pemicu.
- Koreksi pengguna disimpan sebagai hipotesis terbuka. Koreksi tidak langsung mengubah angka atau hasil analisis.
- Pelajaran dari kasus menjadi usulan aturan. Aturan baru dipakai setelah disetujui pengguna.
- Navigasi utama hanya berisi Hari ini, Kasus, Sebab akibat, dan Asisten.

## Pemeriksaan

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Pengujian unit memeriksa kalkulator, sumber, batas bahasa, penyusunan rencana, dampak bisnis, hipotesis, koreksi pengguna, dan cakupan daftar pantau. Playwright memeriksa tur, alur kasus, transparansi rumus, peta sebab akibat, asisten, tema, ukuran layar, serta WCAG A dan AA.

## Interface

- `MarketDataProvider`: daftar emiten, data harian, bukti broker, kepemilikan, dan peristiwa perusahaan.
- `NewsProvider`: berita dan keterbukaan Sectors terekam, plus overlay temuan web-watch yang disetujui reviewer (sumber makro/komoditas/kebijakan/cuaca dari daftar pantauan terverifikasi).
- `AgentEngine`: `analyzeCompany`, `mapEventImpact`, `buildCausalGraph`, dan `answerFollowUp`.
- `MemoryStore`: profil, pertanyaan riset, status kasus, hasil kasus, aturan, catatan pengguna, preferensi penyajian, dan atur ulang.
- Jalur API: `POST /api/analyze`, `POST /api/impact`, dan `POST /api/chat`.

Data live dapat dipasang kemudian dengan mengganti provider rekaman. Kalkulator, gate, tipe output, dan komponen UI tidak perlu membaca bentuk endpoint mentah.
