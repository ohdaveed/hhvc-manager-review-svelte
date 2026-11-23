# Landing page, and AI-drafted pages in the review queue

Status: implemented
Date: 2026-11-23

## Intent

`/` is not a page. [`src/routes/+page.svelte`](../../../src/routes/+page.svelte) exists only to
work out the queue's first row and redirect to it, and there is no help, instructions or
onboarding UI anywhere in the app. A reviewer signing in for the first time lands inside a
three-pane workspace with no explanation of what to do, and the only way to reach a specific page
is the queue sidebar or the site map — both of which live _inside_ the review layout, so neither
is reachable until you are already on a mockup.

Separately, proposing a new page is something this review already does — ten of the thirty-nine
pages in the queue are proposals, added by
[`20260830210000_add_proposed_page_rows.sql`](../../../supabase/migrations/20260830210000_add_proposed_page_rows.sql)
with the note that "the manager wants every option in front of her, and deciding not to publish
one is a normal review outcome". But a proposal today means hand-writing a TypeScript module,
exporting it from `src/lib/data/index.ts`, and writing a migration. That is a developer task, and
the person who has the idea is not the developer.

This change gives `/` a real landing page that does three things: explains how a review works,
gets you to any page without guessing, and lets you describe a page you want so an AI drafts it
into the queue as an editable page.

## Goals

- A signed-in reviewer who has never used the tool can read the landing page and know how to review
  a page without being shown.
- Resuming is one click: the landing page names the next undecided page and links straight to it.
- Any of the thirty-nine pages is reachable from `/` without first opening an unrelated one.
- A reviewer can describe a page in plain words and get an editable draft in the review queue,
  with no code change, no migration and no deploy.
- A draft is reviewed with the tools that already exist — inline edits, Fields, Rethink, Checks,
  the Karl walkthrough — not a second, lesser review surface.

## Non-goals

- Publishing. A draft that gets approved is still exported for a Karl editor to place by hand, the
  same as the other thirty-nine. Nothing in this change writes to Wagtail.
- Promoting a draft into a `src/lib/data/*.ts` module automatically. The export path is enough; see
  _Left to the builder_.
- Deleting drafts, or any editing of the corpus's thirty-nine pages beyond what exists today.
- `compliance-audit`. It answers 400 because its retrieval index never moved off the retired
  Railway backend, and nothing here changes that.
- Replacing the queue sidebar or the site map. The landing page links to them.

## Anti-goals

Things that would make this a failure even if it shipped and worked:

- **The landing page becoming a thing to click past.** If resuming takes more than one action, the
  page has made the daily job slower in exchange for helping on day one.
- **A draft that looks like a reviewed page.** The thirty-nine carry editorial provenance.
  A machine-drafted page that renders identically invites a reviewer to approve AI output as if a
  content designer had written it. It must be visibly provisional at every point it appears.
- **A second content source of truth.** If the database becomes a permanent parallel corpus, then
  `corpus:import`, the lock hashes and the Karl export each quietly cover only part of the review.
  The database holds work in progress; `src/lib/data` remains what ships.
- **Losing a reviewer's description.** Retyping a paragraph because a function timed out is the
  single most likely reason someone stops using the feature.

## Constraints

These are measured facts about this repo, not preferences.

1. **Netlify kills a synchronous function at 60s and it is not configurable.** The AI layer runs
   inside a 55s budget (`GEMINI_DEADLINE_MS`). A whole-page `content` draft measured ~46s on
   `gemini-3.8-flash` and 9–16s on the default `gemini-3.1-flash-lite`. A from-scratch page is the
   same size of generation. There is no room for the validation retry, which only starts with ≥15s
   left.
2. **`pages` has no INSERT policy, deliberately.**
   [`20260822030000_scope_rls_policies.sql:58`](../../../supabase/migrations/20260822030000_scope_rls_policies.sql)
   states "No INSERT or DELETE: pages are seeded."
3. **`/review/[slug]` 404s anything outside the static corpus.**
   [`+page.ts`](../../../src/routes/review/[slug]/+page.ts) builds `ids` from `allPages` at module
   scope and the load is pure.
4. **`pageStore.pages` is built in the constructor** from `allPages`, synchronously, at module
   load — see [`pageData.svelte.ts`](../../../src/lib/stores/pageData.svelte.ts). Anything arriving
   from an async read cannot be there yet.
5. **Merging to `main` applies migrations to production** via the Supabase GitHub App, and skips
   staging. Staging needs a manual `supabase db push`.
6. **`SVELTE_PUBLIC_*` are inlined at build time**, so a deploy's Supabase target is fixed when it
   builds.
7. **`main` requires `test & build` and `e2e` to pass**, with no bypass actors.
8. **Every e2e spec must import `test` from `tests/fixtures`**, and that fixture fails a test on any
   console error or any document response ≥ 400.

## Approaches

Three ways to make an AI-drafted page reviewable were considered.

### A — Drafts are real pages in the database (chosen)

A row holds the drafted page as `jsonb`; a `pages` row joins it to the queue. `pageStore` serves
`allPages` ∪ drafts, so the workspace renders a draft as a page.

Chosen because every panel already keys off a page object plus a field id — `fieldResolver` walks
the page object rather than anything corpus-specific — so inline edits, Fields, Rethink, Checks,
the Karl walkthrough and the export all work on a draft with no change. It is the only option that
gives the reviewer the mockup preview, which is what this tool is.

Its cost is accepted knowingly: `/review/[slug]`'s 404 set stops being a static set computed from
`allPages`, so that load is no longer pure and `tests/reviewSlug404.spec.ts` changes shape.

### B — Drafts are proposal cards

Stored as `jsonb`, shown at their own route as title, summary, intended sections and Karl notes;
editable as prose, approve or reject, no mockup preview. Keeps the static 404 guard and the corpus
lock untouched.

Rejected: a proposal you cannot see rendered is a weaker review than the tool already gives, and
approving one still leaves it needing a hand-port. It also creates a second review surface with
its own rules.

### C — Generate a TypeScript module and open a pull request

One content source; the drafted page becomes indistinguishable from the thirty-nine and flows
through `corpus:import`, the lock hashes and the Karl export with no new code.

Rejected on two grounds: the draft is not in the queue until a merge and a Netlify build, which is
not what was asked for; and it would put a GitHub write token in the application, a far larger
trust surface than anything the app holds today.

### The row-creation decision, within A

Whether the queue row is written before or after the model answers was decided separately.

**Row first** (chosen): submitting writes the row immediately, holding the reviewer's description
and a `drafting` state; generation fills it in when it returns. Survives constraint 1 — a killed
function leaves a row saying _draft failed, retry_ rather than losing the description — and the
reviewer is free to leave the screen.

**Wait on screen** (rejected): one request, no partial rows, nothing new in the queue renderer, but
a 60s kill loses the description outright and pins the reviewer to the screen for up to 45 seconds
with no way to tell a slow draft from a dead one. Given ~46s measured against a 55s budget, that
headroom is too thin to build on.

## Decided

### The landing page

Layout **A, resume first**:

- A progress line (_N of M decided_) and one prominent **Continue** button linking to the next
  undecided page. `nextUndecidedPath` and `firstQueuePath` already exist in `reviewState.ts` and
  are the source for this — no second ordering rule.
- Below it, three equal columns: **How it works** (the four steps of a review, numbered),
  **All pages** (the full list, linking to the site map), **Propose a page**.
- Signed out, the page shows what the tool is and a sign-in link. The review tables are all
  `TO authenticated`, so there is no progress to show and the page must not look broken; the
  mockups themselves still render from the static corpus.

Three points settled during the builder read, marked as the author's calls rather than decisions
taken in conversation:

- **`/` stops redirecting.** It becomes a page that renders, and **Continue** is a link a person
  clicks. The existing onMount-redirect goes away rather than being kept as a fallback — a page
  that sometimes navigates away on its own is worse than either behaviour alone.
- **Drafts count in the progress denominator.** _12 of 39_ becomes _12 of 40_ when a draft lands,
  so proposing a page visibly adds work. That is consistent with how the ten existing proposals
  already sit in the queue, and the alternative — a denominator that excludes drafts — would report
  a review as complete with undecided pages in it.
- **A `drafting` row's title is the reviewer's own words**, truncated: the model's title does not
  exist yet, and `ReviewQueue.titleFor` would otherwise fall back to showing a raw path.

### Creating a page

- One textarea in the Propose column. No page-type picker: the model already chooses `type` and the
  Karl field notes for Rethink, and asking the reviewer for something they do not have adds a
  decision without adding information.
- Submitting writes a draft row and a `pages` row, then runs the generation. The row appears in the
  queue immediately in a `drafting` state and the reviewer may navigate away.
- On success the row holds the drafted page object, the validator's `valid` / `issues`, and the
  model name. On failure it holds the error and the original description, and offers a retry.
- The AI request is unchanged: `{ task: 'content', prompt }`. `page` is already optional in
  [`schemas.js`](../../../src/lib/server/ai/vendor/schemas.js) and
  [`prompts.js`](../../../src/lib/server/ai/vendor/prompts.js) only adds `<current_page>` when one
  is passed. **No prompt, schema or validator work is needed.** Call it through
  `requestGeneration()`; a bare `fetch` 401s.

### Where drafts are written

A server route on the `/api/invite` pattern: verify the caller's bearer token with a per-request
client _outside_ the try block, then act with service-role. This is preferred over adding an INSERT
policy to `pages` because constraint 2 is a deliberate property worth keeping, and because the
route can write the draft row and the `pages` row as one unit.

### How drafts reach the workspace

`pageStore` gains a method to merge draft pages in after construction, applying the same
`routableId` + `withFieldKey` mapping the constructor applies — not a second mapping, for the
reason `withFieldKey`'s own comment gives about recomputed keys orphaning edits.

`/review/[slug]`'s 404 set becomes corpus ∪ drafts. `ReviewQueue.titleFor` already falls back to
the path when the corpus has no page for it, so a draft row must carry its own title.

### Provenance

A draft is visibly provisional wherever it appears: a badge on its queue row, and a banner on the
page naming that it is an AI draft, who asked for it, the description it came from, and what failed
validation. This follows the existing convention — the ten proposals open their `editorNote` with
"PROPOSED PAGE — not in the current 29".

### Scope of who

Any signed-in reviewer can create a draft, the same rule as invites. Every `authenticated` caller
can already UPDATE any row of `pages`, so this grants nothing new in kind.

## Left to the builder

- **Table shape.** One new table versus extending `pages` with nullable columns. The
  `corpus_versions` / `page_versions` pair is the closest existing model for page content as
  `jsonb` and is worth reading first.
- **Draft status representation.** The queue's status union has four values and
  `20260830210000` explicitly declined to invent a fifth for proposals. Whether `drafting` is a
  status, a separate column, or inferred from a null content column is the builder's call, but the
  queue's four-way grouping should not change.
- **How the generation runs after the row is written.** A second request from the browser is the
  simplest thing that works and keeps the 55s budget on one call. A background function would
  survive the reviewer closing the tab. Pick the simpler one unless it fails constraint 1.
- **Progress copy during the wait**, and how a stale `drafting` row is recovered if the tab closed
  mid-flight.
- **Slug derivation** for a drafted page, and collision handling against the existing thirty-nine
  and against other drafts. `routableId` is the rule; what feeds it is open.
- **Export.** `exportReview.ts` should carry drafts; whether it also emits a paste-ready
  `src/lib/data` module is a judgement call, and the non-goal above only rules out doing it
  automatically.
- **Signed-out landing content** beyond the sign-in link.
- **Migration sequencing.** Per constraint 5, decide what is pending against production before
  merging, and push to staging by hand after.

## Verification

Per the repo's definition of done:

- `bun run verify` green, and `lint:ratchet` / `check:ratchet` still at baseline — `check` is at
  zero errors and warnings are at zero and gated.
- New e2e specs import `test` from `tests/fixtures`. A draft page's surfaces need signed-in
  coverage via `tests/signedIn.ts`, and `tests/accessibilitySignedIn.e2e.ts` is where axe sees
  them — the landing page's own `/` is already first in `tests/accessibility.e2e.ts`.
- `/` is currently a redirect that PR #166 tuned deliberately (`2e234a2`, in this checkout at
  `b9482c9`); replacing it means re-checking what asserts that redirect.
- The live check is `verify:live`, which asserts the published commit before anything else.
