---
name: upstream-audit
description: Use when the user asks to audit upstream, check what to port from reclip, compare against the original repo, check purity, or verify cliper hasn't silently regressed. Triggers on phrases like "audit upstream", "check purity", "what should we port from reclip", "compare with original", "is cliper still in sync", "upstream diff".
---

# Upstream Audit (cliper ⇄ reclip)

Cliper is a hardened fork of [averygan/reclip](https://github.com/averygan/reclip). This skill helps decide what to port **from upstream → cliper** (Mode A) and what cliper-specific code must be preserved against silent regression (Mode B).

## Upstream

```
URL:    https://github.com/averygan/reclip
Remote: upstream
Branch: upstream/main
```

## When to run each mode

- **Mode A (port-from-upstream)** — default. Run when the user asks "what should we port", "audit upstream", or after upstream has had new commits. Produces a portability report.
- **Mode B (purity-check)** — run when the user asks "check purity", "did we regress", or before merging a big PR. Verifies cliper's hardening surface is still intact.
- **Both** — when in doubt or the user says "do both". Run A then B.

## Cliper's protected surface (do not regress)

These are the customizations that distinguish cliper from upstream. Any port that touches them needs careful review.

| Area | Files / symbols | Why it matters |
|---|---|---|
| Domain allowlist | `app.py` → `ALLOWED_DOMAINS`, `validate_url` | Public-deploy safety — reject arbitrary URLs |
| SSRF guard | `app.py` → `is_private_host` | Blocks private/loopback/link-local IPs |
| Rate limiting | `app.py` → `flask_limiter`, `get_real_ip` (CF-aware) | Per-IP abuse limits |
| Caps | `app.py` → `MAX_DURATION_SEC`, `MAX_FILESIZE`, `FILE_TTL_SEC`, `MAX_CONCURRENT_DOWNLOADS` | Cost control |
| Turnstile | `app.py` → `verify_turnstile`, `TURNSTILE_*` env, `templates/index.html` widget | Bot protection |
| Auto-cleanup | `app.py` → `cleanup_worker` thread | 30-min file TTL |
| Concurrency | `app.py` → `download_semaphore`, gunicorn `-w 1 -k gthread --threads 16` | Single-process job dict requires single worker |
| DB logging | `db.py` (entire file), `db.log_download(...)` calls in `app.py` | Postgres analytics, fail-safe |
| Branding | `cliper.sh` (renamed from `reclip.sh`), `cliper` name, README, `static/favicon.svg`, `static/og.png`, `static/tp-*.png` | Product identity |
| UI/Design | `templates/index.html`, `DESIGN.md` (Revolut-inspired) | Heavy rewrite — upstream UI changes almost never apply |

If an upstream commit touches any of the above, classify it as **adapt** or **skip**, never **clean cherry-pick**.

## Procedure

### Step 0 — Setup (idempotent)

```bash
# Add upstream remote if missing
git remote get-url upstream >/dev/null 2>&1 || \
  git remote add upstream https://github.com/averygan/reclip
git fetch upstream --quiet
```

### Step 1 — Find divergence

```bash
BASE=$(git merge-base HEAD upstream/main)
git log --oneline "$BASE..upstream/main"   # commits upstream has that we don't
git log --oneline "$BASE..HEAD"            # commits we have that upstream doesn't
git diff --stat upstream/main..HEAD        # net file divergence
```

If `BASE == upstream/main` HEAD, upstream has nothing new — say so and stop Mode A.

### Step 2 — Mode A: classify each upstream-only commit

For every commit in `$BASE..upstream/main`, run:

```bash
git show --stat <sha>
git show <sha> -- <interesting-file>
```

Then categorize:

| Category | Meaning | Default recommendation |
|---|---|---|
| `bugfix` | Fixes a broken behavior cliper also has | **Port** |
| `yt-dlp-compat` | Adapts to a yt-dlp / platform change | **Port** (often urgent) |
| `feature` | Net-new capability | **Evaluate** — does cliper want it? |
| `hardening` | Security/safety improvement | **Port** if not already covered |
| `ui` | Frontend change to `templates/index.html` | **Skip** by default — cliper UI is bespoke |
| `branding` | reclip-specific copy/assets | **Skip** |
| `docs` | README/docs only | **Port** selectively |
| `chore` | tooling, gitignore, refactors | **Evaluate** |

Then check the **protected surface** table above — if the commit touches a protected file/symbol, downgrade `port` → `adapt` and explain the conflict.

### Step 3 — Mode A output

Markdown report with this structure:

```markdown
## Upstream audit — <date>

Upstream HEAD: <sha> · cliper HEAD: <sha> · Merge-base: <sha>
Upstream-only commits: <N>

### Recommended ports

| SHA | Title | Category | Action | Notes |
|---|---|---|---|---|
| abc1234 | Fix yt-dlp 403 on Vimeo | yt-dlp-compat | **port** | Clean cherry-pick |
| def5678 | Add cookie support | feature | **adapt** | Touches `validate_url`; gate behind env flag |

### Skip

| SHA | Title | Reason |
|---|---|---|
| ... | UI tweak to button color | Cliper UI diverged (DESIGN.md) |

### Suggested commands

For clean ports:
\`\`\`bash
git cherry-pick abc1234 def5678
\`\`\`

For adapt cases, summarize the manual change needed.
```

### Step 4 — Mode B: purity check

Verify each row of the protected-surface table is still present in `HEAD`:

```bash
# Domain allowlist still defined?
grep -n "ALLOWED_DOMAINS" app.py

# SSRF guard still wired into validate_url?
grep -n "is_private_host" app.py

# Rate limiter still applied?
grep -nE "@limiter\.limit|Limiter\(" app.py

# Turnstile verify still called on /api/download?
grep -n "verify_turnstile" app.py

# Cleanup worker still started?
grep -n "cleanup_worker" app.py

# DB logging call still in run_download finally block?
grep -n "db\.log_download" app.py

# Single-worker gunicorn?
grep -n "gunicorn" Dockerfile
```

For any check that fails, flag as a **regression** with the file:line where it should be.

Also diff cliper-protected files against `$BASE` to make sure no recent commit silently undid hardening:

```bash
git log --oneline "$BASE..HEAD" -- app.py db.py
# spot-check anything suspicious with `git show <sha>`
```

### Step 5 — Mode B output

```markdown
## Purity check — <date>

| Check | Status | Evidence |
|---|---|---|
| Domain allowlist | ✓ | app.py:20 |
| SSRF guard | ✓ | app.py:61, 81 |
| Rate limiter | ✓ | app.py:53, 246, 304 |
| Turnstile verify | ✓ | app.py:89, 318 |
| Cleanup worker | ✓ | app.py:109, 134 |
| DB logging | ✓ | app.py:222, db.py |
| Single-worker gunicorn | ✓ | Dockerfile:21 |

All hardening intact. (Or: list regressions with fix recommendations.)
```

## Constraints

- **Read-only by default.** This skill reports; it does not cherry-pick or modify files unless the user explicitly asks ("port the safe ones", "apply the patches").
- **Never delete the upstream remote** after running — leave it configured so subsequent runs are fast.
- **Don't pull `upstream/main` into a branch automatically.** Cherry-pick only the SHAs the user approves.
- **Respect cliper's UI direction.** Upstream's `templates/index.html` is structurally incompatible — only port logic, never markup or styles.
- **yt-dlp version drift is the #1 reason to port.** When upstream patches a platform-specific extractor flag, that's almost always worth backporting fast.
