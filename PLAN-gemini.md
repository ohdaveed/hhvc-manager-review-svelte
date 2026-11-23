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

## Notes from implementation

- **Overwrote the old route test by mistake, then ported it.** `server.test.ts`
  existed; the still-relevant cases (cap boundaries, no leaked failure reason,
  no forwarded Origin, abort signal, Cancel -> 499) are carried over.
- **Unusable model output is a 502 with its message; any other failure is a
  generic 500.** Echoing `err.message` would leak a network address.
- **`lint:ratchet` reads 8 locally, 4 in CI.** The extra 4 are in
  `.claude/worktrees/clever-leavitt-ca3bf2`, which `main`'s `.gitignore` does
  not exclude yet (`b629045` adds it on `feat/reviewer-invites`). With that dir
  excluded the count is exactly 4.
- **`lefthook.yml` typos now passes `--force-exclude`.** typos ignores
  `extend-exclude` for explicit paths, so the existing `bun.lock`/`.tooling`
  excludes never applied at commit time either.

## Tasks

- [x] Vendor the backend modules into `src/lib/server/ai/` as ESM, plus the two style-corpus markdown files
- [x] `gemini.ts`: REST `generateObject` (structured JSON, timeout, abort, refusal + MAX_TOKENS handling)
- [x] `generate.ts`: `generateContent` / `generateRewrite` with validate-and-retry, ported from `index.js`
- [x] `+server.ts` calls `generate.ts`; no Railway hop; request validated by the vendored schema
- [x] Rethink sends `provider: 'gemini'` only; Claude fallback removed
- [x] Unit tests: rewrite + content happy path, retry-on-invalid, refusal → 422, missing key → 501, auth still 401
- [x] `bun run verify`, `check:ratchet`, `lint:ratchet` green
- [x] Docs: CLAUDE.md AI-proxy + Deployment sections; `.env.example` if present
- [ ] Doppler: `GEMINI_API_KEY` in `prd` (set by the user — a value only a human types), referenced from `netlify_prd`; Railway refs dropped
  - Done except the key itself. `prd` and `netlify_prd` reference
    `${hhvc-manager-review.prd.GEMINI_API_KEY}` (Doppler refuses chained
    references, so `netlify_prd` points at the source, not at `prd`);
    `netlify_prd`'s Railway refs are deleted.
  - **BLOCKER: that value is not a Gemini key.** It is 43 chars and does not
    start with `AIza`; a live `generateContent` call with it answered
    `400 API key not valid` (2026-11-22). The user must create a key in Google
    AI Studio and set it in `hhvc-manager-review/prd` (both refs follow).
    `GEMINI_MODEL` there is `gemini-3.7-flash`.
- [x] PR open (#160), CI green; ask before merge (merge deploys production)
