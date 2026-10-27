# Safety Checklist — Non-Negotiables

Derived from ponytail's "safety is non-negotiable" and deepseek-harness'
`SAFETY.md` experimental notice. See `AGENTS.md` §2.2 and §6.

Run this as a review gate before declaring any task done. Every item must be
satisfied or explicitly justified in an ADR / `ponytail:` marker with a known ceiling.

## Trust boundaries
- [ ] All untrusted input is validated and sanitized at the boundary.
- [ ] No external/agent-supplied data is executed as code (no unsafe `eval`/`exec`).
- [ ] Shell commands are constructed safely (no unsanitized interpolation of untrusted values).

## Data loss
- [ ] Destructive operations (delete, overwrite, `git reset --hard`, drop) are guarded.
- [ ] Irreversible writes require explicit confirmation or a safe default (backup / dry-run).
- [ ] No silent truncation or overwriting of user data.

## Security
- [ ] No secrets, tokens, or credentials are written into source, logs, or commits.
- [ ] No new exposed network surface without auth; no debug endpoints left open.
- [ ] Dependencies are from trusted sources and keep the runtime closure closed.

## Accessibility
- [ ] UI uses semantic markup with labels and roles.
- [ ] Color is never the sole carrier of meaning; contrast meets the baseline.
- [ ] Interactive elements are keyboard-operable.

## Experimental surfaces
- [ ] Any experimental/unsafe feature is marked with a bilingual `SAFETY.md`-style notice.
- [ ] Risky behavior is gated behind a flag the user must opt into.

## If you must cut a corner
Use a `ponytail:` marker **only** for trivial, bounded simplifications, and record
the accepted ceiling. Never use it to waive an item above — those are non-negotiable.
