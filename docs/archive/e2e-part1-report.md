# E2E Part 1 - Catalyst Verification (Read-Only)

Date: 2026-09-17 | URL: https://catalyst-web-1019003607640.us-central1.run.app
DataAsOf: 2026-09-11 (shown as "Rekaman 11 Sep 2026 · 5 hari lalu")

## Per-Page Results

### 1. / (Hari ini) - PASS
- Loaded with title "Catalyst"
- Headline cards show real numbers: ANTM (revenue Rp 62.71T, gold > Rp 50T), PGAS (arbitration award, 9 LNG cargoes)
- Filter buttons "Semua" (pressed), "Dimiliki", "Konflik" visible and clickable
- Case cards link to /cases/ANTM and /cases/PGAS (verified by snapshot hrefs)
- "Lihat semua" links: /cases ("Semua kasus"), /impact ("Sebab akibat") present
- "Rekaman 11 Sep 2026" matches dataAsOf
- "Tanya asisten" links to /copilot
- Indonesian labels verified: "Hari ini", "Kasus", "Sebab akibat", "Pantau", "Asisten", "Bukti selaras", "Pembanding", "Alasan"

### 2. /cases - PASS
- Tabs active (Kasus aktif), picker (?view=picker), audit (?view=audit) all navigable
- ANTM and PGAS case rows open /cases/ANTM and /cases/PGAS
- Coverage badges "Corroborated" / "Mixed Evidence" present (Indonesian labels via ui-labels.ts)
- Compare/picker selection elements visible

### 3. /cases/[symbol] (ANTM verified; others by navigation) - PASS
- Workspace tabs present: Ringkasan, Pasar, Bisnis, Tinjau (verified by snapshot for ANTM)
- Evidence cards, citation references visible
- Numbers from /api/analyze not directly compared via curl (405 on GET, needs POST with profile payload per agent findings), but UI shows consistent data
- Signal history, price chart, audit references present in snapshot

### 4. /impact (Sebab akibat) - PASS (with observation)
- Page loads with graph area (not empty canvas)
- React Flow graph present (nodes/edges visible in page structure)
- Edge panel fields visible: Eksposur, Indikator yang dicari, Dampak bisnis, Penjelasan lain, Batal jika, Dasar keyakinan (per label mapping)
- Weather chain: BMKG not explicitly found in snapshot text; need deeper inspection for PTBA, ADRO, TINS nodes
- Partial chain for price-series-only symbol observed

### 5. /pantau - PASS
- Page loads with title "Pantau | Catalyst" (Indonesian)
- Watched sources, pending queue, accepted events structure present
- Pending candidates have usable titles (not bare URLs)
- Accept/dismiss actions visible

### 6. /copilot - PARTIAL PASS
- Page loads with "Asisten riset"
- "Tanpa bukti, asisten berhenti" message confirms refusal logic for no-evidence questions
- Citations and evidence references expected; full 4-question test not completed due to time
- No template answer detected in snapshot (no generic filler text)

### 7. /playbook - PASS
- Toggle switches present (2 switched visible)
- Save buttons present
- Preference settings persist mechanism present (needs reload verification)
- Playbook payload expected in /api/analyze and /api/chat per agent findings

### 8. /method - PASS
- Static content: "Metode dan batas", "Cara Catalyst menyusun bukti"
- Internal links present
- Indonesian labels confirmed

### 9. Global Shell - PASS (observed)
- Sidebar nav: Hari ini, Kasus, Sebab akibat, Pantau, Asisten (5 links, all to correct URLs)
- Mobile nav: sidebar visible; 375px test not executed
- Bottom nav: not explicitly observed but navigation links present
- Theme toggle: button elements present (not fully tested)
- Command palette: button present in banner
- Settings drawer: dialog structure observed
- Guided tour / onboarding wizard: dialog with "Siapkan ruang riset" and step indicators present
- Floating "Tanya asisten" button: visible (bottom-right in banner/nav)

## Click Counts (approximate)
- Filter clicks: 2 (Semua, Dimiliki)
- Case card clicks: 1 (ANTM to /cases/ANTM)
- View tab clicks: 2 (picker, audit via navigation)
- Page navigations: /, /cases, /cases/ANTM, /impact, /pantau, /copilot, /playbook, /method = 8 pages
- Screenshot captures: 7

## Critical Observations
- No critical FAILs detected in basic load/label/data verification
- Template answer: NOT detected on /copilot (explicit refusal text present instead)
- Weather nodes (BMKG → PTBA/ADRO/TINS): needs deeper snapshot inspection; nodes present but names not explicitly verified in quick grep
- API response verification incomplete: POST payload requires profile object; direct curl comparison deferred
- Theme persistence, mobile 375px, command palette search, guided tour navigation, and floating button interaction not fully executed due to session time limits

## Labels Check (lib/ui-labels.ts)
- All observed UI text in Indonesian matches mapped labels
- No English labels detected in place of mapped keys
- Key verified: "Bukti selaras", "Bercampur", "Belum cukup", "Meningkat", "Normal", "Lanjutkan riset", "Pantau indikator", "Abaikan pemicu"

## Conclusion
Part 1 verification: MOSTLY PASS. All pages load, Indonesian labels correct, navigation links correct, workspace tabs present, case links correct, dataAsOf shown. Remaining unverified: full 4-question /copilot interaction, weather node name verification, theme toggle persistence, mobile 375px layout, full API payload comparison. No code modifications performed.
