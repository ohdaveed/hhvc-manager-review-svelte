import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';

const requestGeneration = vi.fn();
vi.mock('$lib/ai/generate', () => ({
	requestGeneration: (...args: unknown[]) => requestGeneration(...args)
}));
vi.mock('$lib/supabase', () => ({
	supabase: {
		auth: {
			getSession: async () => ({
				data: { session: { access_token: 'tok', user: { id: 'u1' } } }
			})
		},
		from: () => ({})
	}
}));

import { deriveFieldKey } from '../src/lib/corpus/fieldKey.js';
import { pageStore, toStorePage } from '../src/lib/stores/pageData.svelte.js';
import {
	createDraft,
	retryDraft,
	draftsStore,
	isStaleDraft,
	type DraftPage
} from '../src/lib/stores/draftPages.js';

const iso = (ms: number) => new Date(ms).toISOString();

const content = {
	slug: 'sf.gov/draft-topic',
	type: 'topic',
	title: 'Drafted topic',
	sections: [{ heading: 'What to know', paragraphs: ['Text'] }, { paragraphs: ['No heading'] }]
};

function readyDraft(over: Partial<DraftPage> = {}): DraftPage {
	return {
		id: 'abc',
		path: 'draft:abc',
		title: 'Drafted topic',
		description: 'd',
		state: 'ready',
		content,
		valid: true,
		issues: [],
		model: 'm',
		created_by: 'u1',
		created_at: iso(0),
		updated_at: iso(0),
		...over
	};
}

beforeEach(() => {
	pageStore.pages = pageStore.pages.filter((p) => !p.id.startsWith('draft:'));
	draftsStore.set([]);
	requestGeneration.mockReset();
	vi.unstubAllGlobals();
});

describe('mergeDraftPages', () => {
	it('gives a merged draft the store id its pages row uses', () => {
		pageStore.mergeDraftPages([readyDraft()]);
		expect(pageStore.pages.find((p) => p.id === 'draft:abc')).toBeTruthy();
	});

	it('derives section field keys the same way the corpus does', () => {
		pageStore.mergeDraftPages([readyDraft()]);
		const page = pageStore.pages.find((p) => p.id === 'draft:abc')!;
		// The second fixture section has no heading: the index-fallback case.
		content.sections.forEach((section, i) => {
			expect(page.sections[i].fieldKey).toBe(deriveFieldKey(section, i));
		});
		expect(page.sections).toEqual(toStorePage(content).sections);
	});

	it('replaces a draft on re-merge instead of appending it twice', () => {
		pageStore.mergeDraftPages([readyDraft()]);
		pageStore.mergeDraftPages([readyDraft({ content: { ...content, title: 'Newer' } })]);
		const hits = pageStore.pages.filter((p) => p.id === 'draft:abc');
		expect(hits).toHaveLength(1);
		expect(hits[0].title).toBe('Newer');
	});

	it('does not merge a draft that is still drafting or failed', () => {
		pageStore.mergeDraftPages([
			readyDraft({ path: 'draft:d1', state: 'drafting' }),
			readyDraft({ path: 'draft:f1', state: 'failed', content: null })
		]);
		expect(pageStore.pages.some((p) => p.id.startsWith('draft:'))).toBe(false);
	});

	it('records the drafted text as the base copy, and a re-merge replaces it', () => {
		pageStore.mergeDraftPages([readyDraft()]);
		expect(pageStore.baseCopyOf('draft:abc', 'title')).toBe(content.title);
		// Writes into the page (a hydrated edit, typing) never move the base.
		pageStore.pages.find((p) => p.id === 'draft:abc')!.title = 'On screen';
		expect(pageStore.baseCopyOf('draft:abc', 'title')).toBe(content.title);

		pageStore.mergeDraftPages([readyDraft({ content: { ...content, title: 'Redrafted' } })]);
		expect(pageStore.baseCopyOf('draft:abc', 'title')).toBe('Redrafted');
	});

	it('keeps an unsaved change on the mockup when the draft page is merged again', () => {
		pageStore.mergeDraftPages([readyDraft()]);
		pageStore.setChange('draft:abc', 'title', 'Typed on the draft');

		// Navigating to `/` and back reloads the review, which re-merges drafts.
		pageStore.mergeDraftPages([readyDraft()]);

		const page = pageStore.pages.find((p) => p.id === 'draft:abc')!;
		expect(page.title).toBe('Typed on the draft');
		expect(pageStore.hasUnsavedChange('draft:abc', 'title')).toBe(true);
		pageStore.unsavedChanges = {};
	});
});

describe('createDraft', () => {
	function stubFetch(order: string[], patchFails = false) {
		const calls: { method: string; body: Record<string, unknown> }[] = [];
		vi.stubGlobal(
			'fetch',
			vi.fn(async (_url: string, init: RequestInit) => {
				const body = JSON.parse(init.body as string);
				calls.push({ method: init.method!, body });
				order.push(init.method!);
				if (init.method === 'POST') {
					return new Response(
						JSON.stringify({ id: 'abc', path: 'draft:abc', title: 'T', state: 'drafting' }),
						{ status: 201 }
					);
				}
				return new Response(JSON.stringify({ ok: true }), { status: patchFails ? 500 : 200 });
			})
		);
		return calls;
	}

	it('leaves the row drafting and rethrows when the PATCH fails', async () => {
		stubFetch([], true);
		requestGeneration.mockResolvedValue({ valid: true, issues: [], result: content });
		await expect(createDraft('a page')).rejects.toThrow(/status 500/);
		expect(get(draftsStore)[0].state).toBe('drafting');
	});

	it('keeps an invalid draft and its issues', async () => {
		const order: string[] = [];
		const calls = stubFetch(order);
		requestGeneration.mockResolvedValue({
			valid: false,
			issues: ['too long'],
			result: content,
			model: 'm1'
		});
		const draft = await createDraft('a page');
		const patch = calls.find((c) => c.method === 'PATCH')!.body;
		expect(patch).toMatchObject({ id: 'abc', content, valid: false, issues: ['too long'] });
		expect(patch.failed).toBeUndefined();
		expect(draft.state).toBe('ready');
		expect(draft.issues).toEqual(['too long']);
		expect(pageStore.pages.some((p) => p.id === 'draft:abc')).toBe(true);
		expect(get(draftsStore)[0].created_by).toBe('u1');
	});

	it('marks a draft failed when the generation throws', async () => {
		const order: string[] = [];
		const calls = stubFetch(order);
		requestGeneration.mockRejectedValue(new Error('boom'));
		const draft = await createDraft('a page');
		expect(calls.find((c) => c.method === 'PATCH')!.body).toEqual({ id: 'abc', failed: true });
		expect(draft.state).toBe('failed');
		expect(pageStore.pages.some((p) => p.id === 'draft:abc')).toBe(false);
	});

	it('calls the model only after the row exists, with a prompt-only request', async () => {
		const order: string[] = [];
		stubFetch(order);
		requestGeneration.mockImplementation(async () => {
			order.push('generate');
			return { valid: true, issues: [], result: content };
		});
		await createDraft('a page');
		expect(order).toEqual(['POST', 'generate', 'PATCH']);
		expect(requestGeneration).toHaveBeenCalledWith({ task: 'content', prompt: 'a page' });
	});

	it('holds the drafting row in the store while generation runs', async () => {
		stubFetch([]);
		let seen: DraftPage[] = [];
		requestGeneration.mockImplementation(async () => {
			seen = get(draftsStore);
			return { valid: true, issues: [], result: content };
		});
		await createDraft('a page');
		expect(seen).toHaveLength(1);
		expect(seen[0].state).toBe('drafting');
	});
});

describe('isStaleDraft', () => {
	it('treats a drafting row older than 90s as stale', () => {
		expect(isStaleDraft({ state: 'drafting', updated_at: iso(Date.now() - 91_000) })).toBe(true);
	});
	it('does not treat a fresh or a settled row as stale', () => {
		expect(isStaleDraft({ state: 'drafting', updated_at: iso(Date.now() - 10_000) })).toBe(false);
		expect(isStaleDraft({ state: 'ready', updated_at: iso(0) })).toBe(false);
	});
});

describe('retryDraft', () => {
	it('re-generates and PATCHes the existing row without a POST or a new row', async () => {
		const methods: string[] = [];
		const bodies: Record<string, unknown>[] = [];
		vi.stubGlobal(
			'fetch',
			vi.fn(async (_url: string, init: RequestInit) => {
				methods.push(init.method!);
				bodies.push(JSON.parse(init.body as string));
				return new Response(JSON.stringify({ ok: true }), { status: 200 });
			})
		);
		const failed = readyDraft({ state: 'failed', content: null, valid: null, issues: null });
		draftsStore.set([failed]);
		requestGeneration.mockResolvedValue({ valid: true, issues: [], result: content });

		const out = await retryDraft(failed);

		expect(methods).toEqual(['PATCH']);
		expect(bodies[0]).toMatchObject({ id: 'abc' });
		expect(requestGeneration).toHaveBeenCalledWith({ task: 'content', prompt: 'd' });
		expect(get(draftsStore)).toHaveLength(1);
		expect(get(draftsStore)[0]).toMatchObject({ id: 'abc', state: 'ready' });
		expect(out.state).toBe('ready');
		expect(pageStore.pages.some((p) => p.id === 'draft:abc')).toBe(true);
	});

	it('shows the row as drafting while the retry runs', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('{}', { status: 200 }))
		);
		const failed = readyDraft({ state: 'failed', content: null });
		draftsStore.set([failed]);
		let seen: DraftPage | undefined;
		requestGeneration.mockImplementation(async () => {
			seen = get(draftsStore)[0];
			return { valid: true, issues: [], result: content };
		});
		await retryDraft(failed);
		expect(seen?.state).toBe('drafting');
	});
});
