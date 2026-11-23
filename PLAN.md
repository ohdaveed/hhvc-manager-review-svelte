# PLAN — ponytail audit cuts

Branch `chore/ponytail-cuts`, cut from `main` at `2e234a2`.

A repo-wide over-engineering audit produced ten findings. Five survived
verification; five did not, and the reasons are recorded below so nobody
re-proposes them. The headline figure in the audit (~4,000 lines) was wrong:
the real cut is ~930 lines, ~52 of it code.

## Cuts

- [x] **1. Dead code: two declarations with no reader anywhere.**
      `MARKDOWN_STRONG` (`src/lib/corpus/markdown.ts`) and `__resetFieldIds`
      (`src/lib/components/sfgov/ds/fieldId.ts`). Verified with `git grep` over
      the whole repo, tests included — neither name appears outside the file
      that declares it.
- [x] **2. Over-exported internals: drop `export`, keep the code.** Seven names
      are exported and consumed only inside their own module:
      `getModel`, `normalizeUsage`, `DEFAULT_MODEL` (`server/ai/gemini.ts`),
      `addUsage`, `MAX_ATTEMPTS`, `DISCLOSURE` (`server/ai/generate.ts`),
      `MARKDOWN_LINK` (`corpus/markdown.ts`). This removes no lines. The payoff
      is that knip's "unused exports" list stops carrying 7 false leads, so a
      genuinely dead export is visible in it next time.
- [x] **3. `src/lib/components/blocks/index.ts` + `ImageBlock.svelte`.** The
      barrel has zero importers — `Section.svelte` and `Page.svelte` import each
      block directly — and `ImageBlock` is reachable only through that barrel.
      No corpus module carries an image section (`component:` values are
      supporting, spotlight, resources, services, related, intro, top-facts,
      body). 45 lines.
- [x] **4. `@sveltejs/adapter-auto`.** Referenced nowhere but `package.json` and
      the `knip.jsonc` `ignoreDependencies` entry that silences the warning
      about it. `vite.config.ts` selects between adapter-netlify and
      adapter-node. Remove with `bun remove` so `bun.lock` moves too, and drop
      the ignore entry.
- [x] **5. Three stale root planning docs**, untouched since 2026-08-30:
      `PLAN-prototype.md` (376), `REVIEW-structure-pass.md` (419),
      `PLAN-new-pages.md` (85). `git grep` finds no reference to any of them
      from code, CLAUDE.md, CONTEXT.md, docs/ or the skills. Git history is the
      archive. **Own commit**, so it can be dropped from the PR without
      touching the code cuts.

## Gates

- [x] `bun run verify` (unit + build).
- [x] `bun run lint:ratchet` and `bun run check:ratchet` — `verify` runs
      neither, and both fail when the count DROPS as well as rises. The four
      eslint errors live in `scripts/env-target.ts`,
      `src/lib/components/ui/button/button.svelte`,
      `src/lib/legacy-core/card-inheritance.js` and `karl-transcript.js` —
      none in a file this branch deletes, so the baseline should hold at 4.
- [x] `bunx knip` after the cuts: the "Unused files" list dropped from 3 to
      1 and "Unused exports" from 58 to 49. Confirmed on `7e0eeb6`.

## Rejected, with the evidence

Each of these was in the audit report and should not be re-proposed without new
evidence.

1. **The 13 `src/lib/components/sfgov/ds/*` components imported only by the
   specimen route (~2,100 lines) — NOT CUT, judgment call left to the owner.**
   Only `SiteButton`, `TextField` and `PageAlert` reach the app (the login
   page); the other thirteen are rendered only by
   `src/routes/sfgov-components/+page.svelte`, which exists to axe-test them.
   That reads as a library built ahead of need, but `ds/README.md` states the
   purpose as "building public SF.gov pages" and names Figma as the design
   source, so it is inventory for planned work rather than debt. Deleting it is
   a product decision, not a cleanup.

2. **`ds/SiteHeader`, `ds/SiteFooter`, `ds/OnThisPage` as duplicates of the
   `sfgov/` components — WITHDRAWN, the audit was wrong.** They are not copies.
   The `sfgov/` versions are deliberately INERT — every nav item, the language
   control and the search box are `<span>`s, because the review canvas shows a
   picture of a header and a fake control exposed as a real one fails the axe
   gate. The `ds/` versions are the functional counterparts: real links, a real
   `<select>`, a real `<form>`. Both are needed and each file says so in its own
   header comment. Collapsing them would break the axe gate.

3. **`src/lib/corpus/oneToOne.ts` (128 lines) — KEEP, it is a live CI gate.**
   The audit called it dead because its only importer is its own test. That test
   imports `allPages` and asserts `findOneToOneViolations(allPages)` equals `[]`
   — a content invariant over the real corpus, guarding that no mockup carries
   an element Karl has no field for. Deleting it would silently remove a
   corpus guard. knip cannot see this because it treats tests as entry points.

4. **`src/lib/components/sfgov/OnThisPage.svelte` (72 lines) — KEEP,
   deliberately unwired.** `#102` removed it from `Page.svelte` with a recorded
   reason: three live sf.gov pages captured 2026-08-30 carry no such nav, so the
   prototype's TOC is not rendered. That commit states the component is kept on
   purpose and is "one line to put back if the prototype is the standard rather
   than sf.gov."

5. **`scripts/sync-checks.ts` (225 lines) — KEEP.** It has no `package.json`
   entry, but CLAUDE.md documents it as the service-role script whose
   credentials `env-target.ts` switches. Unlisted, not orphaned.

Also not done: shrinking `scripts/env-target.ts` (513 lines for a four-variable
rewriter — a real target, but a rewrite rather than a cut), and the ~35 unused
exports in `src/lib/server/ai/vendor/**`, which CLAUDE.md requires to stay
mechanically diffable against the upstream package.
