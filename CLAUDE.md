# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A review tool for SF.gov Healthy Housing and Vector Control (HHVC) page mockups. Reviewers sign in with a Supabase magic link, browse mockup pages rendered from static content modules, and edit copy inline with AI rewrite assistance. It is a port of a vanilla-JS app; parts of that app are still in the tree as porting reference.

## Commands

Package manager is **bun** (`bun.lock`). Prefer `bun run <script>`.

```sh
bun run dev              # vite dev, port 5173
bun run build            # production build (adapter-netlify)
bun run check            # svelte-check — see baseline note below
bun run lint             # prettier --check . && eslint .
bun run format           # prettier --write .

bun run test:unit -- --run                      # all unit tests, once
bun run test:unit -- --run path/to/file.test.ts # a single file
bun run test:unit                               # watch mode
bun run test:e2e                                # playwright (builds + previews on :4173)

bun run verify           # unit tests + production build, one PASS/FAIL line each
bun run verify:live      # also probes the deployed site (root 200, proxy 401s, bundle leak scan)
```

`verify` writes full output to `$TMPDIR/hhvc-verify.log` and prints only a summary — read the log only when a line says FAIL. `SITE_URL=...` retargets the live probes.

### Vitest project split

`vite.config.ts` defines two projects, and the file's **location** decides which runs it:

- `src/**/*.{test,spec}.{js,ts}` → **server** project, node environment
- `tests/**/*.test.ts` → **client** project, jsdom with browser resolve conditions

A test placed in the wrong directory gets the wrong environment. E2E is separate: `**/*.e2e.{ts,js}`, matched by `playwright.config.ts`.

## Architecture

### Content pipeline

Page content lives as plain TypeScript modules in `src/lib/data/`, one per mockup page, aggregated by `src/lib/data/index.ts` into `allPages`. Each exports `{ slug, type, title, summary, audience, sections[] }`, where sections carry `paragraphs`/`bullets` plus a `karl` field describing how that block maps to SF.gov's Karl/Wagtail CMS fields, and `editorStatus`/`editorNote` describing the mockup's provenance. Those notes are review material — treat them as content, not comments.

`src/lib/stores/pageData.svelte.ts` derives the routable id at construction time: `sf.gov/topic-x--about` becomes `topic-x--about` (strip `sf.gov/`, slashes to dashes). So `/review/[slug]` matches that derived id, **not** the `slug` field in the data module. Adding a page means adding the module and exporting it from `index.ts`; nothing else registers it.

### Two parallel state systems

These are unrelated and easy to confuse:

- **`$lib/stores/pageData.svelte.ts`** — Svelte 5 runes class (`pageStore`). Holds the static mockup corpus and `activeField` (the inline-edit target). No persistence.
- **`$lib/stores/reviewState.ts`** — Svelte 4 `writable` stores (`pagesStore`, `editsStore`) backed by Supabase, with realtime channels and optimistic-update-then-rollback. This is the persistent side.

### AI proxy

Browser never holds the backend token. `ActionBar.svelte` calls `$lib/ai/generate`'s `requestGeneration()`, which attaches the caller's Supabase access token; `src/routes/api/ai/generate/+server.ts` verifies that token, enforces payload caps (64KB body → 413, 20k-char `fieldText` → 400), then forwards to the Railway backend with `RAILWAY_API_TOKEN` server-side.

Call the endpoint through `requestGeneration()`. A bare `fetch('/api/ai/generate')` will 401.

Note the error handling: `HttpError`s are rethrown so upstream status codes survive, and the auth check sits _outside_ the try — a SvelteKit `HttpError` is not an `Error` instance, so a catch-all would flatten a 401 into a 500.

### Supabase

Client-side only. There is no `hooks.server.ts` and no `event.locals` — sessions live in the browser, and the API route verifies bearer tokens itself with a per-request client (`persistSession: false`). Schema is `supabase/migrations/`: `reviews`, `pages`, `comments`, `edits`.

RLS is enabled on all four tables, but every policy is `FOR ALL TO authenticated USING (true)` — any signed-in user can read and delete any row, and `edits` records no author. Known, unresolved, needs a product decision before it matters.

### Legacy port

`src/lib/legacy-core/` holds ported vanilla-JS modules still in use (`karl-transcript.js` drives `HelpPanel`, `karl-blocks.js` the Karl field mapping). `src/legacy_main.js` is the old entry point, imported by nothing — kept as reference. Its `./review/*.js` imports don't resolve.

## Configuration gotchas

**There is no `svelte.config.js`.** SvelteKit config lives inside the `sveltekit({ ... })` plugin options in `vite.config.ts` — adapter, `compilerOptions`, and `env` together. Documentation and generated snippets will tell you to create `svelte.config.js`; doing so splits config across two files and orphans the settings below.

**Public env vars use the `SVELTE_PUBLIC_` prefix**, set by `env.publicPrefix` in that same block. A `PUBLIC_`-prefixed variable is treated as _private_ and will not reach `$env/static/public`. These are inlined at build time, so they must exist before the build runs, not just at runtime.

**`bun run check` has a large pre-existing error baseline** (~55), almost all from `src/legacy_main.js`'s unresolved imports. Compare against the baseline rather than expecting zero.

**A green test suite does not mean the build passes.** Unit tests don't import the legacy modules, so a broken one there (e.g. duplicate `export { ... }` blocks in `karl-blocks.js`, which rolldown rejects) fails only at build. Run `bun run verify` before claiming a change is good.

## Deployment

Netlify, site `hhvc-manager-review`, **not Git-connected** — deploys are manual (`netlify deploy --build --prod`) and build locally, so Netlify build minutes stay at zero and pushes to `main` do not redeploy. Env vars are set on the Netlify site; `RAILWAY_API_TOKEN` is marked secret.

Supabase auth URLs must include any new origin, or magic links redirect to a dead URL. The hosted allow-list covers production, `localhost:5173`, and Netlify preview hostnames; `supabase/config.toml` covers the local stack.

<!-- FABLIZE:BEGIN — run Opus like Fable (always-on router). Verified procedures only. Install/update: fablize setup.sh -->
## Operating mode (always on — auto-route by task signal)

Apply what the task signals; with no signal, baseline only. Read each pack only when needed. Routing: smallest matching discipline only, overlap only when genuinely multi-category, mimic observable behavior only.

- **[always]** Lead with the outcome · stay within the requested scope (no incidental refactors) · ground completion claims in this session's tool results · confirm before destructive or hard-to-reverse actions.
- **[2+ sequential stories]** Run `python3 /home/ohdaveed/.claude/plugins/cache/fablize/fablize/2.1.1/scripts/goals.py`: create → next → checkpoint (with evidence) → final verification gate (no completion without `--verify-cmd` and `--verify-evidence`). Run from the repo root; state in `./.fablize/` (resume with `status`). Skip for single-step tasks.
- **[debugging / test failure / unknown cause / review]** Follow `/home/ohdaveed/.claude/plugins/cache/fablize/fablize/2.1.1/packs/investigation-protocol.txt`: reproduce first → 3+ competing hypotheses → evidence per hypothesis → full causal chain → verify before/after → report rejected hypotheses.
- **[render/executable artifact: HTML, SVG, game, UI, chart]** Follow `/home/ohdaveed/.claude/plugins/cache/fablize/fablize/2.1.1/packs/verification-grounding-pack.txt` grounding loop: run it in the real renderer → observe the output → fix what you see → re-run. A static check is not observation.
- **[hard or ambiguous task]** Adaptive thinking scales with difficulty automatically. To go higher, recommend `/effort xhigh` to the user. Depth (capability) cannot be raised: if stuck 2+ times or out-of-spec discovery is needed, report the limit honestly and escalate.
<!-- FABLIZE:END -->
