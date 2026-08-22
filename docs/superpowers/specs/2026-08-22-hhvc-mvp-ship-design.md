# Design — Ship the HHVC review tool as an MVP

Date: 2026-08-22
Status: approved design, pending implementation plan

## Problem

The deployed site at `https://hhvc-manager-review.netlify.app` responds 200 and
renders, but **no reviewer other than the developer can use it**, and no reviewer
at all can use it in production.

Three findings, in the order they bite a first-time visitor:

1. **There is no way to sign in.** `src/lib/supabase.ts:32` guards the only
   sign-in path behind `import.meta.env.DEV`, so it is compiled out of the
   production bundle. The file's own comment states it: _"The hosted app still
   has no login route."_
2. **Without a session the app is inert.** Every RLS policy on `reviews`,
   `pages`, `comments` and `edits` is `FOR ALL TO authenticated USING (true)`,
   so on the hosted site `loadReview()` reads nothing. The queue is empty,
   decisions and notes do not persist, and `/api/ai/generate` returns 401
   because `requestGeneration()` has no access token to attach.
3. **Even with a session there may be nothing to read.** `supabase/seed.sql` is
   local-only by design ("never applied to the hosted project") and
   `scripts/sync-checks.ts:199` only `UPDATE`s `pages` — neither can create the
   `reviews` row or the `pages` rows the hosted database needs.

Separately, the work is spread across three unmerged branches. `main` is 18, 17
and 27 commits behind `feat/dev-seed`, `feat/shadcn-components` and
`feat/sfds-v4-scoped` respectively, and holds none of it.

## Decisions taken before this design

- **One shared account.** Reviewers sign in to a single Supabase identity. No
  per-user attribution at MVP; `edits` continues to record no author.
- **Magic link, to a shared mailbox.** Chosen over a shared password form. The
  known trade-off, accepted: the link arrives in one inbox, so a reviewer
  without access to that mailbox needs a link forwarded to them.

## Non-goals

Stated so they can be reopened deliberately rather than by drift:

- Named reviewers and an `edits.author_id` column.
- Tightening RLS away from `USING (true)`. Any signed-in user can still read or
  delete any row; with `shouldCreateUser: false` the only signed-in user is the
  shared account.
- `PLAN.md` task 12 — deduplicating the inline-edit hover affordance repeated
  across `Page.svelte` and `Section.svelte`.
- The Karl-tags `Switch` in `src/routes/review/+layout.svelte`, deliberately
  disabled over unimplemented state. It stays disabled.
- The unused `comments` table. Zero references in `src/`. Dead schema, harmless,
  left alone.

## Design

### 1. Authentication

supabase-js is at 2.112.3 and `src/lib/supabase.ts:5` creates the client with no
options. Per the Supabase reference, `flowType` **defaults to `implicit`** when
omitted, and `detectSessionInUrl` defaults to true in the browser. A magic link
therefore returns with an `#access_token=...` fragment that the client parses on
its own. There is no PKCE `?code=` to exchange and no `exchangeCodeForSession`
call anywhere in this design.

**`/login` (new).** An email field, a submit button, and a "check your inbox"
confirmation state. Calls:

```ts
supabase.auth.signInWithOtp({
	email,
	options: {
		shouldCreateUser: false,
		emailRedirectTo: `${origin}/auth/callback`
	}
});
```

`shouldCreateUser: false` is **load-bearing, not a nicety**.
`supabase/config.toml` sets `enable_signup = true`, and every RLS policy is
`TO authenticated USING (true)`. Without this flag, any stranger who finds the
public URL can request a magic link for their own address, be created as an
authenticated user, and then read or delete every row in the review. The flag
makes the shared account the only identity that can ever sign in.

**`/auth/callback` (new, thin).** Exists so the emailed link has one stable
landing URL. It subscribes to `supabase.auth.onAuthStateChange` and navigates to
the workspace on `SIGNED_IN`, then clears the hash from the address bar. On an
expired or invalid link it renders an error with a path back to `/login` rather
than dropping the visitor into a workspace that will silently show nothing.

**The fragment parse is not a promise you can await, and this is the trap.**
supabase-js consumes the `#access_token` during client initialisation and
announces the result through `onAuthStateChange` — first `INITIAL_SESSION`, then
`SIGNED_IN`. The reference explicitly warns to "avoid making assumptions as to
when this event is fired." A guard that calls `getSession()` on mount can
therefore run before the fragment has been consumed, read null, and bounce a
reviewer who has just authenticated straight back to `/login`.

So all three session checks — `/`, the `/review` layout, and the callback — must
treat a **first null session on a URL that carries an auth fragment** as "not yet
decided" rather than "signed out", and wait for the event before redirecting.
This is the failure that costs an afternoon of "the link works but it kicks me
out", and it is cheap to avoid deliberately and expensive to find by accident.

`detectSessionInUrl` needs no configuration: it defaults to true in the browser
and `src/lib/supabase.ts:5` passes no options, so this is inherited behaviour.
Setting it explicitly would read as meaningful and change nothing.

**`/` (rewrite).** `src/routes/+page.svelte` currently redirects
unconditionally into the workspace with the comment "Bypass Magic Link auth
during development." It becomes a session check: session present → workspace,
absent → `/login`.

**`/review` layout guard.** `src/routes/review/+layout.svelte` needs the same
check, not just `/`. Today a deep link straight to `/review/<slug>` renders the
full chrome around an empty queue with no explanation. The guard goes in front
of the existing `onMount` that calls `loadReview()`, redirecting to `/login`
when there is no session.

**`ensureDevSession()` is not touched.** It is already `DEV`-gated, and
`scripts/verify.sh:83` greps the deployed bundles for `arrizon.david` and
`dev-local-only` as a standing check that it stays compiled out. The real auth
path runs alongside it, never through it.

### 2. Hosted data bootstrap

**`scripts/seed-hosted.ts` (new).** Reads `SVELTE_PUBLIC_SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` from the environment the same way
`scripts/sync-checks.ts` already does, and idempotently inserts one `reviews`
row plus one `pages` row per corpus page. Idempotent in the same shape as
`supabase/seed.sql` — guarded by `WHERE NOT EXISTS` on `(review_id, path)` — so
re-running it after adding a page module is safe. It never creates an auth user;
that is the local seed's job and must not reach the hosted project.

`scripts/sync-checks.ts` then runs against the resulting review to populate
`page_checks`.

**Shared `derivePageId`.** The rule that turns `sf.gov/topic-x--about` into
`topic-x--about` is currently written twice — in
`src/lib/stores/pageData.svelte.ts` and again in `scripts/gen-seed.ts:16`, the
latter carrying a comment that it "mirrors the derivation" by hand. A third copy
in the hosted seeder would be a third chance for a value to drift that must
match exactly or the queue cannot find its pages. It is extracted to one
exported function that `pageData.svelte.ts`, `gen-seed.ts` and `seed-hosted.ts`
all import.

**Implementation starts with a read-only probe** of the hosted database to
establish whether the `reviews` and `pages` rows already exist. That is the
difference between writing the script and merely running it once.

### 3. Branch integration

Ancestry, measured rather than assumed:

- `feat/shadcn-components` is an ancestor of `feat/dev-seed`.
- `feat/shadcn-components` is an ancestor of `feat/sfds-v4-scoped`.
- `feat/dev-seed` is **not** an ancestor of `feat/sfds-v4-scoped`.

`feat/sfds-v4-scoped` is required, not optional polish. `feat/dev-seed` still
carries `@import '@sfgov/design-system/dist/css/sfds.css'` at `src/app.css:2`.
Per commit `baa5bc8`, that bundle is a Tailwind v3 build whose 7,714
`!important` declarations beat every v4 utility, which "gave every shadcn
component a 3px near-black border." Shipping without the v4 branch ships a
visibly broken interface.

`git merge-tree --write-tree feat/sfds-v4-scoped feat/dev-seed` returns a clean
tree — **no conflicts**, despite both branches touching `src/app.css`,
`Page.svelte` and `Section.svelte`.

Order:

1. Merge `feat/dev-seed` into `feat/sfds-v4-scoped`.
2. Build the auth and seeding work on that combined branch.
3. `main` takes the result as a fast-forward.

No rebase at any point, so no force-push and no discarded commits.

### 4. Live defect fixed in passing

`src/routes/review/+layout.svelte:62` renders an "Export Data →" button with no
click handler. It is hidden until it does something. A dead control in a tool
handed to reviewers is worse than an absent one.

## Testing

**Unit** — `src/**`, server project, node environment:

- `/login` calls `signInWithOtp` with `shouldCreateUser: false` and an
  `emailRedirectTo` pointing at the callback route on the current origin.
- The callback renders the error state for an expired or invalid link instead of
  navigating into an empty workspace.

**E2E** — `playwright`:

- An unauthenticated request to `/` lands on `/login`.
- An unauthenticated request to `/review/<slug>` lands on `/login`.

A real magic-link exchange is not automatable here and is covered by the manual
gate below.

## Definition of done

`bun run verify` and `bun run verify:live` both green are **necessary and not
sufficient**. The live script greps deployed bundles for `arrizon.david` and
`dev-local-only`, which proves the dev path is compiled out — not that anyone
can sign in.

Done is a full round trip against the deployed origin:

1. Request a magic link from `/login` for the shared address.
2. Open the link from the shared mailbox.
3. Land in the workspace with a **populated** queue.
4. Record a decision on a page.
5. Reload, and see that decision persist.
6. Trigger an AI rewrite and get **anything other than a 401** — the gate is
   that the session reaches the proxy, not that the rewrite succeeds. A 200
   additionally depends on `RAILWAY_API_TOKEN` being current on the Netlify site
   and the Railway backend being up, neither of which this work touches; making
   them part of the gate means debugging the wrong subsystem at the worst
   moment. `scripts/verify.sh:72` already asserts the unauthenticated 401, so
   this step supplies the other half of that signal.

## Open items requiring the user

These cannot be resolved from the repository:

- **The shared mailbox address**, and confirmation that the intended reviewers
  can reach it.
- **The shared account must already exist in the hosted project's `auth.users`.**
  `shouldCreateUser: false` refuses to create it, so if the identity is not
  provisioned first, every sign-in attempt fails with no account to fall back
  on. Provisioning it is a one-time step that precedes the first live test.
- **Signups must be disabled on the hosted project.** This is the actual
  control, not defence in depth: `shouldCreateUser: false` protects the login
  route this design adds, but the anon key is public and anyone can call
  Supabase's auth endpoint directly with it, bypassing that route entirely. Only
  the project-level signup setting stops a stranger becoming an authenticated
  user with `USING (true)` access to every row. `enable_signup = true` in
  `supabase/config.toml` governs the local stack only; the hosted setting is
  separate and cannot be read from the repository.
- **The hosted Supabase redirect allow-list** must contain the Netlify origin
  and the exact `/auth/callback` URL, or the emailed link redirects to a dead
  address. `supabase/config.toml:additional_redirect_urls` currently lists only
  `http://localhost:5173` and `http://127.0.0.1:5173`; the local stack needs the
  callback path added as well.
- **Whether the hosted database already holds a `reviews` row and its `pages`
  rows** — answered by the read-only probe that opens implementation.

## Risks

- **The magic link is single-mailbox by design.** Accepted at decision time. If
  review sessions turn out to involve several people signing in at once, this is
  the first thing to revisit, and the fix is the shared-password form that was
  considered and set aside.
- **`PLAN.md` at the repository root is stale.** Its tasks 5–11 describe shadcn
  conversion work that the code already contains — `ReviewWorkspace.svelte`
  renders `Tabs.*` from bits-ui, and every workspace component imports from
  `components/ui`. The implementation plan replaces that file rather than
  appending to it.
