---
name: verify
description: Build, launch and drive this app to observe a change at its real surface (browser). Use when verifying a diff, reproducing a UI bug, or capturing screenshots of the review workspace.
---

# Verifying hhvc-manager-review-svelte

The surface is **pixels** — SvelteKit app driven in a browser. Almost every
interesting path (edit targets, FieldsPanel, ReviewQueue) requires a
**signed-in session AND live Supabase rows**, so a bare `bun run dev` shows
"Viewing signed out" and "No pages loaded" and verifies nothing.

## Handle: local Supabase stack + dev server

The CLI is not installed globally, but it is a devDependency (`supabase` in
`package.json`), so `bunx supabase` runs the repo's pinned version. Prefer it
over `@latest`, which can drift from the version the migrations were written
against. Docker is required and available.

```sh
bunx supabase start      # ~GBs of images on first run; run backgrounded
bunx supabase db reset   # applies migrations + supabase/seed.sql (39 pages)
```

`bun run env:status` says which Supabase target `.env.local` points at. Check it
before trusting a signed-out-looking app: pointed at the hosted project, the
local seed password is rejected and every review read silently returns nothing.

That is all. Both blockers that used to need hand-patching after a reset — the
seed's NULL `confirmation_token` (GoTrue 500 `Database error querying schema`)
and the missing table GRANTs (`42501 permission denied for table reviews`) — are
fixed in `scripts/gen-seed.ts` and
`supabase/migrations/20260823140000_grant_table_privileges.sql`. A clean reset
gives you a signed-in app.

## Launch

Do **not** edit `.env.local` (untracked user state). Inline the vars — Vite
picks up process env for `SVELTE_PUBLIC_*`:

```sh
SVELTE_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
SVELTE_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY from `supabase start` output> \
bun run dev --port 5199
```

`ensureDevSession()` (src/lib/supabase.ts) then auto-signs-in as
`demo@hhvc.local` — dev-only, compiled out of production.

## Faking the AI backend

Without `GEMINI_API_KEY` in `.env.local`, `/api/ai/generate` answers 501 and
the panel shows error cards. The route honours **`GEMINI_BASE_URL`**
(`$env/dynamic/private`), so point it at a local stub instead of intercepting
network calls in the browser. That keeps the whole real chain —
`requestGeneration` → bearer token → the route's Supabase `getUser` check →
prompts → validation — intact and fakes only Gemini:

```sh
GEMINI_BASE_URL=http://127.0.0.1:5299 GEMINI_API_KEY=stub-key bun run dev --port 5199
```

Stub answers `POST /models/<model>:generateContent` with Gemini's shape —
`{"candidates":[{"content":{"parts":[{"text":"{\"rewrittenText\":\"...\"}"}]},"finishReason":"STOP"}]}`. Note it must also answer
the "recommendation" call, which reuses `task: 'rewrite-field'` with a
"Do not rewrite this text" instruction.

## Flows worth driving

- `/review/departments--healthy-housing-and-vector-control--about` — richest page.
- Edit targets are `button[data-rewrite-field="<fieldId>"]`. Ids:
  `title`, `summary`, `sections.{fieldKey}.heading|paragraphs.{i}|bullets.{i}|callout.title|callout.text`.
  Click = replace selection; shift/meta/ctrl-click = toggle. `aria-pressed`
  and the accessible name (`"…, selected, field N"`) carry selection state.
- Panel tabs are `div[data-value="fields"|"overview"|"checks"|"help"]`.
- Decisions: Overview tab `[role="radio"]` (Approve/Revise/Blocked) — drives
  the queue's progress block and three-segment bar live.
- Rail collapse: `button[aria-label="Collapse queue"|"Collapse review panel"]`,
  persisted in `localStorage`, survives reload.
- Saved edits land in `public.edits` — check with
  `docker exec supabase_db_… psql -U postgres -d postgres -c "SELECT field_id, new_content FROM edits;"`
  (the column is `new_content`, not `new_text`).

## Gotchas

- Screenshots must stay under the repo root or `.playwright-mcp/` — the MCP
  server refuses paths outside them. `.playwright-mcp/` is gitignored; the
  repo root is not.
- `supabase/.temp/` is **not tracked**: the CLI's own `supabase/.gitignore`
  excludes it. That matters because `supabase start` writes `start-secrets/`
  there (service-role key, DB URL, JWT secret). Never force-add it.
- A saved edit does not re-render on reload: nothing hydrates `pageStore`
  from `editsStore`, so the mockup always shows the static corpus copy.
