Prompt untuk sesi berikutnya (ultracode, session baru, branch `feat/alief/wire-ui`):

```
Run plan lengkap di docs/superpowers/plans/2026-09-13-complete-plan.md.
Branch: feat/alief/wire-ui (16 commit ahead main).
P2 LLM wire: SELESAI (8 modul lib/agent/llm/*, engine async, routes async, 54 test PASS, build PASS dengan suppressions 3 halaman client).
P3 live sectors: GATED — Task 13 belum jalan (butuh checklist kredit + persetujuan 578 credit sisa).
Task 11 sisa: 3 halaman client (`app/cases/page.tsx`, `app/impact/page.tsx`, `app/companies/[symbol]/company-detail-client.tsx`) masih sync `agentEngine` — migrasi fetch-based belum lengkap.
Task 12 deploy CLI: siap (`pnpm build` hijau, image rebuild + `gcloud run deploy` dengan `GOOGLE_API_KEY` secret + `AGENT_MODE=deterministic` default).
Lanjutkan: (a) selesaikan Task 11 (migrasi 3 halaman client ke fetch `/api/analyze` / `/api/causal-graph` POST), (b) jalankan `pnpm lint && pnpm typecheck && pnpm test && pnpm build`, (c) konfirmasi deploy CLI (`Task 12`), (d) hanya setelah persetujuan kredit, jalankan checklist `Task 13` (`sectors-client` live) — JANGAN otomatis.
Referensi file: docs/PLAN-REAL-DATA-AGENT-DEPLOY.md (P2 SELESAI, P3 scaffolded-but-not-live), docs/superpowers/plans/2026-09-13-complete-plan.md (ringkasan lengkap).
```
