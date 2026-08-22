import { writable, get } from 'svelte/store';
import { supabase } from '$lib/supabase';

// Define the shape of our data
export type ReviewPage = {
	id: string;
	review_id: string;
	path: string;
	status: 'needs-review' | 'approved' | 'blocked' | 'revise';
	manager_notes?: string;
	page_checks?: any;
	title: string; // denormalized for easy rendering
};

export type Edit = {
	id?: string;
	page_id: string;
	field_id: string;
	new_content: string;
};

// Our central stores
export const pagesStore = writable<ReviewPage[]>([]);
export const editsStore = writable<Edit[]>([]);

/**
 * Initializes the realtime subscriptions for a specific review session
 */
export function initializeRealtime(reviewId: string) {
	const channel = supabase.channel(`review-${reviewId}`);

	// Listen for page status changes
	channel.on(
		'postgres_changes',
		{ event: 'UPDATE', schema: 'public', table: 'pages', filter: `review_id=eq.${reviewId}` },
		(payload) => {
			pagesStore.update((pages) =>
				pages.map((p) => (p.id === payload.new.id ? { ...p, ...payload.new } : p))
			);
		}
	);

	// Listen for new inline edits
	channel.on(
		'postgres_changes',
		{ event: 'INSERT', schema: 'public', table: 'edits' },
		(payload) => {
			editsStore.update((edits) => {
				// Don't add if we already have it (optimistic UI guard)
				if (edits.find((e) => e.id === payload.new.id)) return edits;
				return [...edits, payload.new as Edit];
			});
		}
	);

	channel.subscribe();
	return () => {
		supabase.removeChannel(channel);
	};
}

/**
 * Saves a page review decision optimistically
 */
export async function updatePageStatus(pageId: string, newStatus: ReviewPage['status']) {
	// 1. Optimistic Update (instant UI)
	let previousPages = get(pagesStore);
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
export async function updatePageNotes(pageId: string, notes: string) {
	let previousPages = get(pagesStore);
	pagesStore.update((pages) =>
		pages.map((p) => (p.id === pageId ? { ...p, manager_notes: notes } : p))
	);

	const { error } = await supabase.from('pages').update({ manager_notes: notes }).eq('id', pageId);

	if (error) {
		console.error('Failed to update notes:', error);
		pagesStore.set(previousPages);
	}
}

/**
 * Saves an inline text edit optimistically
 */
export async function saveInlineEdit(pageId: string, fieldId: string, newContent: string) {
	const optimisticEdit: Edit = {
		id: 'temp-' + Date.now(),
		page_id: pageId,
		field_id: fieldId,
		new_content: newContent
	};

	// 1. Optimistic Update
	let previousEdits = get(editsStore);
	editsStore.update((edits) => {
		// Replace if editing the same field, otherwise append
		const filtered = edits.filter((e) => e.field_id !== fieldId);
		return [...filtered, optimisticEdit];
	});

	// 2. Background Sync
	const { data, error } = await supabase
		.from('edits')
		.insert({ page_id: pageId, field_id: fieldId, new_content: newContent })
		.select()
		.single();

	// 3. Rollback or confirm
	if (error) {
		console.error('Failed to save edit:', error);
		editsStore.set(previousEdits);
	} else if (data) {
		// Swap temporary ID with real database ID
		editsStore.update((edits) => edits.map((e) => (e.id === optimisticEdit.id ? data : e)));
	}
}
