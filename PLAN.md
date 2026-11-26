# PLAN — Follow-ups from the unsaved-change review (PR #225)

Branch `fix/review-follow-ups`, cut from `origin/main` at `ff59b13`.
The previous plan (manual field editing + vocabulary alignment, all boxes ticked) is in git history at
`ff59b13:PLAN.md`. Terms are `CONTEXT.md`'s: unsaved change, suggestion, accepted, draft page.

- [x] **1. Draft pages keep unsaved changes.** `mergeDraftPages` re-applies each unsaved change's value to
      the replaced page object, so returning to a draft page shows what the count says. Unit-tested.
- [x] **2. Saved-elsewhere is per tab.** The notice compares against the edit ids THIS tab inserted, not the
      user id: the reviewer's own save from another tab raises it, this tab's own saves never do, and an
      authorless row is still ignored. Unit-tested through `hydrateMockup`.
- [x] **3. A rewrite never overwrites an accepted suggestion.** A rewrite result for a field whose
      suggestion is accepted (here or on another page) is dropped rather than replacing it, and the
      reviewer is told why. Unit-tested.
- [x] **4. Rethink grounding comment.** `RethinkPanel.svelte` ~107 says what grounding now contains: saved
      edits (hydrated) and unsaved changes. No behaviour change.
- [x] **5. Karl outline wording.** Decided 2026-11-26: it judges the copy on screen (saved edits plus unsaved
      changes), via `placementsFor(..., { copy: 'as-shown' })`; the Blueprint shares it. Unit-tested.
- [x] **6. Verify.** Unit, check, ratchets, e2e, browser check. Verified 2026-11-26 at a80cacb: unit 1229,
      svelte-check 0/0, eslint 3, prettier 42, e2e 110/110; tasks 1 and 3 had their fix reverted once and
      their test failed. Browser: an unsaved 41-character button shows the outline badge "Needs a fix"; clean
      console. Not verified live: a client-chosen edit id against a real insert (grant read, not exercised).

Not in this branch: marking expired edits on the mockup. Edits carry no corpus version, so it needs a
migration -- and a merge to `main` applies migrations to production -- so it gets its own plan.

## Carried over from earlier plans -- audited 2026-11-26

Checked against `main` at `2e69c2f`; every item but the last has shipped:

- Sewage routing fix ("Fix first" in `docs/reviews/2026-11-24-karl-review-all-tabs.md`): done in #212.
  `hhvc-inspection-scope.ts` no longer sends sewage to the Citywide service and links the sewage report.
- 9-page report regroup: done in #217 and #219. SRO page removed in #219. Mosquito and pigeon report pages
  built in #217 / #219. Topic fold (the two hub pages): done in #216.
- **Still open, and not ours to build yet:** on the report pages, the landlord step first and the 311 button
  last. The review files it under _Revise_, not _Decided_ ("Build only what's under Decided"), and it hangs
  on the 72-hour landlord wait, still open. Needs a manager decision first.
