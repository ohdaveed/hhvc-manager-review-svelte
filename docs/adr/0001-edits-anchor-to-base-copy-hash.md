# Edits anchor to a hash of their base copy, not to a corpus version

**Status:** accepted, 2026-11-26. Supersedes decisions 8, 9 and 15 of
`docs/superpowers/specs/2026-08-23-mockup-version-history-design.md`.

## Context

An edit must be able to tell when it has **expired** (`CONTEXT.md`): its field's
base copy has changed since it was saved. `edits` records only `field_id`,
`new_content` and `created_at`, so nothing says what base copy an edit was made
against. `corpus_versions` / `page_versions.field_hashes` already exist, but
`corpus:import` is run by hand and need not track what is deployed. Draft pages
have base copy that is not in the corpus at all.

## Decision

- Each edit records the **hash of its field's base copy at save time**, computed
  from the copy the reviewer saw, with the same field hashing that fills
  `page_versions.field_hashes`. Draft pages hash their drafted field the same way.
- An edit is expired when that hash differs from the hash of the field's base
  copy now. Copy that changes and changes back un-expires it.
- An expired edit keeps showing its accepted text, marked expired.
- The anchor is **required**. Production held no edits when this was decided
  (measured 2026-11-26: 0 rows), so nothing is backfilled and there is no
  "base unknown" state. The migration refuses to run if un-anchored edits exist,
  rather than inventing an anchor for them.
- Resolution is always a new edit (re-confirm, rewrite, or keep the base copy).
  There is no separate accept/revoke log; a saved edit is final.

## Alternatives rejected

- **Foreign key to `corpus_versions`.** Correct only if every deploy was
  imported; a skipped import silently anchors edits to the wrong copy, and draft
  pages have no corpus version.
- **Treat existing edits as current.** Passes possibly-stale text off as current,
  which the definition of expired forbids.
- **Backfill from corpus-version timing, with a "base unknown" fallback.**
  Designed, then dropped once production was found to hold no edits: a state
  no row can reach is dead weight in the glossary and the UI.
- **Render the new base copy with a banner** (old decision 15). Lets a re-port
  silently undo a reviewer's decision on screen.
- **`edit_decisions` accept/revoke log** (old decision 8). Contradicts edits
  being final; the shipped model never used it.

## Consequences

- A migration adds the required anchor column; merging it to `main` applies it
  to production, so re-check that production still holds no edits before that
  merge. Local stacks with edits are cleared with `supabase db reset`.
- Anyone who saves an edit between this decision and that merge makes the
  migration fail, loudly, instead of being anchored by guesswork.
