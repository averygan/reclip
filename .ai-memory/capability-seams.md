# Capability Seams — Plugin Pattern (full)

Source: https://github.com/deepseek-ai/deepseek-harness ("Everything is a Plugin").
See `AGENTS.md` §3.

## Principle
Every component — model adapters, tool registries, even the agent loop — is a
**plugin** composed through a host (Cordis-style). New behavior is a new plugin;
core logic stays closed.

## The Capability Seam
A *seam* is a swappable capability with three roles:

| Role | Responsibility | Example |
| --- | --- | --- |
| **Service Definition** | Declares the interface (the seam). | `ctx.llm`, `ctx.fs`, `ctx.shell` |
| **Service Provider** | Implements the interface. | `llm-deepseek`, `fs-local`, `fs-sandbox` |
| **Consumer** | Uses the capability (often a tool). | `tool-bash` consuming the shell capability |

Swap a **provider** to change behavior end-to-end — e.g. `fs-local` → `fs-sandbox`
(move from local disk to a Landlock-sandboxed environment) — without touching any
**consumer** call site.

## Provider checklist (before adding a plugin)
- [ ] Is the **interface** already defined, or do I need a new seam? (Define the seam first.)
- [ ] Does the provider keep the **runtime closure closed** (no unbounded transitive deps)?
- [ ] Is it wired through the **plugin host / event bus**, not direct imports from core?
- [ ] Is it selected by **configuration**, so it can be swapped without code changes?
- [ ] Does it have a **test** proving the seam contract (provider-agnostic)?
- [ ] Is the choice recorded as an **ADR** if it is a lasting/architecture-level decision?

## Composition notes
- Prefer an **event bus** for cross-cutting concerns (logging, telemetry, gates)
  over scattered direct calls.
- Consumers depend on the **definition**, never on a concrete provider.
- Sandboxing (e.g. Landlock) and filesystem/shell access live behind seams so the
  same agent runs safely locally and remotely.

## Monorepo orientation (harness layout, for reference)
- `packages/core/` — product API spine: session, agent, tools.
- `packages/llm/` — capability definitions + model adapters.
- `vendor/` — vendored Cordis (local modifications tracked here).
- `apps/` — entry points (CLI, Web UI).
- `docs/` — architecture, capability-seams, development, ADRs.
