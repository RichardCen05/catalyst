# Catalyst — Transparansi Analisis dan Endpoint Sumber

Dokumen ini mencatat output analisis yang dapat diaudit, lokasi UI untuk mengeceknya, endpoint API aplikasi, endpoint Sectors, dan sumber eksternal yang dipantau.

## 1. Endpoint UI

Base URL lokal:

```text
http://localhost:3000
```

Ganti `ANTM` dengan ticker yang tersedia.

### Analisis empat pilar

```text
/cases/ANTM?tab=market&pillar=concentration
/cases/ANTM?tab=market&pillar=volume
/cases/ANTM?tab=market&pillar=momentum
/cases/ANTM?tab=business
```

Output yang ditampilkan:

- Rumus.
- Substitusi data.
- Hasil perhitungan.
- Status analisis.
- Bukti pendukung.
- Bukti penyangkal.
- Batasan analisis.
- Data sumber.

Komponen: [`components/evidence-card.tsx`](../components/evidence-card.tsx).

### Audit analisis

```text
/cases/ANTM?tab=review
```

Output yang ditampilkan:

- Hipotesis yang diuji.
- Status hipotesis.
- Jumlah sumber terhubung.
- Bukti yang belum tersedia.
- Konflik bukti.
- Pertanyaan lanjutan.

Komponen: [`components/analysis-audit.tsx`](../components/analysis-audit.tsx).

### Data bisnis dan keuangan

```text
/cases/ANTM?tab=business
```

Output yang ditampilkan:

- Volume operasi.
- Harga realisasi.
- Margin.
- Arus kas.
- Neraca.
- Valuasi.
- Periode data.
- Interpretasi data.
- Sumber finansial.

### Peta sebab-akibat

```text
/impact?company=ANTM
```

Output yang ditampilkan:

- Sumber pemicu.
- Mekanisme.
- Emiten terdampak.
- Dampak bisnis.
- Jalur eksposur.
- Relevansi.
- Confidence.
- Lag atau jeda dampak.
- Bukti penyangkal.
- Kondisi pembatal.
- Hyperlink sumber.

Komponen: [`components/causal-chain.tsx`](../components/causal-chain.tsx).

### Sumber dan hyperlink

Pada halaman kasus, klik tombol `Sumber`, `Periksa sumber`, atau `Periksa data sumber`.

Informasi yang ditampilkan:

- Provider.
- Endpoint.
- Field.
- Waktu sumber.
- Isi berita jika tersedia.
- Hyperlink dokumentasi atau artikel asal.

Komponen: [`components/citation-dialog.tsx`](../components/citation-dialog.tsx).

## 2. Output transparansi pada API aplikasi

### Analisis perusahaan

```http
POST /api/analyze
```

Field transparansi utama pada response:

```text
analysis.pillars[].calculation
analysis.pillars[].metrics[].citations
analysis.pillars[].protocol
analysis.sources
analysis.hypotheses
analysis.financialContext
analysis.missingEvidence
```

Implementasi: [`app/api/analyze/route.ts`](../app/api/analyze/route.ts).

### Causal graph

```http
POST /api/causal-graph
```

Field transparansi utama pada response:

```text
graph.nodes
graph.edges
graph.edges[].exposure
graph.edges[].confidence
graph.edges[].lag
graph.edges[].alternativeExplanation
graph.edges[].falsificationCondition
graph.edges[].citations
```

Implementasi: [`app/api/causal-graph/route.ts`](../app/api/causal-graph/route.ts).

### Jawaban asisten

```http
POST /api/chat
```

Field transparansi utama pada response:

```text
answer.text
answer.hypotheses
answer.citations
answer.relatedSymbols
```

Implementasi: [`app/api/chat/route.ts`](../app/api/chat/route.ts).

### Web-watch eksternal

```http
GET /api/web-watch
```

Field transparansi utama pada response:

```text
sources
pending
accepted
decidedCount
symbols
bands
```

Endpoint ini menampilkan kesehatan sumber, berita yang menunggu review, berita yang sudah diterima, dan pemetaan berita ke emiten.

Implementasi: [`app/api/web-watch/route.ts`](../app/api/web-watch/route.ts).

## 3. Endpoint Sectors

Endpoint live Sectors membutuhkan API key. Prototype saat ini terutama memakai rekaman data Sectors.

| Data | Endpoint |
|---|---|
| Harga dan volume | `https://api.sectors.app/v2/daily/ANTM/` |
| Ringkasan broker | `https://api.sectors.app/v2/broker-summary/ANTM/` |
| Daftar broker | `https://api.sectors.app/v2/brokers/` |
| Foreign flow | `https://api.sectors.app/v2/foreign-flow/ANTM/` |
| Kepemilikan/free float | `https://api.sectors.app/v2/company/report/ANTM/?sections=ownership` |
| IHSG | `https://api.sectors.app/v2/index-daily/ihsg/` |
| Finansial kuartalan | `https://api.sectors.app/v2/financials/quarterly/ANTM/` |
| Berita | `https://api.sectors.app/v2/news/` |
| Filing/keterbukaan | `https://api.sectors.app/v2/filings/` |
| Aksi korporasi | `https://api.sectors.app/v2/corporate-actions/ANTM/` |
| Komoditas | `https://api.sectors.app/v2/mining-commodities/` |
| Ringkasan pasar | `https://api.sectors.app/v2/close/` |

Registry citation: [`lib/data/fixtures.ts`](../lib/data/fixtures.ts).

## 4. Endpoint refresh Sectors di aplikasi

### Cek status refresh

```http
GET /api/settings/refresh
```

Menampilkan status refresh, rencana request, estimasi biaya, dan budget harian.

### Dry-run atau menjalankan refresh

```http
POST /api/settings/refresh
```

Body dry-run:

```json
{
  "run": true,
  "dryRun": true,
  "symbols": ["ANTM"]
}
```

Refresh live dibatasi oleh feature flag, API key, budget harian, cache, dan rate limit.

Implementasi: [`app/api/settings/refresh/route.ts`](../app/api/settings/refresh/route.ts) dan [`lib/data/sectors-refresh.ts`](../lib/data/sectors-refresh.ts).

## 5. Sumber eksternal web-watch

Sumber aktif:

```text
https://www.cnbcindonesia.com/market/rss
https://www.cnbcindonesia.com/news/rss
https://www.katadata.co.id/rss
https://www.eia.gov/rss/todayinenergy.xml
https://www.ojk.go.id/id/berita-dan-kegiatan/siaran-pers/
https://www.bi.go.id/id/publikasi/ruang-media/news-release/
https://www.esdm.go.id/id/media-center/arsip-berita
https://gapki.id/
https://www.bmkg.go.id/cuaca/peringatan-dini-cuaca
https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json
```

Daftar lengkap dan status aktif/nonaktif: [`lib/web-watch/seeds.ts`](../lib/web-watch/seeds.ts).

Alur external web-watch:

1. Sumber dibaca melalui RSS, listing, dokumen, atau JSON.
2. Sistem membandingkan `ETag`, `Last-Modified`, atau text hash.
3. Perubahan menjadi kandidat berita.
4. Kandidat masuk antrean `pending`.
5. Reviewer memetakan emiten, arah dampak, relevansi, dan jalur eksposur.
6. Berita yang diterima masuk ke analisis melalui overlay.

Berita eksternal tidak langsung mengubah kesimpulan analisis.

### Apakah hyperlink membutuhkan scraping?

Tidak selalu. Urutan pengambilan sumber yang disarankan:

1. RSS resmi.
2. API resmi.
3. Halaman listing resmi.
4. Scraping halaman artikel sebagai fallback.

RSS atau API biasanya sudah menyediakan `title`, `link`, `publishedAt`, dan metadata sumber. Sistem dapat menyimpan link artikel tanpa menyalin seluruh artikel.

Scraping halaman artikel hanya dipakai jika RSS atau API tidak tersedia. Implementasi harus mempertimbangkan Terms of Service, lisensi konten, `robots.txt`, rate limit, dan larangan redistribusi isi artikel.

### Alur berita eksternal

```text
RSS/API/listing/dokumen
        |
        v
Fetch dan normalisasi
        |
        v
Bandingkan ETag, Last-Modified, atau text hash
        |
        v
Kandidat berita dengan source URL
        |
        v
pending review
        |
        v
Reviewer memetakan emiten, arah, relevansi, dan jalur eksposur
        |
        v
accepted overlay
        |
        v
Masuk analisis Catalyst
```

Berita eksternal tidak langsung mengubah hasil analisis. Berita harus diterima reviewer lebih dahulu.

### Jadwal pengecekan

Sumber tidak semuanya diperiksa tepat satu kali per hari:

- CNBC Indonesia: setiap 12 jam.
- BMKG: setiap 12 jam.
- Katadata, EIA, OJK, BI, ESDM, dan GAPKI: setiap 24 jam.
- Scheduler utama: hari kerja sekitar 17:30 WIB.
- Sumber yang belum jatuh tempo tidak diambil ulang.
- Membuka halaman aplikasi tidak memulai scraping.

Sistem memakai conditional request dan text hash untuk mengurangi fetch berulang.

### Sumber Sectors dan eksternal

Catalyst menggabungkan dua jalur sumber:

1. **Sectors** untuk data pasar terstruktur, berita, filing, dan corporate actions.
2. **Eksternal** untuk berita makro, kebijakan, komoditas, cuaca, dan konteks rantai pasok.

Pada prototype:

- News dan filing Sectors terutama berasal dari rekaman data.
- Berita eksternal masuk melalui web-watch setelah review.
- Refresh live Sectors saat ini dibatasi pada broker summary dan foreign flow untuk simbol yang sudah direkam.
- Refresh live tidak otomatis memperbarui seluruh news dan filing Sectors.

Endpoint pengecekan web-watch:

```http
GET /api/web-watch
```

UI pengecekan:

```text
/pantau
```

Endpoint sumber eksternal dan status pending/accepted dikembalikan oleh `/api/web-watch`.

## 6. Rumus yang saat ini transparan

### Konsentrasi

```text
HHI = Σ sᵢ²
Peserta efektif = 1 / HHI
Saham publik terserap = total nilai akumulasi / (saham publik × harga referensi)
```

### Volume

```text
robust z = 0,6745 × (Vₜ − median(Vₙ)) / MAD(Vₙ)
```

Ambang default:

```text
Elevated >= 2,5
Extreme >= 5,0
```

### Momentum

```text
residual 3 hari = return saham 3 hari − beta × return IHSG 3 hari
```

### Katalis

Katalis memakai aturan keputusan, bukan skor sentimen tersembunyi:

```text
status = sumber tersedia
       + eksposur tersedia
       + waktu diperiksa
       + jalur sebab-akibat dapat diuji
```

Implementasi rumus: [`lib/agent/metrics.ts`](../lib/agent/metrics.ts).

## 7. Catatan status prototype

- Data analisis saat ini berasal dari rekaman Sectors.
- Endpoint `/api/analyze` dan `/api/causal-graph` mengembalikan `mode: recorded`.
- Refresh live Sectors default nonaktif.
- Jalur refresh live saat ini dibatasi pada data broker dan foreign flow untuk simbol yang sudah direkam.
- Berita eksternal masuk analisis setelah review.
- Hyperlink artikel hanya tersedia jika record memiliki URL sumber asal.
- Jika URL asal tidak tersedia, aplikasi menampilkan metadata endpoint atau dokumentasi, bukan hyperlink palsu.

## 8. Bentuk hasil transparansi lainnya

Selain rumus, paragraf penjelas, dan hyperlink, hasil transparansi dapat berisi:

### Input data

- Nama field.
- Nilai mentah.
- Unit nilai.
- Tanggal data.
- Periode observasi.
- Ticker yang dianalisis.
- Sektor dan subsektor.
- Peer atau pembanding yang dipakai.

### Transformasi data

- Filter data.
- Konversi unit atau mata uang.
- Median dan MAD.
- Perhitungan beta.
- Pembulatan angka.
- Penanganan data kosong.
- Alasan data tertentu tidak dipakai.

### Threshold dan aturan

- Nilai ambang.
- Nama aturan.
- Dampak aturan terhadap hasil.
- Aturan dari playbook pengguna.
- Perubahan aturan dari default.

### Confidence dan ketidakpastian

- Confidence hasil.
- Relevance score atau band.
- Jumlah sumber pendukung.
- Kualitas sumber.
- Periode lag dampak.
- Data yang belum cukup untuk menyimpulkan.

### Konflik dan alternatif

- Bukti pendukung.
- Bukti penyangkal.
- Konflik antar-sumber.
- Penjelasan alternatif.
- Kondisi yang membatalkan hipotesis.
- Pertanyaan riset berikutnya.

### Provenance dan freshness

- Provider.
- Endpoint.
- Field.
- URL sumber.
- Waktu publikasi.
- Waktu data diambil.
- Status `recorded`, `cache`, atau `live`.
- Versi model dan kalkulator.
- ID atau hash snapshot data.

### Audit dan reproducibility

- Waktu analisis.
- Input request.
- Output terstruktur.
- Keputusan reviewer.
- Alasan accept atau dismiss.
- Tombol lihat JSON.
- Export audit.
- Kemampuan menjalankan ulang analisis dengan data yang sama.

### Sensitivity atau what-if

Pengguna dapat melihat apakah status berubah ketika:

- Ambang volume berubah.
- Periode analisis berubah.
- Peer pembanding berubah.
- Sumber tertentu dikeluarkan.
- Data baru masuk.

## 9. Status transparansi pada project

### Sudah tersedia

- Rumus dan substitusi angka.
- Paragraf ringkasan analisis.
- Hyperlink sumber.
- Endpoint dan field sumber.
- Bukti pendukung dan penyangkal.
- Data keuangan yang dipakai.
- Jalur eksposur.
- Confidence, relevance, dan lag.
- Kondisi pembatal.
- Missing evidence.
- Audit hipotesis.
- Review berita eksternal.

### Sebagian tersedia

- Source span atau highlight kalimat sumber.
- Metadata record berita.
- Data input mentah per klaim.
- Status cache atau live pada seluruh output.

### Belum tersedia sebagai fitur lengkap

- Export audit JSON dari UI.
- Sensitivity atau what-if analysis.
- Versi kalkulator dan model pada setiap hasil.
- Hash snapshot untuk menjalankan ulang hasil secara identik.
- Coverage score otomatis per klaim.

Format output transparansi yang disarankan:

```text
Hasil
Cara dihitung
Input data
Bukti sumber
Aturan yang dipakai
Konflik dan ketidakpastian
Batasan
Kondisi pembatal
Tindakan berikutnya
```

Transparansi tidak perlu menampilkan chain-of-thought internal model. Cukup tampilkan alasan terstruktur yang dapat diverifikasi dari data dan sumber.
