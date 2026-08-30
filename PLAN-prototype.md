# PLAN — Make the prototype real

Scope: `design/HHVC Review Working Prototype.dc.html` — the three-pane review
workspace, its assistant, its page checks, the Karl walkthrough, the Karl form
blueprint, the site map and the onboarding.

Worktree: `../wt-prototype`, branch `feat/prototype-to-real`, cut from `7736a91`.
Separate from `PLAN.md`, which tracks the audit workstream and is nearly done.

**Resuming:** this file plus the commit history is the whole handoff. Tick a box,
commit, push — per task, not batched. Record blockers and skipped work here
rather than only in chat.

The prototype is a single component with one in-memory state object. Some of its
logic is real and transfers directly; the rest is staged for one page. §1 is what
ports as-is. §2–§10 are what is missing.

---

## Order of work

- [ ] **1. Corpus loader and field-id scheme** (§2). Everything else keys off it,
      and it is the change most likely to force id decisions elsewhere.
- [ ] **2. The 1:1 validator** (§10). Cheap once the loader exists, and it stops
      the corpus drifting back.
- [ ] **3. Persistence** (§3). The tool loses a reviewer's work on navigation,
      which is the one defect that makes it unusable rather than incomplete.
- [ ] **4. Assistant service** (§4). Per-field rewrite first; analysis and
      verdict after, since both need the backend task list extended.
- [ ] **5. Checks and caps config** (§5). Small, and it unblocks the
      non-Transaction types.
- [ ] **6. Site map graph** (§7). Independent; can run in parallel.
- [ ] **7. Retype diff, then page authoring** (§9). Both depend on the field map
      becoming data.

---

## 1. Already real — port, don't rebuild

These compute from the content in front of them and re-compute when it changes.

| Logic                                                               | What it does                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `blockIndex()` / `value()` / `name()`                               | Flattens a page of any content type into addressable field ids (`sections.1.paragraphs.0`, `things.0`, `<block>.h`) with human labels. Every other feature reads through this. Memoised per page; edits are read before the source.                                        |
| `readingGrade()` + `syllables()`                                    | Flesch-Kincaid over all prose on the page.                                                                                                                                                                                                                                 |
| `isTitleCase()`, `longestSentence()`, `shouting()`, `sentencesOf()` | The individual editorial rules, each returning the field that breaks it, not just a boolean.                                                                                                                                                                               |
| `checks()`                                                          | Assembles ~12 rows, each with a figure and the field it comes from. Recomputes on every edit.                                                                                                                                                                              |
| `steps()` / `panelSteps()` / `withSettings()`                       | Derives the Karl form from the page's own `panels` data plus a Transaction fallback branch. Values resolve through `value()`, so accepted rewrites appear downstream. **Two surfaces read this one function** — the step-by-step walkthrough and the whole-form blueprint. |
| `karlPanels` / `karlTabs`                                           | Groups those same steps into Karl's three tabs (Content, Promote, Settings) and renders each as a filled form panel.                                                                                                                                                       |
| `hasContent()`                                                      | The predicate that defines walkthrough progress — a step counts only if it has something to hand over.                                                                                                                                                                     |
| `select()`, keyboard `j`/`k`, `scrollToStep()`                      | Selection, queue navigation, and keeping the active step visible in both the step list and the canvas.                                                                                                                                                                     |
| `startTour()` / `tourState()` / `endTour()`                         | Snapshots every piece of review state, drives the workspace through five steps, restores the snapshot on exit. The snapshot/restore is real and transfers as-is.                                                                                                           |
| Rail collapse, onboarding gate                                      | The two things persisted (`localStorage['hhvc.rails']`, `['hhvc.onboarded']`).                                                                                                                                                                                             |

## 2. Content layer — the 29-page corpus

**Now:** `PAGES` is a hardcoded object holding a handful of pages. The queue
lists 12 but `loadedQueue()` filters to the ones that exist, and `gotoPage()`
silently returns for the rest.

**Needed:**

- A loader that reads all 29 mockup pages into the same shape (`type`, `slug`,
  `title`, `summary`, `things[]`, `sections[]`, `blocks[]`, `callout`, `photo`,
  `panels[]`, `descLimit`, `cost`, `updated`).
- One normaliser per content type, so `value()` never grows a branch. The
  `panels[]` array is the contract: a page that describes its own Karl form gets
  a correct walkthrough **and a correct blueprint** for free.
- Validation on load — a page missing `panels` falls back to the Transaction
  branch, which is wrong for six of the seven types.
- A stable field-id scheme shared with storage. Edits, suggestions and comments
  are all keyed by field id, so the id has to survive a corpus re-import.
  Index-based ids (`sections.1.paragraphs.0`) break when a paragraph is
  inserted; either freeze them at import or key on a content hash.

## 3. Review state and persistence

**Now:** everything lives in component state and resets on page change —
`gotoPage()` clears `selected`, `suggestions`, `edited`, `stepIndex`, `copied`.
`save()` copies accepted suggestions into `state.edited`. `notes` shows
"Saving…" then "Saved" on a 500ms timer with nothing behind it.

**Needed — a review record per page, server-side:**

- `edits` — field id → current value, with the original retained for diff and
  undo. This is the actual output of the tool; today it is discarded on
  navigation.
- `decision` — approve / revise / blocked, plus `notes`, with author and
  timestamp.
- `walkthroughProgress` — the `copied[]` set and `stepIndex`, so a reviewer can
  leave mid-rebuild and return.
- `choices` — the radio answers made inside walkthrough steps (Cost variant,
  Section vs Callout).
- `retyped` — currently hardcoded to `inspectionPrep → Information`.
- Optimistic write with a real failure path. A failure states what is still true
  ("1 edit could not be saved and is still here to retry"), which means the
  client keeps unsaved edits rather than rolling back.
- Queue status derives from the stored decisions. Today `QUEUE` is a literal
  with the groups pre-sorted, so nothing moves between groups on a decision.
- `hhvc.onboarded` is per-browser. If reviewers share a machine or work across
  two, the onboarding flag belongs on the user record.

## 4. The assistant

Three separate calls are stubbed as one canned response each.

**a. Batch rewrite** — `rewrite(instruction)` looks each selected field up in a
`REWRITES` literal (10 entries, `inspectionPrep` only) and falls back to
collapsing whitespace when there is no match.

Needs a real call taking: the selected fields with their ids and current text,
the reviewer's instruction, the page's content type, and the editorial rules the
checks enforce. Requirements the UI already assumes:

- Per-field results, not one blob — the diff cards, `decide()`, `decideAll()`
  and the accepted count are all per field.
- Latency handling. There is no pending state today; a batch over eight fields
  needs per-card streaming or a skeleton.
- Partial failure — some fields return, some do not, and the ones that did are
  still usable.
- The response is labelled advisory wherever it appears.

**b. "Read the selection"** — `askAssistant()` sets `rec: 'loading'`, waits
800ms, and writes a fixed paragraph. It already guards against a stale response
landing after the selection changed; keep that. Needs the same call with an
analysis task rather than a rewrite task.

**c. The structured verdict** — the proxy forwards one task, `rewrite-field`, so
the assistant returns prose where the design specifies
`APPROVE / REVISE / BLOCKED`. A backend task addition, not a UI change.

## 5. Page checks

`checks()` is real and needs no service. Two things it does not have:

- **A rule source.** The thresholds (65 chars, 110 chars, grade 6–8, verb-first
  headings, three-item lists) are inline constants. They belong in one config
  the Help Center rules can be updated against, since `field-map-corrections.md`
  shows those rules move.
- **A per-type profile.** `descLimit` is already a page property; the rest of
  the checks assume Transaction. Agency, Topic, Report and Campaign each need
  their own row set.

## 6. The Karl walkthrough and the form blueprint

The step generator is real, and both presentations read it. What is staged:

- **Clipboard** — `copyValue()` uses `navigator.clipboard` with a silent catch
  and no fallback. Needs a fallback path and a failure message; the whole point
  of the screen is that the copy landed.
- **Reuse suggestions** — `reuse: { name, evidence }` is hardcoded per step (an
  Address snippet, a Partner agency, a Topic page), and the blueprint renders
  them as chooser rows. Real versions need a lookup against Karl's existing
  snippets and pages, with the evidence line derived rather than written.
- **Field caps** — `limit` on a value drives the character counter in both
  surfaces. The caps come from the field map and need the same config as the
  checks.
- **Flags** — `blocking` and `gap` render as the red and amber markers. The
  static ones are rules (a required `primary_agency` with no mockup source);
  the conditional ones need computing per page.
- **The blueprint is read-only by design.** It states that nothing on it writes
  to the CMS. If that changes, see §9.

## 7. Site map

`SITEMAP` is a literal: four groups, including two computed-looking gap findings
("not linked from any hub", "Related points outside the four permitted types").

Needed: a link graph over the corpus — every Topic, Agency and Related reference
resolved to a page — plus two derivations from it. Orphan detection is a
reachability pass from the hubs; the Related-type violation is a filter against
the four permitted types (`O3`). Both figures are quoted in the UI, so both have
to be counted rather than asserted.

## 8. Onboarding

**Now:** a welcome panel on first visit, a five-step tour, a Help tab, and one
hover tooltip on the queue's `j`/`k` hint.

**Real and transferable:** the snapshot-and-restore around the tour, the step
sequencing, and the ring that moves between panes.

**Staged:**

- The tour forces `pageId: 'inspectionPrep'` and builds its suggestions from the
  `REWRITES` literal, so it only works because that page is hardcoded. Against a
  real corpus it needs a designated demo page, or a fixture the tour loads
  instead of a live one.
- Step 3 writes a sample decision and note. Harmless while nothing persists;
  once §3 lands, the tour must write to a scratch record, not the reviewer's.
- The `--tip` / `--tipy` custom-property hover pattern is one tooltip. If more
  controls need them, it wants a small shared helper rather than repetition.

## 9. Retyping, and creating a page

- `effectiveType()` returns `Information` when `retyped` is true and the page is
  `inspectionPrep`; `retypeRows` is built from that one page's field count.
  Needs a general type-change diff: given source and target type, which fields
  have a home in the target, which are dropped, what the new panel list is. That
  is a function of the Karl field map, which exists as a document and would have
  to become data.
- **Authoring a new page inside the tool** is not built. The model, field
  addressing, checks and blueprint all already accept an empty page of a given
  type; what is missing is an editing surface — copy is selected and rewritten
  today, never typed from scratch — plus a type picker and add/remove for
  sections and Things-to-know items. Additive, not a rewrite.
- **Writing to Karl from the tool** is a different order of work: an
  authenticated Wagtail session, a writer per block type, and a failure mode
  that lands in the CMS rather than on a clipboard. The walkthrough exists
  because that integration does not.

## 10. The 1:1 rule

The mockups are now held to a standing constraint: **a mockup may not contain
anything Karl has no field for.** Two things were removed to satisfy it.

- **The photo on the Transaction page.** A Transaction's panels are `title`,
  `description`, `primary_agency`, `cost`, `things_to_know`, `what_to_do`,
  `special_cases`, `supporting_information`, `custom_section`, `related`,
  `good_for_community`, `get_help`, `partner_agencies`, `topics`,
  `redirect_url`. None holds an image. Images belong to Information, Campaign,
  Agency and News. The Campaign page keeps its image — it has
  `additional_content · Image with text`.
- **Callout titles, on every page.** A Callout is one rich-text field with no
  title, on any host. Anything the title said has to be in the body or gone.

This has to become a check rather than a one-time edit: **a corpus validator
that fails any mockup carrying an element with no destination field**, run at
import. The walkthrough's amber gap cards were the manual version of that
warning; the rule replaces them for this class of problem.

---

## Not designed yet

- Reviewer notes (typed / audio / drawn) — specified in the handoff, never
  ported.
- The content-type check.
- The Rethink tab — shipped in the app, has no frame.
