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

The CLI is not installed globally; `bunx supabase@latest` works. Docker is
required and available.

```sh
bunx supabase@latest start      # ~GBs of images on first run; run backgrounded
bunx supabase@latest db reset   # applies migrations + supabase/seed.sql (29 pages)
```

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
`arrizon.david@gmail.com` — dev-only, compiled out of production.

## Faking the AI backend

`RAILWAY_API_TOKEN` is not in `.env.local`, so `/api/ai/generate` proxies to
the real Railway host and gets a 403 — the panel shows `API Error` cards.
The proxy honours **`RAILWAY_API_URL`** (`$env/dynamic/private`), so point it
at a local stub instead of intercepting network calls in the browser. That
keeps the whole real chain — `requestGeneration` → bearer token → the route's
Supabase `getUser` check → fetch — intact and fakes only the upstream:

```sh
RAILWAY_API_URL=http://127.0.0.1:5299 RAILWAY_API_TOKEN=stub-token bun run dev --port 5199
```

Stub returns `{"result":{"rewrittenText":"..."}}`. Note it must also answer
the "recommendation" call, which reuses `task: 'rewrite-field'` with a
"Do not rewrite this text" instruction.

## Flows worth driving

- `/review/departments--healthy-housing-and-vector-control--about` — richest page.
- Edit targets are `button[data-rewrite-field="<fieldId>"]`. Ids:
  `title`, `summary`, `audience.{i}`, `sections.{fieldKey}.heading|paragraphs.{i}|bullets.{i}|callout.title|callout.text`.
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
- `supabase/.temp/` is **tracked**, and `supabase start` writes a new
  `start-secrets/` directory into it. Check `git status` before committing.
- A saved edit does not re-render on reload: nothing hydrates `pageStore`
  from `editsStore`, so the mockup always shows the static corpus copy.
