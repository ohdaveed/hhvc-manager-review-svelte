# Integrate the HHVC Review Prototype design (2026-08-29)

Source: Claude Design project `a2ce125c-6f96-482c-a4f2-0fdaf68bf3b4`,
file `HHVC Review Prototype.dc.html` (+ 11 chrome assets).

## Decisions taken

- [x] **`support.js` is not ported.** It is `dc-runtime` — the React viewer that
      interprets the `.dc.html` format (`parseDcDocument`, `window.React`). The
      handoff README says so outright. The prototype's _behaviour_ lives in its
      `data-dc-script` block (lines 723-2318), which we read; the runtime that
      executes it has no counterpart in a Svelte app.
- [x] **"Whole app shell" = the mockup render, on every route.** In the
      prototype the SF.gov `<header>` and `<footer>` sit INSIDE
      `<figure style="max-width: {{ canvasMax }}">` — they are mockup chrome, not
      tool chrome. They go in `Page.svelte`, so every route rendering a mockup
      gets them. The review workspace is NOT wrapped in SF.gov chrome; it is an
      internal tool.
- [x] **`fields.ts::extractCopy` is the field-id contract.** It already
      enumerates every editable string in the corpus and `corpus.lock` hashes
      them. No new field ids are invented; the renderer and the resolver are
      brought up to the vocabulary that already exists.

## Corrections to the handoff README (verified against the tree)

- `@sfgov/design-system` is NOT a dependency — deleted; `src/css/sfds.css` is the
  local replacement (`src/app.css:23,203`).
- `whatToKnow` renders nowhere, though session 2 is marked done.
- Prototype values supersede the README: body `max-width` 760px (not 720),
  type eyebrow 14px (not 12), mockup header white (not `#0c1464`).
- The prototype's `PAGES` sample data has its own shape (`cost`, `things[]`,
  `photo`, `partOf`) which is NOT the corpus shape (`whatToKnow.{cost,
thingsToKnow[{label,text}]}`). Corpus wins.
- The prototype's block vocabulary (`b.kind` = text|callout|cards|facts|
  spotlight|documents|listing|table|image) does not exist in the corpus, whose
  section `kind` is only `body` (104) or `placement` (32). Block type is
  derived from which key is present.

## Parallel groups — no two groups share a file

### Group A — SF.gov chrome _(new files only)_

- [x] `static/sfgov/` — 11 assets from the design project
- [x] `src/lib/components/sfgov/SiteHeader.svelte` — lockup, nav, language, search
- [x] `src/lib/components/sfgov/SiteFooter.svelte` — CCSF lockup, social, 3 link
      columns, the two illustrations

### Group B — Page furniture _(new files only)_

- [x] `src/lib/components/sfgov/Breadcrumb.svelte` — `partOf`
- [x] `src/lib/components/sfgov/OnThisPage.svelte` — TOC from section headings
- [x] `src/lib/components/WhatToKnow.svelte` — the grey box: Cost + Things to
      know as `h3` blocks, with the amber orphan warning on non-Transaction types

### Group C — Block renderer _(new files only)_

- [x] `src/lib/components/blocks/` — cards, facts, steps, table, button,
      spotlight, listing, image. Field ids come from `extractCopy`.

### Group D — Field resolver _(one existing file + its test)_

- [x] `src/lib/corpus/fieldResolver.ts` — resolve the paths `extractCopy`
      already emits: `whatToKnow.*`, `sections.<key>.{cards,facts,steps,table,
button,buttonUrl}.*`, `spotlight.*`
- [x] `src/lib/corpus/fieldResolver.test.ts`

### Group E — Wiring _(hub files — done by the main session, sequentially, after A-D land)_

- [x] `src/lib/components/Page.svelte` — mount chrome + furniture + blocks
- [x] `src/lib/components/Section.svelte` — delegate to the block renderer
- [x] `src/css/theme.css` — only genuinely missing tokens (`tests/theme.test.ts`
      guards the three-layer structure)

## Gates

- [x] `bun run verify` (unit + prod build) green
- [x] `bun run corpus:check` green — no data module is edited, so the lock should
      not move; if it does, that is a bug in this work
- [x] `bun run lint:ratchet` not worse than BASELINE
- [x] `bun run check` not worse than the 25-error/1-warning baseline
- [x] `bun run test:e2e` — includes the axe pass; new chrome needs alt text and
      the search/nav controls must not be announced as interactive (they are
      inert mockup furniture)
- [x] Verified in a browser at the real surface, console clean

## Outcome

Landed in seven commits. Measured, not asserted:

- `bun run verify` green — 312 unit tests + production build.
- `bun run check` 21 errors / 1 warning against a 25/1 baseline. No new error
  in any file this work touched; the two in `Section.svelte` are the pre-existing
  untyped snippet params, only shifted in line number.
- `bun run lint:ratchet` PASS at 5, `bun run corpus:check` clean at 29 pages.
- `bun run test:e2e` 7 passed / 1 skipped, axe now covering 5 pages instead of 2.
- Of the 1290 field paths `extractCopy` emits, **0** fail to resolve. Was ~7 shapes.
- Browser-observed at 1440x900, console clean: header, footer, both illustrations,
  4 social marks, What-to-know, contents list, 7 tables on the Article 11 page,
  103 edit targets there, 0 literal `**` and 22 rendered bold runs.

## Known gaps, deliberately not closed

- `assets/icons/x.svg` in the design project is a crossed-stroke close glyph, not
  the X brand mark. Rendered as-is; the project also ships `icon.20.ui.twitter.svg`.
- `partOf` is set by no corpus module, so `Breadcrumb` renders nothing on all 29.
- `facts` carry `unverified` as a SIBLING of `text` rather than wrapping it, so an
  unverified fact does not raise the amber callout. `extractCopy` reads facts with
  `str()` and the resolver follows suit.
- `data-unverified` is emitted only on `EditTarget`'s signed-out branch, and
  nothing reads the attribute. Pre-existing; left alone rather than adding a
  marker with no consumer.

## Superseded

- The working tree carried uncommitted changes that are NOT part of this work
  (`CLAUDE.md`, `corpus.lock`, `src/lib/data/index.ts`,
  `src/lib/data/health-code-article-11.ts`, `tests/karlButtonCap.spec.ts`,
  untracked `dev-5173.png`). `src/lib/data/index.ts` looks like a regression —
  semicolons stripped and a curated comment about the AI backend's link
  vocabulary replaced with a one-liner. Resolve before branching.

## Collision with #76, resolved

While this branch was in flight, #76 landed on `main` carrying the same inline-
markdown feature under different names: `MarkdownText.svelte` + `corpus/markdown.ts`
against this branch's `InlineMarkdown.svelte` + `corpus/inlineMarkdown.ts`.

`main`'s won and this branch's three files were deleted. It is the better of the
two and it landed first: it is shared by the renderer, the readability scorer,
the link-text check and the bare-URL check rather than serving only the renderer,
and its link pattern is deliberately the same one `karl-legacy-core`'s
`extractInlineLinks` already used, instead of being a second definition of it.

`main` was merged in rather than rebased onto, because the PR was already open.
