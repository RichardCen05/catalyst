# Catalyst

Catalyst adalah prototipe pemeriksa perubahan saham untuk investor IDX yang berfokus pada peristiwa. Cakupan awalnya enam emiten komoditas pada sektor nikel, timah, gas, dan batu bara. Harga komoditas, rupiah, cuaca, produksi, dan regulasi ditelusuri sampai dampaknya pada bisnis.

**Lacak perubahan. Periksa buktinya.**

Semua data pada prototipe berupa data contoh statis. Tidak ada panggilan pasar langsung, LLM, pengambilan web, penjadwalan, login, basis data, atau eksekusi transaksi.

## Jalankan lokal

```bash
pnpm install
pnpm dev
```

Buka `http://localhost:3000`, selesaikan pengaturan dua langkah, lalu ikuti empat tindakan pada tur. Tur hanya maju setelah pengguna memilih perubahan, menetapkan pertanyaan, membuka peta sebab akibat, dan melihat tindakan riset.

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
- `NewsProvider`: berita dan keterbukaan Sectors serta data simulasi komoditas, makro, kebijakan, dan cuaca.
- `AgentEngine`: `analyzeCompany`, `mapEventImpact`, `buildCausalGraph`, dan `answerFollowUp`.
- `MemoryStore`: profil, pertanyaan riset, status kasus, hasil kasus, aturan, catatan pengguna, preferensi penyajian, dan atur ulang.
- Jalur API: `POST /api/analyze`, `POST /api/impact`, dan `POST /api/chat`.

Data produksi dapat dipasang kemudian dengan mengganti penyedia data simulasi. Kalkulator, batas keamanan, tipe keluaran, dan antarmuka tidak perlu membaca bentuk data mentah.
