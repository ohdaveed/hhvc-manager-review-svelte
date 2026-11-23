# Rulings made while executing the landing-page plan

Decisions taken on the repo owner's behalf during subagent-driven execution of
[`2026-11-23-landing-page-and-ai-drafted-pages.md`](2026-11-23-landing-page-and-ai-drafted-pages.md),
in the order they were made. Each says what it costs if it is wrong, so a wrong
one can be found and reworked rather than discovered later.

Branch `feat/landing-page-ai-drafts`, PR #179, `b9482c9..55648c5`.

## Setup

**Feature branch in the primary checkout, not a new git worktree.** Execution was
strictly sequential, so there were no parallel groups to isolate, and a fresh
worktree cannot commit here until `node_modules` and `.env.local` are replicated.
_Cost if wrong:_ a concurrent session writing this checkout could have collided;
mitigated by checking `git status` before each dispatch.

## Where things live

**R1 — `MAX_DESCRIPTION_CHARS` lives in `src/lib/corpus/draftPath.ts`,** not in the
server route as the plan said. SvelteKit rejects non-standard named exports from a
`+server.ts`, and a component importing one would pull server code into the browser
bundle. _Cost if wrong:_ one constant sits in a module named for paths.

**R16 — `PATCH /api/pages` does not update `draft_pages.title`,** so that column keeps
the truncated description for the row's life while a ready draft's real title lives in
`pageStore`. Rejected adding `title` to the PATCH because it would have reopened a
completed task. _Cost if wrong:_ two title sources that could drift; only the queue row
renders it.

**R18 — title resolution.** A drafting or failed draft has no `pageStore` entry, so
`draftsStore.title` is its only source; a ready draft's is keyed by `draft.path`, not
`draft.id`. _Cost if wrong:_ a drafting row shows a raw `draft:<uuid>`.

**R15** — superseded by R18's sharper wording.

## Database and the server route

**R7 — the migration was executed before review,** by applying all 15 repo migrations in
order to a throwaway `postgres:17` container rather than resetting the shared local
stack. _Cost if wrong:_ the bootstrap was hand-built, so it is strong evidence rather
than proof that the production apply will succeed.

**R11 — `POST` picks the newest `reviews` row** (`order('created_at', desc).limit(1)`),
matching `reviewState.ts:122-125`. _Cost if wrong:_ a draft attached to a stale review
would be invisible in the queue.

**R12 — `PATCH` has no ownership check,** matching `pages.status` being writable by any
reviewer. **The "cost if wrong" I first recorded was wrong:** I wrote it was no worse
than the existing `pages` UPDATE policy, but that policy writes text while `PATCH`
writes structure fed to a renderer. The final review's Important finding is what that
difference bought. The decision stands; shape validation was added as a separate axis.

**R14 — the no-retry-on-`ready` guard belongs in the interface, not the route.** Sound
for _state_; it does **not** transfer to _shape_, because there is no interface between
a `curl` and the row. _Cost if wrong:_ covered by R12's correction.

**R13 — five behaviours the Task 3 implementer listed as beyond its brief were not scope
creep;** four traced to my own dispatch. _Cost if wrong:_ none; the reviewer judged each
on merit.

## Security

**R6 — draft content needs no HTML sanitisation.** First rested on "no `{@html}`
anywhere", which alone would not settle it. The final review confirmed the harder
version: `resolveLinkTarget` emits an `href` only for `/^https?:\/\//`, and three block
components state in comments that structured URL fields never render as `<a href>`.
_Cost if wrong:_ none found; no stored-XSS path exists, including via a crafted PATCH.

**R27 — silent truncation is not present but is now pinned.** `textarea.svelte` sets no
`maxlength`; a future `maxlength={2000}` would cut pasted text in a real browser while a
jsdom test stayed green, so an assertion guards its absence. _Cost if wrong:_ none.

## Routing and links

**R4 — `/review/[slug]` keeps its pure static 404 set;** drafts get their own route with
`ssr = false`. The spec had accepted losing that guard. _Cost if wrong:_ none; strictly
less invasive than the spec's own plan.

**R5 / R17 / R21 — five link builders, not four, turn a `pages.path` into an href.** I
listed four; the review found `src/routes/+page.svelte:31`, which would have hard-404'd
the app's entry point when a draft was the first queue row. Fixed in Task 5 rather than
left to Task 6's rewrite of that file. Ready drafts also now enter the site map, which
Task 5 resolved by excluding them. _Cost if wrong:_ a dead link; caught by e2e.

**R24 — `reviewProgress` using `pages.find(status === 'needs-review')` is NOT a second
ordering rule.** `needs-review` is the first entry of `QUEUE_STATUS_ORDER`, so
`firstQueuePath` reduces to the same `find`. They diverge only when every page is
decided, where returning `undefined` is correct for a Continue affordance. A comment now
records this, because the obvious "correction" would introduce a bug. _Cost if wrong:_
none; measured.

## Product behaviour

**R2 — the banner says "requested by you" or names no one.** Nothing maps a user id to a
display name and a browser client cannot read `auth.users`. _Cost if wrong:_ another
reviewer's name is absent.

**R19 — a plan gap: nothing existed to retry a draft with.** `retryDraft` was added to
re-run generation against the existing row. Rejected `createDraft(draft.description)`,
which POSTs and would have minted a duplicate queue row beside the failed one. _Cost if
wrong:_ a retry that duplicates rows — which is what the rejected options do.

**R26 — the propose form must not `await createDraft()`** before confirming. The promise
does not settle until generation finishes (9–16s, up to ~46s), so the obvious
implementation would spin the button while the row already existed, defeating the
row-first design. _Cost if wrong:_ the reviewer is pinned to the screen.

**R10 — an empty draft id means "not a draft",** so all three path helpers agree.
_Cost if wrong:_ a malformed path 404s at a different route; both outcomes are a 404.

**R23 — the landing page keeps one `loadReview()` call.** My dispatch told the
implementer to delete it; the instruction was over-specified. The design forbids `/`
_redirecting_, not loading the data it displays. _Cost if wrong:_ none; the alternative
is a resume-first page with no progress on it.

**R25 — my own error, corrected.** The silent `.catch` and the progress-gated-on-resolve
that I asked for combined into a permanent "Loading your progress…" on rejection. Also
reversed my reasoning: the e2e fixture fails on `console.error` only, so `console.warn`
was always available. _Cost if wrong:_ a failure message where a retry might have been
offered.

**R33 — the missing `<h1>` was a product defect, not a scanner-tag question,** and was
fixed rather than deferred. _Cost if wrong:_ one heading element on three states.

**R28 — the sign-in link goes back with a distinct accessible name.** The one-link shape
was an accident of a test query, and the component had been bent to fit it. _Cost if
wrong:_ two sign-in links on one page.

## Process and verification

**R3 — `exportReview` already carries drafts,** because the call site passes
`pageStore.pages`. _Cost if wrong:_ an export missing drafts.

**R20 — live browser verification was deferred to Task 8,** not skipped. Starting a dev
server mid-branch would have duplicated it and left a server in a shared checkout.
_Cost if wrong:_ none; Task 8 ran it and found no product defect.

**R22 — the `FieldsPanel.svelte` reformat was the repo's own pre-commit `format` job,
not a stray formatter.** `prettier --check` flags that file and the hook runs
`prettier --write` with `stage_fixed`, so staging it was enough to rewrite it. The
lesson — never stage a file you are not deliberately changing — was carried into every
later dispatch. _Cost if wrong:_ none; the five other touched files were verified
already prettier-clean.

**R29 — mutation testing replaced "module not found" as the standard of evidence.** Four
tasks had reported a RED that only proved a file was absent. The first mutation run found
a vacuous test immediately. _Cost if wrong:_ none.

**R30 — the three deferred a11y items were measured, not guessed:** no landmark
violation; 5.79:1, 4.92:1 and 5.23:1, all above AA. _Cost if wrong:_ the Retry margin is
thin at 0.42 over the threshold, and hover/focus states are never scanned.

**R31 — `pageData` being undefined in the workspace is closed by a browser run.** No
console error on drafting, stale or failed drafts. _Cost if wrong:_ none.

**R32 — the propose form got a browser spec rather than an accepted gap,** because its
error text uses `text-sfds-red` and was never scanned. _Cost if wrong:_ none.

**R34 — the mutation evidence corrected itself.** A first `DRAFT_STALE_MS` of `9e9` left
the fixture stale and under-reported; `9e15` produced three failures. _Cost if wrong:_
none.

**R35 — the propose-form error spec answers 200 with a bad body rather than a 5xx,**
because Chromium logs a failed resource load as a console error and the fixture fails on
that. Consistent with `/review/[slug]`'s 404 being a unit test for the same reason.
_Cost if wrong:_ the real 5xx path is not exercised in a browser; the route's status codes
are covered at the unit level.

**R36 — a CLAUDE.md claim flagged as unverified is true.** The stale branch is in
`DraftBanner.svelte:72`; the implementer had looked in the route. _Cost if wrong:_ none.

**R37 — the final review's Important finding is confirmed and marginally worse than
described:** `loadDrafts` has no `try` at all, only a returned-error check. All three
legs were fixed rather than one. _Cost if wrong:_ none; a regression test now
demonstrates it.

**R38 — the review's corrections to R12, R14 and R6 are accepted;** all three sharpen
rather than overturn.

**R39 — none of the 24 deferred Minors blocks the merge.** Four are struck as closed by
measurement. The one to do first afterwards is a direct test for `routePathFor` and for a
draft route highlighting its queue row, because `currentPath` is literally the conflicted
line. Do **not** "fix" the stub's permissive missing-`review_id` handling: the decoy row
is what makes the dropped-filter mutation fail.

## Known issues at merge

Two optional coverage gaps, both Minor and both recorded rather than fixed: no test
covers the new PATCH shape check or the layout's `.catch` (both verified by reading), and
the regression test does not assert that the skipped draft's path was logged.

## Deferred backlog

The 24 Minor findings deliberately deferred during the task reviews. The final
whole-branch review triaged all of them and ruled that none blocked the merge (R39);
four were struck as closed by measurement rather than deferred. Kept here because the
execution ledger that held them is scratch and has been removed.

**Do first:** a direct test for `routePathFor`, and one pinning that a draft route
highlights its queue row — `currentPath` is literally the line that was resolved by hand
in the merge conflict.

**Do not "fix":** the stub treating a missing `review_id` as "return all rows". The
foreign-review decoy row is what makes the dropped-filter mutation fail, and a stricter
stub would weaken that signal.

- **Task 4** — `getSession` is called twice in `createDraft` (draftPages.ts:106-108).
- **Task 4** — the 90s `isStaleDraft` boundary is untested (91s and 10s are covered).
- **Task 5** — `<aside>` inside the layout's `<main>` may trip
- **Task 5** — `text-sfds-red` on `bg-sfds-blue-l1` is unmeasured contrast
- **Task 5** — a draft id absent from `draftsStore` shows "Loading draft…" with no
- **Task 5** — `routePathFor` has no direct test; the queue mock exercises only the
- **Task 5** — no coverage for `retryDraft` where generation throws again
- **Task 5** — ⚠️ unverified — how `ReviewWorkspace` behaves when `pageData` is
- **Task 6** — `loaded` never resets, so signed-in → out → in shows stale
- **Task 6** — no test for a signed-in `loadReview` rejection, nor for the effect's
- **Task 6** — the brief suggested shadcn `Card`/`Separator`; only `Button` is used.
- **Task 6** — `text-sfds-action` link contrast on the slate/white background is
- **Task 7** — no boundary test at exactly 2000 chars, so `over <= 0` vs `< 0` is
- **Task 7** — the `<label>` is a two-sentence paragraph, so the textarea's
- **Task 7** — if `supabase.auth.getSession()` throws AFTER a successful POST
- **Task 7** — 5 of 8 tests were observed failing only for "module not found"
- **Task 7** — a superseded draft's late failure is only `console.warn`ed; the form
- **Task 8** — `aria-allowed-role` on `.cursor-default`, pre-existing across all
- **Task 8** — duplicated fixture facts — the four draft titles are retyped at
- **Task 8** — `gotoSignedIn` branches on `path === '/'`, so `/?x=1` falls through to
- **Task 8** — `signedIn.ts` is ~300 lines mixing the session shim, the routes and the
- **Task 8** — axe reports obscured or unresolvable contrast as `incomplete` rather
- **Task 8** — the stub treats a MISSING `review_id` param as "return all rows",
- **Task 8** — no mutation was run for dropping `updated_at` from the store's select,
