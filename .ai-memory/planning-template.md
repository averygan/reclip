# Planning Templates — `task_plan.md` / `findings.md` / `progress.md`

Copy these into the repo root (or `.planning/YYYY-MM-DD-slug/`) at the start of
any multi-step task. See `AGENTS.md` §1.

## task_plan.md

```md
# Task Plan: <short title>

## Goal
One sentence: what "done" means.

## Phases
- [ ] 1. <phase> — <acceptance criterion>
- [ ] 2. <phase> — <acceptance criterion>
- [ ] 3. <phase> — <acceptance criterion>
- [ ] 4. Verify — run repo gates, all green

## Open questions
- <question> → <answer or owner>

## Resume point
If context resets, continue from: <last checked phase>.
```

## findings.md

```md
# Findings

## <YYYY-MM-DD> — <topic>
- Learned: <fact or decision>
- Source: <file:line / URL>
- Implication: <why it matters for this task>

## Errors logged
- [ ] <command> failed with <error>; next attempt: <different approach>
```

## progress.md

```md
# Progress Log

## <YYYY-MM-DD HH:MM>
- Ran: `<command>` → exit <code>
  - note: <what changed / observed>
- Ran: `<gate command>` → all green / <N> failed
- Attempts on <subtask>:
  1. <approach A> → failed (<reason>) — do not repeat
  2. <approach B> → succeeded
```

## Usage rules
- Create `task_plan.md` **before** the first code change.
- Append to `findings.md` after ~every 2 read/search operations.
- Log every command and every error in `progress.md`.
- Check off phases in `task_plan.md` as they finish.
- On `/clear` or crash, re-read these three files and resume — no restatement needed.
