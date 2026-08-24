# Section Rethink — structural AI proposals over a whole section

A reviewer selects a section and asks the assistant to reconsider it: not to
plain-language it or shorten it, but to reconsider what it says, what shape it
should have, and what it omits. The assistant may propose different content,
reordered content, and content that is not there at all. The reviewer accepts or
rejects each proposed change one block at a time.

Vocabulary used throughout this document is defined in `CONTEXT.md`. The terms
that matter most here: **Rethink** (the request), **Proposal** (one rethought
section), **Op** (one accepted-or-rejected difference), **Structural op** (an
add, drop or move — the ones with no base field).

## Why this exists

Today's assistance is `FieldsPanel`'s two presets, Plain language and Shorten.
Both operate inside one block and neither can change the section's shape. A
reviewer who believes a section is organised wrong, buries its point, or is
missing a step has no tool for it — they have a rewriter for copy that is
already in the right place.

Every mockup section also carries a `karl` note describing which CMS field or
StreamField block it becomes, and the corpus is a set of drafts someone will
later rebuild in Karl. So "how should this section be designed" is a question
the material is already annotated for, and nothing currently asks it.

## Sequencing gate — this ships after slice 3

**This design depends on the accepted-edit overlay from
`2026-08-23-mockup-version-history-design.md` slice 3, and must not be built
before it.**

Today `edits` rows are never re-applied to the rendered mockup. They feed the
queue's edit count and `HelpPanel`'s transcript, and a reload renders pristine
corpus. Field-level rewrites survive that because the transcript records their
text. **Structural ops do not**: "insert a bullet here", "drop this paragraph",
"move this to the top" are statements about an ordering that only exists at
render time. Without the overlay they apply in memory, vanish on reload, and the
gap is invisible until a reviewer loses work.

Slice 3 is already designed and specified. Rethink is a better second customer
for it than a retrofit would be. (Decision 6.)

## Findings this design is built on

1. **The backend supports three tasks, not one.** `build_scripts/ai/schemas.js`
   in `HHVC_manager_review_current_tool_package` declares a discriminated union
   over `content`, `rewrite-field` and `compliance-audit`. This repo's
   `CLAUDE.md` and `FieldsPanel.svelte` both state `rewrite-field` is the only
   task the proxy forwards; that is wrong. The proxy forwards the payload
   wholesale and caps only `fieldText` and `instruction`.
2. **`content` returns a validated page object.** Its output is constrained by
   `PAGE_OUTPUT_SCHEMA` and re-validated server-side against the real Zod page
   schema, with one retry naming the specific errors. Every generated section
   must carry a `karl` note — the schema marks it `REQUIRED`.
3. **`content` accepts grounding.** An optional `page` object up to 96KB
   serialized and 12 levels deep, plus an 8,000-character `prompt`.
4. **Measured corpus sizes.** Median page JSON 5,928 bytes (max 13,423); median
   section 971 bytes (max 7,449); a compact 29-page index of
   `slug|type|title|summary` is 6,040 bytes. Everything fits the caps with room
   to spare.
5. **The knowledge base is real but its production state is unknown.** The local
   store holds 1,230 chunks, all embedded with `gemini-embedding-001`
   (hhvc-policy 714, mockup-draft 233, karl 102, hhvc-standards 75, sfgov-live
   52, karl-gitbook 28, sfgov-style 24, sfds 2), over 33MB of source under
   `docs/source/`.
   Railway runs Postgres behind `build_scripts/storage.js`, a different store
   needing its own ingest; `knowledge-retrieval.js`'s header documents this
   exact trap. RAG grounding is deferred on that basis (decision 3).
6. **`GET /api/ai/capabilities` reports `knowledgeBaseReady`, `chunkCount` and
   the task list**, gated on the `aiGenerate` role. One authenticated call
   settles both open production questions.
7. **`PAGE_OUTPUT_SCHEMA` is Anthropic-grammar-incompatible**, marked as such in
   the schema module. Claude falls back to a prompt-stated schema plus Zod
   validation; Gemini compiles it natively.
8. **The backend attaches a `disclosure` string to every response**, because
   SF.gov's AI guidelines require generative-AI use to be disclosed and the HHVC
   standards manual §1.11 forbids automated approval. The client currently
   discards it.
9. **The model cannot flag its own content as unverified.** `PAGE_OUTPUT_SCHEMA`
   narrows text-bearing arrays to plain strings deliberately: "a judgement about
   sourcing that belongs to a human, not a generator."
10. **Section keys are derived once from the pristine corpus** in
    `pageData.svelte.ts` and never recomputed, because a reviewer editing a
    heading would otherwise orphan that section's edits.
11. **Paragraph and bullet positions within a section are still indexes.** The
    store's own docstring names this as a known limit. Insertion is this
    feature's core ask, so it stops being a footnote.

## Decisions

| #   | Decision                            | Resolution                                                                                               |
| --- | ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | Scope of authority                  | **Applied and persisted**, not advisory. Proposals change the mockup and the record                      |
| 2   | Decision unit                       | **The block.** One proposal, per-block accept/reject, composed on apply                                  |
| 3   | Grounding                           | Section + page + **29-page corpus index**. RAG deferred pending finding 5                                |
| 4   | Transport                           | `task: 'content'` with the live page as grounding; diff the target section, discard the rest             |
| 5   | Record unit                         | **Decompose on apply.** Rewrites become ordinary field edits; only the structural delta is new           |
| 6   | Sequencing                          | **After slice 3.** Structural ops are meaningless without the overlay                                    |
| 7   | Structural representation           | **One shape row per section**, `sections.<key>.shape`. Content stays in field rows                       |
| 8   | What the assistant reads            | **The overlay** — base plus accepted edits, not pristine corpus                                          |
| 9   | Karl mapping changes                | **Allowed, flagged prominently.** Never silent                                                           |
| 10  | Added content                       | Enters **`unverified: true`**, stamped client-side. No affordance clears it in this work                 |
| 11  | Shape expiry                        | **Existence only.** A referenced block disappearing expires the shape; upstream rewording does not       |
| 12  | Added-block lifetime                | **Bound to its shape row.** Exempt from hash expiry                                                      |
| 13  | Rationale                           | Stored as a **note anchored to the section**, attributed to the assistant                                |
| 14  | AI disclosure                       | **On the note**, naming the model. No schema change to `edits`                                           |
| 15  | Provider                            | **Gemini** for v1, for native schema compilation (finding 7)                                             |
| 16  | Block types in scope                | **heading, paragraphs, bullets, callout.** `steps`, `cards`, `component`, `kind` deferred                |
| 17  | Non-target sections in the response | **Discarded, but named** — one line noting the assistant also wanted to change sections N and M          |
| 18  | Who may Rethink                     | Any signed-in reviewer, matching decision 11 of the version-history design, **plus** a one-in-flight cap |

## Flow

1. The reviewer clicks **Rethink section** in a section's chrome. The control is
   a real `<button>`, rendered only when signed in — the two rules
   `EditTarget`'s docstring exists for.
2. `pageStore` records `selectedSectionKey`. This is a selection _kind_ distinct
   from `selectedFieldIds`; choosing one clears the other, because they cannot
   share the badge numbering. `enterPage` resets it like every other
   selection-scoped value.
3. The workspace switches to a new **Rethink** tab.
4. The reviewer optionally states what the section should accomplish, then
   submits.
5. One `content` request goes out carrying the rubric, the target section key,
   the overlay-resolved page, and the corpus index. Progress is shown with a
   stated expectation and a working **Cancel**.
6. The response is diffed against the current section into ops. The panel lists
   them with toggles.
7. **Apply N of M** composes the accepted ops, writes the result into the live
   corpus, and persists: one field edit per rewritten or added block, one shape
   row if the structure changed, one note carrying the rationale.

## Request

`task: 'content'`, `provider: 'gemini'`, with:

- **`page`** — the overlay-resolved page (decision 8). Rethinking copy the
  reviewer already fixed, and proposing to fix it again, is the obvious way to
  make the feature feel stupid. The proposal's `original` for each block must be
  captured from the same overlay-resolved text, or the diff lies about what is
  being replaced.
- **`prompt`** — the rubric, the target section key, the section's existing
  `karl` note, and the corpus index.

The rubric states, at minimum:

- Reconsider structure, not only wording. Say what is missing.
- Hold the page's declared reading level. A rethink that raises it is a
  regression.
- Never invent facts, numbers, dates, phone numbers or addresses.
- Preserve every link.
- Respect the section's Karl mapping, and say so explicitly if the proposal
  changes it.
- Propose `target` page keys only from the corpus index given, never invented —
  the backend's own card schema already demands this.
- At most two paragraphs before switching to bullets — the section schema's own
  rule.

Cap arithmetic: the rubric plus a 6,040-byte corpus index plus a `karl` note
sits well inside the 8,000-character `prompt` limit, and the largest page
serializes to 13,423 bytes against a 96KB grounding cap. Client-side guards must
still name the number if either is exceeded, matching the existing pattern in
`FieldsPanel`.

## Diff and ops

The proposal is:

```
Proposal {
  pageId        // the routable page id, so a proposal cannot be applied to another page
  sectionKey
  rationale     // why the section should change
  proposed      // the rethought section as returned
  ops[]         // computed client-side
  otherSections // headings the assistant also wanted to change (decision 17)
  status
}
```

Ops are computed **client-side** by diffing the current section against the
proposed one, blocks matched by normalized-text similarity:

| Op        | Meaning                      | Default      |
| --------- | ---------------------------- | ------------ |
| `keep`    | unchanged                    | n/a          |
| `rewrite` | same block, new text         | accepted     |
| `add`     | a block that did not exist   | accepted     |
| `drop`    | a block the proposal removes | **rejected** |
| `move`    | same block, new position     | accepted     |

`drop` defaults off because deletion should be opted into, not opted out of.

**A drop that would discard an accepted edit is flagged on that block.** Because
the assistant reads the overlay, a proposed _rewrite_ of a block carrying an
accepted edit simply supersedes it — append-only, latest wins, no special case.
A drop is different: it discards the reviewer's own approved text. Flag it,
leave the toggle off, allow it. Forbidding it outright would make the tool argue
with the reviewer about their own page, and a reviewer who fixed a sentence may
well now agree it should go.

**Added blocks are stamped `unverified: true`** with a reason naming their
origin, client-side, because the model is deliberately unable to do it (finding
9). The corpus convention already exists, `writeEntry` preserves the flag
through later rewrites, and `FieldsPanel`'s amber callout surfaces it. Nothing
in this work clears the flag (decision 10) — a wording change is not a sourcing
judgement, and permanently flagged is the safe failure direction on a government
page.

**A Karl mapping change is surfaced prominently** (decision 9). It is sometimes
exactly the right answer — "this should be a callout, not a paragraph" is a
design critique worth having — but it changes what someone has to build in
Wagtail, so it must be impossible to accept without noticing.

## Persistence

Applying composes accepted ops and writes three kinds of row.

**Rewritten blocks → ordinary field edits.** `sections.<key>.paragraphs.2` and
friends, exactly as today. These render through the overlay for free and carry
correct per-field expiry with no new machinery. This is the whole point of
decision 5: most of the feature costs the overlay nothing.

**Structure → one shape row**, at `sections.<key>.shape`, whose content is the
section's block order as a list of references:

- an existing block by its field id,
- an added block by a synthetic id, `sections.<key>.added.<n>`.

A **drop** is absence from the list. A **move** is position in it. An **add** is
a synthetic entry whose _text_ is stored as an ordinary field row at its
synthetic id. So all copy remains addressable copy, which is what lets edits,
notes and diffs continue to key on one thing; structure lives in exactly one
row; and no migration is needed, because `edits.field_id` is plain `text`.

**Rationale → one note** anchored to the section and tagged with its corpus
version, attributed to the assistant and naming the model that produced it
(decisions 13 and 14). This is where AI disclosure lands (finding 8): it
satisfies the requirement where it is actually read — the transcript — without a
schema change, and it keeps §1.11 honest, since a human accepted every block and
the record says what proposed them. The reviewer approved the change; they did
not write the argument for it, and the note must not read as though they did.

### Overlay resolution, extended

Rendering a section becomes:

1. Resolve the section's **block order**: the base order from the corpus, unless
   an accepted, unexpired shape row replaces it.
2. Resolve **each block's text** by the existing per-field rule — base copy
   unless an accepted, unexpired edit for that field id supersedes it.

**Shape expiry is existence-only** (decision 11): the shape expires when a field
id it references is absent from the current version's `field_hashes` keyspace.
Upstream rewording of a referenced block does not expire it. The shape is a
decision about which blocks and in what order; a paragraph being reworded does
not invalidate a decision to move it, and expiring on text would retire a whole
section's structure over an unrelated typo fix — the same over-expiry decision
14 of the version-history design exists to prevent. A referenced block
_disappearing_ is categorically different: the shape then names something that
is not there.

**Added blocks are exempt from hash expiry and expire with their shape row**
(decision 12). They have no base copy, so the base-hash check can never be satisfied
for them; and an added block only means anything as part of an ordering that
includes it.

### Field keys

The composed section **carries its original `fieldKey` forward** and never
re-derives it. Re-deriving would orphan every edit already saved against that
section — precisely the bug the key was introduced to fix (finding 10).

## Panel

A new **Rethink** tab, so two selection kinds are not fighting over one panel and
the already-dense Fields panel does not grow a second mode.

States: idle (nothing selected) · composing (instruction box) · running · ops
list · applied. Running shows a stated expectation and a Cancel that actually
aborts the request — a Rethink plausibly runs 20–60s on a Pro-tier model against
a 240s backend budget, an order of magnitude slower than the per-field rewrites
whose UI it would otherwise borrow. Reviewers frequently realise mid-wait that
they picked the wrong section.

One Rethink in flight per session (decision 18). Signups are disabled and
reviewers are invited by hand, so the abuse surface is people you chose; the
honest failure mode is impatient double-clicking spending twice. Real per-user
rate limiting in the proxy is a separate decision.

## Guards carried over

These are lifted from existing code because they were each written for a bug
that already happened here:

- **Capture the page and section before the request; drop late results.** The
  pattern in `recommend()`, for the same reason — a slow answer landing on
  whatever is on screen when it arrives is advice about copy the reviewer left.
- **`pageId` on the proposal.** Field ids are page-relative, so a proposal
  accepted on page A must be unable to write to page B.
- **Stale selections are reported, not silently dropped.** A section key that no
  longer resolves is a message, not an empty write.

## Testing

- Ops are detected correctly: rewrite, add, drop, move, and a move plus rewrite
  on the same block.
- Composition with partial acceptance produces the expected section — including
  the case where every op is rejected, which must be a no-op rather than a
  write.
- `fieldKey` survives composition.
- Added blocks are stamped unverified; a later rewrite of one keeps the flag.
- A shape row referencing a removed field id expires; one whose referenced
  blocks were merely reworded does not.
- An added block does not outlive its shape row.
- Overlay resolution orders blocks by an accepted shape row and falls back to
  base order when it is expired.
- A drop targeting a block with an accepted edit is flagged and defaults off.
- A Karl mapping change is surfaced.
- The rationale note is attributed to the assistant and names the model.
- Cancel aborts in flight and leaves no proposal.
- E2E: select a section, Rethink, toggle a drop off, Apply, assert the mockup
  changed and the expected rows exist.

## Slices

1. **Request and diff** — the Rethink tab, section selection, the `content`
   request with rubric and corpus index, ops computed and displayed. Read-only:
   nothing applies yet.
2. **Apply, field rows only** — compose and apply, persisting rewrites as
   ordinary field edits. Structural ops are computed and shown but disabled.
3. **Shape rows** — the shape representation, overlay ordering, expiry, added
   blocks.
4. **Rationale note and disclosure** — the note, its attribution, transcript
   rendering.

Slice 1 is useful alone: it is a section-level critique with a real diff, which
is most of the value of the advisory version of this feature.

## Out of scope

- **Cross-section moves and whole new sections.** The assistant will propose
  them; decision 17 names them and stops there.
- **Page-level rethink.**
- **RAG-grounded findings.** Deferred on finding 5, and worth revisiting the
  moment `capabilities` confirms a ready production knowledge base — it is the
  only grounding that can say "this omits a legal requirement" and cite the
  source.
- **Editing proposed text before applying.** Accept blocks, then use the
  existing per-field tools.
- **Clearing the unverified flag.** A subject-matter judgement, not a
  copy-review action.
- **`steps`, `cards`, `component` and `kind`** as proposable blocks.
- **Per-user rate limiting in the proxy.**

## Open risks

- **The `content` task on the deployed backend is unverified.** The local
  package may be ahead of what Railway runs. One authenticated
  `GET /api/ai/capabilities` settles it (finding 6). If the deployed build lacks
  it, deploy the backend — do not degrade to parsing structured data out of a
  prose response, which `REWRITE_OUTPUT_SCHEMA` actively fights.
- **This design is blocked on slice 3** and should not start before it.
- **`bun run lint` is red tree-wide** on prettier and eslint both. Do not
  reformat as a side effect of this work.
- **Index-based block addressing** (finding 11) is now load-bearing rather than
  incidental. The shape row is what contains the blast radius; it is worth
  re-reading that limit before implementing slice 3 of this design.
