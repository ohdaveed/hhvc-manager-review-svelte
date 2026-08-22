# PLAN — Resolve outstanding audit items

Follow-up to the tooling audit (#16), the inline-edit persistence fix (#17) and
the Danger rule fix (#19). Those are landed; what follows is everything the
audit surfaced and left open. The previous plan (persist inline copy edits)
completed — its record is in git history and #17.

**Ordering principle:** tooling that reports green while doing nothing comes
first. A gate that lies is worse than no gate, because it spends trust. Items
needing a product decision are last, and are questions rather than tasks.

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

## Phase F — Questions, not tasks

These need a decision before any code is written.

- [ ] **F1. RLS is effectively open.** Every policy on all four tables is
      `FOR ALL TO authenticated USING (true)`, so any signed-in user can read,
      modify and delete any row, and `edits` records no author beyond
      `user_id`. Already documented as known and unresolved. **What is the
      trust model — is every reviewer trusted with every other reviewer's
      work?** That answer decides whether this is fine or a defect.

- [ ] **F2. `field_id` paths are positional.** `sections.0.paragraphs.1` means
      inserting a section renumbers later paths and orphans edits saved against
      the old ones. Pre-existing in the `data-rewrite-field` scheme, not
      introduced by #17. Worth fixing only if the mockup corpus is expected to
      change shape after review begins.

- [ ] **F3. Signed-out reviewers see a console error.** Production logs
      `No review found: null` for an unauthenticated visitor, because policies
      are `TO authenticated` and the query returns zero rows without erroring.
      The app then renders an editable mockup that silently cannot persist.
      **Is anonymous browsing intended?** If yes it needs a visible "not signed
      in — edits won't save" state; if no, it should redirect.

- [ ] **F4. `.vscode/mcp.json` does nothing for Claude Code.** Correct for
      VS Code per its own plan, but Claude Code reads `.mcp.json` at the repo
      root, and it duplicates a github MCP already connected. Keep it
      VS Code-only, or add a root config?

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

A and B1 first — they cost little and make everything downstream readable.
B2/B3 and F1–F4 are the decision points; nothing in C, D or E is blocked by
them except E6, which should wait for B2.

**Parallel-safe groups** (no shared files, per the orchestration rules in the
global CLAUDE.md):

| Group | Tasks      | Files                                                      |
| ----- | ---------- | ---------------------------------------------------------- |
| 1     | A1, A2     | `.ast-grep/**`, `sgconfig.yml`, `scripts/`, `package.json` |
| 2     | B1, B4     | `knip.jsonc`, `src/lib/stores/reviewState.ts`              |
| 3     | C1, C2, C3 | `.github/workflows/**`, `lefthook.yml`                     |
| 4     | D2         | `src/lib/components/*.svelte`, `tests/`                    |

`package.json` is the hub file: A1, B2, D2 and every Phase E item touch it, so
they cannot run concurrently. Sequence anything that adds or removes a
dependency.
