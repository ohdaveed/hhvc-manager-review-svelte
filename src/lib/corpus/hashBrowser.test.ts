import { describe, expect, it } from 'vitest';
import { allPages } from '$lib/data/index';
import { extractCopy, type CorpusPage } from './fields';
import { hashText } from './hash';
import { hashTextBrowser } from './hashBrowser';

describe('hashTextBrowser', () => {
	it('matches hashText on every field of every corpus page', async () => {
		let compared = 0;
		for (const page of allPages) {
			for (const text of Object.values(extractCopy(page as CorpusPage))) {
				expect(await hashTextBrowser(text)).toBe(hashText(text));
				compared++;
			}
		}
		// Guards against the loop quietly comparing nothing.
		expect(compared).toBeGreaterThan(500);
	});

	it('matches on text outside ASCII, where an encoding slip would show', async () => {
		for (const text of ['', 'café — “quoted” ½', '中文 / Español / Tiếng Việt', 'emoji 🐀']) {
			expect(await hashTextBrowser(text)).toBe(hashText(text));
		}
	});
});
