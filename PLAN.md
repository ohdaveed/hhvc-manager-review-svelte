# PLAN — Karl outline rollout: Step by step

Branch `feat/karl-step-by-step`, cut from `origin/main` at `bcbb06f` (the first slice, PR #197,
verified live). The plan, decisions and vocabulary are in
`docs/plans/2026-11-23-karl-field-mapping-layer.md` (§5, rollout step 1) and `CONTEXT.md`.

Pages: `stepPestReport`, `stepCorrectViolation`, `stepPrepUnit` (6, 7 and 6 steps; every step titled).

Measured before starting: Intro is Unconfirmed (inferred mapping), Steps are Placed, and all three
"Related pages" sections are Unplaced (Step by step has no Related panel). **Defect:** the
transcript labels every step in Transaction's vocabulary ("Section 1 — Section specifics → Text"),
which the walkthrough and Blueprint show on a Step by step form that has no such field.

Karl, read 2026-11-24:

- "You can add up to 15 steps, but should aim for no more than 5." (Steps)
- "Each step has: Title\*" (Steps)
- "Each step can link to one or no transaction on SF.gov." (How a Step by step page works). This
  **confirms** the one-link rule the plan had marked unconfirmed.
- Topic tagging contradicts itself. "How a Step by step page works" says "the step by step will not
  automatically show on the topic page"; the Topic page and the Topics component say tagged Step
  by step pages appear automatically. **Unconfirmed.**
- URL: `sf.gov/step-by-step/title-of-step-by-step` (Step by step) vs `sf.gov/[slug]` (URLs).
  **Unconfirmed.**

- [x] **1. Step labels in the transcript.** On Step by step, steps read `Step N — Title` and
      `Step N — Step description`. The snapshot diff is exactly the three Step by step pages.
- [x] **2. Schema.** Step by step in `schema.ts`: Title, Description, steps ≤15 (confirmed), aim for
      5 (advisory, no status change), step Title required, one Transaction link per step
      (confirmed), and the Topics caveat and URL marked unconfirmed. Every rule is cited.
- [x] **3. Placement.** Step-count and step-title checks; Step by step sub-labels (`Step 2 ·
      Title`); the Topics caveat shown on the Blueprint slot. Unit tests pin the three pages.
- [x] **4. e2e.** A Step by step page joins the outline and Blueprint specs, with axe at 1280px and
      375px; screenshots looked at.
- [x] **5. Ship.** `verify` and the ratchets, PR, merge on green, and `verify:live` against the
      published commit.
