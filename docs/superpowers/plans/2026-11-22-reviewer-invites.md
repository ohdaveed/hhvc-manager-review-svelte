# Reviewer Invites Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any signed-in reviewer invite a new reviewer by email, creating the `auth.users` row that a magic link requires.

**Architecture:** One SvelteKit server route, `POST /api/invite`, verifies the caller's Supabase bearer token with the anon key, then calls `auth.admin.inviteUserByEmail` with a separate service-role client built from `$env/dynamic/private`. The browser never holds the service-role key. The only UI is a form in the already-signed-in branch of `/login`. No schema change, no new table.

**Tech Stack:** SvelteKit 2 (adapter-netlify), Svelte 5 runes, `@supabase/supabase-js`, Vitest (server project), Supabase GoTrue admin API.

**Spec:** [docs/superpowers/specs/2026-11-22-reviewer-invites-design.md](../specs/2026-11-22-reviewer-invites-design.md)

## Global Constraints

- The service-role key is read only from `$env/dynamic/private` as `SUPABASE_SERVICE_ROLE_KEY`. It must never be imported into a `.svelte` file or any module a `.svelte` file imports.
- On Netlify the key is set **per deploy context**: production's key for `production`, staging's (`aplbsgacqnxhzjuquvft`) for `deploy-preview` and `branch-deploy`. A single all-contexts value undoes the production/staging split.
- `disable_signup` stays `true` on both hosted projects. Nothing in this plan turns public signup on.
- The caller's identity comes from the verified bearer token only, never from the request body.
- `redirectTo` is `<request origin>/login`. Both projects' `uri_allow_list` already cover `https://sfhealthyhousing.netlify.app/**`, `https://*--sfhealthyhousing.netlify.app/**` and `http://localhost:5173/**`.
- Conventional commits. `bun run verify` must pass before the branch is opened as a PR.

## Review Focus

Five failure modes the spec implies; each has a test in the task that owns the code.

1. **Caller with no or an expired token** — 401, and the service-role client is never constructed. This is the escalation case: a route that builds the admin client before verifying is an open invite relay. (Task 2)
2. **Address that already has a confirmed account** — 409 with a plain message, not a 500. GoTrue returns 422 `email_exists`; a catch-all would flatten it. (Task 2)
3. **Address outside the Supabase organisation while `smtp_host` is null** — GoTrue's `email_address_not_authorized` must reach the inviter as its own message. This is the _default_ failure until Task 1's SMTP step lands, so a generic "invite failed" would make the whole feature look broken. (Task 2)
4. **Mailer rate limit** — `rate_limit_email_sent` is 2/hour and shared with sign-in emails, so a reviewer inviting two people hits it immediately. GoTrue's 429 must pass through with its message. (Task 2)
5. **`SUPABASE_SERVICE_ROLE_KEY` unset in a deploy context** — a clear 500 naming the variable. Without the check the route builds an admin client with `undefined`, GoTrue answers 401, and it reads to the inviter as _their_ session being bad. (Task 2)

---

### Task 1: Close local signup

Brings the local stack in line with both hosted projects, and removes the constraint that makes the feature undeliverable. The SMTP half has no test — it is remote configuration — so it is verified by reading the value back.

**Files:**

- Modify: `supabase/config.toml:176` and `supabase/config.toml:221`
- Test: `tests/localSignupDisabled.spec.ts` (create)

**Interfaces:**

- Consumes: nothing.
- Produces: nothing code-level. Later tasks assume `smtp_host` is non-null on both projects.

- [ ] **Step 1: Write the failing test**

`.spec.ts` under `tests/` runs in the **server** project (node env) per the vitest split in `vite.config.ts`. A `.test.ts` here would get jsdom and no `fs`.

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('local Supabase auth config', () => {
	it('disables signup in both [auth] and [auth.email]', () => {
		const toml = readFileSync('supabase/config.toml', 'utf8');
		const flags = [...toml.matchAll(/^enable_signup\s*=\s*(\w+)$/gm)].map((m) => m[1]);
		// Two uncommented occurrences: [auth] and [auth.email]. [auth.sms] is
		// already false and is matched here too; all of them must be false.
		expect(flags.length).toBeGreaterThanOrEqual(2);
		expect(flags.every((f) => f === 'false')).toBe(true);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test:unit -- --run tests/localSignupDisabled.spec.ts`
Expected: FAIL — two flags read `true`.

- [ ] **Step 3: Set both `enable_signup` keys to `false` in `supabase/config.toml`**

Leave the surrounding comments intact.

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun run test:unit -- --run tests/localSignupDisabled.spec.ts`
Expected: PASS

**Steps 5 and 6 are REMOVED.** They configured custom SMTP on both hosted projects and read the values back. No email is sent any more — the route returns the link and it is delivered by hand — so SMTP is not a prerequisite for anything here. See `docs/superpowers/plans/2026-11-22-hand-delivered-invite-links-plan.md`. The `enable_signup` work in steps 1–4 above is unrelated and still correct.

- [ ] **Step 7: Commit**

```bash
git add supabase/config.toml tests/localSignupDisabled.spec.ts
git commit -m "chore(auth): disable local signup to match both hosted projects"
```

---

### Task 2: The invite route

**Files:**

- Create: `src/routes/api/invite/+server.ts`
- Test: `src/routes/api/invite/server.test.ts` (beside the handler, like the AI proxy's — `src/**/*.test.ts` is the server project)

**Interfaces:**

- Consumes: `SUPABASE_SERVICE_ROLE_KEY` from `$env/dynamic/private`; `SVELTE_PUBLIC_SUPABASE_URL` and `SVELTE_PUBLIC_SUPABASE_ANON_KEY` from `$env/static/public`.
- Produces: `POST` accepting `{ email: string }`, answering `200 { email }` on success. Task 3 calls it at `/api/invite` with an `Authorization: Bearer <access_token>` header and reads `{ message }` from a non-2xx body.

- [ ] **Step 1: Write the failing tests**

Mock `@supabase/supabase-js` so one `createClient` spy serves both clients, which is what lets Review Focus #1 be asserted by call count:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
const inviteUserByEmail = vi.fn();
const createClient = vi.fn(() => ({ auth: { getUser, admin: { inviteUserByEmail } } }));

vi.mock('@supabase/supabase-js', () => ({ createClient }));
vi.mock('$env/dynamic/private', () => ({ env: { SUPABASE_SERVICE_ROLE_KEY: 'test-service-key' } }));

const { POST } = await import('./+server');

function buildEvent(
	headers: Record<string, string> = {},
	body: unknown = { email: 'new@sfgov.org' }
) {
	const request = new Request('https://deploy-preview-9--sfhealthyhousing.netlify.app/api/invite', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...headers },
		body: JSON.stringify(body)
	});
	return { request, url: new URL(request.url) };
}

const AUTHED = { Authorization: 'Bearer good-token' };
```

Tests, named and asserted exactly:

- `rejects a request with no Authorization header` — `await expect(POST(buildEvent() as never)).rejects.toMatchObject({ status: 401 })`, and `expect(createClient).toHaveBeenCalledTimes(1)` (the anon client only — the admin client must not exist). **Review Focus #1.**
- `rejects a bearer token supabase does not recognise` — `getUser` resolves `{ data: { user: null }, error: { message: 'bad jwt' } }`; expect 401 and `expect(inviteUserByEmail).not.toHaveBeenCalled()`.
- `rejects a malformed email address` — body `{ email: 'not-an-email' }` with `AUTHED`; expect `{ status: 400 }` and `inviteUserByEmail` not called.
- `invites the address and redirects back to the requesting origin` — expect the resolved `Response` status `200`, and `inviteUserByEmail` called with `('new@sfgov.org', { redirectTo: 'https://deploy-preview-9--sfhealthyhousing.netlify.app/login' })`.
- `maps an existing confirmed account to 409` — `inviteUserByEmail` resolves `{ data: null, error: { status: 422, code: 'email_exists', message: 'A user with this email address has already been registered' } }`; expect `{ status: 409 }`. **Review Focus #2.**
- `passes through an address the mailer will not deliver to` — error `{ status: 422, code: 'email_address_not_authorized', message: 'Email address not authorized' }`; expect `{ status: 422, body: { message: 'Email address not authorized' } }`. **Review Focus #3.**
- `passes through the mailer rate limit` — error `{ status: 429, code: 'over_email_send_rate_limit', message: 'email rate limit exceeded' }`; expect `{ status: 429 }`. **Review Focus #4.**
- `fails clearly when the service-role key is missing` — re-import the module with `vi.doMock('$env/dynamic/private', () => ({ env: {} }))`; expect `{ status: 500 }` with a message containing `SUPABASE_SERVICE_ROLE_KEY`, and `createClient` called once. **Review Focus #5.**

`beforeEach` resets all three mocks and sets `getUser` to resolve `{ data: { user: { id: 'u1', email: 'reviewer@sfgov.org' } }, error: null }` and `inviteUserByEmail` to resolve `{ data: { user: { id: 'u2' } }, error: null }`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun run test:unit -- --run src/routes/api/invite/server.test.ts`
Expected: FAIL — `Cannot find module './+server'`.

- [ ] **Step 3: Implement `POST({ request, url })` in `src/routes/api/invite/+server.ts`**

Shape it on `src/routes/api/ai/generate/+server.ts`:

- A `requireUser(request): Promise<User>` helper that reads the `Bearer` token, builds the anon client with `{ auth: { persistSession: false, autoRefreshToken: false } }`, calls `getUser(token)`, and throws `error(401, 'Unauthorized')`. Returns the user.
- Call `requireUser` **outside** the `try`. A SvelteKit `HttpError` is not an `Error` instance, so a catch-all flattens the 401 into a 500 — the reason the AI proxy is written this way.
- Cap the body at 4KB before parsing, mirroring `MAX_BODY_BYTES`.
- Validate with `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, the same shape `src/routes/login/+page.svelte:32` uses, and a 254-character length cap; `error(400, 'That does not look like an email address')` otherwise.
- Throw `error(500, 'SUPABASE_SERVICE_ROLE_KEY is not set for this deploy context')` when the key is absent, before constructing the admin client.
- Build the admin client with `{ auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }` and call `inviteUserByEmail(email, { redirectTo: `${url.origin}/login` })`.
- On an `error` from the SDK: `email_exists` → `error(409, 'That address already has an account.')`; anything else → `error(inviteError.status ?? 500, inviteError.message)`.
- Rethrow deliberate `HttpError`s from the catch exactly as the AI proxy does (`'status' in err`).
- Return `json({ email })`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun run test:unit -- --run src/routes/api/invite/server.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/routes/api/invite/
git commit -m "feat(auth): add an invite route backed by the service-role key"
```

---

### Task 3: The invite form on `/login`

**Files:**

- Modify: `src/routes/login/+page.svelte` — the `{#if sessionStore.signedIn}` branch at lines 94-102
- Test: `tests/inviteForm.test.ts` (create — `.test.ts` under `tests/` is the jsdom client project)

**Interfaces:**

- Consumes: `POST /api/invite` from Task 2.
- Produces: no exports. The form is local to the page.

- [ ] **Step 1: Write the failing test**

Render the page with `@testing-library/svelte`, stub `supabase.auth.getSession` to return a session carrying `access_token: 'tok'`, and stub global `fetch`. Tests:

- `sends the invite with the caller's access token` — type an address, submit, and assert `fetch` was called with `'/api/invite'` and an init whose `headers.Authorization` is `'Bearer tok'` and whose body parses to `{ email: 'new@sfgov.org' }`.
- `shows the route's message when the invite is refused` — `fetch` resolves a 409 with `{ message: 'That address already has an account.' }`; assert that text is on screen.

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test:unit -- --run tests/inviteForm.test.ts`
Expected: FAIL — no invite form in the document.

- [ ] **Step 3: Add the form to the signed-in branch**

Below the existing success `PageAlert` and above the two buttons. Reuse `TextField`, `SiteButton` and `PageAlert`, all already imported. Four `$state` values mirroring the sign-in half (`inviteEmail`, `inviting`, `invited`, `inviteError`), and a `sendInvite(event: SubmitEvent)` that reads the token via `supabase.auth.getSession()` and POSTs it.

Copy, which the spec leaves to the builder — keep it plain and say what the invite grants, since any reviewer can send one:

- Heading: `Invite a reviewer`
- Help text: `They will get an email with a sign-in link. Anyone you invite can edit copy and change review decisions on every page.`
- Success: `Invitation sent to {address}.`

Clear the field after a successful send, so a second invite does not go to the same address by accident.

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun run test:unit -- --run tests/inviteForm.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/routes/login/+page.svelte tests/inviteForm.test.ts
git commit -m "feat(auth): let a signed-in reviewer invite another from /login"
```

---

### Task 4: Deploy configuration and the leak gate

**Files:**

- Modify: `scripts/verify.sh:165-172`
- Netlify site `sfhealthyhousing` environment variables (not in the repo)

**Interfaces:**

- Consumes: the route from Task 2.
- Produces: nothing code-level.

- [ ] **Step 1: Extend the bundle leak scan**

Add `sb_secret_` to the alternation at `scripts/verify.sh:169`, and, when `SUPABASE_SERVICE_ROLE_KEY` is set in the environment running the script, add its literal value to the pattern too. A legacy JWT-format key has no stable greppable marker, so the literal is the only check that catches one.

- [ ] **Step 2: Run the gate against the current deploy**

Run: `bun run verify:live`
Expected: `PASS no server-only values in client bundle`. It must pass _before_ the route exists too — that is the control proving the grep still matches nothing.

- [ ] **Step 3: Set `SUPABASE_SERVICE_ROLE_KEY` per deploy context**

Netlify → Site configuration → Environment variables. Mark it **secret**, like `RAILWAY_API_TOKEN`. Set `production` to `kiynekyzqxneepjipqhg`'s key and `deploy-preview` + `branch-deploy` to `aplbsgacqnxhzjuquvft`'s. Do not use "same value for all contexts".

- [ ] **Step 4: Read the scoping back**

Run: `netlify env:get SUPABASE_SERVICE_ROLE_KEY --context deploy-preview` and again with `--context production`, confirming the contexts differ _without printing either value_ — compare the reported scopes, not the secrets.

- [ ] **Step 5: Commit**

```bash
git add scripts/verify.sh
git commit -m "chore(verify): scan the bundle for a leaked service-role key"
```

- [ ] **Step 6: Open the PR and verify end to end**

Run `bun run verify`, push, `gh pr create`, `gh pr checks --watch`. On the deploy preview: sign in, invite an address, confirm the email arrives and its link returns to the **preview's** `/login` signed in. Merging to `main` publishes production, so confirm before merging.
