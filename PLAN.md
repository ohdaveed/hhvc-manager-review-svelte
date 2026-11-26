# PLAN — Edit selected copy directly from the Fields panel

Branch `feat/manual-field-edit`, cut from `origin/main` at `c0427d2`.
The previous plan (Transaction pages Karl review, all boxes ticked) is in git history at `c0427d2:PLAN.md`.

Goal: every selected field gets an editable control in the Fields panel. Typing previews on the mockup
immediately; Save persists through `saveInlineEdit`; Cancel/Esc restores the original. Saved edits
survive a reload.

Decisions (approved 2026-11-26): live preview per keystroke, persist only on Save; one control per
selected field; no schema change, no new dependency; the reload-hydration gap is fixed in this branch.

- [x] **1. Draft state.** `pageStore.manualDrafts` keyed by field id (`original`, `value`, `pageId`), with
      `updateDraft` / `isDirty` / `cancelDraft` / `forgetDraft`. Selection replacement, `clearSelection`
      and page change revert unsaved drafts on the mockup and clear them. Unit-tested in `tests/pageData.test.ts`.
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

## Notes

- Verified 2026-11-26: verify PASS (1186 unit), ratchets at baseline (svelte-check 0/0, eslint 3, prettier 42),
  e2e 104/104 including `tests/manualFieldEdit.e2e.ts` and the signed-in axe scan of the Fields panel,
  screenshot checked by eye.
- Skipped from the plan: a character counter on the manual edit control (the 8,000 cap is the AI
  backend's, and a manual edit does not go through it).
- Follow-up, not built: the footer's `Save N edits` counts accepted AI suggestions only, so it reads
  `Save 0 edits` beside an unsaved manual draft. Each draft has its own Save.
