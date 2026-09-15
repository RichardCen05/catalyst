# Behavioral Learning — Approach A (Rules Only)

**Scope:** Agent belajar dari koreksi user sebagai aturan eksplisit via `RuleProposal` yang sudah ada.

**Files touched:**
- `lib/types.ts`: tambah `listRules()` ke `MemoryStore`.
- `lib/memory-store.ts`: implementasi `listRules()` (return `ruleProposals`).
- `lib/store.ts`: mekanisme `RuleProposal` sudah ada (`saveCaseResolution`, `setRuleProposalStatus`).
- `lib/agent/engine.ts`: `compilePlaybook()` sudah membaca aturan dari `playbook`.

**Design:**
- Koreksi user (`recordInsight`) → `saveCaseResolution` → `RuleProposal`.
- `setRuleProposalStatus` (`accepted`) → aturan masuk `playbook.materialityRules` / `falsifiers`.
- `AgentEngine.compilePlaybook()` menerapkan aturan saat `analyzeCompany`.
- `MemoryStore.listRules()` mengekspos proposal untuk verifikasi.

**Testing:** Verifikasi alur: insight → proposal → playbook update → engine apply.
