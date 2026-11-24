---
name: hhvc-manager-review-svelte-conventions
description: Code and commit conventions for hhvc-manager-review-svelte, a SvelteKit 2 / Svelte 5 app. Use when writing code, tests or commits in this repo and you need the house style rather than a generic default.
---

# hhvc-manager-review-svelte conventions

`CLAUDE.md` at the repo root is the authority for commands, architecture and
gotchas. This skill covers only the house style, and every claim here was
measured against the tree on 2026-11-24. Re-measure before trusting a number.

## Stack

- **SvelteKit 2 with Svelte 5 runes**, built by Vite. **There is no
  `svelte.config.js`.** SvelteKit config lives in the `sveltekit({ ... })`
  options in `vite.config.ts`.
- **bun** is the package manager and script runner (`bun run <script>`).
- Public env vars use the **`SVELTE_PUBLIC_`** prefix. A `PUBLIC_` variable is
  treated as private.

## Exports and naming

- **Named exports.** `src/**/*.ts` has 0 default exports and 97 files with named
  ones. Svelte components are the only default-imported modules.
- **Svelte components** are PascalCase (`EditTarget.svelte`, `ReviewQueue.svelte`).
- **Corpus data modules** in `src/lib/data/` are kebab-case, named after the page
  (`report-rats-mice-four-legged-problems.ts`).
- **Other TS modules** are camelCase (`fieldKey.ts`, `componentSupport.ts`).
- **Constants** are SCREAMING_SNAKE_CASE (`KARL_PANELS`, `COMPONENT_SUPPORT`).
- Classes are rare (5 in `src`). The one that matters is the runes store
  `pageStore` in `src/lib/stores/pageData.svelte.ts`.

## Tests

The location decides the environment. See `CLAUDE.md` § Vitest project split.

- `src/**/*.test.ts` and `tests/**/*.spec.ts` run in **node**.
- `tests/**/*.test.ts` runs in **jsdom**.
- `**/*.e2e.ts` runs in Playwright and must import `test` from `./fixtures`,
  not from `@playwright/test`.

## Errors

- Keep auth checks **outside** a catch-all. A SvelteKit `HttpError` is not an
  `Error`, so a catch-all flattens a 401 into a 500.
- Answer unexpected failures with a **generic** 500. Echoing `err.message` can
  leak a network address.
- Use optimistic update, then roll back on failure (see `$lib/stores/reviewState.ts`).

## Comments

Comments explain **why**, often with the measurement or incident behind the
rule. Keep that style. Don't strip a long comment as noise: many record a
failure that would otherwise recur.

## Commits

Conventional commits, enforced by the `commit-msg` hook. Over the last 200
commits: `fix` 47, `docs` 43, `feat` 37, `chore` 21, `ci` 9, `test` 6. Scopes are
common (`fix(corpus): …`, `docs(skills): …`). Work arrives on `main` through a PR
only; the ruleset blocks direct pushes.
