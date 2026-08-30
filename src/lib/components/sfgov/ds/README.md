# SF.gov design-system components (Svelte)

Sixteen Svelte 5 components for building **public SF.gov pages**, converted from
the React JSX in the design system's `design-system/components/sfgov-*` folders.

```
src/lib/components/sfgov/ds/
  SiteButton  Icon  Breadcrumbs
  TextField  TextAreaField  ErrorMessage  ChoiceGroup  Dropdown
  PageHeader  PageAlert  ListItem  Spotlight  DataTable  SiteFooter
  SiteHeader  OnThisPage
  types.ts  fieldId.ts
```

## Design source of truth: Figma

**Design values — color, type, spacing, geometry — come from the Figma file
"Public — User Interface Components"** (`wv6CXpGGH0W8mAmkXKpiex`), not from this
repo's CSS. The tokens below were transcribed from the design frames by hand, so
the CSS is a copy and Figma is the original; when the two disagree, the original
decides.

This reverses the rule in the design-system export's own readme ("Where a value
here disagrees with `src/css/theme.css`, theme.css wins"). That rule is
superseded.

Reading it: the file is a "(Copy)", so its components are unpublished and
`search_design_system` returns nothing — reach nodes by `node-id` and use
`get_variable_defs` on a real node to get the variables. Spot-checked
2026-08-30, the public-site palette matches exactly: `Primary/600 #1B519E`
(action), `Primary/900 #000925` (dark end), `Primary/500 #386EBF` (focus ring's
second stop), `Black-White/Black #0B0C0C` (icon stroke). The spacing ladder is
`0 / 4 / 8 / 12 / 16 / 20 / 24 / 28`.

Findings from that check:

- **`Accent/500 #B64A00` is NOT the alert ramp — settled 2026-08-30.** Pixel
  sampling of the Alerts design export puts every bar within ΔRGB ≤ 2 of the
  tokens already here (Information `#0046C4`/`#0046C2`, Success
  `#016900`/`#026800`, Warning `#834000`/`#843F00`, Danger `#AD0000`/`#AC0000`),
  which is lossy-WebP noise. `--color-site-warning: #843f00` is correct and
  stays. Where `Accent/500` belongs is still unknown; it is simply not this.
- **Archive was wrong and is now corrected.** It shipped grey
  (`#5b5f63` bar, `#f2f2f2` fill) while both the design source and the export's
  readme put it on the _same tan ramp as Warning_ — `#843F00` bar, `#FAEFE1`
  fill, with the box glyph as the only separator, "which is why it is never
  optional" (the glyph is unconditional in `PageAlert.svelte`, so that
  precondition holds). Contrast improves: 6.28:1 → 7.60:1 on the page ground.
- **Bar geometry confirmed.** The design measures an 8px bar; `.ds-bar` is
  `width: 8px`.
- **Figma specifies Roboto Slab at Medium 500 and SemiBold 600** for headings,
  while `src/app.css` imports `@fontsource/roboto-slab/700.css` only. Nothing
  breaks today because no component here names a slab family — the 500/600
  weights in `ListItem` and `Spotlight` sit on `--site-font-body`, which is
  Roboto Flex and _variable_, so those weights genuinely exist. Anyone building
  the slab headings must add the 500 and 600 imports, or the weight silently
  synthesizes from 700 and looks plausible but wrong.

This governs design values only. How a _page_ should be built is the Karl Editor
Help Center's call, and what a URL actually renders is settled by the live
published page — see `docs/karl-export-field-map.md`.

## Why this sits beside `sfgov/`, not inside it

`src/lib/components/sfgov/` already holds `Breadcrumb`, `SiteFooter`,
`SiteHeader` and `OnThisPage`. Those are **inert mockup furniture**: their nav
items, search box and crumb links are `<span>`s, not `<a href>` or `<input>`,
because the review canvas shows a _picture_ of a page and a dead anchor or a
fake search box is an axe failure the merge gate catches.

The components in `ds/` are the opposite — real links, real form controls, real
state. Two of them collide by name with the inert pair, which is why they live
in a subfolder rather than being renamed: the import path disambiguates them
and neither has to wear an awkward prefix.

| Building…                           | Use                                             |
| ----------------------------------- | ----------------------------------------------- |
| the mockup inside the review canvas | `sfgov/` — inert, axe-safe, no fake affordances |
| a page that actually works          | `sfgov/ds/` — this folder                       |

Nothing in `sfgov/` was modified.

## Install

**1. Tokens.** Append `src/app.css.append` to the end of `src/app.css`:

```sh
cat src/app.css.append >> src/app.css && rm src/app.css.append
```

The patch tries to make this edit for you; if the hunk did not apply cleanly,
the file is still there and the command above is the whole fix.

This registers the site palette as Tailwind v4 theme colours (`bg-site-action`,
`text-site-ink`, `border-site-border`…) **and** as `:root` custom properties, so
the components can use utilities for layout and `var(--color-site-*)` inside
their scoped styles. One name, both mechanisms.

Note the rename: the design system calls these `--site-action`; here they are
`--color-site-action`, because `@theme` only generates utilities for names in a
recognised namespace. Geometry and type tokens keep their `--site-*` names —
a two-stop box-shadow has no utility family.

**2. Assets.** Copy from the design system into `static/`:

```
assets/icons/*.svg              → static/sfgov/icons/
assets/Lockup_CCSF_White.png    → static/sfgov/
assets/Lockup_SFgov_Black.png   → static/sfgov/
assets/Illustration-Left.svg    → static/sfgov/
```

`Icon` expects the SFDS naming (`icon.20.ui.<name>.svg`). The handful already in
`static/sfgov/icons/` are named plainly, so `Icon` also takes an `src` prop that
bypasses `base` + `name`.

**3. axe in the browser (optional).** The specimen route runs a live axe pass if
`axe-core` is installed. Without it the panel says so and everything else works.

```sh
npm i -D axe-core
```

CI does not depend on this — `tests/sfgov-components.e2e.ts` uses
`@axe-core/playwright`, which is already a dependency.

## Two palettes, and they do not mix

|            | Review tool chrome                            | Public SF.gov                   |
| ---------- | --------------------------------------------- | ------------------------------- |
| Action     | `#495ed4` `--color-sfds-action`               | `#1B519E` `--color-site-action` |
| Dark end   | `#0c1464`                                     | `#000925`                       |
| Focus ring | `--ring`, one stop, set globally in `app.css` | two-stop, per component         |
| Components | `components/ui`, `components/workspace`       | `components/sfgov/ds`           |
| Icons      | `lucide-svelte`                               | the SFDS 20px file set          |

Do not alias one to the other. A reviewer has to be able to tell the tool from
the page at a glance. A Lucide glyph on a public page reads as a different
property — the stroke weight is visibly lighter.

**One override, deliberately.** `src/app.css` sets `outline-style: solid` on
every focusable element, unlayered, so it beats the shadcn utilities. That is
the _tool's_ ring. Site components suppress it and paint the site's two-stop
ring instead, scoped to their own classes.

## Where these differ from the JSX

Fourteen are a faithful port. Two are not, and both departures are structural.

**Dropdown is a native `<select>`.** The JSX renders
`div[role=combobox]` over `div[role=listbox]`. As a static specimen that is
fine — it shows the open menu, group headers, hover row and selected tick. As a
shipped control it would have to own roving focus, `aria-activedescendant`,
type-ahead, Home/End/PageUp/PageDown, Escape-with-focus-restored,
click-outside, scroll-into-view and the mobile picker, and every one is a place
this can regress silently later. What is lost: the open menu cannot be styled,
so row height, hover fill and the selected tick are the OS's. The closed control
matches the frames exactly. Group headers become `<optgroup label>`.

**DataTable is a real `<table>`.** The JSX builds the grid from `<div>`s and
flexbox. It looks identical and tells a screen reader nothing — no row or column
association, no cell count, no table navigation mode. axe raises nothing on a
div grid, so `tests/sfgov-components.e2e.ts` asserts the semantics directly.
`caption` is a required prop: it names the scrollable region and labels the
table.

Smaller changes, each for the same reason:

- **`state="hover" | "focus"` is gone.** Those are real CSS states now. A
  `demoState` prop remains so the specimen route can photograph both at once;
  never set it in application code.
- **The breadcrumb `…` works.** It is a `<button>`, so it has to do something —
  it expands the hidden levels.
- **`ChoiceGroup` uses real inputs**, styled with `appearance: none`, rather
  than `<span>` boxes. Native semantics, focus order and radio arrow-key roving
  all survive.
- **`Icon` requires an alt decision.** `label` for a meaningful glyph,
  `decorative` for one that repeats adjacent text. `<Icon name="rat" />` with
  neither is a type error.
- **`OnThisPage` and `SiteHeader`** have no JSX source; they were converted from
  the shipped inert components and made real.

## Measured contrast

Computed from the sRGB relative-luminance formula, not read off a swatch tool.
Text pairs need 4.5:1 (3:1 at 24px+ or 19px bold); non-text pairs — borders,
focus indicators, the edge of a control — need 3:1.

| Foreground                             | Background                                             |    Ratio | Needs |                   |
| -------------------------------------- | ------------------------------------------------------ | -------: | ----: | ----------------- |
| `--color-site-ink` `#0B0C0C`           | page `#FCFCFC`                                         |    19.09 |   4.5 | pass              |
| `--color-site-ink-secondary` `#3A3E42` | page                                                   |    10.51 |   4.5 | pass              |
| `--color-site-ink-muted` `#5B5F63`     | page                                                   |     6.28 |   4.5 | pass              |
| `--color-site-action` `#1B519E`        | page                                                   |     7.53 |   4.5 | pass              |
| `--color-site-action-dark` `#043578`   | page                                                   |    11.46 |   4.5 | pass              |
| `--color-site-action-hover` `#001D4E`  | page                                                   |    15.92 |   4.5 | pass              |
| `#FCFCFC`                              | `--color-site-action` (dark spotlight, primary button) |     7.53 |   4.5 | pass              |
| `--color-site-info` `#0046C2`          | page                                                   |     7.71 |   4.5 | pass              |
| `--color-site-success` `#026800`       | page                                                   |     6.86 |   4.5 | pass              |
| `--color-site-warning` `#843F00`       | page                                                   |     7.60 |   4.5 | pass              |
| `--color-site-danger` `#AC0000`        | page                                                   |     7.43 |   4.5 | pass              |
| `--color-site-archive` `#843F00`       | page                                                   |     7.60 |   4.5 | pass              |
| `--color-site-badge-fg` `#942A00`      | `--color-site-badge-bg` `#FDE4D7`                      |     7.16 |   4.5 | pass              |
| `#FCFCFC` footer links                 | `--color-site-navy` `#000925`                          |    18.75 |   4.5 | pass              |
| focus `#386EBF`                        | page `#FCFCFC`                                         |     4.93 |   3.0 | pass              |
| focus `#386EBF`                        | navy `#000925`                                         |     3.90 |   3.0 | pass              |
| focus `#386EBF`                        | `#1B519E` button fill                                  | **1.53** |   3.0 | **fail**          |
| ring stop `#FFFFFF`                    | `#1B519E` button fill                                  |     7.53 |   3.0 | pass              |
| ring stop `#FFFFFF`                    | navy `#000925`                                         |    19.24 |   3.0 | pass              |
| `--color-site-ink-muted` border        | page                                                   |     6.28 |   3.0 | pass              |
| `--color-site-border` `#C9CACA`        | page                                                   |     1.72 |   3.0 | exempt — disabled |

Two rows are the whole reason for the `onDark` prop. `#386EBF` clears 3:1
against the navy on its own, so the obvious reading — "the ring is fine on the
footer" — is true but incomplete: 1.4.11 measures the indicator against what is
_adjacent_, and a focus ring drawn immediately outside a `#1B519E` button is
adjacent to that fill at 1.53:1. The white first stop is what makes the
indicator visible, on every dark ground, in one consistent ring shape.

The last row is exempt: SC 1.4.11 does not apply to inactive controls. Never use
the disabled skin for something that is actually operable.

### One number to reconcile upstream

`design-system/tokens/sfgov-site.css` annotates `--site-action` as **6.53:1**.
Measured, it is **7.53:1** — the other two annotations on that ramp (11.36 and
15.55 against my 11.46 and 15.92) track within rounding, so this looks like a
single-digit slip rather than a different method. Nothing fails either way; the
token file's comment is the thing to correct.

## Accessibility gate

`tests/sfgov-components.e2e.ts` runs in the existing `e2e` job, which the
`main: require CI` ruleset already blocks merges on. It is separate from
`tests/accessibility.e2e.ts` so the failure message says whether a _page_ or a
_component_ regressed.

It asserts, beyond the axe sweep:

- Dropdown is a native `<select>` — no `role="combobox"`, no `role="listbox"`
- every `<select>` has a real `<label for>`
- DataTable emits `<th scope="col">`, `<th scope="row">` and a `<caption>`
- every `<img>` has an explicit `alt` (empty or not — never absent)
- the focus ring keeps both stops, and whitens the first on dark grounds
- the breadcrumb `…` expands by keyboard and clears `aria-expanded`
- an errored field is `aria-invalid`, points at its message, and has a **2px**
  border — the part a colour-only regression would quietly drop

## Specimen route

`/sfgov-components` renders every component in every state, with a live axe
result at the top.

It is **public**, not dev-guarded, because `playwright.config.ts` runs
`npm run build && npm run preview` — a dev-only route is invisible to the gate.
It carries `<meta name="robots" content="noindex">` and is linked from no nav.

## Known gaps

- **`ChoiceGroup` has no error-summary pattern.** A form with several invalid
  fields should list them at the top and link into each. That is a form-level
  concern and no frame specifies it.
- **No `Pagination`, `Accordion` or `Tabs`.** The frames do not cover them; they
  were not invented here.
- **`PageHeader`'s image overlap collapses at 900px** with a hardcoded
  breakpoint. The frames specify the desktop treatment only.
- **`SiteHeader`'s language `<select>` does not navigate on change.** It reports
  the choice and the caller decides — a select that navigates on arrow-key
  movement traps keyboard users. Wiring is left to the app.
