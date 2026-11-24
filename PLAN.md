# PLAN — Move the Analysis panel's Karl checks onto the schemas

Branch `feat/karl-analysis-on-schemas`, cut from `origin/main` at `655027f` (About us, PR #206).
This is the second half of §5 in `docs/plans/2026-11-23-karl-field-mapping-layer.md`.

## Why

The Analysis panel judges Karl fit with its own rules, apart from the outline's, so the two can
disagree on the same page:

- `karlComponentFindings` builds its own component inventory from section tags and checks it
  against `COMPONENT_SUPPORT`. Campaign's Contact us reads "supported" there, while the schema
  calls it Unconfirmed. It never asks whether the host page has a Related field.
- `karl-transaction-what-to-do` passes a page whose `karl` note merely mentions `what_to_do`
  (`isWhatToDo` matches note prose), which is the known gap: "passes pages without that heading".
- Nothing checks PLACEHOLDER text, the URL pattern, empty required fields, or copy that won't carry
  over.

## Design

New `src/lib/analysis/karlPlacementChecks.ts` derives findings from `placementsFor` (the outline's
source), judged on the copy on screen (base plus saved edits):

| id                    | Title                       | Status                                                      |
| --------------------- | --------------------------- | ----------------------------------------------------------- |
| `karl-unplaced`       | Copy that won't carry over  | issue if the tray has items                                 |
| `karl-needs-fix`      | Copy that needs a fix       | issue if any section or string needs a fix                  |
| `karl-unconfirmed`    | Karl rules not settled      | unavailable if any; Karl's own pages disagree               |
| `karl-empty-fields`   | Karl fields left empty      | issue only for an empty **required** field                  |
| `karl-url-pattern`    | URL pattern                 | pass or issue against a confirmed pattern; else unavailable |

- `karl-transaction-what-to-do` reads the placement: a section placed in `what_to_do` whose heading
  is "What to do". The note-prose regex goes.
- `karlComponentFindings` keeps only what placements cannot see: whether a Related card's
  **target** is a type Karl's Related accepts. Its host-type checks (callout, accordion, button,
  spotlight, resources, contact, table, alert) are now the placements' job, which reports each of
  them already.
- The readability, copy and accessibility checks are unchanged.

## Checklist

- [x] **1. Placement findings.** `karlPlacementChecks.ts` and tests over the whole corpus, wired into
      `analyzePage` (a `placementFindings` list) and the panel's flattened list.
- [x] **2. What to do from the placement.** `karl-transaction-what-to-do` reads placements; tests
      include a page whose note mentions `what_to_do` but has no such section.
- [x] **3. Component checks narrowed.** `karlComponentFindings` keeps the Related target check;
      its tests are rewritten to that scope.
- [ ] **4. Verify.** Unit tests, the ratchets, the Analysis panel's e2e and axe, a screenshot of
      the panel looked at, then a PR. Ask before merging.
