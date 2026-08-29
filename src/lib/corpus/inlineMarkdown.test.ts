import { describe, it, expect } from 'vitest';
import { parseInline, plainText } from './inlineMarkdown';
import { allPages } from '$lib/data/index';
import { extractCopy } from './fields';

describe('parseInline', () => {
	it('splits bold out of surrounding text', () => {
		expect(parseInline('Review time: **2 days** total')).toEqual([
			{ kind: 'text', text: 'Review time: ' },
			{ kind: 'bold', text: '2 days' },
			{ kind: 'text', text: ' total' }
		]);
	});

	it('treats a link target as an internal key, not a URL', () => {
		expect(parseInline('See [what happens next](afterReport).')).toEqual([
			{ kind: 'text', text: 'See ' },
			{ kind: 'ref', text: 'what happens next', target: 'afterReport' },
			{ kind: 'text', text: '.' }
		]);
	});

	it('is lazy, so two bold runs are two tokens', () => {
		expect(parseInline('**a** and **b**').filter((t) => t.kind === 'bold')).toEqual([
			{ kind: 'bold', text: 'a' },
			{ kind: 'bold', text: 'b' }
		]);
	});

	it('leaves an unmatched marker as literal text', () => {
		expect(parseInline('2 ** 3 is not bold')).toEqual([
			{ kind: 'text', text: '2 ** 3 is not bold' }
		]);
	});

	it('returns nothing for empty or non-string input', () => {
		expect(parseInline('')).toEqual([]);
		expect(parseInline(undefined)).toEqual([]);
		expect(parseInline({ text: 'x' })).toEqual([]);
	});

	it('never emits a token whose text still carries its markers', () => {
		// The guard that matters: if this fails, the page shows raw `**`.
		for (const page of allPages) {
			for (const value of Object.values(extractCopy(page))) {
				if (typeof value !== 'string') continue;
				for (const token of parseInline(value)) {
					if (token.kind === 'text') continue;
					expect(token.text).not.toMatch(/\*\*/);
				}
			}
		}
	});

	it('round-trips every corpus string without losing visible characters', () => {
		// plainText only ever removes markers, so stripping them from the
		// source by hand must land on the same string.
		for (const page of allPages) {
			for (const value of Object.values(extractCopy(page))) {
				if (typeof value !== 'string') continue;
				const byHand = value
					.replace(/\*\*([\s\S]+?)\*\*/g, '$1')
					.replace(/\[([^\]]+)\]\(([^)]*)\)/g, '$1');
				expect(plainText(value)).toBe(byHand);
			}
		}
	});
});
