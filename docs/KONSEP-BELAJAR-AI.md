# Bagaimana Catalyst Belajar

Dokumen ini menjelaskan konsep "AI yang belajar" di Catalyst untuk pembaca yang
belum familiar dengan istilah pasar saham. Tidak ada rumus yang perlu dihafal.

**Status dokumen:** Lapis 1 dan Lapis 2 berjalan penuh. Lapis 3 berjalan separuh —
Catalyst sudah membuat klaim dan menagihnya ke data harga (lihat halaman AI Learning,
bagian "Prediksi yang ditagih ke pasar"), tetapi belum mengoreksi dirinya sendiri secara
otomatis. Batas itu ditandai jelas di bagian Lapis 3 supaya tidak ada yang mengira
Catalyst sudah memperbaiki dirinya sendiri.

---

## Kamus singkat

Beberapa istilah yang muncul di dokumen ini:

| Istilah | Artinya dalam bahasa sehari-hari |
|---|---|
| **Emiten / ticker** | Perusahaan yang sahamnya diperdagangkan. Ditulis 4 huruf: ANTM, BBCA, GOTO. |
| **Volume** | Berapa banyak lembar saham berpindah tangan hari itu. Ramai atau sepi. |
| **Sesi** | Satu hari bursa buka. Sabtu, Minggu, dan libur tidak dihitung. |
| **Katalis** | Peristiwa yang berpotensi menggerakkan saham — berita, laporan keuangan, perubahan harga komoditas. |
| **Material** | Cukup penting untuk mengubah gambaran. Lawan dari "cuma ramai sesaat". |
| **IHSG** | Indeks gabungan seluruh bursa Indonesia. Dipakai sebagai patokan "pasar lagi bagaimana". |

---

## Apa artinya "AI belajar"?

Banyak orang membayangkan AI belajar seperti manusia: baca banyak, lalu makin pintar
sendiri. Untuk aplikasi seperti Catalyst, artinya jauh lebih spesifik:

> **AI belajar = perilakunya berubah karena ada informasi baru yang masuk.**

Kalau tidak ada yang berubah, itu bukan belajar. Itu cuma mengingat.

Pertanyaan berikutnya: informasi barunya dari mana? Ternyata ada tiga sumber yang
berbeda, dan ketiganya mengajarkan hal yang berbeda pula. Itulah tiga lapis di
dokumen ini.

---

## Kenapa Catalyst tidak bisa belajar seperti robot trading

Ini pertanyaan yang wajar: bukankah AI saham biasanya belajar dari untung-rugi?

Benar — tapi itu hanya bisa kalau AI-nya **membeli saham**. Robot trading membuka
posisi, lalu untung atau rugi, lalu dia tahu keputusannya bagus atau buruk. Uang yang
jadi nilainya.

**Catalyst tidak membeli apa-apa.** Catalyst adalah alat riset: dia membaca berita,
memeriksa apakah pasar bereaksi, dan menjelaskan alur sebab-akibatnya. Tidak ada
posisi, tidak ada untung-rugi, jadi tidak ada nilai dari uang.

Kelihatannya seperti kelemahan. Sebenarnya tidak — Catalyst punya tiga sumber lain
yang tidak dimiliki robot trading, dan salah satunya justru lebih bersih daripada
untung-rugi. Penjelasannya di Lapis 3.

---

## Tiga lapis belajar — gambaran cepat

| | Yang dipelajari | Gurunya siapa | Sudah jalan? |
|---|---|---|---|
| **Lapis 1** | Apa yang kamu pedulikan | Kamu (lewat tombol suka/tidak suka) | Ya |
| **Lapis 2** | Aturan main versimu | Kamu (lewat koreksi tertulis) | Ya |
| **Lapis 3** | Seberapa sering tebakan Catalyst tepat | **Pasar, otomatis** | Separuh — mengukur, belum mengoreksi |

Perbedaan terpenting ada di kolom "gurunya siapa". Dua lapis pertama mustahil tanpa
kamu. Lapis ketiga berjalan sendiri walau kamu tidak membuka aplikasi.

---

## Lapis 1 — Belajar apa yang kamu pedulikan

### Analoginya

Barista langganan. Setelah beberapa kali, dia tahu kamu suka kopi tidak terlalu manis.
Dia tidak jadi ahli kopi karena itu — dia cuma hafal seleramu. Dan seleramu tidak bisa
salah. Tidak ada yang bisa bilang "selera kamu keliru".

### Di Catalyst

Setiap kartu bukti punya tombol sederhana:

- **Bukti ini berguna** / **Bukti ini kurang relevan**
- **Minta analisis lebih dalam** / **Minta analisis lebih ringkas**

Setiap klik tersimpan. Berikutnya, kasus yang mirip naik atau turun di daftar
prioritas — yang kamu anggap berguna muncul lebih dulu.

### Contoh

Kamu tiga kali menandai analisis volume sebagai "kurang relevan" untuk saham perbankan.
Catalyst menurunkan prioritas kartu volume perbankan di halaman Hari Ini. Kartu itu
tetap ada dan tetap bisa dibuka — cuma tidak lagi muncul paling atas.

### Yang berubah dan yang tidak

| Berubah | Tidak berubah |
|---|---|
| Urutan kasus di daftar | Angka volume, harga, arus dana |
| Panjang-pendek penjelasan | Isi berita |
| Apa yang muncul duluan | Kesimpulan analisis |

Ini penting: **Lapis 1 mengatur rak, bukan isi barangnya.** Catalyst tidak akan
mengubah fakta karena kamu tidak suka fakta itu.

### Di kode

`FeedbackEvent` → `LearnedPreference` → `feedbackRankDelta()` di `lib/learning.ts`.

---

## Lapis 2 — Belajar aturan main versimu

### Analoginya

Asisten baru di kantor. Hari pertama dia membawakan semua email ke mejamu. Kamu bilang:
"Kalau pengirimnya vendor dan nilainya di bawah 10 juta, tidak usah — langsung teruskan
ke finance." Sekarang dia punya aturan. Aturan itu bukan fakta tentang dunia — itu cara
kerja yang kamu tetapkan.

### Di Catalyst

Saat kamu tidak setuju dengan penilaian Catalyst, kamu bisa menulis koreksi. Tiga jenis:

1. **Koreksi data** — "angka ini salah / sumbernya keliru"
2. **Konteks belum masuk** — "kamu belum tahu bahwa perusahaan ini sudah hedging"
3. **Interpretasi alternatif** — "kenaikan ini bukan karena berita itu, tapi karena
   rebalancing indeks"

Kalau kasusnya kemudian ditutup dengan kesimpulan, Catalyst membuat **usulan aturan** —
kalimat yang bisa dipakai ulang di kasus berikutnya. Kamu yang memutuskan: terima atau
tolak.

### Contoh

Kamu menutup kasus ANTM dengan catatan: *"Kenaikan harga nikel global baru berdampak
ke ANTM kalau bertahan di atas 2 minggu. Lonjakan sehari tidak material."*

Catalyst mengusulkan aturan:
`[Disetujui ANTM] Kenaikan nikel < 2 minggu tidak dianggap material.`

Kamu klik terima. Aturan masuk ke **Playbook**. Analisis ANTM berikutnya memakai aturan
itu, dan di panel audit kamu bisa lihat aturan mana saja yang ikut menentukan hasil.

### Hal penting: kamu berwenang atas "penting", bukan atas "fakta"

Ini batas yang dijaga ketat di aplikasi.

- Kamu boleh bilang "berita ini tidak penting buat saya" → Catalyst menurut.
- Kamu **tidak** bisa bilang "volume kemarin bukan 5 juta lot" → angka itu datang dari
  sumber data, dan tetap begitu sampai sumbernya yang berubah.

Makanya catatan koreksi disimpan sebagai **hipotesis terbuka**, bukan fakta baru. Di
aplikasi tertulis: *"Catatan pengguna tidak menjadi fakta pasar sampai sumber
memverifikasinya."*

Kenapa seketat itu? Karena kalau aplikasi mau menulis ulang data mengikuti maunya
pengguna, seluruh gunanya hilang. Yang tersisa cuma cermin.

### Di kode

`UserInsight` / `CaseResolution` → `RuleProposal` → `playbook` → `compilePlaybook()`
di `lib/agent/engine.ts`.

---

## Lapis 3 — Belajar dari pasar, tanpa kamu

> **Sudah berjalan separuh.** Bagian mengukurnya hidup: buka halaman AI Learning dan
> gulir ke "Prediksi yang ditagih ke pasar". Bagian mengoreksinya belum — usulan
> perubahan ditampilkan, tetapi tidak pernah diterapkan sendiri.

Ini bagian yang paling menarik, dan paling sering disalahpahami.

### Analoginya: ramalan cuaca

BMKG bilang: *"Besok 70% kemungkinan hujan di Jakarta."*

Besok tiba. Hujan atau tidak. **Tidak ada yang perlu menilai.** Langitnya yang menjawab.

Dan setelah ratusan ramalan, ada hal yang bisa dihitung: dari semua hari yang mereka
bilang "70%", berapa persen yang benar-benar hujan? Kalau ternyata cuma 45%, berarti
ramalannya terlalu percaya diri, dan angkanya perlu dikoreksi.

BMKG tidak butuh ada orang yang komplain untuk tahu itu. Cukup dua hal:

1. Mereka **menyebut angka lebih dulu**, sebelum tahu jawabannya
2. Jawabannya **datang sendiri** keesokan harinya

Catalyst punya dua-duanya.

### Kenapa Catalyst punya bahan yang sama

**Bahan pertama — Catalyst sudah menyebut angka di depan.** Setiap analisis
mengandung pernyataan yang bisa meleset, misalnya:

- "Volume dianggap tidak wajar kalau melampaui ambang tertentu"
- "Berita perusahaan biasanya berdampak dalam 0–3 sesi"
- "Berita suku bunga biasanya berdampak dalam 5–20 sesi"

Angka-angka itu nyata ada di dalam program. Dan semuanya bisa salah.

**Bahan kedua — jawabannya datang gratis.** Bursa tetap buka besok. Volume 19 Agustus
tetap tercatat, entah ada yang membuka aplikasi atau tidak.

Jadi Catalyst bisa mencatat tebakannya hari ini, lalu memeriksanya sendiri dua minggu
lagi. Tidak perlu membeli saham. Tidak perlu ada yang mengoreksi.

### Alurnya, hari demi hari

**18 Agustus — Catalyst mencatat tebakan.**

Ada berita perusahaan soal ANTM. Catalyst menganalisis seperti biasa. Diam-diam, dia
juga menyimpan satu catatan:

```
ANTM · volume akan melampaui ambang · dalam 1–10 sesi ke depan
dicatat: 18 Agustus · belum ada hasil
```

Saat ini belum ada yang tahu benar atau salah. Termasuk Catalyst.

**19 Agustus – 2 September — tidak ada yang dikerjakan.**

Sepuluh sesi berlalu. Volume tercatat apa adanya.

**2 September — waktunya menagih.**

Jendela sudah penuh. Catalyst memeriksa: apakah volume ANTM benar melampaui ambang
dalam 10 sesi itu?

Ternyata baru terjadi di sesi ke-12, yaitu 4 September. Hasilnya dicatat: **terlambat**
— arahnya benar, tapi jendela waktunya kependekan.

Tidak ada manusia yang terlibat di langkah ini. Yang memutuskan adalah data volume.

**Setelah 20 kejadian serupa terkumpul.**

Baru di sini terjadi belajar. Satu kejadian tidak berarti apa-apa — bisa kebetulan.
Dua puluh kejadian membentuk pola: ternyata untuk berita perusahaan, dampaknya rata-rata
baru terlihat di sesi ke-7, bukan 0–3 seperti yang ditebak di awal.

Angka 0–3 diganti. Analisis berikutnya memakai jendela yang benar.

### Dari mana "pengetahuan baru"-nya muncul?

Bukan sihir. Jawabannya begini:

Program Catalyst berisi sejumlah **angka yang ditebak** — batas volume wajar, berapa
lama berita butuh waktu untuk terasa, berapa besar konsentrasi pembeli baru dianggap
tidak normal. Angka-angka ini punya nilai yang benar di dunia nyata, tapi belum ada
yang tahu berapa. Jadi diisi tebakan awal.

Setiap tebakan yang ditagih hasilnya = satu pengukuran. Dua puluh pengukuran = perkiraan
yang lumayan. Perkiraan menggantikan tebakan.

Itu saja sumbernya: **selisih antara tebakan dan kenyataan menjadi terukur, begitu
Catalyst mau menyebut angka di depan dan mau ditagih.**

### Yang paling pantas dinilai: skor "seberapa berpengaruh"

Catalyst memberi setiap berita sebuah skor pengaruh terhadap emiten tertentu, 0–100.
Skor ini menentukan apakah berita naik ke prioritas tinggi atau tidak.

Hari ini skornya berasal dari firasat — pengumuman resmi otomatis dapat skor tinggi,
berita media dapat skor lebih rendah, mengikuti pola yang ditetapkan di awal. **Belum
pernah ada yang mengecek apakah pola itu benar.**

Dengan Lapis 3, pertanyaannya bisa dijawab dengan angka:

```
berita skor tinggi  →  31% diikuti gerak harga di luar kebiasaan   (dari 64 kejadian)
berita skor sedang  →  24%                                          (dari 41 kejadian)
berita skor rendah  →  22%                                          (dari 28 kejadian)
```

*(angka di atas ilustrasi. Angka sungguhan ada di halaman AI Learning — dan saat
dokumen ini ditulis, sebagian besar kelompok masih berstatus "belum cukup bukti",
karena rekaman yang tersedia hanya mencakup beberapa minggu.)*

Kalau hasilnya benar-benar seperti itu, artinya skor tinggi dan skor rendah nyaris tidak
berbeda — pembedanya tidak bekerja, dan itu temuan penting. Kalau ternyata berbeda tajam,
skornya terbukti berguna dan sekarang ada buktinya.

Dua-duanya hasil yang berharga. Yang tidak berharga adalah keadaan sekarang: tidak tahu.

---

## Batasnya — yang tidak akan dipelajari Catalyst

Bagian ini sama pentingnya dengan bagian sebelumnya. Alat yang jujur tentang batasnya
lebih bisa dipercaya daripada alat yang mengaku bisa segalanya.

### 1. Catalyst tidak bisa membuktikan sebab-akibat

Kalau harga naik setelah berita, Catalyst hanya boleh bilang **"naik setelahnya"**,
bukan **"naik karena itu"**.

Kenapa? Untuk membuktikan sebab, kita perlu membandingkan dengan dunia yang sama persis
tapi tanpa berita itu. Dunia seperti itu tidak ada. Yang bisa dilakukan cuma menghitung
seberapa sering keduanya berbarengan.

Catalyst sudah menerapkan aturan ini: di bagian pemeriksaan jeda waktu tertulis bahwa
pemeriksaan itu hanya menguji kemasukakalan waktu, bukan membuktikan sebab.

### 2. Belajarnya per jenis berita, bukan per berita

Satu berita = satu kejadian = tidak ada pola. Belajar butuh pengulangan, jadi kejadian
dikelompokkan: berita perusahaan, berita komoditas, berita sentimen, dan seterusnya.

Konsekuensinya: jenis berita yang jarang muncul tidak akan pernah punya cukup data. Itu
bukan kegagalan — statusnya ditulis apa adanya: **"belum cukup bukti"**.

### 3. Angka dari sedikit kejadian tidak dipakai

Kalau baru ada 3 kejadian dan 2 di antaranya tepat, itu bukan "akurasi 67%". Itu
kebetulan yang menyamar jadi pengetahuan. Aturannya: di bawah 20 kejadian, angkanya
tidak ditampilkan sebagai kesimpulan.

### 4. Yang sudah diukur belum tentu sudah diperbaiki

Lapis 3 saat ini berhenti di mengukur dan mengusulkan. Ambang dan jendela waktu baru
berubah kalau kamu menyetujui usulannya. Itu disengaja: data historis yang tersedia
masih sedikit, dan menyetel angka otomatis ke data sesedikit itu lebih mungkin
menghafal kebetulan daripada menemukan pola.

### 5. Catalyst tidak akan pernah tahu apa yang penting bagimu

Ini selamanya wilayah Lapis 1 dan 2. Tidak ada data pasar yang bisa memberi tahu Catalyst
bahwa kamu lebih peduli perbankan daripada pertambangan. Cuma kamu yang tahu.

### 6. Catalyst tidak memberi saran beli atau jual

Bukan soal belajar — ini batas produk. Catalyst menyusun bukti dan menjelaskan alurnya.
Keputusan transaksi bukan wilayahnya, dan permintaan ke arah itu ditolak aplikasi.

---

## Ringkasan

| | Lapis 1 | Lapis 2 | Lapis 3 |
|---|---|---|---|
| **Nama** | Preferensi | Aturan | Kalibrasi |
| **Sumber** | Klik suka/tidak suka | Koreksi tertulis | Data pasar |
| **Gurunya** | Kamu | Kamu | Waktu |
| **Yang diajarkan** | Apa yang kamu pedulikan | Apa yang kamu anggap material | Seberapa sering Catalyst tepat |
| **Yang berubah** | Urutan prioritas | Aturan di Playbook | Ambang dan jendela waktu |
| **Kunci jawaban ada di** | Kepalamu | Kepalamu | Deret harga & volume |
| **Jalan tanpa kamu?** | Tidak | Tidak | **Ya** |
| **Status** | Jalan | Jalan | Mengukur; koreksi masih usulan |

Dua kalimat penutup:

> **Lapis 1 dan 2 mengajari Catalyst apa yang penting bagimu. Itu selamanya butuh kamu.**
>
> **Lapis 3 mengajari Catalyst seberapa sering tebakannya sendiri tepat. Pengukurannya
> berjalan sendiri, karena pasar menjawabnya setiap sore — tetapi perbaikannya masih
> menunggu persetujuanmu.**

---

## Untuk pembaca teknis

| Konsep | Lokasi di kode |
|---|---|
| Lapis 1 | `lib/learning.ts` — `FeedbackEvent`, `LearnedPreference`, `feedbackRankDelta()` |
| Lapis 2 | `lib/types.ts` — `UserInsight`, `CaseResolution`, `RuleProposal`; diterapkan di `compilePlaybook()` pada `lib/agent/engine.ts` |
| Angka yang ditebak | `lib/agent/thresholds.ts` — `DEFAULT_THRESHOLDS`; beberapa masih hardcode di `lib/agent/metrics.ts` |
| Jeda waktu per kategori | `lib/agent/lag-validate.ts` — `heuristicLagFor()` |
| Skor pengaruh berita | `impactLinks[].relevance` di `lib/types.ts`; diisi di `lib/web-watch/queue.ts` dan `scripts/build_market_data.py` |
| Halaman AI Learning | `app/ai-learning/page.tsx` |
| Lapis 3 — klaim & penilai | `lib/agent/prediction.ts` — `PredictionClaim`, `deriveClaims()`, `resolvePrediction()` |
| Lapis 3 — agregasi | `lib/agent/calibration.ts` — `buildCalibration()`, `MIN_SAMPLE`, `suggestLagWindows()` |
| Lapis 3 — jalannya | `lib/agent/prediction-run.ts` — `runPredictionBacktest()` |
| Lapis 3 — tampilannya | `components/prediction-panel.tsx` |
| Uji kebocoran waktu | `tests/prediction.test.ts` — blok `no look-ahead` |
