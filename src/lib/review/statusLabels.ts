import type { ReviewPage } from '$lib/stores/reviewState';

export type ReviewStatus = ReviewPage['status'];

/**
 * The one place a review status becomes words or a colour.
 *
 * THREE vocabularies, side by side on purpose. The app says different things
 * for the same four statuses depending on where you are standing, and plan
 * decision D3 (2026-11-23) is that the landing page gets the requested words
 * while nothing else is renamed in that change. Holding all three here is what
 * makes the difference visible in one screen instead of spread across three
 * components; unifying them is follow-up F1, and is a decision, not a tidy-up.
 *
 * - `label`         -- the landing page ("Undecided").
 * - `queueHeading`  -- the queue sidebar's group headings ("Needs review").
 * - `decisionLabel` -- the decision control in the review panel ("Revise").
 *
 * `badge` and `bar` share a record so a page's badge in a list and its slice of
 * the progress bar cannot be different colours for the same status.
 *
 * BADGE CONTRAST is measured, not eyeballed. shadcn's `destructive` badge is
 * `bg-destructive/10 text-destructive`: 3.98:1, below WCAG AA's 4.5, and axe's
 * signed-in scan caught it once already (see `ISSUE_BADGE` in AnalysisPanel).
 * These are SFDS's own `-l1` ground / solid foreground pairs:
 *
 *   needs-review  #212123 on #e2e2e2  12.41:1  (neutral: undecided is not a tone)
 *   approved      #0b7a3e on #e7f4ec   4.80:1
 *   revise        #a84b00 on #fdf1e7   5.15:1
 *   blocked       #b7202e on #fcecee   5.64:1
 *
 * The label carries the meaning; the colour only reinforces it (WCAG 1.4.1).
 *
 * `satisfies`, so a status added to `ReviewPage['status']` fails to compile
 * here until it has all of these.
 */
export const STATUS_LABELS = {
	'needs-review': {
		label: 'Undecided',
		queueHeading: 'Needs review',
		decisionLabel: 'Needs review',
		badge: 'border-transparent bg-sfds-grey-l2 text-sfds-black',
		bar: 'bg-sfds-grey-l2'
	},
	approved: {
		label: 'Approved',
		queueHeading: 'Approved',
		decisionLabel: 'Approved',
		badge: 'border-transparent bg-sfds-green-l1 text-sfds-green',
		bar: 'bg-sfds-green'
	},
	revise: {
		label: 'Needs revision',
		queueHeading: 'Needs revision',
		decisionLabel: 'Revise',
		badge: 'border-transparent bg-sfds-amber-l1 text-sfds-amber',
		bar: 'bg-sfds-amber'
	},
	blocked: {
		label: 'Blocked',
		queueHeading: 'Blocked',
		decisionLabel: 'Blocked',
		badge: 'border-transparent bg-sfds-red-l1 text-sfds-red',
		bar: 'bg-sfds-red'
	}
} as const satisfies Record<
	ReviewStatus,
	{ label: string; queueHeading: string; decisionLabel: string; badge: string; bar: string }
>;
