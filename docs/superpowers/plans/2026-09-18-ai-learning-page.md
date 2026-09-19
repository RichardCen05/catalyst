# AI Learning — Implementation Plan

> **Untuk pelaksana:** kerjakan berurutan. Centang setiap langkah setelah verifikasi. Jangan menambahkan model training, fine-tuning, data vendor, atau dependency baru.

## Tujuan

Tambahkan halaman `/ai-learning` bernama **AI Learning** di sidebar Catalyst. Halaman menjawab tiga pertanyaan dengan bukti yang dapat dibuka:

1. Masukan apa yang diterima Catalyst?
2. Apa yang dipelajari atau diubah dari masukan tersebut?
3. Memori mana yang sedang dipakai, masih menunggu pemeriksaan, dinonaktifkan, atau ditolak?

Contoh alur yang harus terlihat:

```text
Koreksi ANTM: “Kontrak USD dan IDR belum dibedakan”
  → disimpan sebagai hipotesis terbuka
  → dipakai sebagai konteks pemeriksaan ANTM, bukan fakta pasar
  → menunggu diperiksa / sudah diperiksa / diabaikan
```

## Keputusan produk yang mengikat

- “AI Learning” di Catalyst adalah **memori dan personalisasi per pengguna**, bukan pelatihan ulang bobot model. Jangan menyebutnya fine-tuning atau peningkatan akurasi otomatis.
- Data tetap tersimpan di Zustand/localStorage (`catalyst:v1`) dan backup GCS anonim melalui `/api/memory`. Tidak ada akun, sehingga memori tidak lintas perangkat atau lintas browser.
- Pertanyaan Copilot hanya hidup dalam state komponen selama sesi. Pada versi ini, pertanyaan chat **tidak** disimpan dan **tidak** menjadi memori. Tulis batas ini jelas di halaman supaya pengguna tidak mengira setiap chat direkam.
- Fakta pasar, angka, rumus, dan sumber rekaman tidak boleh berubah karena masukan pengguna. Koreksi selalu berstatus hipotesis sampai diverifikasi.
- Usulan aturan dari hasil kasus tidak boleh otomatis berlaku. Hanya `accepted` yang menambah aturan ke `playbook`; `pending` dan `rejected` tidak memengaruhi analisis.
- Jangan membuat event log kedua yang menyimpan salinan data yang sama. Halaman harus memakai selector/view-model turunan dari state yang sudah menjadi sumber kebenaran: `feedback`, `preferences`, `insights`, `caseResolutions`, `ruleProposals`, dan `playbook`.
- Jangan mencampur pengaturan eksplisit dengan pembelajaran. Profil, daftar pantauan, posisi, pembanding, dan teks playbook yang diedit pengguna harus berlabel **Memori eksplisit**; bukan klaim bahwa AI menyimpulkannya sendiri.

## Kondisi awal yang harus dipertahankan

| Sinyal yang ada | Penyimpanan saat ini | Dampak nyata saat ini |
| --- | --- | --- |
| Feedback `useful`, `not-useful`, `show-more`, `show-less` | `feedback` dan `preferences` | Skor prioritas Hari ini membaca `feedback`. `preferences.active` belum membatasi efeknya. |
| Koreksi analisis | `insights` dan preference turunan | Tampil sebagai hipotesis terbuka pada kasus/Copilot; bukan fakta. |
| Hasil kasus | `caseResolutions` | Menjadi rekam hasil; tidak otomatis mengubah aturan. |
| Usulan aturan | `ruleProposals` | Saat `accepted`, ditambahkan ke `playbook.materialityRules` atau `playbook.falsifiers`. |
| Playbook/profil | `playbook`, `profile`, `holdings` | Konteks eksplisit untuk analisis, bukan hasil inferensi. |

Penting: `LearnedPreference` yang dibuat dari koreksi belum dibaca oleh engine. Halaman baru tidak boleh mengklaim preference tersebut “dipakai AI”. Untuk koreksi, sumber memori yang jujur adalah `UserInsight`; untuk feedback, dampak yang jujur adalah peringkat Hari ini.

## Pengalaman pengguna

### Navigasi

- Tambahkan item sidebar setelah `Asisten`: ikon `BrainCircuit`, label **AI Learning**, URL `/ai-learning`.
- Karena sidebar mobile membaca `navItems`, item sama otomatis muncul di navigasi mobile. Pastikan label masih terbaca dan tidak menimbulkan overflow pada lebar 375 px.
- Tambahkan aksi command palette: **Buka AI Learning** ke `/ai-learning`.
- Jangan menambahkannya ke Settings Drawer; halaman ini adalah fitur utama, bukan utilitas tersembunyi.

### Struktur halaman

Halaman menggunakan `PageHeader`, `Panel`, warna/status badge Catalyst yang ada, dan tidak membutuhkan library baru.

1. Header:
   - eyebrow: `Memori personal`
   - judul: `AI Learning`
   - deskripsi: halaman menjelaskan masukan, proses, dan memori yang dipakai Catalyst.
   - callout batas: “Catalyst tidak melatih ulang model dari data ini. Catatan pengguna tetap hipotesis sampai diperiksa. Pertanyaan chat tidak disimpan sebagai memori.”

2. Ringkasan empat angka:
   - **Masukan tercatat**: jumlah item dari feedback, insights, dan case resolutions.
   - **Menunggu pemeriksaan**: `insights.status === "pending"` ditambah `ruleProposals.status === "pending"`.
   - **Memori dipakai**: feedback yang preference-nya aktif, insight yang tidak `dismissed`, dan rule proposal `accepted`. Tampilkan helper text per jenis; jangan menjumlahkannya sebagai ukuran kualitas.
   - **Memori eksplisit**: jumlah aturan playbook non-kosong ditambah pembanding yang dipilih. Label harus menjelaskan bahwa item ini ditulis pengguna.

3. Panel **Riwayat masukan**:
   - Filter: `Semua`, `Feedback`, `Koreksi`, `Hasil kasus`.
   - Urutkan terbaru dulu dengan `createdAt`/`resolvedAt` yang sudah ada.
   - Setiap baris menampilkan jenis masukan, ticker bila ada, ringkasan masukan, waktu, dan status proses.
   - Klik baris membuka detail inline yang keyboard-accessible (`button` dengan `aria-expanded`), bukan modal bertumpuk.
   - State kosong menjelaskan cara membuat koreksi dari tab Tinjau pada suatu kasus dan cara memberi feedback dari kartu bukti.

4. Detail **Apa yang dipelajari** pada item yang dipilih:
   - Tampilkan teks masukan asli, tetapi hanya untuk data yang memang telah disimpan pengguna.
   - Tampilkan proses sebagai daftar tahap bernomor dan status tahap saat ini.
   - Tampilkan dampak spesifik dan tautan konteks:
     - feedback: `/cases/{symbol}` bila ada;
     - koreksi: `/cases/{symbol}?tab=review`;
     - hasil kasus/rule: `/cases/{symbol}?tab=review` dan `/cases?view=audit`.
   - Untuk insight dengan `sourceUrl`, gunakan link HTTPS yang sudah divalidasi saat input. Jangan preview, fetch, atau merangkum URL tersebut.

5. Panel **Memori aktif dan terjaga**:
   - Kelompokkan: `Feedback untuk prioritas`, `Hipotesis pengguna`, `Aturan yang disetujui`, `Memori eksplisit`.
   - Setiap item harus memiliki badge yang membedakan `dipakai`, `menunggu`, `dinonaktifkan`, `ditolak`, dan `eksplisit`.
   - `pending` insight ditulis “dipakai sebagai hipotesis terbuka”, bukan “dipercaya AI”.
   - Tampilkan tombol navigasi **Kelola koreksi dan usulan** ke `/cases?view=audit` serta **Edit aturan eksplisit** ke `/playbook`. Jangan menduplikasi workflow menerima/menolak/menghapus pada versi pertama.
   - Di bagian bawah, jelaskan lokasi memori: “Tersimpan di peramban ini dan dicadangkan ke GCS bila layanan tersedia. Hapus data browser atau cookie dapat menghilangkan/mereset memori.” Jangan menjanjikan sinkron lintas perangkat.

### Status dan proses yang harus ditampilkan

| Jenis | Tahap | Status akhir pada UI | Dampak yang boleh diklaim |
| --- | --- | --- | --- |
| Feedback | masukan dicatat → preference dibuat/diperbarui → preference aktif | `dipakai` atau `dinonaktifkan` | Menambah/mengurangi prioritas kasus sejenis di Hari ini. |
| Koreksi | catatan disimpan → hipotesis terbuka → status review | `menunggu`, `diperiksa`, atau `diabaikan` | Menjadi konteks pertanyaan/pemeriksaan terkait ticker; tidak mengubah fakta atau rumus. |
| Hasil kasus | hasil disimpan → usulan aturan dibuat → keputusan pengguna | `menunggu`, `diterima`, atau `ditolak` | Hanya `diterima` masuk ke materiality rule/falsifier playbook. |
| Playbook/profil | pengguna mengatur → state disimpan | `eksplisit` | Menetapkan konteks riset yang pengguna pilih. Bukan pembelajaran otomatis. |

## Rencana implementasi

### Task 1 — Buat model tampilan pembelajaran yang murni dan dapat diuji

**Buat:** `lib/learning.ts`  
**Buat:** `tests/learning.test.ts`

- [ ] Definisikan type view-model lokal: `LearningKind`, `LearningStatus`, `LearningStep`, `LearningItem`, `MemoryItem`, dan `LearningSnapshot`. Letakkan type domain yang perlu dipakai komponen di `lib/types.ts` hanya bila dipakai lintas modul; jangan menambahkannya ke persisted state.
- [ ] Buat `buildLearningSnapshot(input)` yang menerima hanya field state yang diperlukan: `feedback`, `preferences`, `insights`, `caseResolutions`, `ruleProposals`, dan `playbook`.
- [ ] Normalisasi feedback menjadi satu `LearningItem` per `FeedbackEvent`. Hubungkan preference dengan ID yang sudah ada: `learned-${feedback.id}`. Jika data lama tidak memiliki preference pasangan, tampilkan status `tidak aktif` dan pesan integritas singkat, bukan error/placeholder.
- [ ] Normalisasi insight menjadi satu item per `UserInsight`. Tahapnya berasal dari `createdAt` dan `reviewHistory`; jangan membuat timestamp baru saat membaca data. `pending` dan `incorporated` diberi status memori `hypothesis-active`; `dismissed` diberi `dismissed`.
- [ ] Normalisasi case resolution menjadi satu item per entry `caseResolutions`. Hubungkan proposal dengan `proposal.symbol === symbol` dan `proposal.sourceResolutionAt === resolution.resolvedAt`. Timestamp tersebut dibuat dari variabel ISO yang sama dalam `saveCaseResolution`, sehingga hubungan ini deterministik. Bila proposal hilang, detail harus berkata “hasil kasus tersimpan; belum ada usulan aturan”, bukan mengarang keputusan.
- [ ] Normalisasi `ruleProposals` yang tidak memiliki resolution pasangan sebagai item mandiri agar state lama/parsial tetap dapat diaudit.
- [ ] Bentuk `MemoryItem` dari:
  - feedback hanya bila preference pasangannya aktif;
  - insight yang tidak `dismissed`;
  - rule proposal `accepted`;
  - semua entri playbook sebagai `explicit` tanpa timestamp buatan.
- [ ] Pakai ID stabil dari data asal dan ID aman untuk React key. Jangan memakai index array atau `Date.now()` di selector.
- [ ] Tambahkan formatter tunggal untuk label aksi feedback, status, jenis insight, jenis rule, dan waktu lokal Indonesia. Komponen tidak boleh mempunyai conditional copy yang berbeda-beda.
- [ ] Uji minimal: pengurutan waktu, relasi feedback/preference, setiap tiga status insight, relasi resolution/proposal, accepted vs rejected rule, state data lama tanpa pasangan, dan tidak ada duplikasi ID pada feed gabungan.

### Task 2 — Pastikan semua klaim “dipakai” benar-benar mengubah perilaku

**Ubah:** `lib/store.ts`  
**Ubah:** `app/page.tsx`  
**Ubah:** `lib/agent/engine.ts`, `components/research-case-overview.tsx`  
**Ubah:** `lib/schemas.ts`  
**Ubah:** `app/api/analyze/route.ts`  
**Ubah/tambah test:** `tests/learning.test.ts`, `tests/api.test.ts`

- [ ] Refactor `recordFeedback` agar satu feedback pada target yang sama memperbarui feedback dan preference pasangan, bukan menumpuk preference yang saling bertentangan. Tambahkan field opsional, backward-compatible pada `FeedbackEvent`: `targetId` dan `targetLabel`. Data lama tanpa field ini tetap harus bisa dibaca.
- [ ] Saat feedback baru atau berubah, pertahankan ID feedback lama bila `targetId` sama. Ganti preference dengan ID `learned-${feedback.id}` secara atomik. Buat label aksi yang spesifik: “Tampilkan analisis lebih dalam”, “Tampilkan analisis lebih ringkas”, “Bukti ini berguna”, atau “Kurangi prioritas bukti serupa”.
- [ ] Perbarui `DashboardPage.rank()` agar feedback hanya memengaruhi ranking ketika preference pasangan aktif. Ini membuat toggle yang sudah ada bermakna. Feedback legacy tanpa preference pasangan tetap diperlakukan aktif demi kompatibilitas.
- [ ] Di `buildAnalysis()` (`lib/agent/engine.ts`), isi field `ResearchCase.userNotes` yang sudah ada dengan `relevantInsights(context?.userInsights, symbol)`, bukan array kosong. Jangan menambahkannya ke metrik, citation, materiality, atau kalkulasi apa pun.
- [ ] Ubah `ResearchCaseOverview` agar menampilkan `researchCase.userNotes`, bukan membaca `insights` langsung dari Zustand. Dengan ini halaman kasus dan jalur API menunjukkan sumber konteks yang sama.
- [ ] Tambahkan `userInsights` opsional pada `analyzeRequestSchema` dan teruskan ke `agentEngine.analyzeCompany()` di `app/api/analyze/route.ts`. Hal ini menutup perbedaan antara jalur API dan halaman yang memanggil engine langsung: insight aktif muncul sebagai hipotesis, tidak pernah fakta.
- [ ] Jangan mengubah `relevantInsights`: `pending` dan `incorporated` tetap masuk sebagai hipotesis; `dismissed` dikeluarkan. Copy halaman AI Learning harus mengikuti perilaku ini.
- [ ] Pastikan `setRuleProposalStatus("accepted")` idempoten. Menerima item yang sama tidak boleh menggandakan string `[Disetujui SYMBOL]` di playbook. Jangan mengubah aturan existing yang sudah diterima tanpa aksi eksplisit pengguna.
- [ ] Tambahkan regression test: feedback aktif mengubah ranking dengan arah yang benar; toggle preference mematikan efek ranking; accepted proposal ada persis satu kali pada playbook; rejected proposal tidak ada pada playbook; analisis dengan insight aktif mengisi `userNotes`; request `/api/analyze` dengan insight aktif menghasilkan `userNotes` yang sama.

### Task 3 — Tambahkan sumber feedback yang jelas pada kartu bukti

**Buat:** `components/evidence-feedback.tsx`  
**Ubah:** `components/evidence-card.tsx`  
**Ubah:** `lib/types.ts`, `lib/store.ts`  
**Ubah/tambah test:** `tests/learning.test.ts`, `tests/e2e/ai-learning.spec.ts`

- [ ] Buat komponen client kecil `EvidenceFeedback` dengan dua pilihan eksklusif: **Berguna** dan **Kurang relevan**. Gunakan tombol `aria-pressed`; pilihan aktif dapat diubah, tetapi jangan beri tombol “suka” yang dapat menambah poin berulang kali.
- [ ] Beri setiap kartu bukti ID target stabil `pillar:${symbol}:${pillar.key}` dan label target, misalnya `ANTM · Konsentrasi`. Simpan keduanya pada `FeedbackEvent` melalui field baru Task 2.
- [ ] Pasang komponen di footer `EvidenceCard`, bersebelahan tetapi terpisah secara visual dari aksi “Tanya pilar”. Copy harus menjelaskan efek sempit: “Mempengaruhi urutan pemeriksaan serupa di Hari ini.”
- [ ] Jangan mengirim feedback ke model, API LLM, provider data, atau analytics pihak ketiga.
- [ ] Uji browser: klik Berguna, ubah menjadi Kurang relevan, reload halaman, lalu pastikan hanya satu item feedback muncul di AI Learning dengan label/konteks pilar yang benar.

### Task 4 — Implementasikan halaman AI Learning

**Buat:** `app/ai-learning/page.tsx`  
**Opsional bila file halaman terlalu besar:** `components/ai-learning-workspace.tsx`  
**Ubah:** `components/app-shell.tsx`, `components/command-palette.tsx`

- [ ] Halaman adalah client component karena membaca Zustand. Bungkus bagian yang memakai `useSearchParams()` dalam `Suspense`, mengikuti pola `app/cases/page.tsx`, agar build App Router tetap aman. Ambil state dengan selector sempit, lalu panggil `buildLearningSnapshot`; jangan membuat salinan state lokal yang dapat basi.
- [ ] Gunakan URL query `?filter=all|feedback|insight|resolution&selected=<id>` untuk filter dan detail yang sedang terbuka. Validasi nilainya terhadap union statis; nilai invalid kembali ke `all` dan tanpa detail.
- [ ] Render header, callout batas, ringkasan empat angka, riwayat masukan, detail item terpilih, dan memori aktif sesuai kontrak UX di atas.
- [ ] Saat `selected` menunjuk ID yang tidak ada (misalnya item dihapus dari halaman Audit), tutup detail dan pertahankan filter. Jangan crash atau meninggalkan panel kosong tanpa penjelasan.
- [ ] Terapkan empty state per filter. Filter `Feedback` harus menjelaskan feedback tersedia pada kartu bukti. Filter `Koreksi` harus menautkan ke `/cases`. Filter `Hasil kasus` harus menautkan ke `/cases?view=audit`.
- [ ] Untuk memori eksplisit, ringkas array playbook tanpa menampilkan input kosong. Tampilkan pembanding dalam format `ANTM: INCO · TINS`; tampilkan ambang hanya ketika nilainya berbeda dari default dari `resolveThresholds()`.
- [ ] Semua interaksi harus dapat dipakai keyboard, fokus detail jelas, dan badge tidak boleh menjadi satu-satunya pembeda status. Pastikan teks panjang insight membungkus tanpa horizontal overflow.
- [ ] Tambahkan item `AI Learning` pada `navItems` di `AppShell` dan action pada `actions` di `CommandPalette`. Verifikasi status aktif bekerja untuk `/ai-learning`.

### Task 5 — Dokumentasi, privasi, dan reset

**Ubah:** `app/method/page.tsx`  
**Ubah:** `components/settings-drawer.tsx`  
**Ubah:** `docs/TRANSPARENCY-ENDPOINTS.md` bila dokumen tersebut mencantumkan bentuk `/api/memory`

- [ ] Tambahkan satu kartu atau bagian ringkas di Metode: AI Learning menyimpan feedback, koreksi, hasil kasus, usulan aturan, dan playbook pengguna; tidak melatih ulang model; fakta pasar tidak berubah oleh memori.
- [ ] Tambahkan tautan **AI Learning** ke utility links Settings Drawer sebagai jalur alternatif, dengan deskripsi singkat. Ini tidak menggantikan item sidebar.
- [ ] Audit `resetMemory()`: setelah reset, selector harus mengembalikan feed kosong untuk signal belajar dan hanya memori eksplisit bawaan yang memang dikembalikan oleh `defaultPlaybook`/`basePreferences`. UI harus menjelaskan “Belum ada masukan Anda”, bukan “Tidak ada memori sama sekali”.
- [ ] Jangan mengubah cookie, bucket, environment variable, atau deployment configuration. Memori baru menggunakan state yang sudah disinkronkan oleh `MemorySync`.
- [ ] Jika menambah validasi baru pada `/api/memory`, validasi hanya data bentuk baru/opsional dan jaga snapshot lama tetap dapat dimuat. Jangan memutus fallback localStorage saat GCS tidak tersedia.

### Task 6 — Verifikasi menyeluruh

**Buat/ubah:** `tests/e2e/ai-learning.spec.ts`, `tests/e2e/sweep-extra.spec.ts`

- [ ] Unit: jalankan `pnpm exec vitest run tests/learning.test.ts tests/api.test.ts` saat Task 1–2 selesai.
- [ ] E2E journey baru:
  1. Selesaikan onboarding.
  2. Buka `/cases/ANTM?tab=market` dan pilih **Berguna** pada kartu Konsentrasi.
  3. Buka `/ai-learning`; cek item feedback, target `ANTM · Konsentrasi`, proses tiga tahap, dan status `dipakai`.
  4. Kembali ke kartu, pilih **Kurang relevan**; refresh; cek item sama berubah, bukan duplikat.
  5. Kirim koreksi dari tab Tinjau; buka detailnya; cek teks koreksi, status `menunggu`, dan pernyataan “hipotesis terbuka”.
  6. Simpan hasil kasus yang menghasilkan rule proposal; cek `menunggu`; terima di Audit; cek detail AI Learning berubah menjadi `diterima` dan item muncul pada “Aturan yang disetujui”.
  7. Buka Copilot dan kirim pertanyaan; kembali ke AI Learning; pastikan teks pertanyaan chat tidak muncul.
- [ ] Perbarui route inventory di `tests/e2e/sweep-extra.spec.ts` dengan `/ai-learning` dan heading `AI Learning`.
- [ ] Tambahkan assertion sidebar desktop mencantumkan `AI Learning`. Jangan mempertahankan assertion urutan lama yang mengharapkan tepat lima item.
- [ ] Lakukan manual responsive pass pada 375 px, 768 px, dan 1440 px: sidebar/mobile nav, filter, detail input panjang, state kosong, link kasus, dan tanpa horizontal overflow.
- [ ] Jalankan gate akhir:

  ```bash
  pnpm lint
  pnpm typecheck
  pnpm test
  pnpm test:e2e
  pnpm build
  ```

## Kriteria selesai

- [ ] `/ai-learning` tersedia dari sidebar desktop, navigasi mobile, command palette, dan Settings Drawer.
- [ ] Pengguna dapat membuka satu feedback, koreksi, hasil kasus, atau usulan aturan dan melihat input asli, tahapan proses, status, memori/dampak, serta tautan konteks.
- [ ] Halaman membedakan secara eksplisit feedback aktif, hipotesis belum terbukti, rule pending/accepted/rejected, dan memori eksplisit.
- [ ] Feedback dari kartu bukti hanya satu per target, tersimpan setelah reload, dan preference nonaktif tidak memengaruhi ranking Hari ini.
- [ ] Tidak ada teks yang mengklaim fine-tuning, pelatihan ulang model, peningkatan akurasi otomatis, atau chat disimpan sebagai memori.
- [ ] Tidak ada fakta, angka, rumus, atau sumber pasar yang berubah karena memori pengguna.
- [ ] Semua gate Task 6 hijau. Tidak ada perubahan deploy, env, bucket, atau dependency.

## Di luar cakupan versi ini

- Penyimpanan riwayat percakapan Copilot atau belajar otomatis dari chat.
- Sinkronisasi lintas perangkat, akun pengguna, ekspor/import memori, atau kerja bersama antar pengguna.
- Feedback per sumber eksternal/berita individual di seluruh aplikasi. Versi ini mulai dari kartu pilar dengan target stabil.
- Penghapusan granular feedback/rule/resolution dari AI Learning. Kelola koreksi dan keputusan rule di Audit; reset penuh mengikuti kontrol memori yang sudah ada bila nanti diekspos.
- Perubahan model, fine-tuning, vector database, RAG baru, API baru, atau provider data baru.
