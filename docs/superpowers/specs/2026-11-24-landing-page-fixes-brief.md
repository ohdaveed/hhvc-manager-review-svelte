# Landing page fixes — design brief

Status: **draft, awaiting confirmation.** Source: the dashboard review of
2026-11-24 (rendered at 1440/768/375, signed out and in, plus loading, error,
empty-search and keyboard states).

## 1. Summary

`/` is where a reviewer resumes a 39-page review, proposes new pages, and finds
any page. The review found two blocking defects (an endless "Loading" when the
review fails to load; sideways scroll on phones) and four comprehension gaps.
This brief fixes all of them inside the app's existing visual language, and adds
three small aids that make the page explain itself.

## 2. Primary user action

**Resume the review at the next undecided page.** Everything else on the page —
proposing, browsing, filtering — is secondary to that one button.

## 3. Design direction

- **Register:** product. The tool disappears into the task.
- **Colour strategy:** Restrained, the project default. Use the existing SFDS
  tokens only: `sfds-action` for the primary action and selection, and the four
  status pairs from `$lib/review/statusLabels` for state. No new hues.
- **Scene:** an HHVC content reviewer at a desk in a daylit office, working
  through the queue in 10–20 minute sittings between other work, often
  returning after a gap of days. → light theme (as today); the page has to
  answer "where was I?" in one glance.
- **Anchors:** the GOV.UK _task list_ pattern (rows with a status on the
  right, grouped into sections, a status summary on top); SF.gov's own
  `PageAlert` for page-level problems; Linear's inbox "next up" affordance.
- **Kept as is:** the 3px radius, white cards on the grey page, the
  `sfds-grey-l2` hairlines, the filled filter chip, native `<details>` as the
  one disclosure pattern.

## 4. Scope

One screen (`/`), all breakpoints, shipped quality. Components touched:
`+page.svelte`, `ProgressSummary`, `HowItWorks`, `ProposePageForm`,
`AllPagesList`, plus a contract change in `loadReview`
(`src/lib/stores/reviewState.ts`). No new dependencies.

## 5. Layout strategy

One **status card** sits in the header slot in every state, so the slot never
holds blank space and never jumps:

```
┌ Status card ─────────────────────────────────────────────────────────┐
│ 4 of 39 decided                                    10%               │
│ ███▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       │
│ [● 2 approved] [● 1 needs revision] [● 1 blocked]   ← filter buttons  │
│──────────────────────────────────────────────────────────────────────│
│ Next up                                                              │
│ Report garbage, mold, and overgrown vegetation      [ Continue → ]   │
│ Transaction                                                          │
└──────────────────────────────────────────────────────────────────────┘
┌ How it works (disclosure) ─────┐  Propose a page
│                                │  [ textarea, 5 rows ]
└────────────────────────────────┘  [Draft this page]
All pages ……
```

- **The status card's footer holds the "Next up" row.** The page title moves
  out of the button and into text beside it, so the button label is short
  ("Continue" / "Start") and can never overflow. Below `sm` the button goes
  full width under the title. (Fixes finding 2, and the 768px squeeze.)
- **The legend becomes filter shortcuts.** Each "● 2 approved" is a button
  that sets the list's status filter to that status and scrolls to the list.
  The hero and the list then share one vocabulary, and the reviewer learns the
  filter exists. One more chip, "6 undecided", leads the row whenever there is
  anything left to decide.
- **Everything below the status card is unchanged in position.**

## 6. Key states (the status card)

| State                             | What it shows                                                                                                                                                                                      | Notes                                                                                                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Checking session / loading review | Skeleton of the card: grey bar, two grey text blocks, a static placeholder (no shimmer under `prefers-reduced-motion`)                                                                             | Same height as the loaded card, so nothing shifts. Replaces the blank `min-h-44` reservation.                                                                       |
| Signed out                        | Card: "Sign in to record decisions and track your progress." + **Sign in** (primary) + "You can read every page without an account."                                                               | Fixes the ~130px dead gap (finding 6).                                                                                                                              |
| Loaded, in progress               | Count, %, bar, filter shortcuts, Next up + **Continue**                                                                                                                                            |                                                                                                                                                                     |
| Loaded, nothing decided           | "0 of 39 decided", no shortcuts except "39 undecided", Next up + **Start**                                                                                                                         | `How it works` also opens by default here (see 7).                                                                                                                  |
| Loaded, all decided               | Count, full bar, shortcuts; footer: "Every page has a decision." + secondary "Review blocked pages" when any are blocked                                                                           | No Continue button (as today).                                                                                                                                      |
| Load failed                       | Card in the danger tint, with heading "Your progress didn't load", line "The review data couldn't be reached. Your decisions are safe.", and a **Try again** button that re-runs the load in place | **Fixes finding 1.** Needs `loadReview` to _reject_ on a query error rather than resolve, so the page's existing `failed` branch becomes reachable. `role="alert"`. |
| Signed in, no review visible      | Neutral card: "No review is set up for your account yet." + "Ask the content team lead to add you."                                                                                                | A separate state from failure. Today it is indistinguishable from loading.                                                                                          |

## 7. Interaction model

- **Continue / Start**: link to `reviewHrefFor(nextPath)`. Visible label is
  short, and the accessible name stays `Continue to <title>` /
  `Start with <title>`. That keeps WCAG 2.5.3 (the visible label begins the
  name) and the existing `getByRole('link', { name: /^Continue to / })` tests.
- **Status shortcuts**: `<button>`s that set `status` in `AllPagesList`, move
  focus to the list heading, and scroll it into view (instant under reduced
  motion). The filter's state has to move out of `AllPagesList` into the page,
  or into a small shared rune, so the hero can set it.
- **How it works**: open when signed out **or when nothing is decided yet**.
  Closed once the reviewer has started. A reviewer who toggles it keeps their
  choice (the existing `touched` latch).
- **Try again**: re-runs `loadReview`. While it runs, the button shows
  "Trying…" and stays in place (no disabled state). If it fails again, the
  card stays put and its text doesn't change.
- **Empty search** (finding 5): the message names everything applied —
  `No Approved pages match "zzzz".` — followed by a secondary
  **Clear search and filter** button that resets both and returns focus to the
  search box.
- **Drafts** (findings 3 and 4):
  - A page whose path `isDraftPath()` is listed under **Proposed pages**
    whatever its state, so a ready draft no longer drifts into "Other pages".
  - The meta line under a draft's title shows its state instead of the type:
    - _Drafting…_ — a small `sfds-action` dot that pulses (static under
      reduced motion)
    - _Draft ready_
    - _Drafting stalled — open to retry_ — via `isStale`
    - _Draft failed — open to retry_ — `sfds-red` text on white, 5.6:1
  - The status badge on the right stays the review decision; draft state and
    decision are different facts.

## 8. Content

- Card headings: "4 of 39 decided" (unchanged: the `gotoSignedIn` guard
  matches `^\d+ of N decided$`), "Next up", "Your progress didn't load",
  "No review is set up for your account yet".
- Buttons: "Continue", "Start", "Try again", "Sign in", "Clear search and
  filter", "Review blocked pages".
- Propose a page: add a helper line with a real example under the label —
  _For example: "A page explaining how tenants report bed bugs, and what
  happens after."_ Make the textarea actually render 5 rows (today it renders
  about 2; check `field-sizing` / `min-h` in `ui/textarea`).
- Row meta (page type) moves from link-like `sfds-slate-l3` blue to
  `text-slate-700`, so it stops reading as a second link.

## 9. Constraints and tests

- Every text pair ≥ 4.5:1. Reuse the measured status pairs. The danger card
  uses `sfds-red-l1` ground with `sfds-black` body (≥ 15:1) and `sfds-red`
  heading (5.64:1).
- axe signed-in scan must stay at zero, and the error and loading cards get
  their own scans (they are new rendered surfaces).
- Regression specs to add:
  - phone width has no horizontal overflow (`scrollWidth === innerWidth` at 375)
  - a ready draft is listed under Proposed pages
  - a `/reviews` 500 shows the error card and Try again recovers
  - the empty message names the active filter
- `loadReview` changing from resolve-on-error to reject-on-error touches its
  other caller (the review layout). Check how that layout handles a rejection
  before changing the contract.

## 10. References for implementation

`impeccable/reference/layout.md` (status card rhythm), `harden.md` (error and
empty states), `clarify.md` (copy), `adapt.md` (375/768 checks).

## Open questions

None blocking. Defaults asserted above. The one judgement call is the
**status shortcuts** in the hero (§5). They are the largest addition and
could be dropped without affecting any fix.
