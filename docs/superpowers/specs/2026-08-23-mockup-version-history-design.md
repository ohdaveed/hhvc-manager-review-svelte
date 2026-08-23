# Mockup version history, accepted-edit overlay, and durable notes

**Status:** design approved, not yet planned
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
   Same for `page_checks`. This is the one place reviewer reasoning can vanish
   silently.
7. **The `comments` table is dead code.** It exists with 4 RLS policies, but
   nothing in `src/` reads or writes it — `grep "from('comments')"` returns zero
   hits.
8. **`field_id` is structural, not positional.** It is
   `sections.<heading-slug>.paragraphs.<n>`, derived from the heading rather than
   the array index and computed once from pristine module data — specifically so
   reordering sections does not orphan later edits, and so a reviewer editing a
   heading does not orphan its own section. Documented limit: paragraph and bullet
   indexes _within_ a section still shift when one is inserted mid-section.
9. **`public.documents` is an orphan** — a pgvector table
   (`id/content/metadata/embedding`) absent from `supabase/migrations/`, 0 rows,
   RLS enabled with 0 policies (therefore deny-all, not exposed). Out of scope
   here; flagged for a separate decision.

## Decisions

| Question                                    | Decision                          | Rationale                                                                                                                                  |
| ------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Is the hosted DB for real work?             | **Real review work**              | Drives minimal scaffolding, no fabricated content                                                                                          |
| How are mockup versions created?            | **Explicit `corpus:import`**      | Keeps writes out of the app; a version exists exactly when you re-port                                                                     |
| What can a reviewer do with history?        | **Compare versions side by side** | Provenance plus a field-level diff                                                                                                         |
| Do AI rewrites create a corpus version?     | **No**                            | They write one `edits` row, as today. Otherwise version diffs fill with per-reviewer noise and stop answering "what changed in the mockup" |
| How does an accepted edit reach the mockup? | **DB overlay at render**          | The only option delivering "automatic" without surrendering git; a static build cannot rewrite its own TypeScript source                   |
| Reviewer notes                              | **Append-only `page_notes`**      | Closes finding 6                                                                                                                           |

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
`corpus:materialize` is the explicit inverse: fold accepted edits back into the TS
modules when git should catch up, after which the next import includes them
naturally.

## Data model

New:

```sql
corpus_versions (
  id uuid pk, git_sha text, imported_at timestamptz, note text, page_count int
)

page_versions (
  id uuid pk,
  corpus_version_id uuid references corpus_versions,
  path text, content jsonb, content_hash text,
  unique (corpus_version_id, path)
)

page_notes (            -- append-only replacement for pages.manager_notes
  id uuid pk, page_id uuid references pages, corpus_version_id uuid,
  user_id uuid, content text, created_at timestamptz
)
```

A full 30-page snapshot is written per import. No content-addressed dedup join
table: 30 rows × even 100 imports is ~3k rows, and dedup would buy nothing but
complexity (YAGNI).

Changed:

- `edits.accepted_at`, `edits.accepted_by` — **accepting is setting these.** A
  partial unique index enforces at most one accepted edit per `(page_id, field_id)`.
  The accepted edits _are_ the overlay; it needs no table of its own.
- `edits.corpus_version_id`, `comments.corpus_version_id` — provenance, so a stale
  edit is visibly stale ("written against v2, page is now v4").

`pages.manager_notes` is read-migrated into `page_notes` and then dropped. Hosted
has 0 rows, so the migration is free.

RLS: every new table follows the per-operation shape established by
`20260822030000_scope_rls_policies.sql` rather than the old blanket
`FOR ALL USING (true)`.

## Flows

**`bun run corpus:import`** — normalize `allPages`, hash each page, write one
`corpus_versions` row plus 30 `page_versions`, recording the git SHA. Idempotent:
a no-op when the hash set already matches the newest version.

**CI guard** — fail the build when the built corpus's hash set is not the newest
`corpus_versions` row. This is what stops "forgot to import" from becoming silent
drift; without it the import step is only as reliable as memory.

**Render** — the static corpus as bundled today, plus the accepted overlay applied
at render. The live page takes **no** runtime dependency on `page_versions`;
versions serve history and diff only.

**`bun run corpus:materialize`** — rewrite the TS modules from accepted edits, so
git catches up on demand.

## Diff UI

A version picker per page: choose two corpus versions, render a field-level diff
keyed on the existing `field_id` derivation, so diffs align exactly with where
notes and edits are anchored. Reusing that key is what makes "this note was
written against the paragraph that changed" expressible.

## Slices

1. **F5 + versioning foundation** — seed the hosted project (a hosted-safe seed
   with no `auth.*` writes, generated alongside the local one), add
   `corpus_versions` / `page_versions`, add `corpus:import`.
2. **Durable notes** — `manager_notes` → append-only `page_notes`.
3. **Accept + overlay** — `edits.accepted_at`, overlay at render, accept UI.
4. **Diff UI** — version picker and field-level diff.
5. **Materialize** — `corpus:materialize`.

Slice 1 alone delivers what F5 asked for.

## Testing

- Content hashing is stable under object-key reordering (otherwise every import
  looks like a change).
- `field_id` derivation is unchanged by this work — regression test, since notes,
  edits and diffs all key on it.
- Overlay substitutes the correct field and only that field.
- Double `corpus:import` yields one version, not two.
- The generated hosted seed contains no `auth.` writes and exactly one
  `INSERT INTO reviews` — this guard matters because the failure mode is leaking
  the dev-password user into production.

## Out of scope

- **`public.documents`** (finding 9) — orphan pgvector table; separate decision.
- **The `comments` table** (finding 7) — dead schema. Slice 3 or 4 may revive it or
  it may be dropped; either way it is a decision, not part of this design.
- **Signed-out empty state.** RLS requires `authenticated`, so signed-out visitors
  correctly see nothing, but the `No review found: null` console error remains
  until handled separately.
- **Inviting reviewers.** With `disable_signup=true` on the hosted project, other
  reviewers must be invited from the Supabase dashboard before they can use a
  seeded review.
