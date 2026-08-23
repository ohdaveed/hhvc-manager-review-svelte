# Mockup version history, accepted-edit overlay, and durable notes

**Status:** design approved after adversarial review, not yet planned
**Date:** 2026-08-23
**Supersedes:** PLAN.md item **F5** ("The hosted database has no data"), which becomes slice 1 of this work.

---

## Why this exists

The mockups are redesigned in a separate vanilla-JS app (`hhvc.netlify.app`, "HHVC
Manager Review Mockup Tool") and re-ported by hand into `src/lib/data/*.ts`, which
is what `allPages` — and therefore every `pages` row — is built from.

That re-port is the problem. Today a page's identity is its `path`, derived from
the module's slug. When a slug is renamed or a page is dropped, the corresponding
`pages` row is orphaned: it still holds a reviewer's real `status`,
`manager_notes` and `page_checks`, pointing at a path the app no longer renders.
Nothing errors. The reviewer's work simply stops being reachable.

The goal is that mockup revisions become **legible** (what changed between two
versions?) rather than destructive, and that reviewer work survives them.

## Findings this design is built on

Each was measured against the hosted project `kiynekyzqxneepjipqhg` or the working
tree, not assumed.

1. **`reviews` / `pages` / `comments` / `edits` are all 0 rows.** F5's premise is
   correct.
2. **`supabase/seed.sql` is deliberately local-only.** Its own header says "never
   applied to the hosted project", and it inserts an `auth.users` row with the
   hardcoded password `dev-local-only`. Applying it to production would plant a
   known-password account. F5 therefore needs a _different_ seed path, not this one.
3. **Auth already works.** `auth.users` holds one confirmed row; the
   `No review found: null` symptom is missing review data, not broken sign-in.
4. **`edits` is already an append-only history** — `(page_id, user_id, field_id,
new_content, created_at)`, one row per save, never updated. Per-field copy
   history exists today and needs nothing new.
5. **`edits.user_id` exists**, contradicting CLAUDE.md's claim that "`edits`
   records no author". That doc line needs correcting.
6. **`pages.manager_notes` is destructive.** `reviewState.ts:188` does
   `.update({ manager_notes })`; each save overwrites the last with no history.
   Same for `page_checks`.
7. **The `comments` table is dead code.** It exists with 4 RLS policies, but
   nothing in `src/` reads or writes it.
8. **`field_id` is structural, not positional** —
   `sections.<heading-slug>.paragraphs.<n>`, derived from the heading rather than
   the array index and computed once from pristine module data, so reordering
   sections does not orphan later edits. Documented limit: paragraph and bullet
   indexes _within_ a section still shift.
9. **`title` and `summary` are already field ids** (`Page.svelte:20,29`), folded by
   `HelpPanel.svelte:46-47`. Page-level addressing partly exists. `audience[]`
   does not have one.
10. **CI has no Supabase credentials** — `pr.yml` sets placeholder values only, so
    fork PRs keep working. Any check requiring DB access is therefore unbuildable
    as specified.
11. **Realtime subscribes to `INSERT` on `edits`, not `UPDATE`.** Any design that
    signals acceptance by updating a column would silently fail to propagate.
12. **`public.documents` is an orphan** — a pgvector table absent from
    `supabase/migrations/`, 0 rows, RLS enabled with 0 policies (deny-all).

## Decisions

Six from design, five from adversarial review.

| #   | Question                                    | Decision                                                                             |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1   | Is the hosted DB for real work?             | Real review work — minimal scaffolding, no fabricated content                        |
| 2   | How are versions created?                   | Explicit `corpus:import`; a version exists exactly when you re-port                  |
| 3   | What can a reviewer do with history?        | Compare two versions side by side, field level                                       |
| 4   | Do AI rewrites create a version?            | **No** — they write one `edits` row, as today                                        |
| 5   | How does an accepted edit reach the mockup? | DB overlay at render; a static build cannot rewrite its own source                   |
| 6   | Reviewer notes                              | Append-only `page_notes`                                                             |
| 7   | Accepted edit when its base copy changes    | **Expires on field-hash change**, surfaced for re-confirmation                       |
| 8   | Is acceptance itself mutable?               | **No** — append-only `edit_decisions` log; accept and revoke are both rows           |
| 9   | After `materialize`                         | Edit records `materialized_in_version_id`; the overlay skips it                      |
| 10  | Enforcing import                            | **`corpus.lock` in git**, compared offline in CI — no DB access                      |
| 11  | Who may accept                              | Deferred; any authenticated reviewer for now, **explicit gate on slice 3**           |
| 12  | What counts as a version change             | Reader-visible copy only; `karl`/`editorNote` snapshotted but excluded from the hash |
| 13  | Reader-visible copy without a field id      | `audience.<n>` becomes an addressable edit target                                    |
| 14  | Where field hashes live                     | `page_versions.field_hashes jsonb`, a `field_id → hash` map                          |
| 15  | Render while an edit is expired             | The **new base copy**, with a banner offering re-confirm                             |
| 16  | Credential for production writes            | Project-scoped **service-role key** in 1Password, not the account-wide PAT           |

## The layer model

Three layers, each with its own history, none folding into another:

- **Corpus** — the TS modules in git. Snapshotted per import. Answers _what changed
  between v2 and v3_.
- **Overlay** — accepted edits in the DB, applied at render. Answers _what
  reviewers have accepted on top of the current version_.
- **Notes / comments** — reasoning, anchored to `field_id`, tagged with the corpus
  version it was written against.

`corpus:import` snapshots **what is in git only** — deliberately not the overlay.
Folding the overlay into the snapshot would make each version depend on review
state, and the diff would stop meaning "the mockup changed".
`corpus:materialize` is the explicit inverse.

## Data model

New:

```sql
corpus_versions (
  id uuid pk, git_sha text, imported_at timestamptz, note text, page_count int
)

page_versions (
  id uuid pk,
  corpus_version_id uuid references corpus_versions,
  path text,
  content jsonb,          -- full snapshot, including karl/editorNote
  content_hash text,      -- reader-visible copy only (decision 12)
  field_hashes jsonb,     -- field_id -> hash, drives expiry (decision 14)
  unique (corpus_version_id, path)
)

page_notes (              -- append-only replacement for pages.manager_notes
  id uuid pk, page_id uuid references pages, corpus_version_id uuid,
  user_id uuid, content text, created_at timestamptz
)

edit_decisions (          -- append-only; accept AND revoke are both rows
  id uuid pk, edit_id uuid references edits,
  decision text check (decision in ('accept','revoke')),
  decided_by uuid, decided_at timestamptz,
  corpus_version_id uuid  -- the version accepted against
)
```

A full 30-page snapshot is written per import. No content-addressed dedup: 30 rows
× even 100 imports is ~3k rows, and dedup would buy nothing but complexity.

Changed:

- `edits.materialized_in_version_id` — set by `corpus:materialize`; the overlay
  skips any edit already folded into the base (decision 9).
- `edits.corpus_version_id`, `comments.corpus_version_id` — provenance, so a stale
  edit is visibly stale.
- `pages.manager_notes` read-migrated into `page_notes`, then dropped. Hosted has
  0 rows, so the migration is free.

Current acceptance state is **derived**: the latest `edit_decisions` row per
`edit_id`. There is no mutable `accepted_at` flag — decision 8 exists precisely
because the action deciding what the mockup says must not be the one action with
no history. It also makes acceptance an `INSERT`, which the existing realtime
subscription shape handles; an `UPDATE` would not (finding 11). The new table
needs its own subscription.

RLS: every new table follows the per-operation shape established by
`20260822030000_scope_rls_policies.sql`, not the old blanket `FOR ALL USING (true)`.

## Overlay resolution

For a given page at the current corpus version, a field renders as:

1. the base copy from the corpus, unless
2. an `edits` row for that `field_id` has a latest decision of `accept`, and
3. it is not `materialized_in_version_id`-retired, and
4. the field's hash in the current `page_versions.field_hashes` still equals the
   hash it was accepted against.

If (4) fails the acceptance is **expired**: render the new base copy and surface a
re-confirm affordance showing the old base, the accepted text, and the new base
(decisions 7 and 15). Expiry is per field, which is why decision 14 exists — a
single per-page hash would expire every accepted edit on a page whenever any part
of it changed.

## Flows

**`bun run corpus:import`** — normalize `allPages`, hash each page and each field,
write one `corpus_versions` row plus 30 `page_versions`, recording the git SHA.
Idempotent: a no-op when the hash set matches the newest version. Authenticates
with a project-scoped service-role key read from 1Password at use time
(decision 16).

**`corpus.lock`** — a committed, sorted `path → field-hashes` map plus a top-level
corpus hash, regenerated by `corpus:import`. CI compares the built corpus to the
lockfile with **no DB access**, which is what makes the check possible at all
given finding 10. Merge conflicts are resolved by **regenerating, never by hand**;
a `.gitattributes` merge driver enforces this.

**Render** — the static corpus as bundled today, plus the overlay resolution
above. The live page takes no runtime dependency on `page_versions`.

**`bun run corpus:materialize`** — rewrite the TS modules from accepted edits and
stamp `materialized_in_version_id`, so git catches up on demand without the
overlay double-applying.

## Diff UI

A version picker per page: choose two corpus versions, render a field-level diff
keyed on `field_id`, so diffs align exactly with where notes and edits are
anchored. `audience.<n>` becomes addressable (decision 13) so audience copy is
diffable and editable like any paragraph. `karl` and `editorNote` are present in
the snapshot and viewable, but changing them does not mint a version.

## Slices

1. **F5 + versioning foundation** — hosted-safe seed (no `auth.*` writes),
   `corpus_versions` / `page_versions` with `field_hashes`, `corpus:import`,
   `corpus.lock` and its CI check.
2. **Durable notes** — `manager_notes` → append-only `page_notes`.
3. **Accept + overlay** — `edit_decisions`, overlay resolution, expiry and
   re-confirm UI, realtime subscription for decisions.
   **Gate: decision 11 (who may accept) must be settled before this ships to
   anyone but you.**
4. **Diff UI** — version picker, field-level diff, `audience.<n>` addressing.
5. **Materialize** — `corpus:materialize` and `materialized_in_version_id`.

Slice 1 alone delivers what F5 asked for.

## Testing

- Content hashing is stable under object-key reordering — otherwise every import
  looks like a change.
- Changing only `karl` or `editorNote` does **not** mint a version (decision 12);
  changing a paragraph does.
- `field_id` derivation is unchanged by this work — regression test, since notes,
  edits and diffs all key on it.
- Overlay substitutes the correct field and only that field.
- An accepted edit whose base field changed renders the **new base**, not the
  accepted text (decision 15).
- `materialize` then re-import does not double-apply the folded edit.
- Revoking after accepting leaves both rows and resolves to the base copy.
- Double `corpus:import` yields one version, not two.
- `corpus.lock` disagreeing with the built corpus fails CI without any DB access.
- The generated hosted seed contains no `auth.` writes and exactly one
  `INSERT INTO reviews` — the failure mode is leaking the dev-password user into
  production.

## Out of scope

- **`public.documents`** (finding 12) — orphan pgvector table; separate decision.
- **The `comments` table** (finding 7) — dead schema. Revive in slice 3/4 or drop
  it; either way a decision, not part of this design.
- **Signed-out empty state.** RLS requires `authenticated`, so signed-out visitors
  correctly see nothing, but the `No review found: null` console error remains.
- **Inviting reviewers.** `disable_signup=true`, so reviewers must be invited from
  the Supabase dashboard. Interacts with decision 11.
