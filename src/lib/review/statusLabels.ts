import type { ReviewPage } from '$lib/stores/reviewState';

export type ReviewStatus = ReviewPage['status'];

/**
 * The one place a review status becomes words or a colour.
 *
 * ONE vocabulary, everywhere a status is shown: the landing page, the queue's
 * group headings, the toolbar and the decision control. Plan decision D3
 * (2026-11-23) gave the landing page these words and left the workspace
 * saying "Needs review" and "Revise"; follow-up F1 was decided on 2026-11-26 in
 * favour of the landing page's words, because a reviewer moving between the two
 * met "Undecided" and "Needs review" for one status, and "Needs review" and
 * "Needs revision" -- one word apart -- for two different ones.
 *
 * The Karl transcript's decision words are NOT these: `$lib/karl/reviewRecord`
 * spells them the way `karl-transcript.js`'s approval test matches them, and
 * changing them there changes which pages read as approved.
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
		badge: 'border-transparent bg-sfds-grey-l2 text-sfds-black',
		bar: 'bg-sfds-grey-l2'
	},
	approved: {
		label: 'Approved',
		badge: 'border-transparent bg-sfds-green-l1 text-sfds-green',
		bar: 'bg-sfds-green'
	},
	revise: {
		label: 'Needs revision',
		badge: 'border-transparent bg-sfds-amber-l1 text-sfds-amber',
		bar: 'bg-sfds-amber'
	},
	blocked: {
		label: 'Blocked',
		badge: 'border-transparent bg-sfds-red-l1 text-sfds-red',
		bar: 'bg-sfds-red'
	}
} as const satisfies Record<ReviewStatus, { label: string; badge: string; bar: string }>;
