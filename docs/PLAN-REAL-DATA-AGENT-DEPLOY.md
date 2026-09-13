# Rencana: Data Nyata, Agent AI, dan Deploy GCP

Dokumen kerja untuk Catalyst menuju submission Sectors Hackathon 2026 Track 01.
Disusun 13 September 2026. Batas submission **30 September 2026, 23:59 WIB** — sisa 17 hari.

Semua klaim di dokumen ini punya bukti; lihat bagian 8 (Verifikasi Rencana).

---

## 1. Ringkasan keputusan

| # | Keputusan | Alasan singkat |
|---|---|---|
| D1 | Perbaiki lima klaim basi di UI sebelum apa pun | Salah faktual, nol credit, satu jam kerja |
| D2 | Pakai rekaman yang sudah ada sebelum membeli data baru | Tujuh endpoint sudah terekam dan menganggur |
| D3 | Tambahkan lapisan LLM (Gemini) di atas mesin deterministik | Track 01 mensyaratkan komponen AI/LLM; Catalyst belum punya |
| D4 | LLM tidak pernah menghasilkan angka | Kalkulator dan citation gate tetap satu-satunya sumber angka |
| D5 | Semua panggilan Sectors lewat cache GCS di server | Kunci tidak pernah ke browser; credit tidak terbakar per request |
| D6 | Deploy ke Cloud Run + memory di GCS | Deployment tidak wajib, tapi usability berbobot 40% |
| D7 | Batas kredit keras di dua sisi: Sectors dan Gemini | Grant tidak bisa diisi ulang; judging berlangsung 8 hari tanpa pengawasan |

---

## 2. Inventaris dummy (hasil riset)

Status data setelah pekerjaan wiring 13 September: harga, volume, IHSG, foreign flow,
broker summary, free float, laporan keuangan, berita, dan filing sudah nyata dari rekaman
Sectors API. Yang berikut ini **masih belum nyata**.

### Tier 1 — klaim yang sekarang salah (bug)

| Lokasi | Klaim | Kenyataan |
|---|---|---|
| `app/method/page.tsx:8` | "baseline 45 hari bursa" | 27 sesi |
| `app/method/page.tsx:10` | Katalis memakai "komoditas, BI-Rate/JISDOR, kebijakan, dan cuaca BMKG" | Hanya Sectors news dan filings |
| `components/price-chart.tsx:23` | header "45 hari bursa" | 28 sesi |
| `app/impact/page.tsx` | filter sumber menawarkan `Makro`, `Komoditas`, `Cuaca` | Tidak ada satu pun event dengan sourceType itu |
| `components/copilot.tsx:12` | quick prompt "Berita nikel ini…" | Tidak ada event nikel; jatuh ke fallback kategori |

### Tier 2 — heuristik yang tampil seperti data

Angka pilar deterministik dan nyata. Narasi di sekelilingnya masih tulisan tangan.

| Item | Lokasi | Sifat |
|---|---|---|
| Skor `relevance` 40–97 | `scripts/build_market_data.py:190` | Rumus karangan: filing 95, news 88 − 6 per emiten tambahan |
| `path` eksposur | `scripts/build_market_data.py` (`CATEGORY_PATH`, `DIMENSION_PATH`) | Template per kategori, bukan analisis per peristiwa |
| Pemetaan `direction` | idem | Tag `Bullish/Bearish/Neutral` asli, pemetaan ke Supported/Adverse/Mixed keputusan kita |
| `mandateFocus` default per emiten | `lib/agent/engine.ts:118` | ANTM→pricing, BBCA→margin, GOTO→cash-flow. Ditebak |
| `lagFor`, `confidenceFor` | `lib/agent/engine.ts` | Ambang 90/75 dan "1-10 sesi" karangan |
| Teks protokol hipotesis, source plan, business impact, lifecycle | `lib/agent/engine.ts` | 83 string Indonesia statis |

### Tier 3 — seed demo

| Item | Lokasi |
|---|---|
| Persona Raka dan Maya, `pillarOrder`, `preferredSectors`, `owned` | `lib/data/fixtures.ts:120-137` |
| Watchlist Maya masih daftar hardcoded | `lib/data/fixtures.ts:130` |
| `defaultPlaybook` (comparables, exposure nikel, falsifier ANTM) | `lib/store.ts:63` |
| `basePreferences` "Prioritaskan Basic Materials" | `lib/store.ts:58` |
| Copy tur, quick prompt, 10 tahap agent, nav | `components/guided-tour.tsx`, `app/method/page.tsx` |

### Tier 4 — kode mati

`lib/memory-store.ts` mengekspor `browserMemoryStore` yang mengimplementasikan
`MemoryStore`, tetapi **tidak ada satu file pun yang mengimpornya**. Seluruh state
sebenarnya lewat zustand `persist` ke localStorage. Ini justru seam yang kita butuhkan
untuk memory GCS — tinggal diwiring, bukan dibuat dari nol.

### Tier 5 — data nyata yang sudah terekam tapi belum dipakai

Semua ada di `research/harness/recorded/`, **nol credit tambahan**.

| Rekaman | Emiten | Bisa mengganti |
|---|---|---|
| `shareholders-composition` | ADRO, BBCA, BBRI, TLKM | Rasio free float kasar → komposisi lokal/asing bulanan |
| `corporate-actions` | ADRO, BBCA, BBRI, TLKM, LIFE | Menambah event perusahaan nyata (dividen, split) |
| `get-segments` | ADRO, BBCA, BBRI, TLKM | Template exposure path → segmen usaha nyata |
| `mining_commodities` Coal & Gold price | 2023–2025 | Kategori `commodity` punya harga betulan |
| `subsector_report ... sections=statistics` | banks, oil-gas-coal, telecommunication | `sectorReturn` rata-rata 18 emiten → statistik subsektor nyata |
| `suspensions`, `most-traded` | pasar | Konteks likuiditas dan gate suspensi |

### Tier 6 — belum terekam sama sekali

Broker summary dan laporan keuangan untuk 12 emiten coverage; harga komoditas nikel dan
timah; intraday; order book; detail kontrak dan hedging. Yang terakhir tiga memang tidak
tersedia di Sectors API dan harus tetap tampil sebagai `missingEvidence`.

---

## 3. Status AI agent — ini blocker, bukan catatan kecil

**Track 01 mensyaratkan komponen AI/LLM.** Kutipan halaman track:
"AI/LLM component: **mandatory**".

Catalyst saat ini **tidak memakai LLM sama sekali**. `lib/agent/engine.ts` adalah mesin
aturan deterministik; UI menyebutnya "Simulasi agent". Di bawah definisi track,
produk ini belum memenuhi syarat masuk Track 01.

Kabar baiknya, uji kualifikasi yang lain **sudah terpenuhi secara struktural**:

| Syarat track | Status Catalyst |
|---|---|
| Custom agent logic / orchestration milik sendiri | Ada: planner, empat pilar, gate |
| Multi-step reasoning flow | Ada: mandate → hypothesis tree → observable → verdict |
| Routing antar sumber data | Sebagian: daily, broker, flow, news, filings |
| Memory / state management | Ada di klien; belum server-side |
| Verification step | Ada: contradiction gate, citation gate, language gate |
| Purpose-built interface | Ada |

Yang hilang hanya modelnya. Dan trap-nya juga eksplisit: menyambungkan klien AI jadi
ke Sectors MCP dengan prompt saja **tidak lolos**. Jadi arahnya bukan "pasang MCP",
melainkan "pasang model di dalam orkestrasi yang sudah kita punya".

### Pembagian kerja model vs kalkulator

Aturan tunggal: **LLM tidak pernah mengeluarkan angka.** Setiap angka tetap lahir dari
`lib/agent/metrics.ts` dan tetap membawa citation.

| Peran | Sekarang | Menjadi |
|---|---|---|
| Mandate parser | rantai `if` kata kunci (`engine.ts:113`) | LLM → structured output `{focus, hypothesisTree[], observables[]}` |
| Penulis exposure path | template kategori | LLM membaca segmen usaha + isi berita → jalur spesifik emiten |
| Penilai relevance & direction | aritmetika karangan | LLM dengan rubrik eksplisit, output terstruktur, disertai alasan |
| Perencana sumber | daftar statis | LLM memilih endpoint mana yang perlu dipanggil berikutnya (bukti orkestrasi untuk video) |
| Penjawab Copilot | cabang `if` kalimat | LLM dengan evidence pack sebagai konteks |
| Verifier | citation gate | Pass kedua: setiap angka pada draft harus ada pada evidence pack, kalau tidak → tolak dan tulis ulang |

### Bentuk teknis

Model: **Gemini**, lewat SDK `@google/genai`. Satu SDK, dua jalur auth, dipilih dari env
tanpa mengubah kode pemanggil:

| | Gemini Developer API | Vertex AI / Gemini Enterprise Agent Platform |
|---|---|---|
| Auth | `GOOGLE_API_KEY` | Application Default Credentials, tanpa kunci |
| Env | `GOOGLE_API_KEY` | `GOOGLE_GENAI_USE_ENTERPRISE=true`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION` |
| Konstruksi | `new GoogleGenAI({apiKey})` | `new GoogleGenAI({vertexai: true, project, location})` |
| Cocok untuk | lokal dan demo | Cloud Run — tidak ada kunci yang perlu dirotasi |

Keputusan: **Gemini Developer API free tier, di lokal maupun di Cloud Run.** Vertex tidak
dipakai untuk sekarang; kolomnya tetap ditulis karena `@google/genai` adalah SDK yang sama,
jadi pindah ke Vertex nanti hanya mengubah env, bukan kode.

Konsekuensi yang harus diterima bersama keputusan itu:

1. **Kunci masuk Secret Manager.** Free tier tetap berarti ada `GOOGLE_API_KEY` yang harus
   dirahasiakan — bedanya dengan Vertex yang tanpa kunci. Kunci hanya dibaca proses server.
2. **Ada kuota per menit dan per hari.** Ini batas sebenarnya, bukan uang. Konfirmasi angka
   RPM/RPD untuk model yang dipilih, lalu setel plafon aplikasi di bawahnya dan antrikan
   kelebihannya, jangan biarkan pengguna melihat error kuota.
3. **Periksa ketentuan penggunaan data free tier** sebelum mengirim apa pun. Isi prompt kita
   adalah berita publik, angka pasar publik, dan mandate yang ditulis pengguna sendiri — tidak
   ada PII di dalamnya, dan itu memang harus tetap begitu. Jangan pernah mengirim isi memory
   pengguna ke model.
4. **Rencanakan jalan keluarnya.** Kalau kuota free tier tidak cukup saat judging, pindah ke
   Vertex atau ke tier berbayar dengan mengubah env — `AGENT_MODE=deterministic` adalah rem
   darurat yang membuat aplikasi tetap jalan penuh tanpa model.

- Structured output lewat `responseSchema` / `responseJsonSchema` pada `GenerationConfig`,
  supaya lima peran di atas mengembalikan objek bertipe, bukan prosa yang harus diparsing.
- Context caching **eksplisit**: `ai.caches.create({model, config: {contents, systemInstruction, ttl}})`
  untuk system prompt + rubrik + skema evidence, lalu cache itu direferensikan pada setiap
  panggilan. Berbeda dari caching prefix otomatis — di sini cache adalah objek dengan TTL yang
  harus dibuat dan diperbarui sendiri. TTL 1 jam, dibuat ulang lazily saat kedaluwarsa.
- Tool layer milik sendiri (bukan MCP): fungsi TypeScript `getDaily`, `getBrokerSummary`,
  `getForeignFlow`, `getNews`, `getFilings`, `getSegments`, dideklarasikan sebagai function
  declarations dan dieksekusi oleh loop kita sendiri. Setiap fungsi membaca cache GCS lebih
  dulu. Loop mencatat plan, tool call, dan alasan re-query — log itulah yang ditayangkan di
  panel `agent-trace` sebagai bukti orkestrasi.
- ID model tidak dikunci di kode. `GEMINI_MODEL` dibaca dari env; konfirmasi ID yang berlaku
  lewat `ai.models.list()` sebelum menulis nilainya.

---

## 4. Arsitektur target

```
Browser (Next.js)
  └── /api/analyze /api/impact /api/chat        server-only, tidak pernah memegang kunci
        ├── Deterministic core   lib/agent/metrics.ts  ← satu-satunya sumber angka
        ├── Agent layer          lib/agent/llm/*       ← Gemini, structured output, tool loop
        │     └── Tool layer     lib/data/sectors-client.ts
        │            └── Cache   GCS gs://catalyst-recorded   (cache-first, TTL per kelas endpoint)
        │                   └── Sectors API      hanya saat cache miss DAN budget mengizinkan
        └── Memory               GCS gs://catalyst-memory/memory/{userId}.json
```

Cloud Run job `catalyst-refresh` + Cloud Scheduler mengisi cache setiap hari bursa setelah
tutup. Jalur request pengguna **tidak pernah** memulai panggilan Sectors saat cache masih
dalam TTL.

---

## 4b. Sitasi tingkat kalimat, dan diagram chain

### Diagram chain sudah React Flow

`components/causal-chain.tsx` sudah memakai React Flow: paket `@xyflow/react` v12.11.6
(nama paket React Flow sejak v12), `ReactFlow` diimpor di baris 10–14, stylesheet-nya
diimpor di `app/layout.tsx:3`, dan node kustom didaftarkan lewat `nodeTypes = { chain: ChainNode }`.
Tidak ada yang perlu diganti. Yang belum dimanfaatkan dari React Flow:

1. Layout masih dihitung manual. Pindahkan ke layouting otomatis (Dagre atau ELK) supaya
   jumlah node yang bertambah tidak merusak susunan.
2. Edge masih default. Jalur dengan `direction` berbeda layak punya `edgeTypes` sendiri,
   sehingga Adverse dan Supported terbaca tanpa membaca label.
3. Minimap dan kontrol zoom belum dipasang, padahal chain akan memanjang setelah P1.
4. Belum ada `onNodeMouseEnter` untuk menyorot jalur hulu-hilir dari satu node.

### Sitasi: pinjam pola yang sudah terbukti di ReguLens

Sitasi Catalyst sekarang berhenti di **endpoint**: provider, endpoint, field, asOf, url.
Itu menjawab "angka ini dari API mana", belum menjawab "kalimat mana yang mengatakannya".

ReguLens (`/Users/af/dumpProject/ReguLens`) sudah menyelesaikan persoalan yang sama satu
tingkat lebih dalam, dan polanya bisa dipinjam utuh:

| Bagian | Lokasi di ReguLens | Isinya |
|---|---|---|
| Model sitasi | `api/app/core/citations.py` | `Citation(clause_id, start, end, match)` — offset karakter ke dalam teks sumber |
| Status kejujuran | modul yang sama | `exact`, `approximate`, `not_found`. Yang ketiga adalah jawaban yang sah, bukan kegagalan |
| Pencari span | `locate()`, `_locate_row()` | Normalisasi whitespace, `SequenceMatcher`, pencocokan baris lewat identifier dan angkanya |
| Visualisasi | `web/app/documents/[id]/SourceText.tsx` | Memotong dokumen jadi run biasa dan run tersitasi, menyorotnya di tempat, deep-link `?cite=`, dan mendaftar klausa yang tidak ditemukan sebagai *unlocated* |

Kalimat yang menjelaskan kenapa polanya benar ada di komentar modulnya sendiri: menyorot
paragraf yang salah lebih buruk daripada tidak menyorot apa pun, karena sitasi hanya bernilai
kalau pembaca bisa memercayai apa yang ditunjuknya.

### Bagaimana itu diterapkan ke Catalyst

Catalyst punya bahan yang setara dan sudah ada di `data/sectors/`: setiap item berita dan
filing membawa `body` lengkap. Jadi:

1. **Tambah `SourceSpan` ke `Citation`** di `lib/types.ts` — opsional, supaya sitasi tingkat
   endpoint yang sudah ada tetap sah:
   `{ documentId, start, end, match: "exact" | "approximate" | "not_found" }`.
2. **Port `locate()` ke TypeScript** di `lib/agent/citations.ts`. Logikanya kecil dan murni:
   normalisasi whitespace sambil menyimpan peta offset, cari kecocokan persis, lalu
   `SequenceMatcher` dengan ambang minimum, lalu menyerah dan mengembalikan `not_found`.
   Tulis tesnya lebih dulu — modul ini adalah tempat paling mudah untuk diam-diam berbohong.
3. **Simpan `body` berita dan filing** ke `market.generated.ts` (sekarang hanya ringkasannya
   yang ikut), supaya span punya teks untuk ditunjuk.
4. **Komponen `SourceText`** versi Catalyst: menampilkan body berita dengan span tersorot,
   dibuka dari `CitationDialog` yang sudah ada, dan mendaftar sitasi `not_found` apa adanya.
5. **Sambungkan ke chain.** Klik edge pada React Flow → buka span yang menjadi dasar
   `rationale` edge itu. Ini yang membuat diagram berhenti menjadi hiasan: setiap panah bisa
   ditelusuri sampai ke kalimatnya.
6. **Inilah gate untuk keluaran LLM.** Setiap klaim tekstual dari Gemini harus membawa span
   yang `exact` atau `approximate` ke dalam body sumber. Yang `not_found` ditolak dan ditulis
   ulang sekali; kalau tetap gagal, klaim itu tidak ditampilkan. Verifier di P2 memakai modul
   ini, bukan heuristik baru.

Urutannya penting: kerjakan sitasi span **sebelum** lapisan LLM, supaya verifier punya
sesuatu yang nyata untuk diverifikasi sejak hari pertama.

---

## 5. Rencana implementasi

### P0 — Perbaiki klaim basi · 0 credit · ~1 jam

1. `method/page.tsx` baseline dan daftar input Katalis dibuat dinamis dari `WINDOW_SESSIONS`
   dan dari kategori yang benar-benar ada di `rawEvents`.
2. `price-chart.tsx` header memakai `priceSeries.length`.
3. `impact/page.tsx` `sourceLabels` dibangun dari `new Set(events.map(e => e.sourceType))`.
4. `copilot.tsx` `prompts` dibangun dari event teratas yang nyata.
5. Test e2e diperbarui agar tidak mengunci teks yang dinamis.

### P1 — Habiskan rekaman yang menganggur · 0 credit · ~4 jam

1. Salin tujuh rekaman Tier 5 ke `data/sectors/`.
2. `build_market_data.py` diperluas:
   - `shareholders-composition` → `BrokerEvidence.freeFloatShares` nyata dan seri
     kepemilikan asing bulanan.
   - `corporate-actions` → event kategori `company` tambahan, `sourceType: "filing"`.
   - `get-segments` → peta segmen per emiten, dipakai sebagai bahan exposure path.
   - `subsector_report statistics` → `sectorReturns` nyata per subsektor.
   - `mining commodity price` → event kategori `commodity` dengan seri harga.
3. `sectorReturn` pindah dari rata-rata 18 emiten ke statistik subsektor; catat di
   `calculation.notes`.

### P1b — Sitasi tingkat kalimat · 0 credit · ~1 hari

1. `lib/agent/citations.ts` — port `locate()` dari ReguLens ke TypeScript, beserta tesnya.
2. Generator menyimpan `body` berita dan filing ke `market.generated.ts`.
3. `Citation.span` opsional di `lib/types.ts`.
4. Komponen `SourceText` dan integrasinya ke `CitationDialog`.
5. Edge React Flow bisa diklik sampai ke span sumbernya.
6. Layout chain pindah ke Dagre atau ELK; minimap dan kontrol zoom dipasang.

### P2 — Lapisan LLM · 0 credit Sectors · ~2 hari

1. `lib/agent/llm/client.ts` — konstruksi `GoogleGenAI`, pilih Developer API atau Vertex lewat env.
2. `lib/agent/llm/schemas.ts` — skema structured output untuk lima peran.
3. `lib/agent/llm/mandate.ts` — mandate bebas → rencana riset. Menggantikan `mandateFocus`.
4. `lib/agent/llm/exposure.ts` — event + segmen + evidence → path, rationale, relevance,
   direction, beserta alasannya.
5. `lib/agent/llm/answer.ts` — Copilot menjawab dari evidence pack.
6. `lib/agent/llm/verify.ts` — pass kedua. Setiap angka pada draft dicocokkan ke evidence
   pack; setiap klaim tekstual harus membawa span `exact` atau `approximate` dari
   `lib/agent/citations.ts`. Gagal → tolak, tulis ulang sekali, lalu turun ke jalur
   deterministik.
7. `lib/agent/llm/trace.ts` — rekam plan, tool call, dan alasan re-query; tampilkan di
   `components/agent-trace.tsx` yang sudah ada.
8. Flag `AGENT_MODE=deterministic|llm`. Default `deterministic` saat test, `llm` di produksi.
   Semua test unit yang ada tetap hijau tanpa memanggil model.

### P3 — Tool layer dan cache · ~1 hari

1. `lib/data/sectors-client.ts`: `fetchSectors(path, params, {ttl})`.
   Urutan: memori proses → GCS → API. Tulis balik ke GCS setiap kali sukses.
2. Ledger budget di `gs://catalyst-recorded/_ledger/YYYY-MM-DD.jsonl`; tolak panggilan
   kalau plafon harian tercapai, sajikan data basi beserta bannernya.
3. Rate limiter: maksimum 25 panggilan berbayar per 30 detik bergulir, jarak 1,5 detik.
4. Validasi simbol terhadap daftar universe dari cache sebelum memanggil — 404 memakan
   1 credit.

### P4 — Memory GCS · ~1 hari

1. `lib/memory/gcs-store.ts` mengimplementasikan `MemoryStore` yang sudah ada di
   `lib/types.ts:410`.
2. Identitas: cookie `catalyst_uid` HttpOnly SameSite=Lax berisi UUID v4 yang
   ditandatangani. Tanpa login, tanpa PII.
3. Objek `memory/{uid}.json`. Tulis dengan `ifGenerationMatch` supaya dua tab tidak saling
   menimpa; konflik → baca ulang, merge, tulis ulang sekali.
4. Klien tetap menulis ke localStorage sebagai cache optimistik; GCS adalah sumber kebenaran.
   Ini juga yang memungkinkan juri membuka link dan melanjutkan state.
5. Route `POST /api/memory` dan `GET /api/memory`; `browserMemoryStore` yang sekarang mati
   dijadikan fallback offline.

### P5 — Deploy · ~0,5 hari

Lihat bagian 7.

### P6 — Beli data yang kurang · bertahap

| Paket | Isi | Credit |
|---|---|---|
| A | `shareholders`, `segments`, `corporate-actions` untuk ANTM, GOTO, PGAS | 9 |
| B | Harga komoditas nikel dan timah | 2 |
| C | `subsector_report statistics` untuk 5 subsektor sisanya | 5 |
| D | Broker summary + financials untuk 4 emiten coverage terpilih | 24 |
| E | (opsional) 8 emiten coverage sisanya | 48 |

A+B+C = **16 credit**, cukup untuk semua janji UI saat ini. D menambah jumlah research
case dari 6 ke 10. E hanya dikerjakan kalau sisa kredit di atas 400 menjelang 25 September.

---

## 6. Disiplin kredit

### Sectors — status

Grant 1.000, tidak bisa diisi ulang, hangus saat event selesai. Terpakai **381**.
Sisa **619**. Rencana P6 paket A+B+C+D = 41 → total 422, sisa 578.

### Sectors — aturan produksi

1. **Browser tidak pernah memanggil Sectors.** Kunci hanya hidup di Secret Manager dan
   proses Cloud Run.
2. **Cache-first dengan TTL per kelas endpoint.**

   | Kelas | Contoh | TTL |
   |---|---|---|
   | Taksonomi | `/v2/subsectors/`, `/v2/brokers/` | selamanya |
   | Identitas emiten | `company/report?sections=overview` | 30 hari |
   | Harian | `/v2/daily/`, `/v2/index-daily/`, `/v2/foreign-flow/` | sampai 17:30 WIB hari bursa berikutnya |
   | Broker & keuangan | `broker-summary/top`, `financials/quarterly` | 1 hari |
   | Berita & filing | `/v2/news/`, `/v2/filings/` | 30 menit |

3. **Jangan pernah membiarkan parameter default.** `sections` default = 8 credit versus 1;
   `classifications`+`periods` default = 10 credit versus 1; `n_quarters` dibayar per kuartal.
4. **Refresh terjadwal, bukan per request.** Cloud Run job jam 17:30 WIB hari bursa.
   Perkiraan 18 emiten × 3 endpoint = 54 credit per hari bursa **kalau** semua di-refresh —
   karena itu job harian hanya menyegarkan harian + berita untuk 6 emiten case = 12 credit/hari.
   Selama 8 hari judging: ~96 credit. Masuk anggaran.
5. **Plafon harian keras** di ledger: 25 credit/hari. Lewat plafon → sajikan cache basi
   dengan label tanggal, jangan memanggil.
6. **404 memakan 1 credit**; validasi simbol dari cache universe lebih dulu.
7. **429 dan 400 gratis**; probing parameter aman, polling 429 tidak — tunggu jendelanya habis.

### Gemini — anggaran

Di free tier, batasnya **kuota, bukan uang**. Yang perlu dihitung adalah panggilan per menit
dan per hari, lalu dicocokkan dengan RPM/RPD model yang dipilih. Isi kolom kanan setelah
angka kuota dikonfirmasi (U3).

| Skenario | Panggilan | Puncak per menit | Muat di free tier? |
|---|---|---|---|
| Pengembangan sehari | ±100 | rendah, satu orang | isi setelah U3 |
| Rekaman video demo | ±40 | sedang, berurutan | isi setelah U3 |
| 8 hari judging, 50 juri × 20 aksi | ±1.000 | **tidak bisa diprediksi** — juri bisa datang bersamaan | isi setelah U3 |

Baris ketiga itu risiko sebenarnya. Beban judging tidak merata, dan free tier menolak dengan
429 saat puncak. Karena itu poin 2, 3, dan 5 di bawah bukan optimasi, melainkan syarat agar
halaman tetap berguna ketika kuota habis.

Kontrol — ini yang menentukan biaya, bukan pilihan modelnya:

1. **Context caching eksplisit** untuk system prompt, rubrik, dan skema evidence. Objek cache
   dibuat sekali dengan TTL 1 jam dan dipakai ulang; tanpa ini setiap panggilan membayar
   ulang seluruh prefix.
2. **LLM hanya jalan pada aksi pengguna.** Render halaman memakai hasil deterministik plus
   hasil LLM yang sudah tersimpan. Tidak ada panggilan model saat halaman dibuka.
3. **Hasil LLM disimpan di GCS** dengan kunci `sha256(symbol + mandate + evidenceHash)`.
   Mandate yang sama pada evidence yang sama tidak pernah dipanggil dua kali.
4. **Model kecil untuk pekerjaan kecil.** Penilai relevance dan penulis exposure path jalan di
   model flash; perencanaan mandate dan verifier di model pro. Satu variabel env per peran.
5. **Plafon panggilan harian** di ledger yang sama dengan credit Sectors, disetel di bawah RPD
   free tier. Lewat plafon, atau kena 429 → jalur deterministik, UI memberi tahu bahwa mode
   agent sedang dibatasi. Jangan pernah menampilkan error kuota mentah ke pengguna.
6. **Pra-hitung sebelum judging.** Enam research case dengan mandate default dijalankan
   sekali, hasilnya disimpan di GCS, dan itu yang dilihat juri saat membuka halaman. Panggilan
   model hanya terjadi kalau juri mengetik mandate atau pertanyaan baru.
7. **Batasi `maxOutputTokens` per peran.** Jawaban Copilot tidak perlu 8.000 token; skema
   terstruktur membuat batas itu aman.

---

## 7. Deploy GCP dengan memory di GCS

### Yang sudah ada dan bisa dipakai ulang

Proyek `ada-sectors-508410` sudah memiliki Artifact Registry, bucket GCS `katalis-recorded`
di `us-east1`, secret `SECTORS_API_KEY`, layanan Cloud Run `katalis-api`, job
`katalis-refresh`, dan satu Cloud Scheduler. Pola `cloudbuild.yaml` di repo Sectors — gate
berjalan **di dalam image** sebelum deploy — dipakai ulang apa adanya.

### Komponen yang dibutuhkan

| # | Objek | Nilai |
|---|---|---|
| 1 | Artifact Registry repo `catalyst` | `asia-southeast2`, kebijakan simpan 5 tag. Repo `katalis` yang sudah ada juga bisa dipakai ulang untuk menghemat satu objek |
| 2 | Cloud Run service `catalyst-web` | `asia-southeast2`, min 0, max 3, 512Mi, port 8080 |
| 3 | Bucket `gs://catalyst-memory` | `us-east1`, uniform access, versioning on, lifecycle hapus versi lama > 30 hari |
| 4 | Bucket `gs://catalyst-recorded` | `us-east1`, cache respons Sectors + hasil LLM |
| 5 | Secret `SECTORS_API_KEY` dan `GOOGLE_API_KEY` | `SECTORS_API_KEY` sudah ada; `GOOGLE_API_KEY` dibuat baru |
| 6 | Service account `catalyst-run@` | `roles/storage.objectAdmin` terbatas pada dua bucket, `roles/secretmanager.secretAccessor` |
| 7 | Cloud Run job `catalyst-refresh` + Scheduler | `30 17 * * 1-5` Asia/Jakarta |
| 8 | Cloud Build trigger | branch `main` repo `RichardCen05/catalyst` |

### Perubahan kode yang diperlukan

1. `next.config.ts` → `output: "standalone"`. Tanpa ini image Next.js membawa seluruh
   `node_modules` dan build Docker jadi berat.
2. `Dockerfile` multi-stage: `node:24-alpine` → `pnpm install --frozen-lockfile` →
   `pnpm build` → salin `.next/standalone`, `.next/static`, `public`, dan `data/sectors`.
   `EXPOSE 8080`, `CMD ["node","server.js"]`, `ENV PORT=8080`.
3. `.dockerignore`: `.next`, `node_modules`, `test-results`, `playwright-report`, `.env*`.
4. Health check `GET /api/health` yang memeriksa cache GCS terbaca.
5. Langkah gate di Cloud Build: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
   dijalankan di dalam image, sama seperti pola katalis.

### Kredensial LLM di Cloud Run

Free tier memakai kunci, jadi kuncinya diperlakukan sama seperti kunci Sectors:

```bash
gcloud secrets create GOOGLE_API_KEY --replication-policy=automatic
printf %s "$KEY" | gcloud secrets versions add GOOGLE_API_KEY --data-file=-
```

Pada `gcloud run deploy`, kunci masuk sebagai referensi, bukan nilai:
`--set-secrets=GOOGLE_API_KEY=GOOGLE_API_KEY:latest`, ditambah
`--set-env-vars=GEMINI_MODEL=...,AGENT_MODE=llm`.

`aiplatform.googleapis.com` tidak perlu diaktifkan selama masih di Developer API.

### Bentuk memory di GCS

```
gs://catalyst-memory/
  memory/{uid}.json            profil, playbook, insight, status case, resolution
  memory/_schema.json          versi skema untuk migrasi
gs://catalyst-recorded/
  sectors/{sha256(path+params)}.json    respons mentah + header waktu ambil
  llm/{sha256(symbol+mandate+evidence)}.json
  _ledger/YYYY-MM-DD.jsonl              credit Sectors dan kuota Gemini
```

Tulis dengan `ifGenerationMatch`; satu kali baca-merge-tulis ulang saat konflik, lalu
menyerah dan laporkan ke pengguna. Jangan pernah menulis tanpa precondition — dua tab
terbuka adalah kondisi normal, bukan kasus tepi.

### Biaya GCP

Cloud Run min-instances 0 dan 2 juta request gratis per bulan; GCS Always Free 5 GB di
satu region US; Artifact Registry 0,5 GB gratis; Cloud Build 2.500 menit gratis per bulan.
Pada skala hackathon perkiraannya **nol dolar**, dengan syarat bucket tetap di `us-east1`
dan min-instances tetap 0.

---

## 8. Verifikasi rencana

| # | Klaim rencana | Bukti | Status |
|---|---|---|---|
| V1 | Track 01 mewajibkan komponen AI/LLM | `research/docs/hackathon/02-tracks.md:23` "AI/LLM component: mandatory." | Terverifikasi |
| V2 | Catalyst belum memakai LLM | Tidak ada dependensi model di `package.json`; `lib/agent/engine.ts` deterministik penuh | Terverifikasi |
| V3 | Menempel klien AI ke MCP saja tidak lolos | `02-tracks.md` bagian "What does not qualify" | Terverifikasi |
| V4 | Deployment tidak wajib | `01-rules.md:85` "Live deployment is not required" | Terverifikasi |
| V5 | Usability 40%, video 30%, technical depth 30% | `01-rules.md:147-151` | Terverifikasi |
| V6 | Sisa kredit 619 | `recorded/_ledger.jsonl`: 245 panggilan berbayar, 381 credit | Terverifikasi |
| V7 | Biaya endpoint yang dipakai di P6 | `plans/plan.json` est_cost: shareholders 1, segments 1, corporate-actions 1, subsector statistics 1, broker-summary/top 2, financials n_quarters=4 4 | Terverifikasi |
| V8 | Batas laju 25 panggilan berbayar per ~30 detik | `research/docs/api/01-api-guide.md:310-330`, diukur 6 Sep 2026 | Terverifikasi |
| V9 | Default parameter mahal (report 8, top-changes 10) | `05-credit-budget.md` tabel biaya | Terverifikasi |
| V10 | 404 berbiaya 1 credit, 400 dan 429 gratis | `05-credit-budget.md` tabel biaya | Terverifikasi |
| V11 | Tujuh rekaman Tier 5 benar-benar ada | `ls research/harness/recorded/` — shareholders×4, corporate-actions×5, segments×4, commodity price×2, subsector statistics×3, suspensions, most-traded | Terverifikasi |
| V12 | `MemoryStore` sudah jadi interface dan `browserMemoryStore` tidak dipakai | `lib/types.ts:410`; grep `browserMemoryStore` hanya cocok pada definisinya | Terverifikasi |
| V13 | SDK `@google/genai` melayani Developer API dan Vertex dari satu klien | Dokumentasi `googleapis.github.io/js-genai`: `new GoogleGenAI({apiKey})` versus `new GoogleGenAI({vertexai: true, project, location})` | Terverifikasi |
| V14 | Nama variabel env Gemini | Dokumentasi yang sama: `GOOGLE_API_KEY`; `GOOGLE_GENAI_USE_ENTERPRISE` + `GOOGLE_CLOUD_PROJECT` + `GOOGLE_CLOUD_LOCATION` | Terverifikasi |
| V15 | Structured output dan context caching tersedia | `GenerationConfig.responseSchema` / `responseJsonSchema`; `ai.caches.create({model, config:{contents, systemInstruction, ttl}})` | Terverifikasi |
| V22 | `aiplatform.googleapis.com` belum aktif di `ada-sectors-508410` | `gcloud services list --enabled` tidak memuatnya, 13 Sep 2026. Tidak menghalangi selama memakai Developer API | Terverifikasi |
| V23 | Catalyst belum punya file env, dan `.gitignore` belum memblokir `.env` | Kondisi repo sebelum 13 Sep 2026 sore; sudah diperbaiki | Terverifikasi |
| V24 | Diagram chain sudah memakai React Flow | `@xyflow/react` 12.11.6 di `node_modules`; `components/causal-chain.tsx:10-14` dan `app/layout.tsx:3` | Terverifikasi |
| V25 | ReguLens punya sitasi tingkat span beserta visualisasinya | `api/app/core/citations.py` (`Citation(clause_id, start, end, match)`, tiga status) dan `web/app/documents/[id]/SourceText.tsx` (sorot di tempat, deep-link `?cite=`, daftar unlocated) | Terverifikasi |
| V26 | Body berita dan filing tersedia untuk disitasi | Setiap item di `data/sectors/v2_news__*.json` dan `v2_filings__*.json` membawa field `body` | Terverifikasi |
| V16 | Pola Cloud Run + GCS + Secret Manager sudah terbukti di proyek yang sama | `Sectors/cloudbuild.yaml`, `Sectors/infra/README.md` | Terverifikasi |
| V17 | Repo Catalyst dibuat dalam jendela yang sah | `git log --reverse` commit pertama 2026-09-12, jendela mulai 19 Agu 2026 | Terverifikasi |
| V18 | `next.config.ts` belum `output: "standalone"` | Isi file saat ini hanya `reactStrictMode` dan `allowedDevOrigins` | Terverifikasi |
| V19 | Bucket Always Free harus satu region US | `Sectors/infra/README.md` mencatat `us-east1` justru karena alasan ini | Terverifikasi |
| V20 | Submission membekukan repo | `03-submission-checklist.md` Fase 4 | Terverifikasi |
| V21 | Proyek `ada-sectors-508410` masih lapang: satu Cloud Run service, satu repo Artifact Registry `katalis`, bucket `katalis-recorded` di US-EAST1, secret `SECTORS_API_KEY` | `gcloud run services list`, `gcloud artifacts repositories list`, `gcloud storage buckets list`, `gcloud secrets list` dijalankan 13 Sep 2026 | Terverifikasi |

Dua hal **belum** terverifikasi dan harus dicek sebelum dieksekusi:

| # | Belum pasti | Cara mengecek |
|---|---|---|
| U1 | ID model Gemini yang berlaku dan region Vertex yang melayaninya | `ai.models.list()`, atau daftar model di AI Studio. Isi `GEMINI_MODEL` hanya setelah ini dikonfirmasi |
| U3 | Kuota RPM dan RPD free tier untuk model yang dipilih, dan ketentuan penggunaan datanya | Halaman rate limits dan terms Gemini API. Menentukan plafon aplikasi dan apakah free tier sanggup menopang 8 hari judging |
| U2 | Proyek GCP `ada-sectors-508410` milik akun alief, sedangkan repo Catalyst milik `RichardCen05` | Keputusan tim: deploy dari proyek yang mana, dan siapa yang menghubungkan Cloud Build trigger ke repo itu |

---

## 9. Yang sengaja tidak dikerjakan

| Ditolak | Alasan |
|---|---|
| Menyambung Sectors MCP sebagai jalan pintas | Trap Track 01; orkestrasi harus milik sendiri |
| LLM menghitung metrik | Menghapus properti yang membuat produk ini layak dipercaya |
| Streaming harga live | Tidak ada di Sectors API dan tidak ada di anggaran kredit |
| Login pengguna | Cookie anonim sudah cukup; login menambah PII dan permukaan serangan |
| Terraform | Tujuh objek cloud; README yang dibaca orang lebih jujur daripada state file yang basi |
| 18 research case penuh sejak awal | 72 credit untuk nilai demo yang kecil; paket D lebih dulu |

---

## 10. Urutan dan tenggat

| Tanggal | Target |
|---|---|
| 14 Sep | P0 selesai, P1 selesai, paket kredit A+B+C dibeli |
| 15 Sep | P1b selesai; setiap angka dan klaim bisa ditelusuri sampai kalimat sumbernya |
| 16 Sep | P2 selesai; jejak agent terlihat di UI |
| 17 Sep | P3 selesai; tidak ada panggilan Sectors di jalur request |
| 18 Sep | P4 selesai; state bertahan lintas perangkat |
| 19 Sep | P5 selesai; URL Cloud Run hidup |
| 20–24 Sep | Paket D, penajaman, eval jawaban agent |
| 25–27 Sep | Rekam video 1 menit dan 3 menit |
| 28 Sep | Pembekuan fitur; hanya perbaikan bug |
| 29 Sep | Submit. Jangan menunggu tanggal 30 |

Catatan tenggat: registrasi tim tutup **22 September 2026**. Pastikan itu beres lebih dulu —
tanpa registrasi, semua pekerjaan di dokumen ini tidak bisa disubmit.
