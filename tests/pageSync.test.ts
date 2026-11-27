/**
 * Syncing the page store with the live review: which saved edits have expired
 * (ADR 0001) and putting saved edits on the mockup. Both used to live in
 * effects in the review layout, reachable only by mounting it; they are store
 * operations now, so they are tested here with plain rows.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { pageStore } from '../src/lib/stores/pageData.svelte.js';
import { extractCopy } from '../src/lib/corpus/fields';

const page = pageStore.pages.find((p) => p.id === 'report-rats-or-mice')!;
const paragraph = Object.keys(extractCopy(page as never)).find((k) => /\.paragraphs\.0$/.test(k))!;
const live = [{ id: 'row-1', path: page.id }];
const edit = (over: Record<string, unknown> = {}) => ({
	id: 'e1',
	page_id: 'row-1',
	field_id: paragraph,
	new_content: 'Saved wording.',
	created_at: '2026-11-27T00:00:00Z',
	base_hash: 'a-hash-of-some-older-base-copy',
	...over
});

describe('pageStore.syncEditStatus', () => {
	afterEach(() => (pageStore.editStatus = {}));

	it('marks an edit whose base copy has changed as expired', async () => {
		await pageStore.syncEditStatus(live, [edit()], async () => 'the-base-copy-now');
		expect(pageStore.editStatusOf(page.id, paragraph)).toBe('expired');
	});

	it('drops a slow pass that a newer one has overtaken', async () => {
		// Pass 1 hashes slowly and would mark the field expired; pass 2 starts
		// after it with no edits and finishes first. Pass 1 landing last must not
		// put the stale answer back.
		let release!: () => void;
		const gate = new Promise<void>((r) => (release = r));
		const slow = pageStore.syncEditStatus(live, [edit()], async () => {
			await gate;
			return 'the-base-copy-now';
		});
		await pageStore.syncEditStatus(live, [], async () => 'unused');
		release();
		await slow;
		expect(pageStore.editStatusOf(page.id, paragraph)).toBeUndefined();
	});
});

describe('pageStore.hydrate', () => {
	// Puts the base copy back, so later tests see the corpus text.
	afterEach(() => {
		const base = pageStore.baseCopyOf(page.id, paragraph)!;
		pageStore.hydrate({
			livePages: live,
			edits: [edit({ id: 'reset', new_content: base, created_at: '2099-01-01T00:00:00Z' })],
			editsLoaded: true,
			isOwnEdit: () => true
		});
	});

	it('puts a confirmed saved edit on the mockup', () => {
		const changed = pageStore.hydrate({
			livePages: live,
			edits: [edit()],
			editsLoaded: true,
			isOwnEdit: () => true
		});
		expect(changed).toBe(1);
		expect(extractCopy(page as never)[paragraph]).toBe('Saved wording.');
	});
});
