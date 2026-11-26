# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: HHVC program managers.** San Francisco Department of Public Health staff from Healthy Housing and Vector Control. They check that the mockup copy about their own programs is accurate. They review in short sessions around other duties, a few pages at a time, and pick up where they left off. They know the subject matter but are not content or CMS specialists.

**Downstream: the Karl page builder.** Whoever rebuilds each page in Karl (SF.gov's Wagtail CMS) reads the transcript this tool produces. This person never needs to sign in, but the output is written for them.

## Product Purpose

Managers review the SF.gov page mockups for HHVC as they would read on SF.gov. They decide each piece of copy, rewrite with AI help, record their reasoning, and propose pages that don't exist yet.

**A review succeeds when the Karl page builder can rebuild every page from its transcript without going back to the managers.** That means every field is decided, every piece of copy has a Karl placement, and every claim is either sourced or flagged as unverified copy.

## Positioning

The mockups render as real SF.gov pages, and each section is checked against the panels and rules of the Karl content type it will become. Copy review and CMS fit happen in one place. A comment thread on a document can't say whether a rewrite is still publishable in Karl; this tool reports that as a placement status (placed, needs a fix, unplaced, unconfirmed).

## Operating Context

- Sign-in is a Supabase magic link. `/` resumes the reviewer's place, shows progress, and offers to propose a page.
- About 35 corpus pages live as static modules in `src/lib/data/`. Pages drafted by AI live in the database, under a banner that says where they came from.
- Several reviewers share one review. Decisions belong to the page, not to whoever made them. Edits are append-only, and the latest edit to a field wins.
- AI rewrites (suggestions) and section Rethinks (proposals made of ops) come from Gemini through a server proxy. Nothing is recorded until a reviewer saves.
- Terminology is fixed by `CONTEXT.md`: unsaved change, suggestion, edit, accepted, expired, draft page, placement, Karl panel. UI copy follows it.

## Capabilities and Constraints

- Edits work inline on the rendered mockup, with field-level AI rewrites, section-level Rethink, notes anchored to fields, page decisions, and the Karl outline view on top of the page.
- What is decided is the transcript, not the corpus: accepted edits are an overlay and are never folded back into the corpus automatically.
- Karl's rules limit what can be published. A restructure Karl can't express is not publishable, whatever its merits as copy.
- AI calls must finish inside Netlify's 60-second function limit (55-second budget). A slow draft comes back marked invalid rather than timing out.
- Deployed on Netlify. Deploy previews share the production database.

## Brand Commitments

- **The mockups are SF.gov pages.** They follow SF.gov's design system and page anatomy, so managers judge copy in the context it will ship in. Figma is the design source of truth for that chrome.
- **Copy follows SF.gov plain-language standards.** The AI layer holds an SF.gov style corpus in `src/lib/server/ai/style/`.
- **The review tool's own interface has no brand set.** Open decision: nothing is committed for how the tool's chrome (panels, queue, landing page) relates to the SF.gov look of the mockups.

## Evidence on Hand

- The real page corpus: `src/lib/data/` (45 modules), with Karl mappings and editor notes for each section.
- Karl reference material: `docs/karl-export-field-map.md`, `docs/karl-transfer-checklist.md`, `docs/karl-transaction-compliance.csv`, `docs/wagtail-content-mapping.md`, `docs/live-page-comparison.md`.
- There are no usage metrics, testimonials or adoption figures. Don't invent any.

## Product Principles

1. **Write for the builder.** Every feature serves a transcript that someone can turn into a page without asking a manager anything.
2. **Show it where it will live.** Copy is judged on a faithful SF.gov rendering, not in a form or a document.
3. **Nothing changes without a deliberate save.** AI output, typed wording and proposals stay suggestions or unsaved changes until a reviewer saves. Cancelling restores what the field said before.
4. **Be honest about status.** Expired, unverified, unplaced and drafted-by-AI states stay visible. They are never hidden or passed off as current.
5. **Respect the manager's time.** Sessions resume where they stopped, and progress is always visible.

## Accessibility & Inclusion

No formal standard has been adopted for the tool's own interface. In practice the bar is the axe checks that gate CI (`tests/accessibility*.e2e.ts`, `tests/focusContrast.e2e.ts`). The mockups inherit SF.gov's own accessibility conventions.
