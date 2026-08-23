import { writable, get } from 'svelte/store';
import { supabase, ensureDevSession } from '$lib/supabase';

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
};

// Our central stores
export const pagesStore = writable<ReviewPage[]>([]);
export const editsStore = writable<Edit[]>([]);

/**
 * Loads all pages for the most recent review and initializes realtime.
 * Call this once from the review layout's onMount.
 * Returns the unsubscribe cleanup function.
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

	if (reviewsError || !reviews || reviews.length === 0) {
		console.error('No review found:', reviewsError);
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
		return () => {};
	}

	pagesStore.set((pages as ReviewPage[]) ?? []);

	// Hydrate saved edits too. initializeRealtime only observes future inserts,
	// so without this a reload leaves editsStore empty and HelpPanel silently
	// builds a Karl transcript with none of the reviewer's previous edits in it.
	const pageIds = (pages ?? []).map((p) => p.id);
	if (pageIds.length > 0) {
		const { data: edits, error: editsError } = await supabase
			.from('edits')
			.select('*')
			.in('page_id', pageIds)
			.order('created_at', { ascending: true });

		if (editsError) {
			console.error('Failed to load edits:', editsError);
		} else {
			editsStore.set((edits as Edit[]) ?? []);
		}
	}

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
export async function updatePageStatus(pageId: string, newStatus: ReviewPage['status']) {
	// 1. Optimistic Update (instant UI)
	const previousPages = get(pagesStore);
	pagesStore.update((pages) =>
		pages.map((p) => (p.id === pageId ? { ...p, status: newStatus } : p))
	);

	// 2. Background Sync
	const { error } = await supabase.from('pages').update({ status: newStatus }).eq('id', pageId);

	// 3. Rollback on failure
	if (error) {
		console.error('Failed to update status:', error);
		pagesStore.set(previousPages);
		// In a real app, trigger a toast notification here
	}
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
	newContent: string
): Promise<boolean> {
	const optimisticEdit: Edit = {
		id: 'temp-' + Date.now(),
		page_id: pageId,
		field_id: fieldId,
		new_content: newContent,
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
	// edits.user_id is `NOT NULL REFERENCES auth.users(id)` and was never being
	// set, so every insert failed its NOT NULL constraint regardless of session.
	const {
		data: { user }
	} = await supabase.auth.getUser();

	if (!user) {
		console.error('Cannot save edit: no authenticated user.');
		editsStore.set(previousEdits);
		return false;
	}

	const { data, error } = await supabase
		.from('edits')
		.insert({ page_id: pageId, field_id: fieldId, new_content: newContent, user_id: user.id })
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
