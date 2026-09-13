# Rencana Lengkap: Wire Everything — P0 sampai P4 (Status 2026-09-13)

Status eksekusi saat ini (branch `feat/alief/wire-ui`, 16 commit ahead `main`):

- P0 (5 klaim fix): SELESAI
- P1 + P1b (citations + span): SELESAI
- P2 (LLM wire): SELESAI — 8 modul baru, engine async, routes async, 54 test pass, build pass (dengan suppressions pada 3 halaman client)
- P3 (live Sectors): GATED — checklist kredit belum jalan (Task 13)
- P4 (GCS memory + deploy): SEBELUMNYA SELESAI; deploy CLI siap

Task 11 sisa: 3 halaman client (`cases`, `impact`, `company-detail`) masih sync `agentEngine`. `page.tsx` sudah migrasi fetch-based.

File utama: `lib/agent/llm/` (8 modul), `lib/agent/engine.ts`, `lib/types.ts`, `app/api/*/route.ts`, `tests/llm-*.test.ts`, `docs/PLAN-REAL-DATA-AGENT-DEPLOY.md` (P2: SELESAI, P3: scaffolded-but-not-live).

Blokir: Task 11 (3 halaman client), Task 13 (P3 live — butuh checklist kredit), deploy CLI (`Task 12`).
