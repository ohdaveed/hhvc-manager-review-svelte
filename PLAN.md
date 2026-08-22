# PLAN — Replace generic divs/HTML with shadcn-svelte components

## Scope decision (assumption, stated up front)

The tree splits cleanly in two and only one half is in scope:

- **Chrome** (the review tool's own UI: sidebars, tab strip, panels, action bar) —
  **in scope**, converts to shadcn-svelte.
- **Mockup** (`src/lib/components/Page.svelte`, `Section.svelte`) — renders the
  SF.gov page under review. **Out of scope.** Converting SF.gov page content into
  Card/Alert would destroy the fidelity that is the entire point of this tool.
  The one exception is the inline-edit hover affordance duplicated 8× across those
  two files, which is chrome, not content.

## Pre-existing state found during orientation (findings, not fixes)

- [x] `components.json` points at `tailwind.config.ts`, which does not exist — this
      is a Tailwind v4 project. Must be corrected before the CLI will run.
- [x] `src/app.css` defines **no shadcn theme tokens** (`--primary`, `--muted`,
      `--border`, `--ring`, `--radius` …). The one already-installed component,
      `ui/button/button.svelte`, references all of them, so it currently renders
      unstyled. Nothing imports it, so nobody has noticed.
- [x] `.page-title`, `.page-body`, `.page-section`, `.page-summary` etc. are
      defined only in `src/css/styles.css`, which is imported only by
      `src/legacy_main.js`, which is imported by nothing. **The mockup's own
      styling is dead** in the Svelte app. Reported, not fixed — out of scope.
- [x] The "Karl tags" checkbox in `routes/review/+layout.svelte` carries
      `toggle toggle-primary toggle-sm` — DaisyUI classes, and DaisyUI is not
      installed. Currently an unstyled native checkbox. A real fix, in scope.
- [x] Baseline screenshot of `/review/report-garbage-filth-vegetation` captured to
      `.playwright-mcp/baseline.png` before any edit, so the mockup region can be
      proven unchanged afterwards.

## Tasks

- [x] 1. Capture baseline screenshot + commit this plan.
- [ ] 2. Fix `components.json` for the Tailwind v4 / shadcn-svelte schema.
- [ ] 3. Add shadcn theme tokens to `src/app.css` — `:root` vars + `@theme inline`
      mapping. **Deliberately omit** the stock `@layer base { *, body }` global
      resets: they would override the existing `body` rule and bleed into the
      sfds-rendered mockup. Done when the mockup region is pixel-identical to
      baseline.
- [ ] 4. Install components: `card`, `tabs`, `textarea`, `label`, `badge`,
      `separator`, `switch`, `alert`, `scroll-area`, `toggle-group`. Done when
      each generated file matches the idiom of the existing `ui/button`
      (tailwind-variants, `data-slot`, `WithElementRef`) and builds against the
      installed `bits-ui@^2.19.0`.
- [ ] 5. `ReviewWorkspace.svelte` → `Tabs`. Highest value: the hand-rolled tablist
      has `role="tab"` and `aria-selected` but no `aria-controls`, no `tabpanel`
      role, and no arrow-key handling. This is a correctness fix, not a reskin.
- [ ] 6. `ActionBar.svelte` → `Card`, `Badge`, `Textarea`, `Button` ×4.
- [ ] 7. `ReviewPanel.svelte` → `Label`, `Textarea`, `Separator`, `Card` + `Badge`
      for check rows, decision buttons → `Button`.
- [ ] 8. `ReviewQueue.svelte` → `Button variant="ghost"` links, `Badge` status
      dots, `Separator` between groups.
- [ ] 9. `HelpPanel.svelte` → `Card`, `Button`, `ScrollArea`.
- [ ] 10. `routes/review/+layout.svelte` → `Button` for Export Data, `Separator`
      for sidebar rules, `Switch` for the dead DaisyUI Karl-tags toggle.
- [ ] 11. `routes/review/[slug]/+page.svelte` → not-found block to `Alert`.
- [ ] 12. Consolidate the 8× duplicated inline-edit hover affordance out of
      `Page.svelte` / `Section.svelte` into one shared class. Content markup
      itself stays untouched.
- [ ] 13. Verify: `bun run verify` (unit + build), `bun run check` against the
      **~55 error baseline** (not zero), `bun run format` (Prettier — this repo
      gates on it; not Oxfmt), and a Playwright screenshot diffed against
      baseline to prove the mockup region is unchanged.

## Deliberately not done

- **Keyboard activation for inline-edit targets.** The elements in `Page.svelte` /
  `Section.svelte` are `role="button" tabindex="0"` with **no `onkeydown`** — a
  keyboard user can focus them and cannot activate them. Real a11y defect, seen
  and reported, but fixing it is beyond "replace divs with shadcn components".
- **The callout in `Section.svelte`** (`bg-blue-50 border-l-4 border-blue-600`) is
  off-brand mockup content. Whether it becomes an SFDS callout or a shadcn `Alert`
  is a product call, so it is left alone and raised in the final report.
- **The dead mockup CSS** (`src/css/styles.css` unimported) — reported above.

## Context for a cold resume

The working tree already had uncommitted changes in `HelpPanel.svelte`,
`ReviewPanel.svelte`, `ReviewWorkspace.svelte`, `stores/reviewState.ts`, plus
untracked `scripts/sync-checks.ts` and a new Supabase migration, **before this
work started**. Those are not mine; they were built on top of, never reverted.
Work happens on branch `feat/shadcn-components`.
