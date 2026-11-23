# Hand-delivered invite links — design

**Date:** 2026-11-22
**Size:** small change (one method swap in an existing route, plus the UI that shows the result)
**Supersedes the SMTP prerequisite in:** `docs/superpowers/specs/2026-11-22-reviewer-invites-design.md`

## Intent

Reviewers are the author's manager and SF.gov employees across several
departments. They need accounts in a tool whose every RLS policy is `TO
authenticated` and whose `edits`/`comments` tables carry `user_id UUID NOT NULL
REFERENCES auth.users(id)` — so each person must have a real `auth.users` row
and a real session. Nothing weaker works.

Email cannot deliver that. Supabase's built-in mailer refuses any address
outside the project's Supabase **organisation**, and that organisation has
exactly one member. Custom SMTP would fix it but needs a provider account and a
verified sending domain the author does not have; corporate SSO would fix it but
needs an app registration in the city's tenant, and that route is explicitly out
of scope here.

So the link stops travelling by email and travels by hand instead. Supabase
documents `auth.admin.generateLink` as producing links _"to be sent via a custom
email provider"_ — it returns the URL rather than mailing it — and it "handles
the creation of the user for `signup`, `invite` and `magiclink`". That is
exactly the shape needed: the account is created, the link comes back, and the
author pastes it to the reviewer over whatever channel they already use.

## Goals

- Any signed-in reviewer can create an account for a named colleague and obtain
  a working sign-in link, with no email sent and no SMTP configured.
- The reviewer's experience is unchanged from a magic link: click, and you are
  signed in.
- One handoff per person, not per visit.

## Non-goals

- No storage of generated links, no list of outstanding invites, no resend.
- No roles or permission tiers. Everyone who gets in can still edit copy and
  change review decisions on all 29 pages.
- No self-service recovery — and this is sharper than it first reads, so it is
  written out rather than left as a phrase. Once a reviewer has signed in once,
  their address is CONFIRMED, and from then on `/api/invite` refuses it with
  409 while `/login`'s `signInWithOtp` mails a link the built-in mailer will
  not deliver. So a reviewer who signs out, clears site data, or opens the tool
  on a second machine cannot get back in through the app at all, and the
  **"Sign out" button is a one-way door**. Recovery requires someone holding
  the service-role key or dashboard access to mint a link out of band. Deleting
  and recreating the account is not an option either: `edits.user_id` and
  `comments.user_id` are `NOT NULL REFERENCES auth.users(id)`.

  `type: 'magiclink'` is explicitly NOT the fix — it would reintroduce exactly
  the impersonation the anti-goals below rule out. A real fix means either a
  recovery path that proves address ownership some other way, or accepting that
  onboarding is operator-assisted. Not built; flagged.

## Anti-goals

Things that would make this a failure even if links worked:

- **Using `type: 'magiclink'` instead of `type: 'invite'`.** A magic link for an
  address that already has an account signs the holder in _as that person_. With
  any reviewer able to call this route, that is one request away from
  impersonating the manager. `invite` refuses an already-confirmed address
  (GoTrue returns 422 `email_exists`, which the route already maps to 409), and
  that refusal is the control. This is the single most important line in the
  document.

  **That control is partial, and the gap is measured, not assumed.** It covers
  CONFIRMED addresses only. GoTrue re-invites an existing UNCONFIRMED address
  rather than refusing it — two `generate_link` calls for the same pending
  invitee both returned 200 with a link, verified against a real project on
  2026-11-22. So between the moment someone is invited and the moment they
  first sign in, any reviewer can obtain a working link for them and act as
  them. No permissions are gained (every authenticated user already has the
  same ones); what is forgeable is **attribution**, which is what this tool
  exists to record. Closing it means either refusing every existing address —
  which also breaks re-inviting someone whose link expired, still a real need
  even at a 24h `mailer_otp_exp` — or recording an inviter per
  account and allowing only them to re-invite. Neither was built. The route
  logs who asked and for whom instead, so the window is traceable rather than
  silent. **This is a decision to revisit, not a settled design.**

- **The link reaching a log, Sentry, or a URL.** The response body now carries a
  credential. It must not be `console.log`ged, must not be put in a query
  string, and must not end up in an error report. The audit line above logs the
  caller's id and the target address and nothing else; a test asserts the link
  is absent from it.
- Re-enabling public signup, or weakening any RLS policy, to make this simpler.

## Constraints

- The link is a bearer credential: whoever holds it becomes that user. It is
  single-use and expires — `mailer_otp_exp` reads **86400s (24h)** on both
  projects, raised from 3600s on 2026-11-22 so a link handed over on a Friday
  afternoon still works when the recipient opens it. That is a deliberate
  trade: a longer window for a credential sitting in someone's chat history,
  bought to stop the common failure (an expired link nobody can redeem).
- A Supabase session refreshes indefinitely once established, which is what
  makes a one-time handoff sufficient.
- `disable_signup` stays `true` on both projects. `generateLink` is an admin
  call gated by the service-role key, not by the signup flag — the same reason
  `inviteUserByEmail` works today.
- `SUPABASE_SERVICE_ROLE_KEY` is already set per Netlify deploy context
  (production → `kiynekyzqxneepjipqhg`, previews → `aplbsgacqnxhzjuquvft`), so
  no new configuration is needed.

## Approaches

- **A — hand-delivered invite links (chosen).** `/api/invite` returns the link
  instead of mailing it.
- **B — passwords set by an admin.** `createUser({ email, password,
email_confirm: true })` plus a password field on `/login`. Rejected: no
  self-service reset exists without SMTP, so every forgotten password returns to
  the author, and a password pasted into a chat is a permanent credential where
  a one-hour link is not.
- **C — Google sign-in with an allowlist**, using an OAuth client in the
  author's own Google Cloud project. Rejected: reviewers span departments so
  there is no single work domain to restrict on; if the city is not on Google
  Workspace it asks public employees to use personal accounts for city business,
  which is a records-management problem; and `disable_signup: true` blocks OAuth
  from creating users, so every person still has to be pre-provisioned first. It
  adds a provider without removing a step.

Two were dropped before reaching that list: anonymous sign-in, because edits
must be attributable to a stable `auth.uid()`; and a shared password gate in
front of the app, because it produces no `auth.users` row at all and every
foreign key and policy depends on one.

**A was chosen** because it is a one-method change to code already written,
reviewed and open in PR #158; it asks nothing new of reviewers; it adds no
provider, password or account to manage; and each person keeps their own
identity, so authorship stays intact.

## The design

**Route: `POST /api/invite`, changed in one place.** Replace

```
admin.auth.admin.inviteUserByEmail(email, { redirectTo })
```

with

```
admin.auth.admin.generateLink({ type: 'invite', email, options: { redirectTo } })
```

`redirectTo` stays `${url.origin}/login`, so a link generated from a preview
returns to that preview. On success the route answers `200 { email, actionLink }`
where `actionLink` is `data.properties.action_link`. Every existing status
mapping is kept: 401 unverified caller, 400 malformed address, 409
`email_exists`, 500 missing or bad service-role key.

**UI: `/login`, signed-in branch.** The success state stops saying "Invitation
sent" and instead shows the link with a copy button, the address it belongs to,
and one line of warning: that it signs the holder in as that person, that it
works once, and that it expires. The link is rendered as text to be copied, not
as an anchor — nothing on this page should navigate to it.

**Supabase config — done.** `mailer_otp_exp` was raised from 3600s to 86400s
(24h) on both projects on 2026-11-22, so a link pasted into a chat on Friday
still works when the reviewer opens it. Verified by reading the value back from
`/v1/projects/<ref>/config/auth` on each, not from the dashboard's own
confirmation.

**Consequence for PR #158.** Custom SMTP stops being a prerequisite. Its design
doc and plan both name SMTP as step one; both need amending, and the plan's
Task 1 SMTP steps become unnecessary. The local `enable_signup` fix in that task
stays — it is unrelated and still correct.

## Left to the builder

- Whether `generateLink` also _attempts_ a send on a project using the built-in
  mailer. If it does, the attempt fails for an unauthorised address while the
  link still returns; confirm against the local stack rather than assuming, and
  make sure a failed send does not turn into a failed request.
- The exact wording of the warning line and the copy-button affordance.
- Test coverage mirroring the existing route tests: that `type` is `'invite'`
  and never `'magiclink'` (assert the argument — this is the anti-goal above and
  deserves its own test), that the link is returned on success, and that the
  409 path still fires for an existing confirmed address.
