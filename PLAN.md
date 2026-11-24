# PLAN — Landing page fixes

Branch `feat/landing-fixes`, cut from `origin/main` at `0046900`, in worktree `../wt-landing-fixes`.
The confirmed design is `docs/superpowers/specs/2026-11-24-landing-page-fixes-brief.md` (user
confirmed "build as written", 2026-11-24). It came from the dashboard review of the same day.

## Tasks

- [x] **loadReview rejects on a query error.** A `/reviews` error rejects instead of resolving to
      a no-op, so the landing page's `failed` branch is reachable; "no review visible" stays a
      resolve. The review layout's handling of a rejection is checked and still works.
- [x] **Status card.** One card in the header slot in every state: skeleton (loading), signed out
      (Sign in), in progress / none decided / all decided, load failed (Try again re-runs the
      load), and signed in with no review. A "Next up" row holds the title; the button reads
      Continue/Start with the accessible name `Continue to <title>` / `Start with <title>`. No
      horizontal overflow at 375px.
- [x] **Status shortcuts.** Legend entries (plus "N undecided") are buttons that set the list's
      status filter and move focus to the list heading.
- [x] **Drafts.** `isDraftPath` pages are always under Proposed pages; a draft's meta line shows
      Drafting… / Draft ready / Drafting stalled / Draft failed.
- [x] **Empty search.** The message names the query and the active status, plus a "Clear search
      and filter" button that resets both and focuses the search box.
- [x] **Polish.** How it works opens when nothing is decided yet. The propose textarea really
      renders 5 rows and gets an example line. Row meta is `text-slate-700`.
- [x] **Gates.** New/updated unit and e2e specs; `bun run verify`, lint/check/format ratchets,
      e2e green.
- [ ] **Rendered check.** 375/768/1440, signed in/out, loading/error, axe clean, console clean.

## Decisions

- PLAN.md is per-branch in this repo; this replaces the Karl Agency plan, which merged as #202.
