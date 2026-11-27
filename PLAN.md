# PLAN — Karl rebuild sidebar UX

Branch `feat/karl-sidebar-ux`, cut from `origin/main` (`02d88be`), in worktree `../wt-karl-sidebar-ux`
(the main checkout is shared with another session). Source: a pasted Laws-of-UX critique of the
walkthrough drawer (`src/lib/components/workspace/WalkthroughDrawer.svelte`).

- [ ] **1. Section labels.** Steps carry the section `heading` (review-record overlay included, via
      `karl-transcript.js` `emitSection`) and `sectionIndex`. Rows and the active card lead with the
      heading; `rawName` stays as the mono tag; the card keeps `uiLabel` visible. Corpus-wide unit test.
- [ ] **2. Copy & next.** One-value steps: primary "Copy & next →" copies, marks, advances; a clipboard
      failure neither marks nor advances and says so. Multi-value steps keep per-value Copy and a
      "Done · next →" primary; no-value steps "Mark done · next →". Focus moves into the new card; an
      `aria-live` region announces the copy. Landing guide copy updated. jsdom drawer test.
- [ ] **3. Clutter.** Drawer title becomes `sr-only` (still the focus target); subtitle drops the
      duplicated copied count; the mapping box collapses into the card's header row with a `rawName` pill,
      keeping the CHOOSE/FLAG instructions. Navy header untouched.
- [ ] **4. No-paste badges.** Rows for steps with no values carry a badge by outcome — Choose, Blocking /
      Flag, or Empty. No skip-empty toggle (it could hide a blocking gap) — deliberately skipped.
- [ ] **5. Preview sync.** `Section.svelte` root gets `data-section-index`; the active step's
      `sectionIndex` scrolls the mockup preview (`scrollTop`, not `scrollIntoView`) and holds a highlight
      on that section until the step changes or the walkthrough exits.
- [ ] **6. Verify.** Unit tests, `bun run check:ratchet`, `lint:ratchet`, `format:ratchet`, build, and a
      Playwright screenshot of an Information-heavy page from a worktree dev server (not :5173).
