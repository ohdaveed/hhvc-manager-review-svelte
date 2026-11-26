# Expired edits — design

**Status:** agreed 2026-11-26, not yet built.
**Decision record:** `docs/adr/0001-edits-anchor-to-base-copy-hash.md`.
**Supersedes:** decisions 7, 8, 9 and 15 of
`2026-08-23-mockup-version-history-design.md`. Terms are `CONTEXT.md`'s.

## Rules

1. Every saved edit records the hash of its field's **base copy** as the
   reviewer saw it at save time. The column is required.
2. Base copy is the corpus text for a corpus page and the drafted text for a
   draft page, hashed the same way as `page_versions.field_hashes`.
3. An edit is **expired** when its recorded hash differs from the hash of the
   field's base copy now. Compared against now, not against history: copy that
   changes and changes back is current again.
4. An expired edit still shows its accepted text, marked expired; the current
   base copy is one step away. It is never hidden, never shown as current.
5. It is resolved only by a new edit — re-confirm (same text), rewrite, or keep
   the base copy (an edit equal to the base). Each starts as an unsaved change
   and is recorded on save, like any other edit.
6. An edit whose field no longer exists is **orphaned**: kept, not rendered on
   the mockup, listed in the transcript. Moving it to another field is out of
   scope.
7. The transcript includes expired and orphaned edits, flagged, with the
   accepted text and (for expired) the current base copy.

## Constraints found while designing

- `hashText` (`src/lib/corpus/hash.ts`) uses `node:crypto`, so the browser
  cannot call it. The save path needs a browser-safe SHA-256 (WebCrypto,
  async) whose hex output is byte-identical; a test must pin the two together.
- Reviews read `latest_edits`, not `edits`
  (`20260827110000_latest_edits_view.sql`), so the view must expose the anchor.
- Production held **0 edits** on 2026-11-26, so there is no backfill. The
  migration must fail if any un-anchored edit exists; re-check before merging,
  because the merge applies it to production.

## Out of scope

Moving orphaned edits; an accept/revoke log; `materialize`.
