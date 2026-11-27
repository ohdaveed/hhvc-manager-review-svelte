import { reviewHrefFor } from '$lib/corpus/draftPath';
import { queueOrder, type ReviewPage } from '$lib/stores/reviewState';

/**
 * How far through the review a reviewer is, and where to go next.
 *
 * `total` is every page in the review, drafts included: proposing a page adds
 * work, so 12 of 39 becomes 12 of 40. Excluding drafts would let a review read
 * as complete with undecided pages still in it. `decided` is every status but
 * `needs-review`, so a page marked revise or blocked is a decision too.
 *
 * `nextHref` goes through `reviewHrefFor`: a draft's `pages.path` is
 * `draft:<uuid>`, which `/review/[slug]` would hard-404.
 */
export function reviewProgress(pages: ReviewPage[]): {
	decided: number;
	total: number;
	nextPath: string | undefined;
	nextHref: `/review/${string}` | undefined;
} {
	// The first undecided row in the queue's order, so Continue lands on the
	// row the sidebar shows first among those still to do. `undefined` once
	// everything is decided: there is nothing left to resume.
	const undecided = new Set(pages.filter((p) => p.status === 'needs-review').map((p) => p.path));
	const next = queueOrder(pages).find((path) => undecided.has(path));
	return {
		decided: pages.length - undecided.size,
		total: pages.length,
		nextPath: next,
		nextHref: next ? reviewHrefFor(next) : undefined
	};
}
