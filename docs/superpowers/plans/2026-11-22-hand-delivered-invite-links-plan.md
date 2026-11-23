# Hand-Delivered Invite Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/api/invite` returns a sign-in link to the caller instead of emailing it, so reviewers can be onboarded with no SMTP configured.

**Architecture:** One method swap inside the existing route — `inviteUserByEmail` becomes `generateLink({ type: 'invite', … })`, which Supabase documents as producing links "to be sent via a custom email provider" and which creates the user itself. The route's response gains the URL; `/login`'s signed-in branch shows it for copying instead of saying an email was sent. No schema change, no new provider, no new environment variable.

**Tech Stack:** SvelteKit 2 (adapter-netlify), Svelte 5 runes, `@supabase/supabase-js`, Vitest.

**Spec:** `2026-11-22-hand-delivered-invite-links-design.md` (same directory; to be committed to `docs/superpowers/specs/`)

**Branch:** `feat/reviewer-invites` — this change belongs in PR #158, because it removes that PR's stated SMTP prerequisite.

## Global Constraints

- **`type: 'invite'`, never `type: 'magiclink'`.** A magic link for an address that already has an account signs the holder in _as that person_; any reviewer can call this route, so `magiclink` would put impersonating the manager one request away. `invite` refuses a confirmed address (GoTrue 422 `email_exists` → the route's existing 409).
- The returned link is a bearer credential. It must never be written to a log, to Sentry, or into a URL.
- `redirectTo` stays `${url.origin}/login`, so a link made on a preview returns to that preview.
- Every existing status mapping is preserved: 401, 400, 409, 429, 500.
- `SUPABASE_SERVICE_ROLE_KEY` is already set per Netlify deploy context; nothing new is required.
- Conventional commits; `bun run verify` green before the branch is pushed.

## Review Focus

1. **`magiclink` substituted for `invite`** — silent privilege escalation to impersonation. Pinned by asserting the argument itself, not just the response. (Task 1)
2. **The link rendered as a clickable `<a href>`** — the author clicks it to "check it works", burns the single-use token, and is signed in _as the invitee_ while the invitee's link is dead. Pinned by asserting the link is not a navigable anchor. (Task 2)
3. **`generateLink` also attempting a send** on a project using the built-in mailer: the send fails for an unauthorised address, and the request must still succeed with a link rather than erroring. (Task 1)
4. **The link reaching stdout or an error report** — a credential in a Netlify function log. Pinned by asserting nothing is logged carrying it. (Task 1)
5. **An address that already has a confirmed account** — must stay 409, never a link, since a link for an existing user is the impersonation case under a different name. (Task 1)

---

### Task 1: The route returns a link

**Files:**

- Modify: `src/routes/api/invite/+server.ts`
- Modify: `src/routes/api/invite/server.test.ts`
- Modify: `docs/superpowers/specs/2026-11-22-reviewer-invites-design.md` and `docs/superpowers/plans/2026-11-22-reviewer-invites.md` — remove custom SMTP as a prerequisite; it is superseded by this change. Leave the local `enable_signup` work in Task 1 of that plan alone: it is unrelated and still correct.

**Interfaces:**

- Consumes: the existing `requireUser`, body cap, email validation and service-role guard — all unchanged.
- Produces: `POST /api/invite` answering `200 { email: string, actionLink: string }`. Task 2 reads `actionLink` from the response body.

- [ ] **Step 1: Write the failing tests**

Add to the existing `describe`, reusing its `buildEvent`, `AUTHED` and mock setup. Replace the `inviteUserByEmail` spy with `generateLink`, resolving `{ data: { properties: { action_link: 'https://example.test/verify?token=abc' } }, error: null }` in `beforeEach`.

- `generates an invite link, never a magic link` — assert `generateLink` was called with an object whose `type` is exactly `'invite'`, and that `JSON.stringify(generateLink.mock.calls[0])` does **not** contain `'magiclink'`. **Review Focus #1.**
- `returns the action link to the caller` — resolved response status `200`, and its parsed body equals `{ email: 'new@sfgov.org', actionLink: 'https://example.test/verify?token=abc' }`.
- `points the link back at the requesting origin` — `generateLink` called with `options.redirectTo === 'https://deploy-preview-9--sfhealthyhousing.netlify.app/login'`.
- `never logs the link` — spy on `console.log`, `console.info` and `console.error` with `vi.spyOn`; after a successful call, assert no call argument stringifies to anything containing `'example.test'`. **Review Focus #4.**
- `succeeds when the mailer refuses the address but a link was produced` — `generateLink` resolves `{ data: { properties: { action_link: '…' } }, error: { status: 422, code: 'email_address_not_authorized', message: 'Email address not authorized' } }`; expect status `200` and the link returned. **Review Focus #3.**
- Keep the existing `maps an existing confirmed account to 409` test, repointed at `generateLink`. **Review Focus #5.**

The remaining existing tests (401 no header, 401 bad token, 400 malformed email, 429 rate limit naming the cap, 500 missing key, 500 bad key) stay as they are, repointed at `generateLink`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun run test:unit -- --run src/routes/api/invite/server.test.ts`
Expected: FAIL — `generateLink` is not called; the route still calls `inviteUserByEmail`.

- [ ] **Step 3: Swap the call in `src/routes/api/invite/+server.ts`**

Replace the `inviteUserByEmail(email, { redirectTo })` call with
`admin.auth.admin.generateLink({ type: 'invite', email, options: { redirectTo: `${url.origin}/login` } })`,
and return `json({ email, actionLink: data.properties.action_link })`.

Error handling changes in one way only: when an error comes back **but** a link was produced, prefer the link — the built-in mailer refusing an unauthorised address is expected here and is not a failure of this route. When no link was produced, keep the existing mapping exactly (`email_exists` → 409, 401/403 → 500 "misconfigured", `over_email_send_rate_limit` → 429 naming the shared cap, otherwise the range-checked upstream status).

Update the route's doc comment: it currently explains that the admin path bypasses `disable_signup`, which still holds; add why `invite` and not `magiclink`, in the terms of the Global Constraints above.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun run test:unit -- --run src/routes/api/invite/server.test.ts`
Expected: PASS

- [ ] **Step 5: Amend the two superseded documents**

In the #158 design doc, the constraint "Neither project has custom SMTP" stays as a true statement but stops being a blocker; the "Prerequisite, and it is step one" paragraph is replaced by a line saying links are hand-delivered and SMTP is no longer required. In the #158 plan, Task 1's SMTP steps 5 and 6 are removed and its title shortened to the config change it still does.

- [ ] **Step 6: Commit**

```bash
git add src/routes/api/invite/ docs/superpowers/
git commit -m "feat(auth): return the invite link instead of emailing it"
```

---

### Task 2: `/login` shows the link

**Files:**

- Modify: `src/routes/login/+page.svelte` — the invite section's success state
- Modify: `tests/inviteForm.test.ts`

**Interfaces:**

- Consumes: `POST /api/invite` from Task 1, reading `actionLink` from the 200 body.
- Produces: no exports.

- [ ] **Step 1: Write the failing tests**

- `shows the generated link for copying` — `fetchMock` resolves `200 { email: 'new@sfgov.org', actionLink: 'https://example.test/verify?token=abc' }`; assert the URL text is on screen.
- `does not render the link as a navigable anchor` — assert `container.querySelector('a[href*="example.test"]')` is `null`. A click by the author consumes the single-use token and signs _them_ in as the invitee. **Review Focus #2.**
- `warns that the link signs the holder in` — assert text matching `/signs them in|treat it like a password/i` is present.

Keep the existing three tests (token sent, route message on refusal, recovery from a rejected request); the first needs no change, the others none.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun run test:unit -- --run tests/inviteForm.test.ts`
Expected: FAIL — the success state still renders "Invitation sent to …".

- [ ] **Step 3: Replace the success state**

Swap the `invitedTo` string for the pair the UI now needs, and render, inside the existing success `PageAlert`: the address, the link as selectable text in a `<code>` (never an `<a>`), a copy button using `navigator.clipboard.writeText`, and one line of warning.

Copy, fixed here because the spec leaves wording to the builder but fixes the meaning:

- Alert title: `Send this link to {address}`
- Warning: `Anyone with this link signs in as them. It works once and then expires — treat it like a password.`
- Button: `Copy link`, becoming `Copied` for two seconds.

Clear `inviteEmail` on success as it does today.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun run test:unit -- --run tests/inviteForm.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/routes/login/+page.svelte tests/inviteForm.test.ts
git commit -m "feat(auth): show the invite link for hand delivery"
```

---

## Before the first task

Land the design and this plan in the repo (`docs/superpowers/specs/` and `docs/superpowers/plans/`) and commit them on `feat/reviewer-invites`. They are currently in the session scratchpad because the shared checkout was held by another session.

## After the last task

Run `bun run verify`, push, and confirm on the PR preview that an invite returns a usable link — then **do not click it yourself**; it is single-use, and consuming it signs you in as the invitee. Verify instead by generating one for an address you control and opening it in a private window.
