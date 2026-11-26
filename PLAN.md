# PLAN — Expired edits

Branch `feat/expired-edits`, cut from `origin/main`. Design:
`docs/superpowers/specs/2026-11-26-expired-edits-design.md`; decision:
`docs/adr/0001-edits-anchor-to-base-copy-hash.md`. Terms are `CONTEXT.md`'s.

- [x] **0. Design.** Glossary (Base copy, Expired, Orphaned, Transcript), ADR 0001 and the spec committed.
- [ ] **1. Browser-safe field hash.** A WebCrypto SHA-256 whose hex equals `hashText` for the same input,
      pinned by a test over real corpus fields.
- [ ] **2. Migration.** `edits.base_hash text NOT NULL`; fails if any existing edit would be un-anchored;
      `latest_edits` exposes it. Applied and tested on the local stack only.
- [ ] **3. Save path records the anchor.** `saveInlineEdit` sends the base copy's hash; corpus and draft
      pages both. Unit-tested.
- [ ] **4. Expiry and orphan resolution.** A pure function classifies each latest edit as current, expired
      or orphaned against the base copy now. Unit-tested, including copy that changes back.
- [ ] **5. Mockup marking.** Expired edits show their text marked expired, with the base copy one step away;
      re-confirm / rewrite / keep base each create an unsaved change. Orphaned edits do not render.
- [ ] **6. Transcript.** Expired and orphaned edits appear flagged. Snapshot test updated deliberately.
- [ ] **7. Verify.** Unit, check, ratchets, e2e, browser check; re-confirm production still has 0 edits
      immediately before merge.
