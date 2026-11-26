---
name: HHVC Manager Review
description: SF.gov page mockups shown as they will ship, with the review marks set around them.
colors:
  site-action: '#1b519e'
  site-action-hover: '#001d4e'
  site-action-soft: '#dfebfd'
  site-navy: '#000925'
  site-focus: '#386ebf'
  site-ink: '#0b0c0c'
  site-ink-secondary: '#3a3e42'
  site-ink-muted: '#5b5f63'
  site-border-subtle: '#e9eaea'
  site-surface: '#fcfcfc'
  site-tint: '#f2f6fc'
  site-callout-bg: '#daebff'
  site-info: '#0046c2'
  site-success: '#026800'
  site-warning: '#843f00'
  site-danger: '#ac0000'
  sfds-action: '#495ed4'
  sfds-blue-dark: '#0c1464'
  sfds-blue-l1: '#edf4f7'
  sfds-black: '#212123'
  sfds-slate-l3: '#1d4d70'
  sfds-slate-l2: '#5a7a92'
  sfds-grey-l2: '#e2e2e2'
  sfds-green: '#0b7a3e'
  sfds-green-l1: '#e7f4ec'
  sfds-amber: '#a84b00'
  sfds-amber-l1: '#fdf1e7'
  sfds-red: '#b7202e'
  sfds-red-l1: '#fcecee'
  chrome-canvas: '#f3f4f6'
  chrome-surface: '#ffffff'
  chrome-primary: 'oklch(0.205 0 0)'
  chrome-muted-fg: 'oklch(0.556 0 0)'
  chrome-border: 'oklch(0.922 0 0)'
  chrome-destructive: 'oklch(0.577 0.245 27.325)'
  karl-placed: '#1b5e20'
  karl-placed-bg: '#e8f5e9'
  karl-needs-fix: '#6f4a00'
  karl-needs-fix-bg: '#fff7e6'
  karl-unconfirmed: '#3d4551'
  karl-unconfirmed-bg: '#eef0f3'
  karl-unplaced: '#8c1d18'
  karl-unplaced-bg: '#fdecea'
typography:
  page-title:
    fontFamily: 'Roboto Slab, ui-serif, Georgia, serif'
    fontSize: '44px'
    fontWeight: 600
    lineHeight: '56px'
    letterSpacing: '-1px'
  lede:
    fontFamily: 'Roboto Flex Variable, system-ui, sans-serif'
    fontSize: '20px'
    lineHeight: '30px'
  site-title-lg:
    fontFamily: 'Roboto Slab, ui-serif, Georgia, serif'
    fontSize: '1.75rem'
    lineHeight: '2rem'
    letterSpacing: '-1px'
  site-body:
    fontFamily: 'Roboto Flex Variable, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: '1.5rem'
  chrome-title:
    fontFamily: 'Roboto Slab, serif'
    fontSize: '1.125rem'
    fontWeight: 600
  chrome-body:
    fontFamily: 'Roboto Flex Variable, sans-serif'
    fontSize: '0.875rem'
    lineHeight: '1.25rem'
  chrome-label:
    fontFamily: 'Roboto Flex Variable, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 600
    lineHeight: '1rem'
  karl-chip:
    fontFamily: 'Roboto Flex Variable, system-ui, sans-serif'
    fontSize: '12px'
    fontWeight: 400
    lineHeight: '16px'
rounded:
  site: '4px'
  chrome-sm: '0.375rem'
  chrome-md: '0.5rem'
  chrome-lg: '0.625rem'
  pill: '9999px'
spacing:
  '1': '4px'
  '2': '8px'
  '3': '12px'
  '4': '16px'
  '5': '20px'
  '6': '28px'
  '7': '40px'
  '8': '60px'
components:
  site-button-primary:
    backgroundColor: '{colors.site-action}'
    textColor: '#ffffff'
    rounded: '{rounded.site}'
    padding: '0 16px'
    height: '40px'
  site-button-primary-hover:
    backgroundColor: '{colors.site-action-hover}'
  site-button-secondary:
    backgroundColor: '{colors.site-action-soft}'
    textColor: '{colors.site-action}'
    rounded: '{rounded.site}'
    height: '40px'
  site-text-field:
    backgroundColor: '#ffffff'
    textColor: '{colors.site-ink}'
    rounded: '{rounded.site}'
    height: '48px'
  chrome-button:
    backgroundColor: '{colors.chrome-primary}'
    textColor: '#fafafa'
    rounded: '{rounded.chrome-lg}'
    padding: '0 10px'
    height: '32px'
  chrome-button-outline:
    backgroundColor: '{colors.chrome-surface}'
    textColor: '{colors.sfds-black}'
    rounded: '{rounded.chrome-lg}'
    height: '32px'
  chrome-action-button:
    backgroundColor: '{colors.sfds-action}'
    textColor: '#ffffff'
    rounded: '{rounded.chrome-md}'
  karl-chip-placed:
    backgroundColor: '{colors.karl-placed-bg}'
    textColor: '{colors.karl-placed}'
    typography: '{typography.karl-chip}'
    rounded: '{rounded.site}'
    padding: '4px 8px'
  karl-chip-unplaced:
    backgroundColor: '{colors.karl-unplaced-bg}'
    textColor: '{colors.karl-unplaced}'
    typography: '{typography.karl-chip}'
    rounded: '{rounded.site}'
    padding: '4px 8px'
  status-approved:
    backgroundColor: '{colors.sfds-green-l1}'
    textColor: '{colors.sfds-green}'
    rounded: '{rounded.pill}'
  status-changes:
    backgroundColor: '{colors.sfds-amber-l1}'
    textColor: '{colors.sfds-amber}'
    rounded: '{rounded.pill}'
---

# Design System: HHVC Manager Review

## Overview

**Creative North Star: "The Proof Sheet"**

Think of a printer's proof. The SF.gov mockup is the page exactly as it will ship, and the review tool is the reviewer's pencil marks around it. Two layers share every screen, and keeping them apart is the system's main job. The **mockup layer** reproduces SF.gov faithfully, from the Figma file "Public — User Interface Components" (`wv6CXpGGH0W8mAmkXKpiex`). The **chrome layer** (queue, panels, toolbars, landing page) is a neutral utility built on shadcn-svelte, tinted with the older SFDS blues and slates. It is plainly a tool and can't be mistaken for an SF.gov page.

The chrome is dense and small (mostly 12–14px), with light surfaces and few accents. The one thing allowed to speak loudly is a **review mark**: Karl placement chips, review-status pills, and the expired, unverified and drafted-by-AI banners. Marks annotate the page; they never restyle it. A reviewer judges copy in the setting it will publish in, so anything that makes the mockup look less like SF.gov is a defect, however good it looks.

**Key Characteristics:**

- Two palettes, split by layer: `site-*` inside the mockup, `sfds-*` plus shadcn neutrals in the chrome.
- Neutral, compact, low-ornament chrome. The mockup is the visual centerpiece.
- Review marks carry the strongest color in the chrome, always as color plus a label.
- Roboto Slab headings and Roboto Flex body text in both layers. Size and density tell them apart.
- Accessibility fixes live in tokens (the focus ring, slate choice), not in vendored components.

## Colors

The mockup uses SF.gov's cool civic blues on near-white. The chrome uses quiet neutrals, the SFDS slate-blues, and a small set of status colors.

### Primary

- **Civic Action Blue** (`site-action`): links, primary buttons and accordion titles inside the mockup. Hover and pressed go to **Midnight Action** (`site-action-hover`).
- **SFDS Periwinkle** (`sfds-action`): the chrome's action accent, used for selected states, primary tool actions, and rings on chosen items. It belongs to the chrome only and never appears inside the mockup.

### Secondary

- **Ink Slate** (`sfds-slate-l3`): secondary text across the queue, toolbar and panels (8.94:1 on white).
- **Fog Slate** (`sfds-slate-l2`): used only where the mockup furniture has to match what sf.gov renders (SiteHeader). It passes AA by just 0.03, so it is never chrome secondary text.
- **Deep Indigo** (`sfds-blue-dark`): the app-wide focus ring (`--ring`).

### Tertiary: review marks

- **Status triplets:** Approved is `sfds-green` / `sfds-green-l1`, Needs changes is `sfds-amber` / `sfds-amber-l1`, Rejected or error is `sfds-red` / `sfds-red-l1`. Each is used as a dot, a tint and readable text.
- **Karl chips:** placed (forest on mint), needs a fix (umber on cream), unconfirmed (graphite on cloud), unplaced (oxblood on blush).

### Neutral

- **Proof Grey** (`chrome-canvas`, Tailwind `gray-100`): the app canvas behind everything.
- **Paper White** (`chrome-surface`): chrome panels and cards.
- **Graphite** (`chrome-primary`): default shadcn button fill and text.
- **Hairline** (`chrome-border`, `sfds-grey-l2`): panel and row dividers.
- **Site Ink** (`site-ink`), **Site Ink Secondary**, **Site Ink Muted**: the mockup's text ladder. **Site Surface** (`site-surface`) is the mockup page itself.

### Named Rules

**The Layer Boundary Rule.** A `site-*` color appears only inside the mockup frame, and an `sfds-*` color only outside it. Where the two disagree (`site-action` #1B519E against `sfds-action` #495ED4), both are correct, each in its own layer.

**The Figma Decides Rule.** When a `site-*` value disagrees with Figma, Figma wins and the CSS is fixed. This overrides the design-system export's older "theme.css wins" rule.

**The Color-Plus-Label Rule.** A review mark never relies on color alone. Every status has a text label or glyph, so contrast holds and color-blind reviewers read it the same way.

## Typography

**Display Font:** Roboto Slab (with ui-serif, Georgia)
**Body Font:** Roboto Flex Variable (with system-ui)

**Character:** Both layers use the same civic pair: a slab serif for authority and a variable grotesque for running text. The mockup sets it at public-site size; the chrome sets it small and tight.

### Hierarchy

- **Page title** (600, 44px / 56px, −1px): the mockup page heading. Mockup only.
- **Lede** (20px / 30px): the mockup's opening summary.
- **Site title ladder** (Slab, 2rem → 1.75rem → 1.25rem): mockup section headings. The mobile step lives in `@theme` and the desktop step in a scoped media block.
- **Site body** (400, 16px / 24px): mockup paragraphs and bullets.
- **Chrome title** (Slab 600, about 18px): panel and landing-page headings, set with `font-display`.
- **Chrome body** (14px / 20px): panel copy, queue rows, form text.
- **Chrome label** (600, 12px): field labels, status pills, toolbar labels.
- **Karl chip** (400, 12px / 16px, no letter-spacing or text-transform): annotations on the page.

### Named Rules

**The Small-But-Strong Rule.** Below 14px, chrome text gets its legibility from weight and the darker slate (`sfds-slate-l3`), never from a lighter grey.

## Layout

The workspace is a two-part split: the review chrome (queue, fields, analysis and Rethink panels) beside a scrolling mockup frame that renders the SF.gov page at its own column width. The Karl outline summary is capped at 1076px. The mockup's scroll container is focusable on purpose (`tabindex="0"`), because axe's `scrollable-region-focusable` gates CI.

Spacing follows SFDS's 4px-based ladder (`--ds-space-1…8`: 4, 8, 12, 16, 20, 28, 40, 60), and Figma's ladder (0–28 in steps of 4) inside the mockup. SFDS's own Tailwind scale is deliberately kept out of the default namespaces: SFDS's `p-2` means 2px and its `md` breakpoint is 420px, so loading them there would silently rewrite every shadcn component.

Control heights are fixed: **40px buttons** and **48px fields** in the mockup (56px fields under 640px), with a **44px minimum tap target**. Chrome buttons are shadcn's 28/32/36px.

## Elevation & Depth

Flat by default. Depth comes from tonal layering: grey canvas, then white panel, then the white or near-white mockup, separated by hairline borders. The one SF.gov shadow is the menu dropdown (`--site-menu-shadow`). Focus is a double ring, not a shadow: a 4px gap in the surface color, then 3px of `site-focus` in the mockup, with Deep Indigo `--ring` in the chrome.

### Named Rules

**The Instant Focus Rule.** Focus indicators never animate in. Use `transition-colors`, not `transition-all`, so the ring is visible on the first frame.

## Shapes

The mockup uses SF.gov's crisp 4px radius (`--site-radius`) on buttons, fields, alerts and chips. The chrome uses shadcn's slightly softer ladder from `--radius` 0.625rem (`rounded-md` and `rounded-lg`), and fully round pills for status. Borders are 1px hairlines. SFDS's 3px default border is quarantined behind the `sfds-` prefix for the same reason as its spacing scale.

## Components

### Buttons

- **Site button (mockup):** 40px tall, 4px radius, 16px horizontal padding, Roboto Flex medium 14px. Primary is Civic Action Blue, going to Midnight Action on hover. Secondary is soft blue going to a stronger soft blue. Four variants. Live on `/login`.
- **Chrome button (shadcn):** 32px tall (28 small, 36 large), `rounded-lg`, 14px medium, Graphite fill. Outline, secondary, ghost and destructive variants are shadcn defaults. It nudges 1px down when pressed.
- **Chrome action:** a primary tool action rendered in SFDS Periwinkle with white text.

### Chips

- **Karl chip:** 12px text in a 4px-radius tinted box with a 14px glyph, a status head, and an optional reason line. Four states, keyed by `data-karl-chip`. The chip annotates the section it describes and sits in the margin of the page.
- **Review-status pill:** a fully round pill with an SFDS status triplet and a text label.

### Cards / Containers

- **Corner Style:** `rounded-lg` (0.625rem) for chrome cards; 4px for anything inside the mockup.
- **Background:** Paper White on the Proof Grey canvas.
- **Shadow Strategy:** none; see Elevation & Depth.
- **Border:** 1px Hairline.

### Inputs / Fields

- **Site field (mockup):** 48px tall, white sits a step above the `#fcfcfc` page, 4px radius, Site Ink Muted default border, double-ring focus.
- **Chrome textarea (shadcn):** Hairline border, Deep Indigo ring on focus, destructive ring when `aria-invalid`.

### Navigation

The mockup's SiteHeader is **inert**: nav items and search are `<span>`s, not links, because a non-working control exposed as a real one fails the axe gate. Chrome navigation is the review queue (PageRow list with status dots) and shadcn tabs.

### Edit Target (signature)

Every addressable field in the mockup is a real `<button>` (the `edit-target` utility), reset to inherit the surrounding copy's font, size, alignment and color. It shows only a hover tint and an instant focus ring. It is the one place the chrome touches the page, and it must not change the page's layout: padding only, never negative margins.

## Do's and Don'ts

### Do:

- **Do** take every mockup value from the Figma file and use `site-*` tokens inside the mockup frame.
- **Do** use `sfds-slate-l3` for secondary chrome text, and keep `sfds-slate-l2` for SiteHeader fidelity only.
- **Do** pair every status color with a label or glyph.
- **Do** fix accessibility in tokens (`--ring`), not in generated `components/ui/**` files, which the shadcn CLI overwrites.
- **Do** keep controls to the two mockup heights, 40px buttons and 48px fields.

### Don't:

- **Don't** use an `sfds-*` or shadcn color inside the mockup, or a `site-*` color in the chrome.
- **Don't** load SFDS's Tailwind scale (spacing, radius, border width, breakpoints) into the default namespaces.
- **Don't** make mockup furniture interactive when it is inert on purpose (header nav, search).
- **Don't** remove `tabindex="0"` from the mockup scroll container to quiet Svelte's a11y warning; axe needs it.
- **Don't** animate focus rings in, or pull an edit target outside the mockup column with negative margins.
