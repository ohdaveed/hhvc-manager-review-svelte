# PLAN — Karl outline rollout: Topic

Branch `feat/karl-topic`, cut from `origin/main` at `1c1c8d7` (Step by step, PR #198, verified
live). The plan and vocabulary are in `docs/plans/2026-11-23-karl-field-mapping-layer.md` (§5,
rollout step 2) and `CONTEXT.md`.

One page: `healthyHousingTopic` (`sf.gov/topics--healthy-housing-conditions`). Its sections are a
Spotlight (with a button), two Services, a Resources block and a Related list.

Measured before starting: the four content sections are Placed, but every one is labelled "Child
topics (outer StreamField; internally "Page content") 1–4", the field map's internal note. Related
(U5) and the audience list are Unplaced. Primary agency is empty and required. The Spotlight's button
reads as Placed although `componentSupport.ts` already marks a Topic spotlight button `unknown`.

Karl, read 2026-11-24:

- The form labels the outer stream "Child topics", and one block choice is also called "Child
  topics" (field map, "Naming trap"), so labels name both: `Child topics · Spotlight block`.
- Spotlight: "Report, Profile, and Topic only allow 1 spotlight." (Spotlight)
- Spotlight button: the Button page leaves Topic out; the Spotlight page does not restrict it.
  **Unconfirmed** (already `unknownTypes` in `COMPONENT_SUPPORT.spotlightButton`).
- Auto-listed services: the Topic page says tagged Transaction and Step by step pages "will
  automatically appear under the heading More services"; the Step by step page says the step by step
  "will not automatically show on the topic page". **Unconfirmed.**
- URL: `sf.gov/topic-[slug]` (URLs) vs `sf.gov/topics/name-of-topic` (Topic). **Unconfirmed.**
- "Only DS can make new topics." (Topic). HHVC can draft this page, not create it. A page-level
  caveat.

- [x] **1. Schema.** Topic in `schema.ts`: Title, Description, one Spotlight, the spotlight-button and
      More-services caveats, the URL, and the page-level DS caveat, all cited. Caveats carry their
      own one-line wording, replacing the `CAVEAT_TEXT` map.
- [x] **2. Placement.** Topic blocks labelled `Child topics · Spotlight block` (etc.); a spotlight
      count over 1 needs a fix; the spotlight button Unconfirmed; the page caveat shown in the
      Blueprint header and the outline summary. Unit tests pin the page.
- [ ] **3. e2e.** The Topic page joins the outline and Blueprint specs, with axe at 1280px and 375px;
      screenshots looked at.
- [ ] **4. Ship.** `verify` and the ratchets, PR, merge on green, and `verify:live` against the
      published commit.
