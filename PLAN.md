# PLAN — Edit selected copy directly from the Fields panel

Branch `feat/manual-field-edit`, cut from `origin/main` at `c0427d2`.
The previous plan (Transaction pages Karl review, all boxes ticked) is in git history at `c0427d2:PLAN.md`.

Goal: every selected field gets an editable control in the Fields panel. Typing previews on the mockup
immediately; Save persists through `saveInlineEdit`; Cancel/Esc restores the original. Saved edits
survive a reload.

Decisions (approved 2026-11-26): live preview per keystroke, persist only on Save; one control per
selected field; no schema change, no new dependency; the reload-hydration gap is fixed in this branch.

- [ ] **1. Draft state.** `pageStore.manualDrafts` keyed by field id (`original`, `value`, `pageId`), with
      `startDraft` / `updateDraft` / `cancelDraft` / `forgetDraft`. Selection replacement, `clearSelection`
      and page change revert unsaved drafts on the mockup and clear them. Unit-tested in `tests/pageData.test.ts`.
- [ ] **2. Panel controls.** The name-only list in `FieldsPanel.svelte` becomes one labelled textarea per
      selected field, numbered like its badge, with Save / Cancel and Esc-to-cancel. Typing calls the
      resolved field's `set()` so the mockup re-renders.
- [ ] **3. Save.** Save calls `saveInlineEdit`, skips no-op saves, keeps the draft and shows an error on
      failure, and drops a pending AI suggestion for that field once saved. Accept is disabled on a field
      with an unsaved draft.
- [ ] **4. Hydrate saved edits.** After `loadReview` and on each realtime insert into `edits`, the latest edit per
      field is applied to the mockup through `resolveField().set`, last-write-wins, never over an open draft.
- [ ] **5. Tests.** `tests/fieldsPanel.test.ts` covers type → mockup changes, Cancel reverts, Save calls
      `saveInlineEdit` once with the right `field_id`, failed save keeps the draft; hydration has its own test.
- [ ] **6. Verify.** `bun run verify` PASS, lint/check/format ratchets at baseline, a Playwright check of the
      real page (select, type, see mockup change) with a clean console. PR open.
