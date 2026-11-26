# PLAN — Edit selected copy directly from the Fields panel

Branch `feat/manual-field-edit`, cut from `origin/main` at `c0427d2`.
The previous plan (Transaction pages Karl review, all boxes ticked) is in git history at `c0427d2:PLAN.md`.

Goal: every selected field gets an editable control in the Fields panel. Typing previews on the mockup
immediately; Save persists through `saveInlineEdit`; Cancel/Esc restores the original. Saved edits
survive a reload.

Decisions (approved 2026-11-26): live preview per keystroke, persist only on Save; one control per
selected field; no schema change, no new dependency; the reload-hydration gap is fixed in this branch.

- [x] **1. Draft state.** `pageStore.manualDrafts` keyed by `draftKey(pageId, fieldId)`, with
      `updateDraft` / `isDirty` / `cancelDraft` / `forgetDraft`. Unit-tested in `tests/pageData.test.ts`.
      (Revised after review: drafts are no longer reverted by a selection or page change -- see 7.)
- [x] **2. Panel controls.** The name-only list in `FieldsPanel.svelte` becomes one labelled textarea per
      selected field, numbered like its badge, with Save / Cancel and Esc-to-cancel. Typing calls the
      resolved field's `set()` so the mockup re-renders.
- [x] **3. Save.** Save calls `saveInlineEdit`, skips no-op saves, keeps the draft and shows an error on
      failure, and drops a pending AI suggestion for that field once saved. Accept is disabled on a field
      with an unsaved draft.
- [x] **4. Hydrate saved edits.** After `loadReview` and on each realtime insert into `edits`, the latest edit per
      field is applied to the mockup through `resolveField().set`, last-write-wins, never over an open draft.
- [x] **5. Tests.** `tests/fieldsPanel.test.ts` covers type → mockup changes, Cancel reverts, Save calls
      `saveInlineEdit` once with the right `field_id`, failed save keeps the draft; hydration has its own test.
- [x] **6. Verify.** `bun run verify` PASS, lint/check/format ratchets at baseline, a Playwright check of the
      real page (select, type, see mockup change) with a clean console. PR open.

## Fixes from the self-review (2026-11-26)

- [x] **7. Typing is never discarded silently.** A selection change or navigation keeps an unsaved draft
      on the mockup; the panel lists this page's parked drafts with Edit / Discard / Save and says how
      many wait on other pages. Drafts are keyed by page and field, since field ids are page-relative.
- [x] **8. Saved-edit hydration ignores optimistic rows.** `applySavedEdits` skips a field whose newest
      row is `saveInlineEdit`'s `temp-` row, so a failed AI save no longer leaves its text on the mockup.
      Covered by unit tests only: an e2e test of a deliberately failed save trips the console-error gate
      in `tests/fixtures.ts` on the app's own `Failed to save edit` log.
- [x] **9. No line breaks.** No corpus field holds one (measured over every string in `pageStore.pages`),
      so Enter saves and pasted line breaks become spaces.

## Vocabulary alignment (grilled 2026-11-26; terms in `CONTEXT.md`)

An **unsaved change** is new wording on the mockup not yet saved -- typed, or from an accepted
suggestion. Saving is the acceptance; there is no accepted-but-unsaved state.

- [x] **10. Rename to "unsaved change".** UI copy says "unsaved change(s)", never "unsaved edit(s)";
      `ManualDraft` / `manualDrafts` / `parkedDrafts` / `draftsElsewhere` and their methods use
      unsaved-change names. No "draft" left meaning field-level typing in this branch's code.
- [x] **11. One count, one Save.** The footer reads `Save N changes` and saves every unsaved change on
      this page, typed or accepted; the toolbar pill counts unsaved changes on every page. Unit-tested.
- [x] **12. Cancel un-accepts.** Cancel on a field holding an accepted suggestion restores the field and
      returns the suggestion to pending, not dismissed. Unit-tested.
- [ ] **13. Someone else saved this field.** While a field has an unsaved change, a newer confirmed edit
      to it from elsewhere shows a one-line notice on that field; Save still proceeds (last write wins).
      Unit-tested.
- [ ] **14. Verify.** `bun run verify` PASS, ratchets at baseline, e2e green, Playwright check by eye.

Deferred, not this branch: rename the suggestion status `'accepted'` (pre-dates this branch; touches
Rethink, `decideAll` and the export fold -- follow-up PR after merge); marking expired edits on the
mockup (edits carry no corpus version yet).

## Notes

- Verified 2026-11-26: verify PASS (1186 unit), ratchets at baseline (svelte-check 0/0, eslint 3, prettier 42),
  e2e 104/104 including `tests/manualFieldEdit.e2e.ts` and the signed-in axe scan of the Fields panel,
  screenshot checked by eye.
- Skipped from the plan: a character counter on the manual edit control (the 8,000 cap is the AI
  backend's, and a manual edit does not go through it).
- The footer/pill count gap noted here earlier is now task 11.

## Carried over from the previous plan (`c0427d2:PLAN.md`), still open

- The sewage routing fix is out of scope only because it sits on an Information page (*Learn what HHVC
  can inspect*). The Decisions tab marks it **Fix first**, and it is still pending.
- Also deferred there, each needing its own plan: the 9-page report regroup, removing the SRO page, the
  mosquito and pigeon pages, and the Topic fold. Track B2 deferred moving the landlord notice and
  putting the 311 button last (the 72-hour wait is still open in the Decisions tab).
