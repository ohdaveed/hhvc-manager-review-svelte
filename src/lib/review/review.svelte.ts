import { fromStore } from 'svelte/store';
import { pageStore } from '$lib/stores/pageData.svelte';
import {
	nextUndecidedPath,
	pagesStore,
	reconcileReview,
	type ReviewPage
} from '$lib/stores/reviewState';
import type { ReviewStatus } from '$lib/review/statusLabels';

/**
 * The review as a reviewer sees it: the `pages` table squared with the corpus.
 *
 * One module so every reader -- the queue, the decision panel, the toolbar's
 * prev/next and the landing page -- counts the same pages the same way. Each
 * used to call `reconcileReview` itself with inputs it rebuilt itself, and two
 * of them disagreeing ("0 of 38" on the landing page beside "0 of 41" in the
 * queue) is the bug this exists to make impossible.
 *
 * Reactive to both sources: `pagesStore` (rows, through `fromStore`) and
 * `pageStore.pages` (the corpus, which gains a draft's page when it becomes
 * ready). Read it like a store value -- `review.total`, `review.rows` -- from
 * any component or `$derived`. The rule itself stays in the pure
 * `reconcileReview`, which is tested on its own.
 */
class Review {
	readonly #rows = fromStore(pagesStore);
	readonly #reconciled = $derived(
		reconcileReview(
			this.#rows.current,
			pageStore.pages.map((p) => p.id)
		)
	);

	/** Rows a reviewer can open (a corpus page or a draft), in store order. */
	get rows(): ReviewPage[] {
		return this.#reconciled.rows;
	}

	/** Corpus pages with no row: viewable, but undecidable until a reviewer adds the row. */
	get unreviewed(): string[] {
		return this.#reconciled.unreviewed;
	}

	/** Rows for pages no longer in the corpus; left out of every count. */
	get retired(): ReviewPage[] {
		return this.#reconciled.retired;
	}

	/** Every page a reviewer can open: the progress denominator. */
	get total(): number {
		return this.#reconciled.total;
	}

	readonly #decided = $derived(
		this.#reconciled.rows.filter((p) => p.status !== 'needs-review').length
	);
	/** Rows with a decision. `needs-review` is the seeded status, not a decision. */
	get decided(): number {
		return this.#decided;
	}

	readonly #counts = $derived.by(() => {
		const tally: Partial<Record<ReviewStatus, number>> = {};
		for (const p of this.#reconciled.rows) tally[p.status] = (tally[p.status] ?? 0) + 1;
		return tally;
	});
	/** Rows per status. A status with no rows is absent, not 0. */
	get counts(): Partial<Record<ReviewStatus, number>> {
		return this.#counts;
	}

	/**
	 * Whether the table returned anything. Not `total > 0`: the total counts
	 * corpus pages with no row, so it is non-zero before (or without) a load,
	 * and the loading, empty and failed states are about the load.
	 */
	get loaded(): boolean {
		return this.#rows.current.length > 0;
	}

	/** The undecided page after `current`, wrapping; never a retired page's row. */
	nextUndecided(current: string): string | undefined {
		return nextUndecidedPath(this.#reconciled.rows, current);
	}
}

export const review = new Review();
