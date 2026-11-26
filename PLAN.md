# PLAN — Expired edits

Branch `feat/expired-edits`, cut from `origin/main`. Design:
`docs/superpowers/specs/2026-11-26-expired-edits-design.md`; decision:
`docs/adr/0001-edits-anchor-to-base-copy-hash.md`. Terms are `CONTEXT.md`'s.

- [x] **0. Design.** Glossary (Base copy, Expired, Orphaned, Transcript), ADR 0001 and the spec committed.
- [x] **1. Browser-safe field hash.** A WebCrypto SHA-256 whose hex equals `hashText` for the same input,
      pinned by a test over real corpus fields.
- Production checked read-only 2026-11-26 (Supabase connector, project kiynekyzqxneepjipqhg): 0 edits,
  20 migrations applied (latest 20261125150000, matching the repo), 2 corpus versions.
- [x] **2. Migration.** `edits.base_hash text NOT NULL`; fails if any existing edit would be un-anchored;
      `latest_edits` exposes it. Applied and tested on the local stack only.
- [x] **3. Save path records the anchor.** `saveInlineEdit` sends the base copy's hash; corpus and draft
      pages both. Unit-tested.
- [x] **4. Expiry and orphan resolution.** A pure function classifies each latest edit as current, expired
      or orphaned against the base copy now. Unit-tested, including copy that changes back.
- [x] **5. Mockup marking.** Expired edits show their text marked expired, with the base copy one step away;
      re-confirm / rewrite / keep base each create an unsaved change. Orphaned edits do not render.
- [x] **6. Transcript.** Expired and orphaned edits appear flagged. Done as a section above the first panel
      (`staleEditsMarkdown`) and a walkthrough-drawer block, fed by `reviewRecordFor`'s new `stale` argument;
      `karl-transcript.js` is untouched. Snapshots needed no update: the section renders only when an edit is
      stale, and the snapshot pages have none.
- [ ] **7. Verify.** Unit, check, ratchets, e2e, browser check; re-confirm production still has 0 edits
      immediately before merge.

## Carried over from earlier plans -- audited 2026-11-26

Checked against `main` at `2e69c2f`; every item but the last has shipped:

- Sewage routing fix ("Fix first" in `docs/reviews/2026-11-24-karl-review-all-tabs.md`): done in #212.
  `hhvc-inspection-scope.ts` no longer sends sewage to the Citywide service and links the sewage report.
- 9-page report regroup: done in #217 and #219. SRO page removed in #219. Mosquito and pigeon report pages
  built in #217 / #219. Topic fold (the two hub pages): done in #216.
- **Still open, and not ours to build yet:** on the report pages, the landlord step first and the 311 button
  last. The review files it under _Revise_, not _Decided_ ("Build only what's under Decided"), and it hangs
  on the 72-hour landlord wait, still open. Needs a manager decision first.
