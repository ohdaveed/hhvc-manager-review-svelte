# PLAN — Resolve outstanding audit items

Follow-up to the tooling audit (#16), the inline-edit persistence fix (#17) and
the Danger rule fix (#19). Those are landed; what follows is everything the
audit surfaced and left open. The previous plan (persist inline copy edits)
completed — its record is in git history and #17.

**Ordering principle:** tooling that reports green while doing nothing comes
first. A gate that lies is worse than no gate, because it spends trust.

**One exception overrides that order: F1a.** It is a dashboard check with no
in-repo change, and it is the only item here with a plausible path to data
loss. Do it before anything else.

Phase F held the open product questions. They are now **decided** — each records
the decision and the evidence it turned on, and F1–F3 have become tasks.

Every claim below was measured; the measuring command is named so a later
reader can re-check rather than trust.

---

## Phase A — Gates that report green while doing nothing

- [ ] **A1. `bun run ast:scan` is a no-op.** `.ast-grep/rules/` and
      `.ast-grep/tests/` hold only `.gitkeep`, so the scan matches nothing and
      exits `0`. The plan that introduced it never staged rule authoring, so
      this is its end state, not a pending step. Either write rules worth
      having — candidates: a bare `fetch('/api/ai/generate')` that bypasses
      `requestGeneration()` and will 401, a `PUBLIC_`-prefixed env var that
      silently won't reach `$env/static/public`, a `goto()` without
      `resolve()` — or delete the script and its config. Do not leave it green
      and empty.
      _Done when:_ `ast-grep scan` reports on a seeded fixture, or the script,
      `sgconfig.yml` and `.ast-grep/` are gone.
      _Touches:_ `.ast-grep/**`, `sgconfig.yml`, `package.json`.

- [ ] **A2. `verify:tools` only proves installation.** It runs `--version` on
      five binaries and asserts nothing about behavior — which is exactly why
      it reports A1's empty scanner as healthy. Make each step assert an
      observable outcome (ast-grep matches a known fixture; knip exits non-zero
      on a deliberately unused export; repomix emits a file).
      _Done when:_ reverting A1's fix makes `bun run verify:tools` fail.
      _Touches:_ `scripts/verify-tooling.ts`.

---

## Phase B — Make knip trustworthy, then act on it

knip prints ~90 findings on every commit. Nobody reads 90 findings. Calibrate
first (B1), then triage, so what remains is signal.

- [ ] **B1. Fix the CSS false positives.** `@fontsource-variable/roboto-flex`,
      `@fontsource/roboto-slab` and `tw-animate-css` are imported at
      `src/app.css:2-4` yet reported unused. knip says why itself:
      `.css — Compiled extension excluded by project (imports not followed)`.
      Also drop the `src/hooks.{server,client}` entry pattern — it matches
      nothing, since this app has no hooks files — and the redundant
      `playwright.config.ts` / `vite.config.ts` entries.
      _Done when:_ those three no longer appear and knip reports 0
      configuration hints.
      _Touches:_ `knip.jsonc`.

- [ ] **B2. Decide on 14 genuinely unreferenced dependencies.** Verified with
      `grep -rE "(from|import|require\()\s*['\"]<dep>"` repo-wide excluding
      `node_modules`/`.svelte-kit`/`build` — **all returned 0 import sites**:
      `zod`, `ai`, `pg`, `@tiptap/core`, `@tiptap/pm`, `@tiptap/starter-kit`,
      `layerchart`, `sveltekit-superforms`, `lucide-svelte`,
      `@formkit/drag-and-drop`, `@google/genai`, `@ai-sdk/anthropic`,
      `@ai-sdk/google`, `@ai-sdk/openai`, `@ai-sdk/svelte`.
      This is **not** a knip false positive — it is real. But removal is a
      product call: several look like scaffolding for intended work (Tiptap for
      rich-text editing, the AI SDKs for model calls the Railway proxy
      currently owns). **Ask before deleting.**
      _Flag while here:_ `pg` is a Node Postgres driver in an app whose
      CLAUDE.md says Supabase access is client-side only — it could never run
      in the browser. Either dead scaffolding or a server-side plan that never
      landed.
      _Done when:_ each is removed, or recorded here as deliberately retained
      with the reason.
      _Touches:_ `package.json`, `bun.lock`.

- [ ] **B3. Check `@sfgov/design-system`.** `src/app.css:147` says the vendored
      CSS "replaces `@import '@sfgov/design-system/dist/css/sfds.css'`", so the
      package may be dead weight — but it is the SF.gov design system.
      Confirm against the vendoring decision before removing.
      _Touches:_ `package.json`, `src/app.css`.

- [ ] **B4. Two unused files, and one export to narrow.** knip reports
      `src/lib/actions/clickOutside.ts` and `src/lib/index.ts` unused. Separately,
      drop the `export` keyword on `initializeRealtime`
      (`src/lib/stores/reviewState.ts:102`) — it is **live code**, called at
      `:62`; knip flags only the redundant export. Do not delete the function.
      _Touches:_ `src/lib/stores/reviewState.ts`, plus the two files if removed.

---

## Phase C — CI and supply chain

- [ ] **C1. Pin the remaining floating actions.** `actions/checkout@v5`,
      `oven-sh/setup-bun@v2` and `reviewdog/action-eslint@v1` still track moving
      tags across `pr.yml` and `ai-quality-gates.yml`; `pr-agent` is already
      SHA-pinned (#16). `suzuki-shunsuke/pinact` (1,174★) automates it.
      **Constraint:** do not rename the `test & build` or `e2e` jobs — ruleset
      `21203092` matches required checks by job name and silently stops gating
      if they change.
      _Touches:_ `.github/workflows/*.yml`.

- [ ] **C2. Add `actionlint`** (`rhysd/actionlint`, 4,162★). Two workflows,
      ~240 lines of CI, and nothing validates them. Catches the C1 class of
      problem plus expression and permissions errors before a red PR does.
      _Touches:_ `.github/workflows/`.

- [ ] **C3. lefthook's format glob skips YAML.** `*.{js,ts,svelte,json,md}`
      excludes `.yml`/`.yaml`, so workflow files never get auto-formatted and
      drift from Prettier.
      _Touches:_ `lefthook.yml`.

---

## Phase D — Quality baselines

- [ ] **D1. Decide the eslint baseline.** `bunx eslint .` reports **11 errors**
      repo-wide, matching the figure in CLAUDE.md. They are pre-existing and
      unrelated to recent work (confirmed at the merge-base). Either fix them
      and make eslint blocking, or record the count here with a ratchet so it
      can only go down. Today it is neither — it reports without blocking,
      so it can quietly grow.
      _Touches:_ varies; `.github/workflows/pr.yml` if made blocking.

- [ ] **D2. Accessibility on the edit targets.** `Section.svelte` and
      `Page.svelte` put `role="button"` on `<p>`, `<li>`, `<h2>` and `<h3>`
      with a click handler and no keyboard handler; Svelte warns on every
      build. This is a Section 508 / WCAG 2.1 AA obligation for an SF.gov
      property, and the edit targets are the app's primary interaction — **a
      keyboard-only reviewer cannot edit anything today.** Pair the fix with
      `@axe-core/playwright` (719★, Deque — the reference implementation) in
      the existing `e2e` job, which already blocks merge, making a11y a gate
      for roughly ten lines.
      _Touches:_ `src/lib/components/Section.svelte`,
      `src/lib/components/Page.svelte`, `tests/*.e2e.ts`, `package.json`.

---

## Phase E — Recommended tools not yet installed

From the audit's twelve, sequenced by value here rather than by stars.

- [ ] **E1. `gitleaks`** (28,902★) — pre-commit secret scanning. Sharpened by
      an audit finding: this repo sets a **repo-local `core.hooksPath`**, so
      the machine's global ggshield hooks do **not** run here. There is no
      commit-time secret scanning in this repo today.
- [ ] **E2. `crate-ci/typos`** (4,104★) — the app exists to review copy; a typo
      in `src/lib/data/*.ts` ships as if intentional.
- [ ] **E3. `semgrep`** (16,353★) — the only proposed tool addressing F1 below.
      Note `semgrep/mcp` is **archived**; use the CLI.
- [ ] **E4. `commitlint`** (18,698★) — conventional commits are mandated by the
      global CLAUDE.md and nothing enforces them; lefthook already owns the
      hook surface.
- [ ] **E5. `@vitest/coverage-v8`** (ships with the installed Vitest 4) — the
      Danger rule demands tests but nothing measures whether they test
      anything. Zero new dependencies.
- [ ] **E6. `renovate`** (22,315★) — 40+ deps on `^` ranges at the bleeding
      edge (Vite 8, TypeScript 6, ESLint 10, Vitest 4). **Do B2 first**, so it
      isn't opening PRs for packages about to be deleted.
- [ ] **E7. `oraios/serena`** (28,368★) — the remaining real token saver.
      **Spike `.svelte` LSP coverage before adopting; that is unverified.**

---

## Phase F — Decided

These were open questions; they are now decisions, recorded with the evidence
each turned on. F4 is closed — no work. F1–F3 are tasks below.

**Correction carried in from the audit:** `edits.user_id` and `comments.user_id`
are both `NOT NULL REFERENCES auth.users(id)` — authorship **is** recorded.
CLAUDE.md's "edits records no author" is stale and should be fixed when that
file is next touched. The gap is not missing attribution; it is that
attribution is captured and then ignored by authorization.

### F1 — Reviewers may read everything, write only their own rows

**Decision.** Blanket delete is not a trust model, it is an oversight. Reviewers
should see each other's work — that is the point of a shared review tool — but
should not be able to modify or delete it.

**What makes this urgent rather than tidy:** `supabase/config.toml` sets
`[auth] enable_signup = true`, `[auth.email] enable_signup = true` and
`enable_confirmations = false`. With `FOR ALL TO authenticated USING (true)` on
all four tables, anyone who can receive email could sign up and then read,
modify or delete every row. **That file governs the local stack only — the
hosted project is unverified.** F1a exists to close that gap first.

- [ ] **F1a. Verify hosted Supabase signup settings.** Check the dashboard for
      the hosted project. If signup is open, restrict to invited users or an
      `@sfgov.org` email allow-list. Highest leverage item in this plan: no
      schema change, and it is the only step that closes the sign-up-and-delete
      path. Do this before F1b.
      _Done when:_ the hosted setting is confirmed closed, and the value is
      recorded here.
      _Touches:_ nothing in-repo (dashboard), then this file.

- [ ] **F1b. Split the blanket policies per operation.** Replace
      `FOR ALL ... USING (true)` with per-operation policies. `edits` is already
      treated as append-only last-write-wins by `HelpPanel`, so it wants
      `SELECT USING (true)`, `INSERT WITH CHECK (auth.uid() = user_id)`, and
      **no `UPDATE` or `DELETE` policy at all**. Apply the same shape to
      `comments`. `reviews` and `pages` are shared state that reviewers
      legitimately mutate (status, manager notes) — keep those writable, but
      drop `DELETE`.
      _Done when:_ a new migration lands and a signed-in user cannot delete
      another user's edit.
      _Touches:_ `supabase/migrations/` (new file), `supabase/seed.sql` if
      affected.

### F2 — Move to stable field ids, now, while the table is empty

**Decision.** Fix it, and the reason is timing rather than severity. Nothing
wrote to `edits` before #17 landed, so there is no data to migrate. This is the
cheapest this decision will ever be; every edit saved from here raises the cost.

- [ ] **F2a. Derive `field_id` from a stable id, not array position.** Give each
      section, paragraph and bullet an explicit id in the `src/lib/data/`
      modules and build `data-rewrite-field` from that, so inserting a section
      no longer renumbers later paths and orphans their edits. Keep the
      `data-rewrite-field` attribute as the single source of the id — the
      contract `tests/inlineEditFieldId.test.ts` already guards.
      _Done when:_ inserting a section ahead of an edited one leaves that
      edit's `field_id` unchanged, covered by a test.
      _Touches:_ `src/lib/data/**`, `src/lib/components/Section.svelte`,
      `src/lib/components/Page.svelte`, `tests/inlineEditFieldId.test.ts`.

### F3 — Keep anonymous read, make it honest

**Decision.** Anonymous browsing was never actually decided — **there is no
route guard on `/review` at all**: no `+layout.server.ts`, no session check, no
redirect. So this is a gap, not a feature.

Keep it anyway. Anonymous visitors do see the mockups, because that content
comes from the static `$lib/data` modules rather than Supabase; only the queue,
decisions and edits are empty. Sharing a mockup with a stakeholder who should
not need an account is worth preserving. What is not acceptable is doing it
silently: today a signed-out visitor gets a fully editable mockup whose edits
vanish on reload with no signal, and since #17 it is quieter but worse —
`livePage` is undefined, so `saveInlineEdit` is never called and there is not
even a console error.

- [ ] **F3a. Make the signed-out state visible and non-editable.** Show a
      persistent "viewing signed out — edits won't be saved" banner, and make
      edit targets non-interactive when there is no session (no `role="button"`,
      no click handler, no affordance). Pairs naturally with D2, which is
      reworking those same targets for keyboard access.
      _Done when:_ a signed-out visitor can read every mockup and cannot open
      the ActionBar.
      _Touches:_ `src/routes/review/+layout.svelte`,
      `src/lib/components/Section.svelte`, `src/lib/components/Page.svelte`.

### F4 — Closed, no work

`.vscode/mcp.json` stays VS Code-only; **no root `.mcp.json`.** The github MCP
is already connected at user scope, so a root config would duplicate it and
prompt every collaborator for approval, and the filesystem MCP is redundant
with native file tools. Low value, nonzero friction.

---

## Not in scope / already settled

- `initializeRealtime` is **live code** (`reviewState.ts:62`). Only its
  `export` is redundant — see B4. Do not delete the function.
- Reformatting the tree to clear the Prettier backlog. lefthook's
  `prettier --write` on staged files shrinks it as files are touched; a bulk
  reformat would produce a ~90-file diff and is ruled out by the global
  CLAUDE.md.
- `pr-agent` is SHA-pinned to `The-PR-Agent/pr-agent@f6af7d7` (v0.42.0), and
  the ownership transfer from `qodo-ai` was verified against GitHub's own
  redirect. Settled in #16.

---

## Suggested sequencing

**F1a first, ahead of everything.** It is a dashboard check, it is the only
item on this plan with a plausible path to data loss, and it does not depend on
any other task.

Then A and B1 — cheap, and they make everything downstream readable. B2/B3 are
the remaining decision points. Nothing in C, D or E is blocked except E6, which
should wait for B2 so Renovate is not opening PRs for packages about to be
deleted.

**F2a is time-sensitive in a way the others are not.** Its cost rises with
every edit saved to the `edits` table, so it should land before the tool sees
real review traffic.

**Parallel-safe groups** (no shared files, per the orchestration rules in the
global CLAUDE.md):

| Group | Tasks        | Files                                                      |
| ----- | ------------ | ---------------------------------------------------------- |
| 1     | A1, A2       | `.ast-grep/**`, `sgconfig.yml`, `scripts/`, `package.json` |
| 2     | B1, B4       | `knip.jsonc`, `src/lib/stores/reviewState.ts`              |
| 3     | C1, C2, C3   | `.github/workflows/**`, `lefthook.yml`                     |
| 4     | F1b          | `supabase/migrations/**`, `supabase/seed.sql`              |
| 5     | D2, F2a, F3a | `src/lib/components/*.svelte`, `src/lib/data/**`, `tests/` |

**Group 5 is one group on purpose, not three.** D2 (keyboard access), F2a
(stable ids) and F3a (signed-out state) all rewrite the same edit-target markup
in `Section.svelte` and `Page.svelte`. Splitting them across worktrees
guarantees conflicts; doing them as one pass over those components is both
cheaper and more coherent, since all three change what an edit target _is_.

`package.json` remains the hub file: A1, B2, D2 and every Phase E item touch
it, so they cannot run concurrently. Sequence anything that adds or removes a
dependency.

`package.json` is the hub file: A1, B2, D2 and every Phase E item touch it, so
they cannot run concurrently. Sequence anything that adds or removes a
dependency.
