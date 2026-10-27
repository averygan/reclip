# References — Source Projects & Where Their Ideas Live

This file records the proven approaches synthesized into `AGENTS.md`, and maps
each idea back to its origin so the guidance can be audited and updated.

## 1. planning-with-files (OthmanAdi)
- Repo: https://github.com/OthmanAdi/planning-with-files
- Contribution: **persistent file-based planning / context engineering**.
- Key ideas → `AGENTS.md` §1:
  - Filesystem = disk (durable), context window = RAM (volatile).
  - 3-file pattern: `task_plan.md`, `findings.md`, `progress.md`.
  - Lifecycle hooks re-inject the plan each turn so goals survive `/clear`,
    crashes, and compaction.
  - Key rules: create plan first; 2-action rule; log all errors; never repeat failures.
  - Completion gate: stop only when every phase is checked off.
- Evidence of effectiveness (per its README): ~96.7% assertion pass rate;
  recovery in ~5.0 turns vs ~13.3 without the skill; spans 60+ agents.

## 2. ponytail (DietrichGebert)
- Repo: https://github.com/DietrichGebert/ponytail
- Contribution: **minimalist, reuse-first output discipline**.
- Key ideas → `AGENTS.md` §2:
  - The "lazy senior dev": write the minimum that works; the best code is unwritten.
  - Reuse ladder: YAGNI → reuse → stdlib → native → dependency → one line → minimum.
  - Lazy about the solution, never about reading.
  - Safety non-negotiable: trust-boundary validation, data-loss handling,
    security, accessibility are never cut.
  - `ponytail:` marker for deliberate, bounded corner-cuts; `/ponytail-debt` greps it.
- Evidence of effectiveness (per its README, measured on real Claude Code
  sessions editing a FastAPI + React repo): ~54% less code (up to 94%), ~20%
  cheaper, ~27% faster, 100% safe — the only arm that cut every metric and stayed safe.

## 3. deepseek-harness (deepseek-ai)
- Repo: https://github.com/deepseek-ai/deepseek-harness
- Contribution: **plugin architecture, capability seams, verification & ADR discipline**.
- Key ideas → `AGENTS.md` §3, §4, §5, §6:
  - "Everything is a Plugin," powered by a vendored Cordis framework.
  - Capability Seam = Service Definition + Service Provider + Consumer; swap
    providers, not call sites.
  - Verification gates: `lint`, `lint:fix`, `test`, `test:coverage`, `knip`,
    `publint`, `hygiene`; run the repo's own gate command, not a subset.
  - ADRs for capability seams and adapter choices (ADR 0009 seams, 0010 twin LLM adapters).
  - Bilingual docs (`name.md` + `name.zh.md` + `name.i18n.yaml`); bilingual
    `SAFETY.md` experimental notice.
  - Keep the runtime closure closed; enforce LF/`.editorconfig` hygiene.
- Structure: pnpm monorepo — `apps/`, `packages/core` (session/agent/tools),
  `packages/llm` (adapters), `vendor/` (Cordis), `docs/`.

## Synthesis map

| AGENTS.md section | Primary source | Reinforced by |
| --- | --- | --- |
| §1 Plan in files | planning-with-files | deepseek-harness (`.agents/notes` logs) |
| §2 Minimum that works | ponytail | planning-with-files (log errors, don't repeat) |
| §3 Plugins / seams | deepseek-harness | ponytail (reuse before write) |
| §4 Verify | deepseek-harness | ponytail (measure outcomes) |
| §5 ADRs | deepseek-harness | planning-with-files (findings.md) |
| §6 Docs discipline | deepseek-harness | — |
| §7 Memory layout | planning-with-files | deepseek-harness (`.agents/`) |
