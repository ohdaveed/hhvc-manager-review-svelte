import { reviewHrefFor } from '$lib/corpus/draftPath';
import type { ReviewPage } from '$lib/stores/reviewState';

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
	nextHref: `/review/${string}` | undefined;
} {
	const next = pages.find((p) => p.status === 'needs-review');
	return {
		decided: pages.filter((p) => p.status !== 'needs-review').length,
		total: pages.length,
		nextHref: next ? reviewHrefFor(next.path) : undefined
	};
}
