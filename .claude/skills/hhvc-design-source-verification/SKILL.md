---
name: hhvc-design-source-verification
description: 'Establish canonical design sources, audit components against Figma, track design-to-code drift, and verify visual fidelity before and after fixes. Use this skill when verifying components or tokens against the design system, establishing design-system precedence, auditing rendered components for design fidelity, or tracking gaps between design intent and implementation.'
trigger: 'Use this skill when verifying components or tokens against the design system, establishing design-system precedence, auditing rendered components for design fidelity, or tracking gaps between design intent and implementation.'
author: arrizon.david
source_sessions:
  - arrizon.david_arrizon.david's Organization_default_acd2a71a-79ac-46df-9176-9d9b399e830a
  - arrizon.david_arrizon.david's Organization_default_25b29e61-75cd-4d31-af6e-26a6fe717f3e
  - arrizon.david_arrizon.david's Organization_default_6a758eaf-4166-4b4c-ac89-ed89426edc77
  - arrizon.david_arrizon.david's Organization_default_e7a876c8-b35b-4593-ad3e-860f65882f7a
  - arrizon.david_arrizon.david's Organization_default_8cae9cf6-9abf-4efa-b6df-50b54ea29378
contributors:
  - arrizon.david
version: 1
created_by_agent: claude_code
created_at: 2026-08-30T21:25:27.316Z
updated_at: 2026-08-30T21:25:27.316Z
---

# HHVC Design Source Verification

The SF.gov components library is the source of truth, but it exists in multiple forms: Figma design file, React export, Svelte port, CSS tokens, and rendered mockups. This skill provides a systematic way to establish canonical precedence, audit implementation against design, and record design-to-code drift.

## When to Use This Skill

Use this skill when:

- Verifying a component's visual or semantic design against the Figma source
- Establishing design-system precedence when Figma, CSS, and rendered page disagree
- Auditing tokens, colors, spacing, or typography for fidelity to design
- Recording gaps between design intent and implementation without immediately fixing them
- Discovering design artifacts (folder, zip, Figma file) and deciding how to integrate them

## The Verification Workflow

### 1. Locate the design artifact

Design can exist in multiple forms:

```bash
find . -name "*.fig" -o -name "*design*" -type d | head -20
ls -lh design/
unzip -l "Webapp*.zip" | grep -E "\.(jsx|d\.ts|prompt\.md)"
```

Also check docs, design notes, and GitHub issues for Figma links.

### 2. Access Figma as the primary source

If a Figma link exists, use the MCP:

```
Use figma with get_metadata (for file overview)
Use figma with search_design_system (for specific components)
Use figma with get_screenshot (for rendered variants)
```

**Establish precedence explicitly:** Figma is the original; CSS, React exports, and rendered pages are copies. Document this in the repo (e.g., `src/lib/components/.../README.md`) so future work doesn't re-invent a different hierarchy.

If no Figma link exists, search or ask the team before guessing.

### 3. Audit components by sampling rendered DOM

For component updates or token fixes, audit the rendered version:

```bash
# Start a dev server
bun run dev
# OR serve design artifacts for standalone inspection
python3 -m http.server 8899

# Open in browser: http://localhost:5173 or http://localhost:8899
# Open DevTools → select a component → read computed styles
```

Record:

- **Color values** (hex or RGB; compare to Figma variables)
- **Spacing** (measure computed width/height/margin/padding)
- **Typography** (font, weight, line-height, size)
- **State behaviors** (focus ring, hover, disabled, error, dark mode)

Example evidence:

```ini
Primary/600 in Figma    = #1B519E
--site-action in CSS    = #1B519E
button.primary (DOM)    = rgb(27, 81, 158) = #1B519E
✓ Match
```

### 4. Track gaps; don't guess fixes

When design and code diverge, record the delta with the blocking question:

```
**Accent/500 #B64A00 in Figma, absent from repo:**
Figma defines this token. Checked all rendered components —
no hex value matches. Searched Figma for its use —
found only in Spotlight frame variants. Unclear whether it's
a future tone, a renamed variable, or a deprecated token.
Status: Do not apply until role is confirmed against a
Figma component node.

**Roboto Slab weights 500/600 in Figma spec, only 700 imported:**
app.css imports @fontsource/roboto-slab/700.css only.
No component names slab family yet, so it's not a bug today.
If a component migrates to slab, these weights are missing.
Status: Latent gap; add to import when a component needs it.
```

### 5. Verify fixes in the real artifact

After fixing a token or component:

```bash
bun run test:unit -- --run      # Confirm structure assertions pass
bun run dev                     # Launch the app
# Navigate to the component, open DevTools, spot-check 2–3 key styles
```

**Render before claiming verification.** A passing test asserts DOM structure, not rendered appearance. You need to see it in a browser.

### 6. Clean up untracked design artifacts

Untracked design files (zips, `.html` exports, `.dcfiles`) should be `.gitignored` unless part of active workflow:

```bash
echo "design/" >> .gitignore
echo "*:Zone.Identifier" >> .gitignore  # Windows download noise
```

## Precedence Rules

**For design values:**

1. Figma (original source)
2. CSS tokens (transcribed from Figma; subject to transcription error)
3. Rendered page (should match CSS, but may not if CSS is stale)

**For content field mapping (Karl CMS):**

1. Live published page (what users actually see)
2. Field map documentation (how a type should build)
3. Help Center docs (authoring intent; reference only)

**For page structure and routing:**

1. Live published page (canonical behavior)
2. Mockup corpus (mockup SoT)
3. Legacy planning docs (historical reference)

## Gotchas

- **Figma links without node-id are limited** — `get_metadata` returns only the first page. Use `search_design_system` or request the full-file link.
- **Computed styles are authoritative, not CSS rules** — an element may have multiple conflicting rules; DevTools shows the winner.
- **WebP exports are lower fidelity than rendered HTML** — prefer interactive pages (standalone `.html`) or a dev server over static images.
- **Design token names are variable references** — `Primary/600` in Figma maps to `--site-action` in CSS, not a hardcoded `#1B519E`.
- **Audit gaps rather than guessing fixes** — a missing variable in the repo might be a future addition, deprecated token, or naming mismatch, not an error.
- **Spotlight tones conflate multiple design axes** — verify against Figma's full tone matrix (3 hues × light/dark) rather than assuming one tone per tone name.

## Example: Token Audit Workflow

From HHVC #97:

**Finding 1 — Variable in Figma, absent from repo:**

- Figma has `Accent/500 #B64A00`
- Searched codebase → no match
- Searched Figma nodes → found only in Spotlight variants
- Checked live page → Accent bar uses `#843F00`, not `#B64A00`
- **Outcome:** Recorded as gap, pending confirmation whether `Accent/500` is a future tone

**Finding 2 — Design specifies 6 Spotlight tones, repo has 2:**

- Figma: 3 hues (primary, secondary, accent) × light/dark = 6 tones
- Repo: `'primary' | 'secondary' | 'dark'` = 2 or 3 at best
- Built 6-row audit table, measured every tone's RGB against Figma
- Confirmed WCAG AA contrast on all six
- **Outcome:** Expanded enum, added test assertions, verified all six render correctly

**Finding 3 — Font weight import gap:**

- Figma spec: Roboto Slab 500 and 600 for headings
- Current import: only weight 700
- Component scan: no component uses slab yet
- **Outcome:** Recorded as latent; import weights when the first slab component ships

Each outcome is specific — not "design disagrees" but "here's the discrepancy, here's what's at risk, here's the gate that decides when to fix."
