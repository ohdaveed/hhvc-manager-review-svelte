# PLAN — Follow-ups from the unsaved-change review (PR #225)

Branch `fix/review-follow-ups`, cut from `origin/main` at `ff59b13`.
The previous plan (manual field editing + vocabulary alignment, all boxes ticked) is in git history at
`ff59b13:PLAN.md`. Terms are `CONTEXT.md`'s: unsaved change, suggestion, accepted, draft page.

- [ ] **1. Draft pages keep unsaved changes.** `mergeDraftPages` re-applies each unsaved change's value to
      the replaced page object, so returning to a draft page shows what the count says. Unit-tested.
- [ ] **2. Saved-elsewhere is per tab.** The notice compares against the edit ids THIS tab inserted, not the
      user id: the reviewer's own save from another tab raises it, this tab's own saves never do, and an
      authorless row is still ignored. Unit-tested through `hydrateMockup`.
- [ ] **3. A rewrite never overwrites an accepted suggestion.** A rewrite result for a field whose
      suggestion is accepted (here or on another page) is dropped rather than replacing it, and the
      reviewer is told why. Unit-tested.
- [ ] **4. Rethink grounding comment.** `RethinkPanel.svelte` ~107 says what grounding now contains: saved
      edits (hydrated) and unsaved changes. No behaviour change.
- [ ] **5. Karl outline wording.** Pending a decision: which copy the outline judges (see below).
- [ ] **6. Verify.** Unit, check, ratchets, e2e, browser check.

Not in this branch: marking expired edits on the mockup. Edits carry no corpus version, so it needs a
migration -- and a merge to `main` applies migrations to production -- so it gets its own plan.

## Carried over from earlier plans (`c0427d2:PLAN.md`), still open

- The sewage routing fix is out of scope only because it sits on an Information page (*Learn what HHVC
  can inspect*). The Decisions tab marks it **Fix first**, and it is still pending.
- Also deferred there, each needing its own plan: the 9-page report regroup, removing the SRO page, the
  mosquito and pigeon pages, and the Topic fold. Track B2 deferred moving the landlord notice and
  putting the 311 button last (the 72-hour wait is still open in the Decisions tab).
