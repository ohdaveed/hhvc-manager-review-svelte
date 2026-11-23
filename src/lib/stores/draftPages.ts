import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase';
import { requestGeneration } from '$lib/ai/generate';
import { pageStore } from './pageData.svelte';

export type DraftPage = {
	id: string;
	path: string;
	title: string;
	description: string;
	state: 'drafting' | 'ready' | 'failed';
	content: object | null;
	valid: boolean | null;
	issues: string[] | null;
	model: string | null;
	/** Who asked for the draft. Null once that account is deleted. */
	created_by: string | null;
	created_at: string;
	updated_at: string;
};

/** A `drafting` row untouched this long was abandoned (tab closed, function killed). */
export const DRAFT_STALE_MS = 90_000;

export const draftsStore = writable<DraftPage[]>([]);

export function isStaleDraft(
	draft: Pick<DraftPage, 'state' | 'updated_at'>,
	now: number = Date.now()
): boolean {
	return draft.state === 'drafting' && now - Date.parse(draft.updated_at) > DRAFT_STALE_MS;
}

export async function loadDrafts(reviewId: string): Promise<void> {
	const { data, error } = await supabase.from('draft_pages').select('*').eq('review_id', reviewId);
	if (error) {
		// Logged, not thrown, like the edits hydration: the corpus still reviews.
		console.error('Failed to load drafts:', error);
		return;
	}
	const drafts = (data as DraftPage[]) ?? [];
	draftsStore.set(drafts);
	pageStore.mergeDraftPages(drafts);
}

async function authedFetch(method: 'POST' | 'PATCH', body: Record<string, unknown>) {
	const {
		data: { session }
	} = await supabase.auth.getSession();
	if (!session) throw new Error('You must be signed in to draft a page.');
	const res = await fetch('/api/pages', {
		method,
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${session.access_token}`
		},
		body: JSON.stringify(body)
	});
	if (!res.ok) throw new Error(`Draft request failed with status ${res.status}.`);
	return res;
}

function replaceDraft(next: DraftPage) {
	draftsStore.update((all) => all.map((d) => (d.id === next.id ? next : d)));
}

/**
 * Writes the row first, then calls the model, then records the outcome.
 *
 * The row-first order is required: Netlify kills a function at 60s, and the
 * reviewer's description has to survive that. The `drafting` row is held in
 * `draftsStore` as soon as the POST answers. Resolves only once generation has
 * finished, with the final row. A generation failure still resolves, with a
 * `failed` row, so only a failed POST or PATCH throws. If the tab closes
 * mid-way the row stays `drafting` and reads as stale after `DRAFT_STALE_MS`.
 *
 * An invalid draft is kept: it is saved as `ready` with `valid: false` and its
 * issues, because the reviewer's job is to edit an imperfect draft.
 */
export async function createDraft(description: string): Promise<DraftPage> {
	const created = (await (await authedFetch('POST', { description })).json()) as {
		id: string;
		path: string;
		title: string;
	};
	const now = new Date().toISOString();
	const {
		data: { session }
	} = await supabase.auth.getSession();
	const drafting: DraftPage = {
		id: created.id,
		path: created.path,
		title: created.title,
		description: description.trim(),
		state: 'drafting',
		content: null,
		valid: null,
		issues: null,
		model: null,
		created_by: session?.user?.id ?? null,
		created_at: now,
		updated_at: now
	};
	draftsStore.update((all) => [...all, drafting]);

	let out: Awaited<ReturnType<typeof requestGeneration>> | null = null;
	try {
		out = await requestGeneration({ task: 'content', prompt: description });
	} catch (err) {
		console.error('Draft generation failed:', err);
	}

	let outcome: DraftPage;
	let patch: Record<string, unknown>;
	if (out) {
		const valid = out.valid === true;
		const issues: string[] = Array.isArray(out.issues) ? out.issues : [];
		const model: string | null = typeof out.model === 'string' ? out.model : null;
		patch = { id: created.id, content: out.result, valid, issues, ...(model && { model }) };
		outcome = {
			...drafting,
			state: 'ready',
			content: out.result,
			valid,
			issues,
			model,
			updated_at: new Date().toISOString()
		};
	} else {
		patch = { id: created.id, failed: true };
		outcome = { ...drafting, state: 'failed', updated_at: new Date().toISOString() };
	}

	await authedFetch('PATCH', patch);
	replaceDraft(outcome);
	pageStore.mergeDraftPages([outcome]);
	return outcome;
}
