# design-sync notes

## CORRECTION (same day) — a React design system DOES exist here

The conclusion below is **wrong on its headline claim**. An untracked `design/`
folder at the repo root holds `Webapp design improvement1.zip`, which contains a
Claude Design system in the expected layout — 139 files:

```
design-system/components/primitives      31 files   (~10 components)
design-system/components/workspace       28         (~9)
design-system/components/sfgov-content   19         (~6)
design-system/components/sfgov-forms     13         (~4)
design-system/components/sfgov-actions   10         (~3)
design-system/guidelines                 24
design-system/tokens                      5
design-system/ui_kits                     9
```

Each component is the expected `<Name>.jsx` + `<Name>.d.ts` + `<Name>.prompt.md`
triple. **React, not Svelte.**

**Why the first pass missed it:** the detection probes were `find -name "*.jsx"`
/ `"*.tsx"`, `.storybook/`, `*.stories.*`, and `react` in `package.json`. Every
`.jsx` here is _inside a zip_, so a filename search cannot see it, and the folder
is untracked so it is invisible to git-based discovery too. **A future run should
unzip-list any archive in `design/` before concluding anything.**

**What is still missing for an upload:** no `styles.css` at the bundle root, no
`_ds_bundle.js`, no `_vendor/`, no `_ds_sync.json`. So this is a design-system
_export_, not a synced upload bundle — the authoring artifacts are all there, the
compiled runtime is not. `design/styles.css` exists loose in the folder and may
be the entry point the export's readme describes.

`design/readme.md` (19KB) is the system's own documentation and states the
framework position directly: _"The components will not, and cannot — the
design-system format is React JSX. Treat `components/` as executable
specification."_ That readme's Index also names `SKILL.md` and `github.md`, which
are not present in the zip — so there may be a more complete export elsewhere.

**Revised recommendation:** before re-running the sync, extract
`Webapp design improvement1.zip` and check whether it is a complete Claude Design
project export that can be uploaded as-is, rather than converted from source.
That is a different and much shorter path than any of the three below.

---

## 2026-08-30 — sync attempted, stopped deliberately. No project created.

**Blocker: this repo has no syncable design system.** Claude Design's upload
contract is React — `_ds_bundle.js` exposing components on
`window.<globalName>.*`, `.jsx` previews, `<Name>Props` typings. This repo is
Svelte 5.

Nothing here is a bug to fix. Re-running the skill will reach the same wall
unless one of the "what would unblock" items below changes.

### What was checked, and what was found

| Probe                                                        | Result                                         |
| ------------------------------------------------------------ | ---------------------------------------------- |
| `.design-sync/config.json`, legacy `design-sync.config.json` | neither existed — first-time run               |
| `**/.storybook/main.*`, `**/storybook/main.*`                | none                                           |
| `*.stories.*`                                                | none                                           |
| `react` / `react-dom` in `package.json`                      | absent; not installed                          |
| `*.jsx` / `*.tsx` in the repo                                | none                                           |
| library `dist/`                                              | none — this is an app, not a published package |

So under the skill's own shape detection this is `shape: 'package'` with no
package to convert.

### `src/lib/components/sfgov/ds/` is not a candidate

16 Svelte 5 components (`SiteButton`, `Icon`, `Breadcrumbs`, `TextField`,
`TextAreaField`, `ErrorMessage`, `ChoiceGroup`, `Dropdown`, `PageHeader`,
`PageAlert`, `ListItem`, `Spotlight`, `DataTable`, `SiteFooter`, `SiteHeader`,
`OnThisPage`). They are a real design-system surface, but Svelte compiles to
Svelte client components, not React ones. Bundling them would upload components
the design agent cannot render — and a component that renders wrong here renders
wrong in _every_ design that agent builds.

### The upstream React source is not on this machine

`src/lib/components/sfgov/ds/README.md` says these were "converted from the
React JSX in the design system's `design-system/components/sfgov-*` folders."
That upstream repo was searched for and is not checked out here. What the
`sfgov-*` glob does match is unrelated:

- `HHVC_manager_review_current_tool_package/docs/source/sfgov-style|sfgov-live`
  — markdown documentation, no code
- `Downloads/Webapp design improvement/svelte-export/src/routes/sfgov-components`
  — a single `+page.svelte`
- `src/routes/sfgov-components` — this repo's own Svelte route

No git remote on this machine points at an sfgov or design-system repo.

### The one React thing present, and why it was not used

`node_modules/@sfgov/design-system` is installed and does ship React:
13 source components (`Box`, `Button`, `Container`, `Flex`, `Grid`, `Text`,
`Tile`, `SVGIcon`, `GlobalStyle`, `GoogleFonts`, `SSRStyle`, `page/`) plus a
genuinely compiled `dist/react/` (`index.js`, `index.mjs`, `index.d.ts`,
`index.d.mts`, with maps) and a `tailwind.preset.js`.

It was still rejected, on four facts:

- **version `0.0.1`**
- **absent from `bun.lock`** (0 matches) and from `package.json` — a phantom
  install, so a `bun install` may remove it and the sync would not be
  reproducible
- **no `exports` map** (`exports: null`)
- **peer deps `react ^18.2.0`, `react-dom ^18.2.0`, `tailwindcss ^2.2.19`** —
  React is not installed at all, and the Tailwind 2 peer sits against this
  repo's Tailwind 4 (`@tailwindcss/vite`)

It is referenced only by `src/app.css`, which matches `CLAUDE.md`: the CSS half
of the legacy port is "still retained as reference." It is a stylesheet
dependency, not a component dependency.

### What would unblock a future run

Any one of these, in rough order of how faithful the result would be:

1. **Check out the upstream SF.gov design-system repo** with the `sfgov-*`
   React folders, and sync from there. This is the true source the Svelte port
   was made from, so it is the highest-fidelity target.
2. **Pin `@sfgov/design-system` as a real dependency** (add to `package.json`,
   install `react`/`react-dom`), then sync its `dist/react`. Reproducible, but
   ships a third-party `0.0.1` package rather than anything authored here, and
   the Tailwind 2/4 gap needs resolving before previews can be trusted.
3. **Build a React mirror of the 16 Svelte components.** Large net-new work,
   scoped separately — this is authoring a design system, not syncing one.

Options 1 and 2 were both offered; the run was stopped instead.
