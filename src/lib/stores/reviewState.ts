import { writable, get } from 'svelte/store';
import { supabase, ensureDevSession } from '$lib/supabase';
import { loadDrafts } from './draftPages';
import { isDraftPath } from '$lib/corpus/draftPath';
import { groupPaths } from '$lib/landing/groups';

// Define the shape of our data
export type PageCheck = { status: string; message: string };

export type ReviewPage = {
	id: string;
	review_id: string;
	path: string;
	status: 'needs-review' | 'approved' | 'blocked' | 'revise';
	manager_notes: string | null;
	page_checks: Record<string, PageCheck> | null;
	// NOTE: there is deliberately no `title` here. The pages table stores only
	// id/review_id/path/created_at, so a title on this type would be a promise
	// the database cannot keep. Callers resolve display titles from the static
	// corpus in $lib/stores/pageData.svelte, keyed by `path`.
};

export type Edit = {
	id?: string;
	page_id: string;
	field_id: string;
	new_content: string;
	// `edits` is append-only, so a field can have several rows. Consumers order
	// by this to pick the newest rather than trusting row order.
	created_at?: string;
	/** The author. Null once their account is deleted; absent on optimistic rows. */
	user_id?: string | null;
	/** sha256 of the field's base copy when saved; required since 20261126100000. */
	base_hash?: string;
};

// Our central stores
/**
 * The order the decision statuses are listed in wherever statuses are counted
 * or filtered -- the landing page's status filter and progress counts.
 * `needs-review` first because it is the work. NOT the queue's row order: the
 * queue is grouped by theme (`queueOrder`), so a decision never moves a row.
 */
export const QUEUE_STATUS_ORDER = [
	'needs-review',
	'approved',
	'revise',
	'blocked'
] as const satisfies readonly ReviewPage['status'][];

/**
 * Every path in the order the review queue renders its rows: the review's rows
 * under the landing page's themed headings (`groupPaths`), then `unreviewed`
 * -- corpus pages with no row yet, which the sidebar lists last.
 *
 * The queue's one order. The sidebar renders it; the toolbar's previous/next,
 * `nextUndecidedPath` and the landing page's resume point step through it, so
 * "next" is always the row below the current one on screen. A decision does
 * not change it, because the groups are themes rather than statuses.
 *
 * Empty when no review is loaded; callers fall back to corpus order, which is
 * what the queue lists while browsing signed out.
 */
export function queueOrder(pages: ReviewPage[], unreviewed: readonly string[] = []): string[] {
	return [...groupPaths(pages.map((p) => p.path)).flatMap((s) => s.paths), ...unreviewed];
}

/**
 * The `pages` table squared with the static corpus, which drift apart in both
 * directions. A corpus page added after the seed ran has no row (measured: the
 * five pages of #221 on a stack seeded before them), and a page retired from the
 * corpus keeps its row, because retiring one ships no migration (#244, #245).
 * Read alone, the table under-counts the review and lists rows whose link 404s
 * on `/review/[slug]`'s static guard.
 *
 * - `rows` -- rows a reviewer can open: a corpus page or a draft. Store order.
 * - `unreviewed` -- corpus ids with no row. Viewable, but undecidable: the
 *   table has no INSERT policy, so nothing in the app can create their row.
 * - `retired` -- rows for a page that is no longer in the corpus.
 * - `total` -- every page a reviewer can open, the progress denominator.
 */
export function reconcileReview(
	pages: ReviewPage[],
	corpusIds: readonly string[]
): { rows: ReviewPage[]; unreviewed: string[]; retired: ReviewPage[]; total: number } {
	const corpus = new Set(corpusIds);
	const rows: ReviewPage[] = [];
	const retired: ReviewPage[] = [];
	for (const p of pages) (corpus.has(p.path) || isDraftPath(p.path) ? rows : retired).push(p);
	const rowed = new Set(rows.map((p) => p.path));
	const unreviewed = corpusIds.filter((id) => !rowed.has(id));
	return { rows, unreviewed, retired, total: rows.length + unreviewed.length };
}

/**
 * The page after `current` that still has no decision, so a reviewer can move on
 * without going back to the sidebar.
 *
 * Searches in `queueOrder` -- the order the sidebar renders -- starting after
 * `current` and wrapping round, so it names the next undecided row below the
 * current one on screen. Deciding `current` does not move it, so "next" still
 * means the row that came after it. Never returns `current`; `undefined` once
 * every page has a decision.
 */
export function nextUndecidedPath(pages: ReviewPage[], current: string): string | undefined {
	const statusOf = new Map(pages.map((p) => [p.path, p.status]));
	const order = queueOrder(pages);
	const start = order.indexOf(current) + 1;
	for (let i = 0; i < order.length; i++) {
		const path = order[(start + i) % order.length];
		if (statusOf.get(path) === 'needs-review' && path !== current) return path;
	}
	return undefined;
}

export const pagesStore = writable<ReviewPage[]>([]);
export const editsStore = writable<Edit[]>([]);
/**
 * True once `loadReview` has fetched the saved edits. Until then `editsStore`
 * is empty for want of a fetch, not for want of edits, and an unsaved change
 * stamped against it would mistake every older save for a new one.
 */
export const editsLoaded = writable(false);

/**
 * Ids of the edits THIS TAB inserted. `saveInlineEdit` picks the id itself and
 * records it before the insert, so its own row is recognised even when the
 * realtime echo arrives before the insert call returns. What tells a save
 * from this tab apart from one made elsewhere -- another reviewer, or the same
 * reviewer in another tab, which overwrites typing just the same.
 */
const ownEditIds = new Set<string>();
export const isOwnEdit = (id: string) => ownEditIds.has(id);

/**
 * Loads all pages for the most recent review and initializes realtime.
 * Call this once from the review layout's onMount.
 * Returns the unsubscribe cleanup function.
 *
 * REJECTS when a query fails, and resolves with a no-op cleanup when no review
 * is visible. The two used to look the same -- both resolved -- so a caller
 * could not tell "the database errored" from "there is nothing to show", and
 * the landing page sat on "Loading your progress…" forever after an error.
 * The error is still logged first: `tests/fixtures.ts` ignores that message by
 * text, and a rejection carries nothing the e2e gate would recognise.
 */
export async function loadReview(): Promise<() => void> {
	// Every policy is `FOR ALL TO authenticated`, so without a session each query
	// below returns nothing. No-op outside development.
	await ensureDevSession();

	// Fetch the most recent review
	const { data: reviews, error: reviewsError } = await supabase
		.from('reviews')
		.select('id')
		.order('created_at', { ascending: false })
		.limit(1);

	// No error and no rows is the normal signed-out state (RLS hides every
	// review), not a failure, so only a real error is logged as one.
	if (reviewsError) {
		console.error('No review found:', reviewsError);
		throw new Error('Could not load the review', { cause: reviewsError });
	}
	if (!reviews || reviews.length === 0) {
		console.info('No review visible (signed out, or none exists).');
		return () => {};
	}

	const reviewId = reviews[0].id;

	// Subscribe first, then hydrate. Doing it the other way round left a window --
	// the pages query plus the whole edits fetch -- in which another reviewer's
	// change had no subscriber and no place in the snapshot, so the queue and
	// decision stayed stale until the next update or a reload.
	const channel = initializeRealtime(reviewId);

	// Fetch all pages for that review
	const { data: pages, error: pagesError } = await supabase
		.from('pages')
		.select('*')
		.eq('review_id', reviewId);

	if (pagesError) {
		console.error('Failed to load pages:', pagesError);
		channel.unsubscribe();
		throw new Error('Could not load the review pages', { cause: pagesError });
	}

	pagesStore.set((pages as ReviewPage[]) ?? []);

	// Hydrate saved edits too. initializeRealtime only observes future inserts,
	// so without this a reload leaves editsStore empty and `reviewRecordFor`
	// builds a Karl walkthrough with none of the reviewer's previous edits in it.
	//
	// Read `latest_edits`, not `edits`. The view is one row per
	// (page_id, field_id), which is what this store holds anyway --
	// saveInlineEdit filters that pair out before appending. Querying the table
	// meant fetching an unbounded append-only history, and PostgREST truncates
	// at max_rows (1000) without erroring: ascending order plus a
	// last-write-wins fold made the silently dropped rows the NEWEST ones. See
	// 20260827110000_latest_edits_view.sql.
	const pageIds = (pages ?? []).map((p) => p.id);
	if (pageIds.length > 0) {
		const { data: edits, error: editsError } = await supabase
			.from('latest_edits')
			.select('*')
			.in('page_id', pageIds)
			.order('created_at', { ascending: true });

		if (editsError) {
			console.error('Failed to load edits:', editsError);
		} else {
			editsStore.set((edits as Edit[]) ?? []);
			editsLoaded.set(true);
		}
	}

	// Drafts join the page store before buffered events replay against them.
	await loadDrafts(reviewId);

	// Snapshot is in; replay anything that arrived while it was in flight.
	channel.applyHydration();

	return () => channel.unsubscribe();
}

// Not exported: called only by loadReview above. It is live code -- knip
// flagged the redundant `export`, not the function.
function initializeRealtime(reviewId: string) {
	const channel = supabase.channel(`review-${reviewId}`);

	// Events that land between subscribing and the initial snapshot being applied
	// have nowhere to go: the store is still empty, so a page UPDATE would match
	// no row and be dropped, and a snapshot applied afterwards would overwrite it
	// anyway. They are buffered here and replayed by `applyHydration` once the
	// snapshot is in, which is what closes the query-to-subscribe gap.
	let hydrated = false;
	const buffered: (() => void)[] = [];
	const runOrBuffer = (apply: () => void) => (hydrated ? apply() : buffered.push(apply));

	// Listen for page status changes
	channel.on(
		'postgres_changes',
		{ event: 'UPDATE', schema: 'public', table: 'pages', filter: `review_id=eq.${reviewId}` },
		(payload) => {
			runOrBuffer(() =>
				pagesStore.update((pages) =>
					pages.map((p) => (p.id === payload.new.id ? { ...p, ...payload.new } : p))
				)
			);
		}
	);

	// Listen for new inline edits
	channel.on(
		'postgres_changes',
		{ event: 'INSERT', schema: 'public', table: 'edits' },
		(payload) => {
			runOrBuffer(() =>
				editsStore.update((edits) => {
					// Don't add if we already have it (optimistic UI guard)
					if (edits.find((e) => e.id === payload.new.id)) return edits;
					return [...edits, payload.new as Edit];
				})
			);
		}
	);

	channel.subscribe();

	return {
		/** Replay anything that arrived while the snapshot was being fetched. */
		applyHydration() {
			hydrated = true;
			for (const apply of buffered.splice(0)) apply();
		},
		unsubscribe() {
			supabase.removeChannel(channel);
		}
	};
}

/**
 * Saves a page review decision optimistically
 */
export async function updatePageStatus(
	pageId: string,
	newStatus: ReviewPage['status']
): Promise<boolean> {
	// 1. Optimistic Update (instant UI)
	const previousPages = get(pagesStore);
	pagesStore.update((pages) =>
		pages.map((p) => (p.id === pageId ? { ...p, status: newStatus } : p))
	);

	// 2. Background Sync
	const { error } = await supabase.from('pages').update({ status: newStatus }).eq('id', pageId);

	// 3. Rollback on failure
	//
	// Returns a boolean rather than logging and swallowing. A rolled-back
	// decision is the one failure in this app the reviewer MUST see: the
	// optimistic update already moved the queue row into another group, so a
	// silent rollback reads as "the click did nothing" on a control whose
	// whole output is which pages are approved. `updatePageNotes` already
	// reports this way and ReviewPanel surfaces it; status now matches.
	if (error) {
		console.error('Failed to update status:', error);
		pagesStore.set(previousPages);
		return false;
	}
	return true;
}

/**
 * Saves page decision notes optimistically
 */
export async function updatePageNotes(pageId: string, notes: string): Promise<boolean> {
	const previousPages = get(pagesStore);
	pagesStore.update((pages) =>
		pages.map((p) => (p.id === pageId ? { ...p, manager_notes: notes } : p))
	);

	const { error } = await supabase.from('pages').update({ manager_notes: notes }).eq('id', pageId);

	if (error) {
		console.error('Failed to update notes:', error);
		pagesStore.set(previousPages);
		// Reported so the caller can tell the reviewer. Rolling the store back on
		// its own is invisible while the same page is open: the textarea keeps
		// showing text that was never saved.
		return false;
	}
	return true;
}

/**
 * Saves an inline text edit optimistically.
 *
 * Returns whether the row actually reached the database. Both failure paths
 * below roll the optimistic entry back, and before this returned a boolean they
 * did so silently: `saveAccepted` treated the resolved promise as a save, wrote
 * the rewrite into the corpus and dropped the suggestion, so a reviewer was told
 * an edit was saved that no longer existed anywhere and had no retry path.
 */
export async function saveInlineEdit(
	pageId: string,
	fieldId: string,
	newContent: string,
	/** sha256 of the field's base copy as the reviewer saw it -- the edit's anchor. */
	baseHash: string
): Promise<boolean> {
	const optimisticEdit: Edit = {
		id: 'temp-' + Date.now(),
		page_id: pageId,
		field_id: fieldId,
		new_content: newContent,
		base_hash: baseHash,
		created_at: new Date().toISOString()
	};

	// 1. Optimistic Update
	const previousEdits = get(editsStore);
	editsStore.update((edits) => {
		// Replace if editing the same field ON THIS PAGE, otherwise append. Filtering
		// on field_id alone dropped other pages' edits for the same field name.
		const filtered = edits.filter((e) => !(e.page_id === pageId && e.field_id === fieldId));
		return [...filtered, optimisticEdit];
	});

	// 2. Background Sync
	// user_id has to be set explicitly, and once was not -- every insert failed
	// regardless of session. What refuses an unauthored row is now the `edits`
	// INSERT policy, `WITH CHECK ((select auth.uid()) = user_id)`: NULL = uid()
	// is NULL rather than true. It used to be the column's own NOT NULL, which
	// 20260827100000 dropped so that deleting a reviewer nulls their edits
	// instead of cascading them away.
	const {
		data: { user }
	} = await supabase.auth.getUser();

	if (!user) {
		console.error('Cannot save edit: no authenticated user.');
		editsStore.set(previousEdits);
		return false;
	}

	const editId = crypto.randomUUID();
	ownEditIds.add(editId);
	const { data, error } = await supabase
		.from('edits')
		.insert({
			id: editId,
			page_id: pageId,
			field_id: fieldId,
			new_content: newContent,
			base_hash: baseHash,
			user_id: user.id
		})
		.select()
		.single();

	// 3. Rollback or confirm
	if (error) {
		console.error('Failed to save edit:', error);
		editsStore.set(previousEdits);
		return false;
	}

	if (data) {
		// Swap temporary ID with real database ID
		editsStore.update((edits) => edits.map((e) => (e.id === optimisticEdit.id ? data : e)));
	}
	return true;
}
