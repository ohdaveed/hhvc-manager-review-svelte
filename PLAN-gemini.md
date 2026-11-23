# PLAN — call Gemini directly, retire the Railway backend

Branch `feat/gemini-direct`. Separate from `PLAN.md`, which belongs to the
sfgov-mimicry work and is not this task's to overwrite.

## Why

`RAILWAY_API_URL` (`web-production-9bb3b.up.railway.app`) answers Railway's
404 `Application not found` (measured 2026-11-22), so every AI rewrite in
production fails. The user does not want Railway any more. `/api/ai/generate`
will call Gemini itself.

## Decisions

- **Full parity** with the backend (user's choice): same system prompts and
  style corpus, structured JSON output, `validate-output` checks, one retry
  with the failures named, same response envelope (`result`, `valid`,
  `issues`, `provider`, `model`, `attempts`, `disclosure`).
- **Vendored, not rewritten.** Source is
  `HHVC_manager_review_current_tool_package` at its current `main`. Files are
  converted CommonJS → ESM mechanically so they can still be diffed against
  the original. Only `safeUrl`/`urlProbe` are taken from the 1,017-line
  browser `utils.js`. `buildTranscript` is not ported: only
  `findUnmappedSections` uses it, and validation never calls that.
- **Gemini over REST `fetch`, not `@google/genai`** — one fewer dependency.
- **New dependency: `zod`** (MIT, maintained) — the vendored page schema and
  request schema are written in it.
- **Gemini only.** No Anthropic provider is ported. Rethink's Claude-first
  fallback is removed and it asks for Gemini directly.
- Page keys come from this repo's `pagesByKey`, the corpus the app renders.

## Tasks

- [x] Vendor the backend modules into `src/lib/server/ai/` as ESM, plus the two style-corpus markdown files
- [ ] `gemini.ts`: REST `generateObject` (structured JSON, timeout, abort, refusal + MAX_TOKENS handling)
- [ ] `generate.ts`: `generateContent` / `generateRewrite` with validate-and-retry, ported from `index.js`
- [ ] `+server.ts` calls `generate.ts`; no Railway hop; request validated by the vendored schema
- [ ] Rethink sends `provider: 'gemini'` only; Claude fallback removed
- [ ] Unit tests: rewrite + content happy path, retry-on-invalid, refusal → 422, missing key → 501, auth still 401
- [ ] `bun run verify`, `check:ratchet`, `lint:ratchet` green
- [ ] Docs: CLAUDE.md AI-proxy + Deployment sections; `.env.example` if present
- [ ] Doppler: `GEMINI_API_KEY` in `prd` (set by the user — a value only a human types), referenced from `netlify_prd`; Railway refs dropped
- [ ] PR open, CI green; ask before merge (merge deploys production)
