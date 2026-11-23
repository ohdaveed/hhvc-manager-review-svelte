# Landing Page and AI-Drafted Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `/` a real landing page that explains the review, resumes it in one click, and lets a reviewer describe a page an AI drafts into the queue as an editable page.

**Architecture:** A new `draft_pages` table holds the drafted page as `jsonb`; the existing `pages` table keeps carrying the review decision, joined by `path`. Drafts use the reserved path form `draft:<uuid>` and render at their own route `/review/draft/[id]`, so `/review/[slug]`'s pure static 404 guard is left untouched. `pageStore` merges draft pages in after construction through the mapping its constructor already uses. Creation is row-first: a POST writes the row, the browser then calls the unchanged `content` AI task and PATCHes the result back.

**Tech Stack:** SvelteKit 2 (Svelte 5 runes), TypeScript, Supabase (Postgres + PostgREST), Tailwind + shadcn-svelte, Vitest, Playwright, bun.

**Spec:** [`docs/superpowers/specs/2026-11-23-landing-page-and-ai-drafted-pages-design.md`](../specs/2026-11-23-landing-page-and-ai-drafted-pages-design.md)

## Global Constraints

- Public env vars use the **`SVELTE_PUBLIC_`** prefix; SvelteKit config lives in `vite.config.ts`, **there is no `svelte.config.js`**.
- Every e2e spec imports `test` from `./fixtures`, never from `@playwright/test`. Type-only imports from `@playwright/test` are legal.
- The e2e fixture fails a test on any uncaught exception, any `console.error`, or any **document** response ≥ 400.
- Vitest project split is by location: `src/**/*.{test,spec}.ts` and `tests/**/*.spec.ts` → node; `tests/**/*.test.ts` → jsdom.
- `bun run check` must stay at **0 errors and 0 warnings**; `bun run lint:ratchet` must stay at exactly **4**. Both are blocking CI steps.
- The AI request is `{ task: 'content', prompt }` — `page` is optional. **No change to `schemas.js`, `prompts.js`, `validate-output.js` or `generate.ts`.** Call it via `requestGeneration()` from `$lib/ai/generate`; a bare `fetch` returns 401.
- `GEMINI_DEADLINE_MS` is 55s against Netlify's non-configurable 60s kill. Default model `gemini-3.1-flash-lite`, thinking `low`. Do not change either.
- A server route verifies the caller **outside** the `try` block, because a SvelteKit `HttpError` is not an `Error` instance and a catch-all flattens 401 into 500.
- `pages` keeps having **no INSERT policy**. All writes in this plan go through service-role in a server route.
- Conventional commits; feature branch off `main`. `main` is protected — `test & build` and `e2e` must pass, no bypass.
- Migrations auto-apply to **production** on merge and skip staging; staging needs a manual `supabase db push`.

## Review Focus

Five conditions the spec implies that no task's happy path exercises. Each has its test added to the task that owns the code.

1. **An empty or whitespace-only description** must not create a row or call the model — Task 3.
2. **A description over 2,000 characters** must be refused with 400 naming the field, and the form must not silently truncate it — Task 3 and Task 7.
3. **A signed-out visit to `/`** must render the explanation and a sign-in link, claim no progress, and log no console error — Task 6.
4. **A `drafting` row whose tab closed mid-flight** must become visibly stale rather than spinning forever — Task 5.
5. **A draft that comes back `valid: false`** must still land and show its issues, never be discarded — Task 4.

---

### Task 1: `draft_pages` table

**Files:**

- Create: `supabase/migrations/20261123100000_draft_pages.sql`
- Modify: `supabase/seed.sql` (none required; note only if the generator needs it)
- Test: `tests/draftPagesMigration.spec.ts`

**Interfaces:**

- Produces: table `draft_pages` with columns `id uuid pk`, `review_id uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE`, `path text NOT NULL`, `title text NOT NULL`, `description text NOT NULL`, `state text NOT NULL DEFAULT 'drafting'`, `content jsonb`, `valid boolean`, `issues jsonb`, `model text`, `created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL`, `created_at timestamptz NOT NULL DEFAULT now()`, `updated_at timestamptz NOT NULL DEFAULT now()`; `UNIQUE (review_id, path)`; `CHECK (state IN ('drafting','ready','failed'))`.
- Produces: RLS enabled with a single policy `draft_pages_select` — `FOR SELECT TO authenticated USING (true)`. No INSERT/UPDATE/DELETE policy.

- [ ] **Step 1: Write the failing test**

```ts
// tests/draftPagesMigration.spec.ts — node project (.spec.ts)
import { readFileSync } from 'node:fs';
const sql = readFileSync('supabase/migrations/20261123100000_draft_pages.sql', 'utf8');

it('enables RLS and grants only SELECT to authenticated', () => {
	expect(sql).toMatch(/ALTER TABLE draft_pages ENABLE ROW LEVEL SECURITY/);
	expect(sql).toMatch(
		/CREATE POLICY "draft_pages_select" ON draft_pages\s+FOR SELECT TO authenticated/
	);
	expect(sql).not.toMatch(/FOR (INSERT|UPDATE|DELETE)/);
});

it('constrains state to the three values the client branches on', () => {
	expect(sql).toMatch(/CHECK \(state IN \('drafting', ?'ready', ?'failed'\)\)/);
});

it('states its table privileges rather than inheriting them', () => {
	expect(sql).toMatch(/GRANT SELECT ON draft_pages TO authenticated/);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun run test:unit -- --run tests/draftPagesMigration.spec.ts`
Expected: FAIL — `ENOENT` on the migration file.

- [ ] **Step 3: Write the migration**

Follow `20260823060000_corpus_versions.sql` for house style: a header comment saying why the table exists, `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS` before `CREATE POLICY` (Postgres has no `CREATE POLICY IF NOT EXISTS` and a bare create aborts a re-run), and explicit `GRANT` statements per `20260823140000_grant_table_privileges.sql` — a local Postgres does not get Supabase's `ALTER DEFAULT PRIVILEGES`.

Add `COMMENT ON COLUMN draft_pages.path IS` explaining the reserved `draft:<uuid>` form and why a derived slug was not used: a uuid cannot collide with a corpus slug or another draft, which removes slug-collision handling entirely.

- [ ] **Step 4: Apply locally and verify the privilege audit stays clean**

Run: `supabase db reset && bun run test:unit -- --run tests/draftPagesMigration.spec.ts && bun run audit:privileges --local`
Expected: tests PASS; the audit reports no anon-executable functions and an empty allowlist.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261123100000_draft_pages.sql tests/draftPagesMigration.spec.ts
git commit -m "feat(db): add draft_pages for AI-drafted review pages"
```

---

### Task 2: Draft path and href helpers

**Files:**

- Create: `src/lib/corpus/draftPath.ts`
- Test: `src/lib/corpus/draftPath.test.ts`

**Interfaces:**

- Produces: `DRAFT_PATH_PREFIX = 'draft:'`
- Produces: `draftPathFor(id: string): string` → `` `draft:${id}` ``
- Produces: `draftIdFrom(path: string): string | undefined` — the uuid, or `undefined` for a corpus path
- Produces: `isDraftPath(path: string): boolean`
- Produces: `reviewHrefFor(path: string): string` — `/review/draft/<id>` for a draft path, `/review/<path>` otherwise. This is the single place the queue, the landing page and `nextUndecidedPath` consumers turn a `pages.path` into a link.

- [ ] **Step 1: Write the failing test**

```ts
it('round-trips a draft id through its path', () => {
	const id = '9f1c2f0e-0000-4000-8000-000000000001';
	expect(draftIdFrom(draftPathFor(id))).toBe(id);
});

it('does not mistake a corpus path for a draft', () => {
	expect(isDraftPath('report-garbage-filth-vegetation')).toBe(false);
	expect(draftIdFrom('report-garbage-filth-vegetation')).toBeUndefined();
});

it('routes each kind of path to its own route', () => {
	expect(reviewHrefFor('mosquito-education-workshop')).toBe('/review/mosquito-education-workshop');
	expect(reviewHrefFor('draft:abc')).toBe('/review/draft/abc');
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun run test:unit -- --run src/lib/corpus/draftPath.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the five exports in `src/lib/corpus/draftPath.ts`**

Document why a reserved prefix on `pages.path` was chosen over a `kind` column: `firstQueuePath` and `nextUndecidedPath` already return a `path` and every caller links from it, so the path is the only value that has to carry the distinction.

- [ ] **Step 4: Run and verify PASS**

Run: `bun run test:unit -- --run src/lib/corpus/draftPath.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/corpus/draftPath.ts src/lib/corpus/draftPath.test.ts
git commit -m "feat(corpus): add draft path and review href helpers"
```

---

### Task 3: `POST`/`PATCH /api/pages`

**Files:**

- Create: `src/routes/api/pages/+server.ts`
- Test: `src/routes/api/pages/server.test.ts`

**Interfaces:**

- Consumes: `draftPathFor` from Task 2.
- Produces: `POST /api/pages` — body `{ description: string }`, returns `201 { id, path, title, state: 'drafting' }`. Writes one `draft_pages` row and one `pages` row sharing `path`, with service-role.
- Produces: `PATCH /api/pages` — body `{ id: string, content?: object, valid?: boolean, issues?: string[], model?: string, failed?: true }`, returns `200 { ok: true }`. Sets `state` to `'ready'` or `'failed'` and `updated_at = now()`.
- Produces: `MAX_DESCRIPTION_CHARS = 2000`, `MAX_BODY_BYTES = 64 * 1024`.

Mirror `src/routes/api/invite/+server.ts` exactly: a `requireUser(request)` helper that reads the bearer token and calls `getUser` on a per-request anon client with `persistSession: false`, **called outside the try**; `MAX_BODY_BYTES` checked on the raw text before `JSON.parse`; a missing `SUPABASE_SERVICE_ROLE_KEY` answered as 500 naming the variable; a generic 500 for anything unexpected so no internal detail is echoed.

- [ ] **Step 1: Write the failing tests**

```ts
it('rejects an unauthenticated caller before building a service-role client', async () => {
	// assert 401 and that createClient was called exactly once (the verify client)
});

it('refuses a whitespace-only description without calling the model', async () => {
	// POST { description: '   ' } -> 400
});

it('refuses a description over the cap, naming the field', async () => {
	// POST { description: 'x'.repeat(2001) } -> 400 with /description/
});

it('caps the body before parsing it', async () => {
	// POST a 65KB body -> 413
});

it('writes the draft row and the pages row with the same path', async () => {
	// POST { description: 'How a tenant appeals a notice of violation' } -> 201
	// assert both inserts used `draft:<returned id>`
});

it('titles the row from the reviewer own words, truncated', async () => {
	// a 200-char description -> title length <= 80, no mid-word cut
});

it('marks a draft failed without storing content', async () => {
	// PATCH { id, failed: true } -> state 'failed', content untouched
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `bun run test:unit -- --run src/routes/api/pages/server.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `POST` and `PATCH` in `src/routes/api/pages/+server.ts`**

The row id is generated client-side with `crypto.randomUUID()` in the route so `path` and `id` can be written in one pass without a round trip.

Note in a comment that any authenticated reviewer may PATCH any draft id. That matches the existing trust model — every `authenticated` caller can already UPDATE any row of `pages` — and is the reason the route does not try to scope by `created_by`.

- [ ] **Step 4: Run and verify PASS**

Run: `bun run test:unit -- --run src/routes/api/pages/server.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/routes/api/pages tests
git commit -m "feat(api): create and finalize AI page drafts via service-role route"
```

---

### Task 4: Draft store, and merging drafts into `pageStore`

**Files:**

- Create: `src/lib/stores/draftPages.ts`
- Modify: `src/lib/stores/pageData.svelte.ts` — extract the constructor's mapping into an exported `toStorePage(page: object): Page` and call it from both the constructor and the new merge method
- Test: `tests/draftPages.test.ts`

**Interfaces:**

- Consumes: `draftPathFor`, `isDraftPath` (Task 2); `POST`/`PATCH /api/pages` (Task 3).
- Produces: `toStorePage(page: object): Page` from `pageData.svelte.ts` — applies `routableId` and `withFieldKey`, the one mapping both paths share.
- Produces: `pageStore.mergeDraftPages(drafts: DraftPage[]): void` — maps each `ready` draft's `content` through `toStorePage`, overrides `id` with the draft's `path`, and replaces any existing entry with that id rather than appending a duplicate.
- Produces: `draftsStore: Writable<DraftPage[]>`
- Produces: `type DraftPage = { id: string; path: string; title: string; description: string; state: 'drafting' | 'ready' | 'failed'; content: object | null; valid: boolean | null; issues: string[] | null; model: string | null; created_at: string; updated_at: string }`
- Produces: `loadDrafts(reviewId: string): Promise<void>` — selects from `draft_pages` for the review and calls `pageStore.mergeDraftPages`
- Produces: `createDraft(description: string): Promise<DraftPage>` — POSTs, pushes the `drafting` row into `draftsStore`, then calls `requestGeneration({ task: 'content', prompt: description })` and PATCHes the outcome
- Produces: `isStaleDraft(draft: DraftPage, now?: number): boolean` — `state === 'drafting'` and `updated_at` older than `DRAFT_STALE_MS = 90_000`

`mergeDraftPages` must use `toStorePage`, not a second mapping. `withFieldKey`'s own comment explains that recomputing a section's field key orphans every edit saved against the old one.

- [ ] **Step 1: Write the failing tests**

```ts
it('gives a merged draft the store id its pages row uses', () => {
	pageStore.mergeDraftPages([readyDraft({ path: 'draft:abc' })]);
	expect(pageStore.pages.find((p) => p.id === 'draft:abc')).toBeTruthy();
});

it('derives section field keys the same way the corpus does', () => {
	// a merged draft's sections all carry a `fieldKey`
});

it('replaces a draft on re-merge instead of appending it twice', () => {
	pageStore.mergeDraftPages([readyDraft({ path: 'draft:abc' })]);
	pageStore.mergeDraftPages([readyDraft({ path: 'draft:abc' })]);
	expect(pageStore.pages.filter((p) => p.id === 'draft:abc')).toHaveLength(1);
});

it('does not merge a draft that is still drafting or failed', () => {
	// neither reaches pageStore.pages
});

it('keeps an invalid draft and its issues', async () => {
	// requestGeneration resolves { valid: false, issues: ['...'], result: page }
	// -> PATCH called with state-bearing content and the issues, not discarded
});

it('marks a draft failed when the generation throws', async () => {
	// requestGeneration rejects -> PATCH { failed: true }
});

it('calls the model only after the row exists', async () => {
	// assert POST resolved before requestGeneration was invoked
});

it('treats a drafting row older than 90s as stale', () => {
	expect(isStaleDraft({ state: 'drafting', updated_at: iso(Date.now() - 91_000) })).toBe(true);
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `bun run test:unit -- --run tests/draftPages.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Extract `toStorePage`, add `mergeDraftPages`, implement `src/lib/stores/draftPages.ts`**

`createDraft` sends no `page` to `requestGeneration` — a from-scratch draft has no grounding page, and `page` is optional in the request schema.

- [ ] **Step 4: Run and verify PASS**

Run: `bun run test:unit -- --run tests/draftPages.test.ts`
Expected: PASS

- [ ] **Step 5: Hydrate drafts with the review**

Modify `loadReview()` in `src/lib/stores/reviewState.ts` to call `loadDrafts(reviewId)` after the pages snapshot is set and before `channel.applyHydration()`, so a draft is in the store before any buffered realtime event replays against it.

- [ ] **Step 6: Run the full unit suite**

Run: `bun run test:unit -- --run`
Expected: PASS, no regressions.

- [ ] **Step 7: Commit**

```bash
git add src/lib/stores tests/draftPages.test.ts
git commit -m "feat(drafts): load AI page drafts and merge them into the page store"
```

---

### Task 5: The draft route

**Files:**

- Create: `src/routes/review/draft/[id]/+page.ts`, `src/routes/review/draft/[id]/+page.svelte`
- Create: `src/lib/components/workspace/DraftBanner.svelte`
- Test: `tests/draftRoute.spec.ts`

**Interfaces:**

- Consumes: `draftsStore`, `isStaleDraft` (Task 4).
- Produces: route `/review/draft/[id]`. `+page.ts` exports `ssr = false` and a `load` that throws `error(404)` unless `params.id` matches the uuid pattern.
- Produces: `DraftBanner.svelte` — props `{ draft: DraftPage }`.

`ssr = false` on this route only. The draft is `TO authenticated` and sessions live in the browser, so a server render has no session and would 404 a valid draft. Opting one route out is what keeps `/review/[slug]`'s pure static 404 for the thirty-nine intact — the spec expected to lose that guard, and this avoids it.

`+page.svelte` reuses the existing workspace by rendering the same components the `[slug]` page does, with `DraftBanner` above the mockup. The banner shows: that this is an AI draft, the description it came from, the model, and each validation issue when `valid === false`. A `drafting` draft shows progress; a stale one (`isStaleDraft`) shows a retry instead of a spinner; a `failed` one shows the error and a retry.

- [ ] **Step 1: Write the failing tests**

```ts
it('404s an id that is not a uuid', async () => {
	await expect(load({ params: { id: 'not-a-uuid' } })).rejects.toMatchObject({ status: 404 });
});

it('opts out of SSR so the authenticated draft read happens in the browser', async () => {
	const mod = await import('../src/routes/review/draft/[id]/+page.ts');
	expect(mod.ssr).toBe(false);
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `bun run test:unit -- --run tests/draftRoute.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `+page.ts`, `+page.svelte` and `DraftBanner.svelte`**

- [ ] **Step 4: Run and verify PASS**

Run: `bun run test:unit -- --run tests/draftRoute.spec.ts`
Expected: PASS

- [ ] **Step 5: Link drafts from the queue**

Modify `src/lib/components/workspace/ReviewQueue.svelte` to build hrefs with `reviewHrefFor(p.path)` and to resolve a draft row's title from `draftsStore` — `titleFor` currently falls back to the raw path, which would show `draft:9f1c…`. Show the draft badge on the row.

- [ ] **Step 6: Run the full unit suite**

Run: `bun run test:unit -- --run`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/routes/review/draft src/lib/components tests/draftRoute.spec.ts
git commit -m "feat(drafts): render a draft in the review workspace with provenance"
```

---

### Task 6: The landing page

**Files:**

- Modify: `src/routes/+page.svelte` (replace the redirect entirely)
- Create: `src/lib/components/landing/ProgressSummary.svelte`, `HowItWorks.svelte`, `AllPagesList.svelte`
- Create: `src/lib/landing/progress.ts`
- Test: `src/lib/landing/progress.test.ts`, `tests/landingPage.test.ts`

**Interfaces:**

- Consumes: `pagesStore`, `nextUndecidedPath`, `firstQueuePath` (existing); `reviewHrefFor` (Task 2); `draftsStore` (Task 4).
- Produces: `reviewProgress(pages: ReviewPage[]): { decided: number; total: number; nextHref: string | undefined }` — `decided` counts every page whose status is not `needs-review`; `total` is `pages.length`, so drafts are included.

The `onMount` redirect and its `loadReview`/`goto` call are **deleted**, not kept as a fallback.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/landing/progress.test.ts
it('counts every decided status, not just approved', () => {
	expect(
		reviewProgress([p('approved'), p('revise'), p('blocked'), p('needs-review')]).decided
	).toBe(3);
});

it('includes drafts in the denominator', () => {
	expect(reviewProgress([p('needs-review'), p('needs-review', 'draft:abc')]).total).toBe(2);
});

it('points at the first undecided page when nothing is decided', () => {
	/* nextHref */
});
it('has no next href once every page is decided', () => {
	/* undefined */
});
```

```ts
// tests/landingPage.test.ts — jsdom
it('renders the explanation and a sign-in link when signed out', () => {
	// the four steps are present; no "N of M decided" text; no console.error
});

it('does not redirect', () => {
	// goto is never called on mount
});

it('shows progress and a continue link when signed in', () => {
	/* ... */
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `bun run test:unit -- --run src/lib/landing/progress.test.ts tests/landingPage.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `reviewProgress` and the three components, then rewrite `src/routes/+page.svelte`**

Layout A from the spec: progress line and a prominent **Continue** button at the top; below it three equal columns — How it works, All pages, Propose a page (the form arrives in Task 7). Reuse shadcn `Button`, `Card` and `Separator` as the review layout does.

- [ ] **Step 4: Run and verify PASS**

Run: `bun run test:unit -- --run src/lib/landing/progress.test.ts tests/landingPage.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/routes/+page.svelte src/lib/components/landing src/lib/landing tests/landingPage.test.ts
git commit -m "feat(landing): replace the root redirect with a resume-first landing page"
```

---

### Task 7: The propose-a-page form

**Files:**

- Create: `src/lib/components/landing/ProposePageForm.svelte`
- Modify: `src/routes/+page.svelte` (mount the form in the third column)
- Test: `tests/proposePageForm.test.ts`

**Interfaces:**

- Consumes: `createDraft`, `MAX_DESCRIPTION_CHARS` (Tasks 3, 4).

- [ ] **Step 1: Write the failing tests**

```ts
it('disables submit until a non-whitespace description is typed', () => {
	/* ... */
});

it('shows the remaining character count and refuses to submit over the cap', () => {
	// typing 2001 chars: the value is NOT truncated, submit is disabled, the cap is named
});

it('disables submit while a draft is in flight so a double click cannot create two rows', () => {
	/* ... */
});

it('tells the reviewer the draft is in the queue and clears the field on success', () => {
	/* ... */
});

it('keeps the description in the field when the request fails', () => {
	/* ... */
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `bun run test:unit -- --run tests/proposePageForm.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `ProposePageForm.svelte` and mount it**

One `Textarea` from `$lib/components/ui/textarea/index.js` (the path `RethinkPanel`, `ReviewPanel` and `FieldsPanel` all use), a counter, a submit button. Copy must say the draft takes up to a minute and that the reviewer can leave the page. Signed out, the column explains that creating a page needs sign-in.

- [ ] **Step 4: Run and verify PASS**

Run: `bun run test:unit -- --run tests/proposePageForm.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/landing src/routes/+page.svelte tests/proposePageForm.test.ts
git commit -m "feat(landing): describe a page and send it for an AI draft"
```

---

### Task 8: End-to-end and accessibility coverage

**Files:**

- Create: `tests/landing.e2e.ts`
- Modify: `tests/signedIn.ts` — add `draft_pages` to the stubbed PostgREST routes
- Modify: `tests/accessibilitySignedIn.e2e.ts` — add the landing page and a draft page
- Test: the files above

**Interfaces:**

- Consumes: `gotoSignedIn` from `tests/signedIn.ts`.

`/` is already the first entry in `tests/accessibility.e2e.ts`, which covers it signed out. Signed-in surfaces need `tests/signedIn.ts`, which stubs the HTTP boundary; `draft_pages` must be added there or every signed-in draft assertion scans an empty state and reinstates the blind spot the fixture exists to close.

- [ ] **Step 1: Write the failing e2e spec**

```ts
import { expect, test } from './fixtures'; // never '@playwright/test'

test('the landing page resumes the review in one click', async ({ page }) => {
	await gotoSignedIn(page, '/');
	await expect(page.getByText(/of \d+ decided/)).toBeVisible();
	await page.getByRole('link', { name: /continue/i }).click();
	await expect(page).toHaveURL(/\/review\//);
});

test('a ready draft opens in the workspace with its banner', async ({ page }) => {
	await gotoSignedIn(page, '/review/draft/9f1c2f0e-0000-4000-8000-000000000001');
	await expect(page.getByText(/AI draft/i)).toBeVisible();
});

test('the landing page renders signed out without claiming progress', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByText(/of \d+ decided/)).toHaveCount(0);
	await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `bun run test:e2e`
Expected: FAIL on the draft and landing assertions.

- [ ] **Step 3: Add `draft_pages` to `tests/signedIn.ts` and the two pages to `tests/accessibilitySignedIn.e2e.ts`**

Follow the fixture's existing rule that each test proves its surface rendered before scanning it — assert the banner and the progress line are present, not just that the route answered.

- [ ] **Step 4: Run the e2e suite and the import guard**

Run: `bun run test:e2e && bun run test:unit -- --run tests/e2eFixtureImports.spec.ts`
Expected: PASS both.

- [ ] **Step 5: Commit**

```bash
git add tests
git commit -m "test(e2e): cover the landing page and a draft page, signed in and out"
```

---

### Task 9: Gates, staging, and ship

**Files:**

- Modify: `CLAUDE.md` — document `draft_pages`, the `draft:` path convention, the one `ssr = false` route, and that `/` is no longer a redirect
- Modify: `docs/superpowers/specs/2026-11-23-landing-page-and-ai-drafted-pages-design.md` — mark status implemented

- [ ] **Step 1: Run every gate**

Run: `bun run verify && bun run lint:ratchet && bun run check:ratchet`
Expected: PASS each. If `check` or the ratchets moved, fix the cause rather than raising a baseline — raising one is a decision, not a fix.

- [ ] **Step 2: Update `CLAUDE.md` and the spec status, then commit**

```bash
git add CLAUDE.md docs/superpowers/specs
git commit -m "docs: record draft pages, the draft route and the new landing page"
```

- [ ] **Step 3: Open the PR and watch CI**

```bash
gh pr create --fill
```

Then `gh pr checks --watch`. `test & build` and `e2e` must pass; `main` has no bypass actors.

- [ ] **Step 4: Confirm before merging**

The merge deploys production **and** applies `20261123100000_draft_pages.sql` to the production project via the Supabase GitHub App. Check what is pending against production first, and ask before merging.

- [ ] **Step 5: Push the migration to staging by hand**

```bash
supabase link --project-ref aplbsgacqnxhzjuquvft && supabase db push
```

The integration names the production ref only, so deploy previews would otherwise query a table staging does not have.

- [ ] **Step 6: Verify the live artifact**

Run: `bun run verify:live`
Expected: the published commit matches `git ls-remote origin refs/heads/main`, root returns 200, no bundle leak. A green build is not a serving deploy.

---

## Self-Review

**Spec coverage.** Landing layout A → Task 6. Propose form → Task 7. Row-first creation → Tasks 3, 4. Drafts as real pages in the workspace → Tasks 4, 5. Provenance badge and banner → Task 5. Service-role write path → Task 3. `pageStore` merge after construction → Task 4. Drafts in the denominator → Task 6. Drafting row titled from the reviewer's words → Task 3. Signed-out landing → Tasks 6, 8. Export carrying drafts is a spec non-goal for automation and is **not** covered by a task — it is listed in the spec's _Left to the builder_ and stays out of this plan deliberately.

**Two spec "left to the builder" items this plan decides**, because leaving them open would block Task 1: the table shape (one new `draft_pages` table, not nullable columns on `pages`) and slug derivation (a reserved `draft:<uuid>` path, which removes collision handling rather than solving it). Both are recorded as comments in the migration.

**One spec expectation this plan improves on.** The spec accepted that `/review/[slug]`'s pure load would become a DB read. Routing drafts to `/review/draft/[id]` with `ssr = false` keeps the static guard and `tests/reviewSlug404.spec.ts` unchanged.

**Type consistency.** `DraftPage` is defined once in Task 4 and consumed by Tasks 5–8. `reviewHrefFor` is defined in Task 2 and used in Tasks 5 and 6. `toStorePage` is defined in Task 4 and used only there. `state` is the same three-value union in the migration, the route and the store.

**Review Focus.** All five lines have an owning task's test: empty description (Task 3), over-cap (Tasks 3 and 7), signed-out landing (Tasks 6 and 8), stale drafting row (Tasks 4 and 5), `valid: false` draft kept (Task 4). Double-submit is also covered in Task 7.
