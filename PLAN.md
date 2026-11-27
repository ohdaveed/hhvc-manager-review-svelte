# PLAN — Karl rebuild sidebar UX

Branch `feat/karl-sidebar-ux`, cut from `origin/main` (`02d88be`), in worktree `../wt-karl-sidebar-ux`
(the main checkout is shared with another session). Source: a pasted Laws-of-UX critique of the
walkthrough drawer (`src/lib/components/workspace/WalkthroughDrawer.svelte`).

- [x] **1. Section labels.** Steps carry the section `heading` (review-record overlay included, via
      `karl-transcript.js` `emitSection`) and `sectionIndex`. Rows and the active card lead with the
      heading; `rawName` stays as the mono tag; the card keeps `uiLabel` visible. Corpus-wide unit test.
- [x] **2. Copy & next.** One-value steps: primary "Copy & next →" copies, marks, advances; a clipboard
      failure neither marks nor advances and says so. Multi-value steps keep per-value Copy and a
      "Done · next →" primary; no-value steps "Mark done · next →". Focus moves into the new card; an
      `aria-live` region announces the copy. Landing guide copy updated. jsdom drawer test.
- [x] **3. Clutter.** Drawer title becomes `sr-only` (still the focus target); subtitle drops the
      duplicated copied count; the mapping box collapses into the card's header row with a `rawName` pill,
      keeping the CHOOSE/FLAG instructions. Navy header untouched.
- [x] **4. No-paste badges.** Rows for steps with no values carry a badge by outcome — Choose, Blocking /
      Flag, or Empty. No skip-empty toggle (it could hide a blocking gap) — deliberately skipped.
- [x] **5. Preview sync.** `Section.svelte` root gets `data-section-index`; the active step's
      `sectionIndex` scrolls the mockup preview (`scrollTop`, not `scrollIntoView`) and holds a highlight
      on that section until the step changes or the walkthrough exits.
- [x] **6. Verify.** Unit tests, `bun run check:ratchet`, `lint:ratchet`, `format:ratchet`, build, and a
      Playwright screenshot of an Information-heavy page from a worktree dev server (not :5173).

Notes from the browser check (1600×1000, bed-bugs Information page, worktree dev server :5199):
- Rows first used one line, which left ~20 characters of heading beside the `information_section` tag
  and cut most headings before the word that tells them apart. They now clamp at two lines.
- A pre-existing sideways scrollbar in the step list came from an unwrapped photo-credit URL in
  `.value-text`; fixed with `overflow-wrap: anywhere` (display only — Copy writes the value unbroken).
- Copy & next observed end to end: clipboard written, Step 2 active, focus on the new card, live region
  "Copied Page title", navy count 1 of 16. Clicking step 9 scrolled the mockup to "Check for bed bugs" and
  marked only that section. The one console error was a local Supabase token refresh 400, unrelated.
- Skip-empty toggle deliberately not built: it could hide a blocking gap.
- Gates 2026-11-26: unit 1360/1360, svelte-check 0/0, eslint 2, prettier 40 (all at baseline), build ok.
