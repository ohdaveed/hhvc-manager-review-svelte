# tests/ — e2e conventions

The Vitest project split (which directory gets which environment) is in the root `CLAUDE.md`.

## Every e2e spec imports `test` from `tests/fixtures`

```ts
import { expect, test } from './fixtures'; // not '@playwright/test'
```

`tests/fixtures.ts` carries an auto-fixture that fails a test when the page raised an uncaught exception, logged a console error, or navigated to a **document** response ≥ 400. Playwright has no config-level auto-fixture — a fixture reaches a test only through the `test` object it imports — so this is opt-in, and a spec importing from `@playwright/test` runs entirely ungated.

**That bypass is silent, and a new file is the dangerous case**: it conflicts with nothing, so a clean merge is exactly what hides it. `tests/e2eFixtureImports.spec.ts` asserts the rule rather than documenting it, and `tests/mockupResponsive.e2e.ts` is the instance that merged cleanly while sitting outside the gate before it existed.

Type-only imports stay legal and are the normal way to get Playwright's types:

```ts
import type { Page } from '@playwright/test'; // fine — binds nothing at runtime
```

The guard parses each `from '@playwright/test'` clause and compares specifier names exactly, so it skips a `type`-only import and a `type` specifier inside the braces. An alias still binds the runtime object, so `test as base` is a violation.

Two consequences when writing a spec:

- **Signed out, Supabase reads are expected to fail** — the mockups render from the static corpus while every `TO authenticated` policy denies the review data. `/rest/v1/` and `/auth/v1/` are excluded by **path**, not host, because the host differs per environment (`127.0.0.1:54321` local, a placeholder in CI, the real project in a preview) and a host rule would silently stop matching in one of them.
- **A test that deliberately visits a 4xx will fail the gate.** That is why `/review/[slug]`'s 404 is covered by `tests/reviewSlug404.spec.ts` as a unit test — the load is pure, so a browser adds nothing, and testing it there keeps the gate strict instead of carving an exception into it.

## Signed-in e2e, and the axe blind spot it closed

`tests/signedIn.ts` puts the app in its signed-in state by stubbing the HTTP boundary — PostgREST responses via `page.route`, the session via a `Storage.prototype.getItem` shim, realtime via `page.routeWebSocket`. `tests/accessibilitySignedIn.e2e.ts` then runs axe over the queue, the decision panel, Checks, Fields and the walkthrough.

**This is not a nicety.** Until it existed, axe had never seen a signed-in surface: the queue, decisions, checks and fields panel all need review data, and e2e runs signed out, so they were never in a scanned page. `--color-sfds-slate-l2` sat at 4.07:1 on the selected queue row's `#edf4f7` tint — below AA — while `no WCAG 2.1 AA violations` reported green. Pointing axe at a signed-in panel for the first time also failed a shadcn `destructive` badge at 3.98:1.

Three properties worth keeping:

- **Stubbed, not signed in for real, and that is forced.** e2e runs `npm run build && npm run preview`, a production build, where `ensureDevSession` is dead code behind `import.meta.env.DEV`; and CI has no Supabase project. Stubbing is what works identically in both.
- **The session key is matched by pattern, not hardcoded.** It is `sb-<project-ref>-auth-token`, and the ref comes from whatever `SVELTE_PUBLIC_SUPABASE_URL` the bundle was built with — a placeholder in CI, possibly a real project locally. A hardcoded key would miss on a developer's machine and leave the run quietly scanning signed-out pages.
- **Every test proves its surface rendered before scanning it.** `gotoSignedIn` asserts the queue has rows and the signed-out banner is gone. A panel showing its empty state would scan clean and reinstate the blind spot under a new name.

It does **not** test RLS. The policies live in the database; `supabase/migrations` is where they are asserted. This fixture is about what the signed-in UI renders.
