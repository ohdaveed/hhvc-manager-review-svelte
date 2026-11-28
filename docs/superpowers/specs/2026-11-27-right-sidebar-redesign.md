# Right-Hand Sidebar Redesign

**Date:** 2026-11-27  
**Reference mockup:** `watermarked_img_15076677998312521542.webp`  
**Status:** Approved

## Understanding Summary

- **What is being built:** Full replacement of the `Fields`, `Rethink`, and `Analysis` tab panels inside `ReviewWorkspace.svelte`, matching the structure of the design mockup while preserving the `Decision` tab (`ReviewPanel.svelte`).
- **Fields tab:** Removes the top `Show Karl fields` / `Blueprint` strip from `ReviewWorkspace.svelte` and renders a **Karl Readiness** card at the top of `FieldsPanel.svelte` (`Show Karl fields` switch, `X of Y items in Karl` summary, section/field rows with status pills and `Highlight` buttons, plus `Start walkthrough` and `Build in Karl` → `BlueprintView`). Inline field editing and AI field rewrites appear below only when fields are selected on the mockup.
- **Rethink tab:** Replaces the section-only ops diff with AI-generated categorized suggestion cards (`Plain language`, `Structure`, `Code & scope`) via `/api/ai/generate` (`task: 'page-suggestions'`), each with a `Send to Decision notes` button that appends to `pages.manager_notes`, plus a sticky `Go to Decision →` footer.
- **Analysis tab:** Replaces the current Analysis view strictly with **Reading Level** (ARI grade score, target badge, `Highlight on page`) and **Link Targets** (`N checked · M external`, `All` / `External` / `Internal` filters, `Inspect` action), plus a sticky `Next undecided page →` footer.
- **Who it is for & why:** Single author preparing SF.gov Healthy Housing & Vector Control (HHVC) page mockups for manager approval and downstream Karl (Wagtail CMS) transfer.
- **Non-goals:** Redesigning the `Decision` tab, the left queue (`ReviewQueue.svelte`), or the SF.gov mockup chrome.

## Non-Functional Requirements & Assumptions

- **Performance:** Readability, Link Targets, and Karl Readiness compute synchronously from in-memory `pageData` / `karl` modules; `Rethink` runs through `requestGeneration()` within the 55 s Gemini deadline with per-page session caching and abort-on-navigation.
- **Security & Privacy:** All AI calls authenticate via `requestGeneration()` (`/api/ai/generate`); Decision notes persist via existing RLS-scoped `updatePageNotes()`.
- **Accessibility & Visual Rules:** Follows `DESIGN.md` layer boundaries (`sfds-*` and shadcn neutrals in chrome, `site-*` in mockup, Color-Plus-Label on every status pill), 0 `svelte-check` errors/warnings, and axe-core checks.
- **Assumptions:** `Show Karl fields` is hidden/disabled on draft pages (`karlViews = false`). `Highlight`, `Highlight on page`, and `Inspect` scroll `#mockPage` to the matching target and apply a visible highlight ring.

## Decision Log

1. **Full replacement vs. additive:** Replace `Fields`, `Rethink`, and `Analysis` tab contents to match the mockup; keep `Decision` (`ReviewPanel.svelte`) and keep inline edit/AI rewrite controls in `Fields` only when a field is selected on `#mockPage`.
2. **Top Karl strip:** Remove `karlViews` strip from `ReviewWorkspace.svelte`; place `Show Karl fields` inside the `Fields` Karl Readiness card and wire `Build in Karl` → `pageStore.showBlueprint()`.
3. **Rethink AI & footer:** Add `task: 'page-suggestions'` outside `vendor/` with auto-run on open + per-page cache + `Regenerate` / `Cancel`; omit the extra footer icon next to `Go to Decision →`.
4. **Analysis scope:** Strictly Reading Level + Link Targets + `Next undecided page →` (no collapsed Karl Jr. findings).

## Final Design

### 1. Workspace Shell, Highlighting & Fields Tab

- `ReviewWorkspace.svelte` keeps the 4 tabs (`Decision`, `Fields`, `Rethink`, `Analysis`) and collapse button, removing the top `karlViews` strip.
- `pageStore` adds `highlight: { kind: 'field' | 'section' | 'whatToKnow' | 'readability' | 'link'; target: string; nonce: number } | null`, cleared on `resetForPage`.
- `$lib/karl/readinessRows.ts` maps `pageData` + `placementsFor()` into ordered readiness items (`Title / H1`, `Summary / Lead`, `What to know`, and sections) with status (`Populated`, `AI-drafted`, `Mapped to Karl`, `Needs a fix`, `Unmapped`).
- `FieldsPanel.svelte` renders the **Karl Readiness** card (`Show Karl fields` switch, summary bar, rows with status pills + `Highlight`, and `Start walkthrough` / `Build in Karl` footer), followed by inline editing / AI rewrites when `selectedFieldIds.length > 0` (or unsaved changes exist).

### 2. Rethink Tab & `page-suggestions` AI Task

- `src/lib/server/ai/generate.ts` + `src/routes/api/ai/generate/+server.ts` support `task: 'page-suggestions'` returning `{ plainLanguage, structure, codeAndScope }` inside the 55 s budget, keeping `vendor/schemas.js` untouched.
- `RethinkPanel.svelte` auto-runs once per uncached `pageId` (with `Cancel` and `Regenerate`), renders the 3 categorized cards (`Plain language`, `Structure`, `Code & scope`) with `Send to Decision notes` (appending to `liveRecord.manager_notes` via `updatePageNotes`), and a sticky `Go to Decision →` footer.
- `ReviewPanel.svelte` syncs `notesValue` when `liveRecord.manager_notes` updates externally while no local debounce is active.

### 3. Analysis Tab & Testing

- `$lib/analysis/linkTargets.ts` extracts internal (`pageKey` / `sf.gov`) and external (`http(s)`) links across page copy, cards, buttons, contact, partner agencies, and spotlight.
- `AnalysisPanel.svelte` renders **Reading Level** (`Grade {score}`, target badge, `Highlight on page`) and **Link Targets** (`N checked · M external`, `All` / `External` / `Internal` filters, `Inspect` action), above a sticky `Next undecided page →` footer.
- Covered by node unit tests (`readinessRows`, `linkTargets`, `server.test.ts`), jsdom component tests (`fieldsPanel`, `rethinkPanel`, `analysisPanel`), and `verify` + ratchet gates + Playwright e2e / screenshots.
