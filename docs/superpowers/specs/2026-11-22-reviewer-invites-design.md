# Reviewer invites — design

**Date:** 2026-11-22
**Size:** small change (one server route, one form, plus auth configuration)

## Intent

Any signed-in reviewer can put a new reviewer's address into `auth.users` and
have Supabase email them an invite. Today the only way in is the Supabase
dashboard, which means asking the one person who holds that access.

The matching half — "only users already in the DB can use a magic link" — is
**already true and needs no work.** `disable_signup` reads `true` on both hosted
projects (`kiynekyzqxneepjipqhg`, `aplbsgacqnxhzjuquvft`, read from
`GET /v1/projects/<ref>/config/auth` on 2026-11-22). The
`shouldCreateUser: false` at `src/routes/login/+page.svelte:58` is the page
being polite about it, not the control: the anon key is inlined in the public
bundle, so the server-side flag is what actually holds.

## Goals

- A signed-in reviewer can invite an address from inside the app.
- The invite email lands in a real inbox, for addresses outside the Supabase
  organisation.
- Public signup stays off everywhere, including the local stack.

## Non-goals

- No roles, no permission tiers, no "manage users" screen.
- No revoke, no expiry, no resend-with-a-button. Removing a user stays a
  dashboard action.
- No list of pending or past invites.

## Anti-goals

Things that would make this a failure even if the invite worked:

- The service-role key reaching the browser bundle, or a deploy preview holding
  **production's** service-role key. The production/staging split in CLAUDE.md
  exists so a preview cannot write to the real review database; a single
  all-contexts key would undo it.
- Re-enabling public signup to make anything here easier.
- Weakening any RLS policy.

## Constraints

Verified, not assumed:

- **The admin invite path ignores `disable_signup`.** GoTrue's
  `internal/api/invite.go` contains no `DisableSignup` check — the endpoint is
  gated by the service-role middleware instead. So invites keep working while
  signups stay off.
- **Inviting a confirmed address fails** with 422 `email_exists`. Inviting an
  address that exists but is unconfirmed re-sends the invite.
- **Supabase's audit entry names the service role, not the human.**
  `NewAuditLogEntry(..., adminUser, UserInvitedAction, ...)` records whoever
  authenticated the admin call, which here is the key. No free attribution.
- **Neither project has custom SMTP.** `smtp_host` is `null` on both, so the
  built-in mailer refuses any address that is not a member of the Supabase
  _organisation_ (`email_address_not_authorized`), and caps at
  `rate_limit_email_sent: 2` per hour, shared with sign-in emails. Without
  custom SMTP this feature cannot deliver to a new reviewer at all.
- **The service-role key cannot be in the browser**, so this needs a server
  route. The app is otherwise client-side; `src/routes/api/ai/generate/+server.ts`
  is the existing precedent and the shape to copy.
- **`redirectTo` must be in each project's `uri_allow_list`** or it is silently
  ignored and the link falls back to Site URL. Both lists already cover
  `https://sfhealthyhousing.netlify.app/**`, `https://*--sfhealthyhousing.netlify.app/**`
  and `http://localhost:5173/**`.

## Approaches

Three were considered; all three share the server route, since the key cannot
be client-side. They differ only in how much the app records about an invite.

- **A — fire and forget (chosen).** The route calls `inviteUserByEmail` and
  returns. No schema, no list, no record of who invited whom.
- **B — attribution via `user_metadata`.** Same route, but stamps the caller's
  id and email into the invitee's metadata and adds a read endpoint listing
  unconfirmed users as pending invites. No migration, but two endpoints.
- **C — an app-owned `invitations` table.** Migration plus RLS, rows for
  pending/accepted/revoked. Real control over revoke and expiry, at the cost of
  a second source of truth beside `auth.users` that can drift from it.

A fourth — own token, own mailer, own accept route — was dropped as more work
for a worse email.

**A was chosen** for being the smallest thing that works. The trade is
accepted knowingly: because any signed-in reviewer may invite, and because
nothing records who did, an unexpected account cannot be traced back to the
reviewer who created it. Supabase's own audit log does not close this, per the
constraint above. A typo'd address also becomes a permanent unconfirmed
`auth.users` row that only the dashboard can remove. B exists if that becomes a
problem.

## The design

**Prerequisite, and it is step one.** Configure custom SMTP on both hosted
projects, then raise `rate_limit_email_sent` off 2. Until this is done the
feature is only testable against the local stack and addresses inside the
Supabase organisation.

**Route: `POST /api/invite`.** Body `{ email }`.

- Verifies the caller's bearer token exactly as `requireUser` does in the AI
  proxy, and makes that check **outside** the `try` — a SvelteKit `HttpError` is
  not an `Error` instance, so a catch-all flattens a 401 into a 500.
- Builds a second, service-role client (`persistSession: false`,
  `autoRefreshToken: false`, `detectSessionInUrl: false`) from
  `$env/dynamic/private`, and calls
  `auth.admin.inviteUserByEmail(email, { redirectTo: <origin>/login })`.
- `redirectTo` is derived from the request's own origin, so a preview invites
  back to that preview and production to production, both already covered by the
  wildcard allow-list entries.
- Caps the body before parsing it, as the AI proxy does.
- Status mapping: 401 no/invalid token · 400 malformed email · 409 the address
  already has a confirmed account (GoTrue's 422 `email_exists`, renamed because
  the caller is authenticated and can be told plainly) · 429 passed through from
  the mailer rate limit, with the limit named in the message · 500 otherwise.

**UI: the signed-in branch of `/login`.** That branch already renders "You are
signed in" with two buttons; the invite form goes beside them. It is also where
an invitee lands, so the page stays the one place sign-in lives. One email
field, one button, and a result line naming the address.

**Environment.** `SUPABASE_SERVICE_ROLE_KEY` is already the name used by
`scripts/sync-checks.ts` and switched by `bun run env:local` / `env:hosted`, so
local development needs nothing new. On Netlify it must be set **per deploy
context** to match the existing table: production's key for `production`,
staging's for `deploy-preview` and `branch-deploy`.

**Local config drift, fixed here.** `supabase/config.toml:176` and `:221` both
set `enable_signup = true`, so the local stack behaves the opposite way from
both hosted projects — locally, any address can sign itself up and the login
page's refusal path is never exercised. Set both to `false`.

## Left to the builder

- The exact copy on the form and its result states.
- Whether the form clears or keeps the address after a successful send.
- How `scripts/verify.sh`'s bundle leak scan (line 165) is extended to cover a
  leaked service-role key. The goal is stated; the pattern is not. The current
  scan greps literal strings, and a legacy JWT key has no stable greppable
  marker, so this likely means matching `sb_secret_` and, where the key is
  available to the script, its literal value.
- Test placement follows the repo's split: a route test beside the handler
  (`src/routes/api/invite/server.test.ts`, mirroring the AI proxy's) runs in the
  server project. Cover at minimum: no token → 401, confirmed address → 409,
  and that the service-role client is never constructed before the caller is
  verified.
