# PLAN — Persist inline copy edits

**Problem.** Reviewer copy edits never reach Supabase. `onSave` in
`src/routes/review/+layout.svelte` calls `pageStore.activeField.update(val)`,
which mutates the in-memory module object from `$lib/data` and stops there.
`saveInlineEdit` (`src/lib/stores/reviewState.ts:202`) holds the only write to
the `edits` table and had zero callers repo-wide. `loadReview` reads that table
into `editsStore` and `HelpPanel` folds it into the Karl transcript — so the
read path is complete and correct, but always reads an empty set. Net effect:
the Karl/Wagtail handoff this tool exists to produce contains no copy edits.
Decisions and manager notes were unaffected; they persist via
`updatePageStatus` / `updatePageNotes`.

**Why it went unnoticed.** `allPages` is a module-level singleton, so an edit
survives navigation within a session and is lost only on reload.

## Decisions

- **`field_id` is the existing `data-rewrite-field` path** (`title`,
  `summary`, `sections.0.paragraphs.1`). It is already stable and per-instance,
  and its `title`/`summary` values already match `HelpPanel`'s fold keys, so no
  casing reconciliation is needed. The human-facing `name` (`Section [1]
Paragraph`) stays display-only — it omits the paragraph index and would
  collide across paragraphs in one section.
- **Two edit targets had no `data-rewrite-field`** (section heading, callout
  title). They get `sections.{index}.heading` and
  `sections.{index}.callout.title`.
- **Signed-out reviewers keep in-memory editing.** The in-memory update always
  runs; persistence is attempted after. `saveInlineEdit` already logs, rolls
  back its optimistic entry, and returns when there is no authenticated user,
  so no guard is needed at the call site.
- **Page identity** resolves via `$pagesStore.find((p) => p.path ===
pageData.id)` — the same lookup `HelpPanel` uses. If there is no live record
  (signed out, or page absent from the review), persistence is skipped and the
  edit stays in memory.

## Tasks

- [x] 1. Add `fieldId` to the `ActiveField` type in
      `src/lib/stores/pageData.svelte.ts`.
- [x] 2. Pass `fieldId` from every edit target in
      `src/lib/components/Page.svelte` and `src/lib/components/Section.svelte`,
      adding the two missing `data-rewrite-field` attributes.
- [x] 3. Wire `onSave` in `src/routes/review/+layout.svelte` to call
      `saveInlineEdit(livePage.id, fieldId, val)` after the in-memory update.
- [x] 4. Add unit tests covering the field-id contract and the save wiring.
- [x] 5. Run `bun run verify`, open a PR, land it green. Landed in #17 as
      `c7fadd6`; production verified serving it (HTTP 200).

## Notes / not in scope

- `initializeRealtime` is **not** dead code — it is called at
  `reviewState.ts:62`. knip flags it only because the `export` keyword is
  redundant. Left alone.
- `field_id` values are positional, so inserting a section renumbers later
  paths and orphans edits saved against the old positions. Pre-existing in the
  `data-rewrite-field` scheme; not addressed here.
- RLS on `edits` is `FOR ALL TO authenticated USING (true)` and records no
  author beyond `user_id`. Unchanged, still needs a product decision.
