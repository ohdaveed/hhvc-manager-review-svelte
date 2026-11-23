# PLAN — "Fit" shows the desktop layout (UX review finding 1)

Branch `fix/preview-fit-desktop`, cut from `origin/main` at `2e234a2`, in worktree
`~/wt-preview-fit` (the main checkout belongs to another session on
`chore/ponytail-cuts`).

**Problem, measured 2026-11-22:** at a 1440px viewport with both rails open, "Fit
to pane" (the default) gives a 683px frame. The frame is a size container, so sf.gov
reflows into its **tablet** layout. Reviewers were approving the tablet rendering,
and only a small `683px · Tablet` readout said so.

**Fix:** when the pane is narrower than 1024px, "Fit" keeps the layout at 1024px
(desktop) and scales the frame down with CSS `zoom`. Container queries still see
1024px, so the layout stays desktop. Below a 50% scale (phones) it falls back to
the old reflow, because a quarter-size page is unreadable. The readout shows the
scale.

- [ ] `fitScale(paneWidth)` helper in `pageData.svelte.ts` plus unit tests.
- [ ] Layout measures the pane, applies `width:1024px; zoom:<scale>` under Fit, and
      the readout shows `1024px · Desktop · 67%`.
- [ ] Browser check at 1440 with both rails open: desktop header (no hamburger),
      readout correct, clicking copy still selects the field (edit targets work
      under zoom), and the footer can still be reached by scrolling.
- [ ] Gates: `test:unit --run`, `check:ratchet`, `build`; e2e runs in CI.
