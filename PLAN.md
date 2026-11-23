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

- [x] `fitScale(paneWidth)` helper in `pageData.svelte.ts` plus unit tests.
- [x] Layout measures the pane, applies `width:1024px; zoom:<scale>` under Fit, and
      the readout shows `1024px · Desktop · 67%`.
- [x] Browser check at 1440 with both rails open: desktop header (no hamburger),
      readout correct, clicking copy still selects the field (edit targets work
      under zoom), and the footer can still be reached by scrolling.
- [x] Gates: `test:unit --run`, `check:ratchet`, `build`; e2e runs in CI.

## Result

Gates: 625/625 unit (4 new), svelte-check 0/0, eslint at baseline 4, build green.
Browser at 1440 with both rails open (local stack): readout `1021px · Desktop · 67%`,
full desktop header and nav (no hamburger), no horizontal overflow (scrollWidth equals
clientWidth), clicking the title selects it and the ring lines up, footer reachable.
At 375px the scale would fall below 50%, so it falls back to reflow (`278px · Phone`).

A first attempt subtracted a hardcoded 64px for `px-8`. In this theme that is 40px a
side, which left a horizontal scrollbar. It now binds the pane's `contentRect`, so
there is no constant to drift.

Trade-off: at 67% the body copy is about 11px on screen. Desktop (1024) is still one
click away for reading at full size.
