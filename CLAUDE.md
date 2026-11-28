# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A review tool for SF.gov Healthy Housing and Vector Control (HHVC) page mockups. Reviewers sign in with a Supabase magic link, land on a page that resumes their review, browse mockup pages rendered from static content modules, and edit copy inline with AI rewrite assistance. They can also describe a page that does not exist yet and have it drafted by AI. It is a port of a vanilla-JS app; parts of that app are still in the tree as porting reference.

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
bun run verify:live      # also probes the deployed site (published commit, root 200, proxy 401s, bundle leak scan)
bun run audit:privileges # which functions in `public` an anon/authenticated caller can EXECUTE
bun run lint:ratchet     # asserts the eslint error count is exactly at baseline
bun run check:ratchet    # asserts the svelte-check error count is exactly at baseline

bun run env:status       # which Supabase target local development points at
bun run env:local        # point it at the local stack (values read from `supabase status`)
bun run env:hosted       # point it at the hosted project (values from Doppler, else `.env.hosted`)
```

### Choosing a Supabase target

`scripts/env-target.ts` rewrites the three target variables in `.env.local` and reports what is active. Run `env:status` before assuming which database you are developing against — the failure it exists for is silent.

Pointed at the hosted project, `ensureDevSession()` signs in with the local seed's password, the hosted project rejects it (`captcha protection: request disallowed`), and with no session every `TO authenticated` policy denies every read. `loadReview()` then finds nothing, so the queue, decisions, notes and checks are all inert **while the mockups still render from the static corpus** — the app looks like it is working. The only symptom is `No review found: null` in the console.

Four properties worth keeping if this script is ever changed:

- **Local values come from `supabase status` at switch time, never stored.** They change when the stack is recreated, and a stored copy goes stale silently.
- **Hosted values come from Doppler (`hhvc-svelte/prd`), and `.env.hosted` is only the fallback.** `doppler secrets download` is tried first; the gitignored profile is read when Doppler cannot answer — not installed, not logged in, offline, project or config renamed — or when Doppler is missing any of the four keys, and the switch fails outright when neither source has them. The script prints which source supplied the values, because "it worked" and "it worked from the file you meant to retire" are different outcomes. `SUPABASE_DB_URL` is why Doppler owns these: the service-role key bypasses RLS through the API, but the connection string is DDL, so keeping it out of a plaintext file in the working tree is the point.
- **Two script credentials switch with the two `SVELTE_PUBLIC_*` vars — four variables in all.** `SUPABASE_SERVICE_ROLE_KEY` is what `scripts/sync-checks.ts` authenticates with, and it bypasses RLS. `SUPABASE_DB_URL` is the direct Postgres connection `corpus:import` uses, since `import_corpus_version` moved to the `private` schema where PostgREST cannot reach it — that script no longer uses the service-role key at all. Moving only some of them leaves the app reading local while those scripts write to production — `env:status` reports that state as `SPLIT TARGET`, and it is the state this repo was in before the script existed. `credentialsAgree` reads the project ref out of the connection string's host (`db.<ref>.supabase.co`) or its username (`postgres.<ref>@…pooler…`), so a mismatched connection string is caught rather than merely carried along; the string itself is never printed, because unlike the API URL it carries the database password.
- **No key is printed.** Targets are named by URL and project ref.

`SVELTE_PUBLIC_*` are `$env/static/public` and inlined at build time, so **a running dev server keeps serving the old target until restarted**. The script says so when it sees something on :5173.

`verify` writes full output to `$TMPDIR/hhvc-verify.log` and prints only a summary — read the log only when a line says FAIL. `SITE_URL=...` retargets the live probes.

**`verify`'s result is trustworthy again as of `819d914`, and was not before.** Its `quiet()` helper ended the brace group with `echo`, so the group's status was always `0`: both gates printed PASS unconditionally and the script exited `0` whatever happened. It reported "all local gates green" over a failing unit test for as long as that test had been broken. If you are reading a `verify` result from a commit older than that fix, it means nothing. The one visible symptom was the count rendering as `(? passed)` — the regex expects `Tests N passed` and a failing run prints `Tests 1 failed | 12 passed`, so a `?` there is worth chasing.

The same gates run in CI on every PR (`.github/workflows/pr.yml`), and `main` requires them — see Branch protection below. Running `verify` locally is the fast check; it is not what decides whether a PR can merge.

### `audit:privileges`

`bun run audit:privileges --local` audits the local stack; without `--local` it
reads `SUPABASE_DB_URL` and audits whatever that points at. It needs a **direct
Postgres connection** because `pg_proc.proacl` is not reachable through
PostgREST, and it names the target by hostname only — the connection string
carries the database password.

It exists because `20260823130000` closed the anon-EXECUTE hole **for one
function**, and the hosted projects' `ALTER DEFAULT PRIVILEGES` grant EXECUTE to
`anon` and `authenticated` by name, so every new function arrives
anon-executable and reachable at `/rest/v1/rpc/<name>`. Prevention was rejected
twice: a `DO` block in a migration runs once and cannot see a function added two
migrations later, and a schema-wide default revoke would 403 the first RPC
someone genuinely wants callable. It also flags any `SECURITY DEFINER` function
with no pinned `search_path`. The allowlist in the script is empty and a test
asserts it stays that way — adding a name is meant to need a justification, not
a drive-by edit.

### Vitest project split

`vite.config.ts` defines two projects, and the file's **location** decides which runs it:

- `src/**/*.{test,spec}.{js,ts}` → **server** project, node environment
- `tests/**/*.test.ts` → **client** project, jsdom with browser resolve conditions
- `tests/**/*.spec.ts` → **server** project, node environment. The server project's
  `include` covers `tests/**` too and excludes only `tests/**/*.test.ts`, so the
  extension — not just the directory — decides. A node-only test that needs `fs`
  belongs here (`tests/seedHosted.spec.ts`); a `.test.ts` alongside it gets jsdom.

A test placed in the wrong directory gets the wrong environment.

**The client project loads `tests/setup/jsdomStorage.ts`, and on Node 25+ it is load-bearing.** Node now defines its own global `localStorage`, which without `--localstorage-file` evaluates to `undefined` and hides jsdom's — so every test touching storage fails in `beforeEach` (`Cannot read properties of undefined (reading 'clear')`), measured as the 11 `rails`/`present` tests in `tests/pageData.test.ts` on Node 26. The setup file restores jsdom's `localStorage`/`sessionStorage` only when the global is unusable, so on older Node it does nothing. If a storage test fails only on one machine, `NODE_OPTIONS=--no-experimental-webstorage` is the quick confirmation. CI doesn't pin Node, so it can be green while a developer is red. E2E is separate: `**/*.e2e.{ts,js}`, matched by `playwright.config.ts`.

### Landing page and AI-drafted pages

`/` is a page, not a redirect: signed in, it leads with the reviewer's resume point, the progress denominator and the propose-a-page form, then lists every page; signed out, it explains the tool and offers sign-in. The old root redirect is gone, so nothing should assume `/` forwards anywhere.

A drafted page is not in the static corpus, so its content lives in `draft_pages` (`supabase/migrations/20261123100000_draft_pages.sql`): title, description, `content` jsonb, and a `state` of `drafting`, `ready` or `failed`. **The table has only a SELECT policy** (and only `GRANT SELECT`) — every write goes through `POST`/`PATCH /api/pages`, which verifies the caller's bearer token first and then writes with the service-role key. The review decision (status, manager notes, checks) stays on `pages`; the two rows share a `path`.

That `path` is the reserved form `draft:<uuid>`, not a derived slug, so a draft cannot collide with a corpus slug or with another draft. **`reviewHrefFor` in `$lib/corpus/draftPath` is the single place a `pages.path` becomes a link** — it sends `draft:<uuid>` to `/review/draft/<uuid>` and everything else to `/review/<slug>`. Build review links through it rather than interpolating a path, or a draft will 404 under `/review/[slug]`.

`/review/draft/[id]` is the **one route with `ssr = false`**, and it is only that one on purpose. A draft is `TO authenticated` and sessions live in the browser, so a server render has no session and would report a good draft as missing. Opting this single route out is what leaves `/review/[slug]`'s pure, static 404 guard — and `tests/reviewSlug404.spec.ts` — untouched for the thirty-five corpus pages; making `[slug]` fall back to a database read would have turned that guard into a network call. A draft renders under a provenance banner that says whether it is drafting, ready, stale or failed.

## Architecture

### Content pipeline

Page content lives as plain TypeScript modules in `src/lib/data/`, one per mockup page, aggregated by `src/lib/data/index.ts` into `allPages`. Each exports `{ slug, type, title, summary, sections[] }` (there is no page-level `audience` field: it was retired on 2026-11-26, and a "Who this information is for" list is an ordinary section), where sections carry `paragraphs`/`bullets` plus a `karl` field describing how that block maps to SF.gov's Karl/Wagtail CMS fields, and `editorStatus`/`editorNote` describing the mockup's provenance. Those notes are review material — treat them as content, not comments.

`src/lib/stores/pageData.svelte.ts` derives the routable id at construction time: `sf.gov/topic-x--about` becomes `topic-x--about` (strip `sf.gov/`, slashes to dashes). So `/review/[slug]` matches that derived id, **not** the `slug` field in the data module. Adding a page means adding the module and exporting it from `index.ts`; nothing else registers it.

**A section can carry an `image`** (`{ src, alt, width, height, credit }`), with the file under `static/images/mockup/`. Karl has a verified home for one in only two places — an Information section's `Image` block and a Campaign Spotlight's image — and `findImageIssues` in `$lib/corpus/sectionImage` enforces Karl's image rules against the real files (minimum size per placement, alt text, attribution). Two rules it cannot check were checked by eye when each photo was chosen: no text in the image, and no abstract or posed-stock photography. A watermark counts as text, which is why no photo comes from the NYSIPM gallery.

### Two parallel state systems

These are unrelated and easy to confuse:

- **`$lib/stores/pageData.svelte.ts`** — Svelte 5 runes class (`pageStore`). Holds the static mockup corpus and `activeField` (the inline-edit target). No persistence.
- **`$lib/stores/reviewState.ts`** — Svelte 4 `writable` stores (`pagesStore`, `editsStore`) backed by Supabase, with realtime channels and optimistic-update-then-rollback. This is the persistent side.

### AI proxy

Browser never holds the model key. `FieldsPanel.svelte` and the Rethink panel call `$lib/ai/generate`'s `requestGeneration()`, which attaches the caller's Supabase access token; `src/routes/api/ai/generate/+server.ts` verifies that token, caps the body at 64KB (413), validates it against `generateRequestSchema` (8,000-char `fieldText`/`prompt`, 2,000-char `instruction` → 400 naming the field), then calls **Gemini directly** with `GEMINI_API_KEY` server-side. No key → 501.

**There is no Railway backend any more.** The route used to forward to one (`web-production-9bb3b.up.railway.app`); that service went dark (Railway's 404 `Application not found`, measured 2026-11-22) and was retired rather than revived. Its AI layer now lives in `src/lib/server/ai/`:

- `vendor/` — the backend's prompts, request/output schemas, `validate-output` and the plain-language standards it depends on, **converted CommonJS → ESM mechanically and kept diffable** against `HHVC_manager_review_current_tool_package`. Fix them upstream-first or note the divergence; don't restyle them. `style/` is the 28 KB SF.gov style corpus the system prompts inline, bundled with `?raw` because a Netlify function has no `docs/` to read.
- `gemini.ts` — REST `generateContent` (no `@google/genai`): structured JSON via `responseJsonSchema`, one retry on 408/429/5xx, the caller's abort signal passed through, and no call outliving the request's deadline. `GEMINI_MODEL` picks the model (default `gemini-3.1-flash-lite`); `GEMINI_THINKING_LEVEL` the thinking level (default `low`; `default` sends none); `GEMINI_BASE_URL` points it at a stub.
- `generate.ts` — validate each draft and retry once with the failures named, exactly as the backend's `index.js` did. Responses keep the backend's envelope (`result`, `valid`, `issues`, `attempts`, `model`, `disclosure`).
- **Everything runs inside a 55s budget** (`GEMINI_DEADLINE_MS`), because Netlify kills a synchronous function at **60s, not configurable** — and a killed request is Netlify's own error with no draft. Measured 2026-11-22 on `gemini-3.8-flash`: a field rewrite ~10s, a whole-page `content` draft **~46s**. So a page retry rarely fits: a retry starts only with ≥15s left, and a retry that runs out of time keeps the first draft. Either way the reviewer gets that draft with `valid: false` and its `issues`, rather than a timeout. Only a first attempt that overruns answers 504. **Thinking and model choice decide whether Rethink works at all** (measured 2026-11-22, whole-page Rethink): at the model's default thinking level `gemini-3.8-flash` spent 13.5k tokens thinking, took 138s and was cut off at `MAX_TOKENS` — production answered 504 on every Rethink. With thinking `low`, `gemini-3.8-flash` ran 27s/55s/103s/28s (one run ballooned to 15.9k output tokens) while `gemini-3.1-flash-lite` ran 9–16s with every draft valid, which is why it is the default. `gemini-3.5-flash-lite` was faster (7s) but emptied required callouts, and `gemini-2.5-*` is closed to new keys. Re-run that comparison before changing either setting.

Gemini is the only provider: the request schema rejects `provider: 'claude'`, and Rethink's old Claude-first fallback is gone. `compliance-audit` answers 400 — it needed the backend's retrieval index, which did not move.

Call the endpoint through `requestGeneration()`. A bare `fetch('/api/ai/generate')` will 401.

Note the error handling: failures map to the statuses the backend used and the panels key on — refusal 422, timeout 504, Cancel 499, a Gemini HTTP error or unusable output 502 — and anything else is a **generic** 500, because echoing `err.message` would leak a network address. The auth check sits _outside_ the try — a SvelteKit `HttpError` is not an `Error` instance, so a catch-all would flatten a 401 into a 500.

### Supabase

**`import_corpus_version` lives in the `private` schema, not `public`.** PostgREST serves only the schemas in `[api] schemas` (`supabase/config.toml`: `public`, `graphql_public`), so nothing in `private` is reachable over the Data API at any grant level — verified against the local stack: an anon `POST /rest/v1/rpc/import_corpus_version` returns **404**, and forcing it with `Content-Profile: private` returns **406**, while an anon read of the exposed `corpus_versions` returns 401 (the control that says the key and request path are fine). That is why `scripts/corpus-import.ts` connects with `pg` rather than `supabase.rpc()`. The alternative — leaving it in `public` and revoking per function — is what `20260823130000` had to do, and it has to be remembered on every new function; this removes the category instead. `bun run audit:privileges` still guards `public`, which now holds no functions at all.

Client-side only. Sessions live in the browser and there is no `event.locals`; the API route verifies bearer tokens itself with a per-request client (`persistSession: false`). Schema is `supabase/migrations/`: `reviews`, `pages`, `comments`, `edits`.

`src/hooks.server.ts` does exist, but it is Sentry's and nothing else — `sequence(sentryHandle())` plus `handleErrorWithSentry()`. It establishes no session and populates no `locals`, so it is not a place to reach for auth: adding one there would put a server-side session beside the browser-side one and give two answers to who the caller is.

The local stack is usable from a clean `supabase start` + `supabase db reset`
with no hand-patching. Two things had to be fixed for that and are worth knowing
if either regresses: the seed writes `''` into the eight `auth.users` token
columns GoTrue scans as Go `string` rather than `*string` (a NULL there is a 500
`Database error querying schema`, not "no token"), and
`20260823140000_grant_table_privileges.sql` states the table privileges instead
of inheriting them. The hosted project gets those grants from Supabase's own
`ALTER DEFAULT PRIVILEGES`; a local Postgres does not, so before that migration
the app worked against the hosted database and could not work against a local
one.

RLS is enabled on all five tables (`reviews`, `pages`, `edits`, `comments`, `draft_pages`) and the policies are **scoped per operation**, not blanket. `20260822030000_scope_rls_policies.sql` replaced the original `FOR ALL TO authenticated USING (true)` set; the model is read-everything, write-only-your-own:

| Table         | SELECT | INSERT | UPDATE | DELETE |
| ------------- | ------ | ------ | ------ | ------ |
| `reviews`     | all    | —      | —      | —      |
| `pages`       | all    | —      | any    | —      |
| `edits`       | all    | own    | —      | —      |
| `comments`    | all    | own    | own    | own    |
| `draft_pages` | all    | —      | —      | —      |

Two shapes there are deliberate rather than oversights. `edits` has no UPDATE or DELETE policy at all — the table is append-only, last-write-wins, which is how `$lib/karl/reviewRecord` folds it, so an UPDATE path would contradict the reader. `pages.status`/`manager_notes` are writable by any reviewer because a decision is a property of the page, not of whoever recorded it.

Authorship is recorded and enforced: `edits.user_id` and `comments.user_id` are both `NOT NULL REFERENCES auth.users`, and the own-row policies compare against `(select auth.uid())` — wrapped in a subquery so the initplan runs once per statement rather than once per row.

**Supabase's security advisor reports nothing about any of this.** Its linter checks whether RLS is on and whether policies exist, not whether they are permissive — the old blanket policies passed both tests. Don't read a clean advisor as evidence the policies are scoped; read the migration.

### Legacy port

`src/lib/legacy-core/` holds ported vanilla-JS modules still in use (`karl-transcript.js` drives the Karl walkthrough via `$lib/karl/walkthrough`, `karl-blocks.js` the Karl field mapping). The old entry point `src/legacy_main.js` is **gone** — it was imported by nothing and its unresolved `./review/*.js` imports were 52 of the 76 `bun run check` errors. The CSS half of that port (`src/css/**`, `src/routes/layout.css`, and the `@sfgov/design-system` dependency they pull) is still retained as reference; see PLAN.md B5.

## Configuration gotchas

**There is no `svelte.config.js`.** SvelteKit config lives inside the `sveltekit({ ... })` plugin options in `vite.config.ts` — adapter, `compilerOptions`, and `env` together. Documentation and generated snippets will tell you to create `svelte.config.js`; doing so splits config across two files and orphans the settings below.

**Public env vars use the `SVELTE_PUBLIC_` prefix**, set by `env.publicPrefix` in that same block. A `PUBLIC_`-prefixed variable is treated as _private_ and will not reach `$env/static/public`. These are inlined at build time, so they must exist before the build runs, not just at runtime.

Locally they come from `.env.local` (untracked). **CI has no `.env.local`, so `pr.yml` sets placeholders** — `SVELTE_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co` and `SVELTE_PUBLIC_SUPABASE_ANON_KEY=ci-placeholder-anon-key`. They are deliberately not secrets: the build fails without _some_ value because `src/lib/supabase.ts` calls `createClient` at module scope, but CI is checking that the app builds, not that it reaches Supabase, and placeholders keep the workflow working on fork PRs where secrets are not injected. `GEMINI_API_KEY` is `$env/dynamic/private` and is not needed to build. A CI job that genuinely needs to talk to Supabase would need real values added as repo secrets first — no job does today.

**`bun run lint` is red on the current tree**, both halves: `prettier --check .` on 39 tracked files and `eslint .` on **2** errors. Because the script is `prettier && eslint`, a prettier failure means eslint never runs — so anything that needs eslint must invoke it directly. This is why CI reports lint without blocking on it. Do not "fix" it by reformatting the tree as a side effect of unrelated work.

**The eslint count is ratcheted, and the number it ratchets is not the one you get by running eslint yourself unless your ignores are current.** `bun run lint:ratchet` asserts 2 and fails in both directions — up, because new errors are not accepted; down, because a baseline nobody tightens only rots. It runs as a blocking step inside `test & build`, not in the non-blocking `review` job, since a ratchet that cannot fail the merge is a report.

The 2 (3 until `card-inheritance.js`'s `@ts-nocheck` was waived inline, 2026-11-26; 4 until `karl-transcript.js`'s, 2026-11-23; 5 until `karl-blocks.js`'s, 2026-11-21) replaces the 11 recorded at `d2b1f5f`, but the gap that mattered was neither figure: **a machine that had run `supabase start` counted 213.** `eslint.config.js` derives its ignores from `includeIgnoreFile(.gitignore)`, which reads only the file it is handed — so `supabase/.temp/`, ignored by the Supabase CLI's own nested `supabase/.gitignore`, was invisible to it, and eslint walked into the running stack's edge-runtime scratch code for 208 of those errors. That tree also holds `start-secrets/`, which is not somewhere a linter should be reading. It now carries an explicit `{ ignores: ['supabase/.temp/**'] }`; without it the ratchet would compare a number that depends on whether your local stack is up.

**The prettier count is ratcheted too, and it counts TRACKED files, not `.`.** `bun run format:ratchet` asserts 39 and fails in both directions, as a blocking step in `test & build` beside the other two. **The denominator is deliberately not recorded**: the tracked-file total moves with every PR, so writing it down here only guarantees it goes stale, while the 39 cannot drift silently because the ratchet enforces it. It does not make formatting blocking — the pre-existing drift stays, and reformatting the tree as a side effect of unrelated work is still the thing not to do — it asserts the count cannot rise, which nothing did before: `bun run lint`'s prettier half is red, the `&&` short-circuits, and a PR adding newly unformatted files failed no gate.

It enumerates `git ls-files` because a tree-wide count is **machine-dependent**, the same defect that had eslint reading 213 on one machine. Measured 2026-11-24 with agent scratch present: `prettier --list-different .` reported **78** files, of which 28 were in `.superpowers/` and `.impeccable/` — untracked but **not gitignored**, so `.prettierignore` does not exclude them and prettier walks in. Tracked files are what CI and a fresh clone have. The 98 this section used to record was such a count. Note `--ignore-unknown` is required, since `git ls-files` includes `.png` and `.sql` that prettier has no parser for.

**`bun run check` is at zero errors**, as of 2026-11-22. It was 23 that morning and 76 before `legacy_main.js` was removed. Expect zero and treat anything else as a regression in your own branch — the long-lived baseline this section used to describe is gone, along with the habit of reading a non-zero number as normal.

**`bun run check:ratchet` enforces zero**, as a blocking step inside `test & build` beside `lint:ratchet`. It fails in both directions, so a fixed error has to be banked by lowering the baseline rather than left as slack. The non-blocking `check` in the `review` job stays, for the annotations and the summary table. Raising the baseline is a decision, not a fix.

**Warnings are at zero and gated too**, as of 2026-11-22 (eight that morning). Five were `state_referenced_locally` on a field id that must be evaluated once -- `nextFieldId` increments a module counter, so reading the prop reactively would mint a new id on every change and break label/input pairing and hydration; `untrack` states that. One was a real a11y defect: `aria-invalid` on a bare `<fieldset>`, implicitly `role="group"`, which does not support the attribute -- so an errored choice group's state was announced by nothing. ARIA models the two types differently, so it now sits on the `radiogroup` for radios and on each input for checkboxes.

The last two are **suppressed, not fixed, and deliberately so.** Svelte's `a11y_no_noninteractive_tabindex` and axe's `scrollable-region-focusable` contradict each other on a focusable scroll container: deleting `tabindex="0"` from the mockup container to satisfy Svelte fails 5 of the 7 specs in `tests/accessibility.e2e.ts` (`scrollable-region-focusable (serious): Scrollable region must have keyboard access`), measured. axe gates CI, so axe wins, and each `svelte-ignore` carries that reasoning inline. **Do not "fix" either warning by removing the attribute.** Raising `WARNING_BASELINE` is allowed where a suppression carries a justification a later reader can check -- not merely silence.

The ratchet passes `--tsconfig`, which bounds svelte-check to `.svelte-kit/tsconfig.json`'s `include` allowlist. That is load-bearing: without it svelte-check walks every subdirectory but `node_modules`, which would pull in `supabase/.temp` and make the count depend on whether `supabase start` has been run — the defect that had eslint counting 213 on one machine and 5 on another. `--ignore` is not an alternative; it only applies with `--no-tsconfig`.

**A green test suite does not mean the build passes.** Unit tests don't import the legacy modules, so a broken one there (e.g. duplicate `export { ... }` blocks in `karl-blocks.js`, which rolldown rejects) fails only at build. Run `bun run verify` before claiming a change is good.

## Deployment

Netlify, site `sfhealthyhousing` (production `https://sfhealthyhousing.netlify.app`), **Git-connected and deploying automatically**. Merging to `main` publishes production, and every PR gets a deploy preview at `deploy-preview-<n>--sfhealthyhousing.netlify.app` — both build on Netlify, so builds do consume Netlify minutes. Netlify's build settings are overridden by `netlify.toml` in this repo, which is where the command and publish directory actually come from. Env vars are set on the Netlify site; `GEMINI_API_KEY` belongs there as a secret.

`netlify deploy --build --prod` still works and builds locally, but it is a manual override, not the normal path: the deploy it uploads carries no `commit_ref`, so it supersedes the commit-linked release and the published deploy can no longer be traced to a SHA. Reach for it only when Netlify's own build is unavailable.

**A deploy being `ready` at your commit does not mean it is the one being served.** A locked or pinned deploy keeps the published one fixed while new merges keep building green behind it — `getSite.published_deploy.locked` is the field that says so, and `listSiteDeploys` will happily show a `ready` production deploy at the right SHA while an older one is what visitors get. This state held for three merges (#49, #53, #54) between 2026-08-24 and 2026-08-25 without a single status code changing; it was unlocked and `54160a5` published with `netlify api unlockDeploy` then `netlify api restoreSiteDeploy`.

That is why `verify:live` asserts the **published commit** first. `vite.config.ts` stamps the build's commit into SvelteKit's `version.name` — Netlify's `COMMIT_REF`, else Actions' `GITHUB_SHA`, else `git rev-parse HEAD` — so it is served at `/_app/version.json`, and the check reads it back out of the artifact rather than trusting the control plane. The expected side comes from `git ls-remote origin refs/heads/main`, not `git rev-parse origin/main` — the local tracking ref is only as fresh as your last fetch, and a clone that is behind would agree with a stale deploy and report PASS. Against a preview, set `EXPECT_COMMIT` too, or the gate compares that deploy against `main` and correctly reports a mismatch.

CI runs separately in `.github/workflows/pr.yml` — unit tests, build and e2e block, while prettier/eslint/svelte-check report without blocking. A green Netlify preview says the site built; it does not say the tests passed.

`supabase/.temp/` is CLI scratch state and is **not tracked** — that is the
CLI's own `supabase/.gitignore` template, added because `supabase start` writes
`start-secrets/.../env/docker.env` (service-role key, DB URL, JWT secret) into
that directory. The consequence: a fresh clone has no `project-ref`, so
hosted-project commands need `supabase link --project-ref <ref>` first. Local
development (`supabase start`, `db reset`) needs no link — `config.toml` is
enough.

Supabase auth URLs must include any new origin, or magic links redirect to a dead URL. The hosted allow-list covers production, `localhost:5173`, and Netlify preview hostnames; `supabase/config.toml` covers the local stack.

**Renaming the Netlify site is a new origin.** The site was renamed from `hhvc-manager-review` to `sfhealthyhousing` on 2026-11-22, in the Netlify dashboard. Netlify does not redirect a renamed site, so `hhvc-manager-review.netlify.app` returns 404 from that moment. Production's `site_url` and both projects' `uri_allow_list` still named the old host, so a magic link would have fallen back to a dead URL. Two consequences if it is ever renamed again:

- **Update `site_url` and `uri_allow_list` on both Supabase projects** (Dashboard → Authentication → URL Configuration, or `PATCH /v1/projects/<ref>/config/auth`), plus `SITE_URL` in `scripts/verify.sh`. `verify:live` is the one that notices: it probes the old host and gets a 404.
- **Remove the old host from the allow-lists. Do not just add the new one.** A released `*.netlify.app` name can be claimed by anyone, and magic-link redirects carry the session in the URL fragment, so a stale entry would hand sign-in tokens to whoever registers it.

### One hosted Supabase project, shared by every deploy context

Every Netlify deploy context talks to the production project:

| Context                    | Supabase project             | Ref                    |
| -------------------------- | ---------------------------- | ---------------------- |
| `production`               | `hhvc-manager-review-svelte` | `kiynekyzqxneepjipqhg` |
| `deploy-preview`           | `hhvc-manager-review-svelte` | `kiynekyzqxneepjipqhg` |
| `branch-deploy`            | `hhvc-manager-review-svelte` | `kiynekyzqxneepjipqhg` |
| `dev` (`netlify dev` only) | `hhvc-manager-review-svelte` | `kiynekyzqxneepjipqhg` |

**A deploy preview reads and writes the production database.** A reviewer editing copy on a PR preview is editing the real review. That is accepted, not overlooked: the production database still holds only mockup review data, so a separate preview database buys little. Revisit this if production ever holds data that matters.

There used to be a staging project, `hhvc-manager-review-staging` (`aplbsgacqnxhzjuquvft`), that previews and branch deploys read. **It is gone**: measured 2026-11-26, it was absent from `supabase projects list`, its API host answered nothing, and `db.aplbsgacqnxhzjuquvft.supabase.co` no longer resolved. So every preview was building against a database that did not exist. The `deploy-preview` and `branch-deploy` values of `SVELTE_PUBLIC_SUPABASE_URL`, `SVELTE_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` were then pointed at production on the Netlify site. To split them again, create a project, run `supabase db push`, `supabase/seed.hosted.sql` and `bun run corpus:import` against it, and set those three variables per context.

`SVELTE_PUBLIC_*` are inlined at **build time**, so the context is fixed when the build runs. You cannot tell which database a deploy uses by looking at it at runtime, and a preview built before a variable changed keeps the old target until it is rebuilt. To check, build under a context and read the bundle:

```sh
netlify build --context deploy-preview
grep -rhoE 'https://[a-z0-9]+\.supabase\.co' build/   # expect kiynekyz…
```

**Magic links from a preview need production's allow-list to cover preview hosts** (`https://*--sfhealthyhousing.netlify.app/**`), since previews now sign in against production's `auth.users`.

**`GEMINI_API_KEY` is shared across every context**, so a preview's AI rewrites spend the production key.

### Merging to `main` applies migrations to production

A merge to `main` does not only deploy the frontend. The **Supabase GitHub App**
(`app.slug` is `supabase`) applies pending migrations to the **production**
project on the merge commit. Nothing in `.github/` does this — `grep -rn supabase
.github/` finds only `pr.yml`'s placeholder env vars — so the only visible trace
is the `Supabase Preview` check, which behaves differently on the two commits:

| Commit                 | Conclusion | Check target                                |
| ---------------------- | ---------- | ------------------------------------------- |
| PR head                | `skipped`  | `.../project/kiynekyzqxneepjipqhg/branches` |
| merge commit on `main` | `success`  | `.../project/kiynekyzqxneepjipqhg`          |

Measured on PR #64: `20260827110000_latest_edits_view.sql` was pushed by hand
**only** to the local stack, and appeared in production's
`supabase_migrations.schema_migrations` immediately after the merge.

Two consequences worth knowing before merging anything with a migration in it:

- **The merge is the apply.** Check what is pending against production _before_
  merging rather than after, because the merge changes the production schema
  with nobody running a command — a wider blast radius than the Netlify deploy
  it arrives alongside.
- **Previews see the migration only after the merge.** They read production,
  so a PR's preview runs its new frontend against a schema that does not yet
  have that PR's migrations. A preview that depends on a new table, column or
  view will fail to read until the merge applies it.

`verify:live` cannot see any of this. Its gates passed against a frontend
querying `latest_edits`, and would have passed identically had the view been
missing from the database, because a failed edits hydration logs to the console
and leaves the app rendering.

Note that `supabase link` sets `supabase/.temp/project-ref` for the whole checkout, so whichever project you linked last is what `supabase db push` targets — there is no per-command project flag in that path. Check it before pushing.

## Branch protection

`main` is governed by repository ruleset **`main: require CI`** (id `21203092`), scoped to `~DEFAULT_BRANCH` so it follows a rename. It is `active` with **no bypass actors** — the repo owner is subject to it too, and `current_user_can_bypass` reads `never`.

| Rule                     | Effect                                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| `required_status_checks` | `test & build` and `e2e` must pass; `strict`, so the branch must also be current with `main` |
| `pull_request`           | changes must arrive via a PR (0 approvals — it gates the path, not review)                   |
| `non_fast_forward`       | force-pushes to `main` are refused                                                           |

The contexts are matched against the **job names** in `pr.yml`. Renaming a job there without updating the ruleset silently drops that gate — the check simply stops being reported under the required name.

Consequences worth knowing before working here:

- There is no direct push to `main`, for anyone. A `git push origin main` is rejected with `GH013: Repository rule violations found`.
- A red PR cannot be merged, including by the owner, so the workflow is a gate rather than a report.
- The escape hatch is editing or disabling the ruleset at `github.com/ohdaveed/hhvc-manager-review-svelte/rules` — a deliberate, visible act. Prefer fixing the build.
- Stacked PRs targeting another branch are unaffected; the ruleset only covers the default branch. Note that GitHub requires the async merge endpoint (`PUT /repos/{owner}/{repo}/pulls/{n}/merge-async`) for a PR that is part of a stack — `gh pr merge` fails on those with a stack error.

<!-- FABLIZE:BEGIN — run Opus like Fable (always-on router). Verified procedures only. Install/update: fablize setup.sh -->

## Operating mode (always on — auto-route by task signal)

Apply what the task signals; with no signal, baseline only. Read each pack only when needed. Routing: smallest matching discipline only, overlap only when genuinely multi-category, mimic observable behavior only.

- **[always]** Lead with the outcome · stay within the requested scope (no incidental refactors) · ground completion claims in this session's tool results · confirm before destructive or hard-to-reverse actions.
- **[2+ sequential stories]** Invoke the `fablize:fablize` skill and follow its multi-story loop (§1): create → next → checkpoint (with evidence) → final verification gate (no completion without `--verify-cmd` and `--verify-evidence`). Run from the repo root; state in `./.fablize/` (resume with `status`). Skip for single-step tasks.
- **[debugging / test failure / unknown cause / review]** Invoke `fablize:fablize` and follow its investigation protocol (§2): reproduce first → 3+ competing hypotheses → evidence per hypothesis → full causal chain → verify before/after → report rejected hypotheses.
- **[render/executable artifact: HTML, SVG, game, UI, chart]** Invoke `fablize:fablize` and follow its verification-grounding loop (§3): run it in the real renderer → observe the output → fix what you see → re-run. A static check is not observation.
- **[hard or ambiguous task]** Adaptive thinking scales with difficulty automatically. To go higher, recommend `/effort xhigh` to the user. Depth (capability) cannot be raised: if stuck 2+ times or out-of-spec discovery is needed, report the limit honestly and escalate.

<!-- FABLIZE:END -->
