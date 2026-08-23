# Build 1b — Field inspector

The chosen direction from `design_handoff_hhvc_review_workspace`. Brief is
**polish, not restructure**: the three panes and the review flow stay; what
changes is the visual identity, the editing affordance, and multi-field AI
editing.

Scope is 1b only. **2a's rail contents** (vertical progress bar, `writing-mode`
label, status dot) and **3a's walkthrough drawer** are separate passes. The
collapse _buttons_ are in 1b's own column-1 and column-3 header specs, so they
are built and functional here — shipping a dead control is worse than either
option.

Reviewer notes (typed/audio/drawn) were designed in 1a and are **out**: the
handoff marks them "port if in scope", and they need a Storage bucket plus a
`notes` table (open question 1).

---

## Decisions taken before writing code

**Field identity is resolved, not registered.** The panel needs each selected
field's current value and a way to write it back. The obvious move — have
`EditTarget` register `{name, value, update}` into a map on mount — has four
failure modes here: `EditTarget` lives inside `{#if editable}` so it remounts
when the session check resolves; navigation leaves the previous page's entries
behind; `update` closes over `section.paragraphs[i]` so a stale closure writes
to a detached object; and a captured `value` is wrong the moment an edit lands.

`fieldId` is already a parseable path, so a resolver walks `pageStore` instead
and nothing is cached. Eight shapes exist, all emitted by `Page.svelte` and
`Section.svelte`:

```
title
summary
audience.{i}
sections.{fieldKey}.heading
sections.{fieldKey}.paragraphs.{i}
sections.{fieldKey}.bullets.{i}
sections.{fieldKey}.callout.title
sections.{fieldKey}.callout.text
```

Sections resolve by `fieldKey`, never by array index — the same reason
`pageData.svelte.ts` derives it once from the pristine corpus.

**Batch rewrite is N requests, not one.** The handoff says "one request", but
the proxy's contract is `task: 'rewrite-field'` with a single `fieldText`, and
the Railway backend is not ours to change. One request per selected field
keeps each payload inside `MAX_FIELD_TEXT_CHARS` (20k) naturally and gives the
per-field diffs the spec wants for free. `Promise.allSettled`, so one failure
does not discard its siblings — which is what independent accept/reject implies
anyway.

**Colour comes from the existing `@theme` block in `app.css`**, which already
registers `sfds-action` `#495ed4`, `sfds-blue-dark` `#0c1464`, `sfds-blue-l1`
`#edf4f7`, `sfds-slate-l2`, `sfds-slate-l3`, `sfds-grey-l2`, `sfds-black`.
Missing pieces (the status triplets and `#a84b00`) are added there, in its own
convention. Note the consequence: 1b consumes `@theme` utilities, not the
`--brand-*` custom properties revived in #34. Both are honest — the handoff
named `theme.css` and it is now genuinely loaded — but only one is a utility.

---

## Tasks

- [x] **1. `fieldResolver.ts` + unit test.** `resolveField(page, fieldId)` →
      `{ name, value, set(next) } | null`, covering all eight shapes and
      returning `null` for an unknown or stale id. Tested against the real
      corpus so a shape added later fails here first.

- [x] **2. Store: `activeField` → ordered selection.** `selectedFieldIds:
string[]` (index + 1 is the badge number), `suggestions:
Record<fieldId, {original, suggested, status}>`, `rewriteInstruction`,
      `agentRec`. Single selection becomes `length === 1` rather than a second
      code path.
      `railCollapsed` goes to `localStorage`, per user, no server round-trip.

- [x] **3. `EditTarget`: multi-select.** Click replaces the selection,
      shift-click adds/removes. `aria-pressed` carries selected state so it is
      not colour-only. Numbered badge, absolutely positioned; list items need
      `margin-top: 16px` / `padding: 8px 6px 2px` and must keep
      `list-style-position: outside`. **No negative horizontal margins on the
      wrapper** — it causes horizontal overflow.
      Run `bun run test:e2e` immediately after this task, before any panel
      work: `tests/accessibility.e2e.ts` is a required check pinned to this DOM,
      and a selector break should surface while it is one file rather than five.

- [x] **4. Layout.** Grid `250px 1fr 300px` → `280px 1fr 380px`. Canvas toolbar
      gains the page-type chip, the slug in mono, and the unsaved-edit pill.
      `ActionBar` is removed — its rewrite calls move into the Fields tab.
      Collapse buttons in both side headers, with accessible names (icon-only).

- [x] **5. `ReviewQueue`.** Progress block (`N of 29 decided`, percentage, the
      three-segment bar), per-group count pills, selected item with the
      `border-left` treatment, optional sub-line carrying page type and edit
      count.

- [x] **6. `FieldsPanel` + third tab.** Selection header, agent recommendation
      card (idle/loading/done/error), batch rewrite (two presets + free text),
      per-field suggestion cards with deleted and inserted text as **separate
      paragraphs** — never inline, they are different sentences — accept/reject
      per card, accept-all/reject-all, unverified callout, footer whose
      **`Save N edits` counts accepted suggestions, not selected fields**.
      Selecting a field on the mockup switches the panel to this tab.

- [x] **7. Verify.** `bun run verify`, `bun run test:e2e`, Playwright
      screenshot with a clean console.
      _Signed-in verification is live-blocked:_ the dev auto sign-in uses a
      password grant against the hosted project, which now answers
      `400 captcha protection: request disallowed`, and the local Supabase
      stack is not running. The shell, both rail collapses and their
      `localStorage` round-trip were checked in the browser; the selection and
      panel flow is covered by `tests/fieldsPanel.test.ts` and the multi-select
      block in `tests/inlineEditFieldId.test.ts` instead.

---

## Known, and deliberately not fixed here

**`edits` is append-only in the schema but deduped in the client.** The handoff
says several rows per field ordered by `created_at` gives the diff view its
history for free. `saveInlineEdit` filters `(page_id, field_id)` out of the
local store before appending, so the client keeps only the latest. Saving
accepted suggestions works; a history view built on `editsStore` would find
none. Not in 1b's scope — flagged so it is not discovered later.

**`requestGeneration` discards the status code.** It throws a bare
`new Error('API Error')`, so a 400 "Field text too long" reaches the reviewer as
"API Error". Rather than change a shared helper, the Fields panel checks length
against the documented 20k cap before sending.
