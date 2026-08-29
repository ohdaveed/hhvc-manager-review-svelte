import { describe, it, expect } from 'vitest';
import {
	tokenizeMarkdown,
	withoutMarkdownLinks,
	markdownLinksIn,
	normalizeLabel
} from './markdown';
import { allPages } from '$lib/data/index';
import { extractCopy } from './fields';

describe('tokenizeMarkdown', () => {
	it('returns a single text token for copy with no markdown', () => {
		expect(tokenizeMarkdown('Call 311 to report a problem.')).toEqual([
			{ kind: 'text', text: 'Call 311 to report a problem.' }
		]);
	});

	it('returns nothing for an empty string', () => {
		expect(tokenizeMarkdown('')).toEqual([]);
	});

	it('splits a bullet lead-in into strong plus the rest', () => {
		expect(
			tokenizeMarkdown('**Notify your landlord:** Tell the property owner about the problem.')
		).toEqual([
			{ kind: 'strong', text: 'Notify your landlord:' },
			{ kind: 'text', text: ' Tell the property owner about the problem.' }
		]);
	});

	it('keeps two bold spans in one string separate', () => {
		const tokens = tokenizeMarkdown('**One** and **two**');
		expect(tokens.filter((t) => t.kind === 'strong').map((t) => t.text)).toEqual(['One', 'two']);
	});

	it('reads a link as label plus target', () => {
		expect(tokenizeMarkdown('See [the guide](https://sf.gov/x) first.')).toEqual([
			{ kind: 'text', text: 'See ' },
			{ kind: 'link', text: 'the guide', target: 'https://sf.gov/x' },
			{ kind: 'text', text: ' first.' }
		]);
	});

	it('reads an internal page-key target', () => {
		const tokens = tokenizeMarkdown('[What happens after you report](afterReport)');
		expect(tokens).toEqual([
			{ kind: 'link', text: 'What happens after you report', target: 'afterReport' }
		]);
	});

	it('interleaves bold and links in one pass, in source order', () => {
		const tokens = tokenizeMarkdown('**Note:** read [the guide](afterReport) now');
		expect(tokens.map((t) => t.kind)).toEqual(['strong', 'text', 'link', 'text']);
	});

	it('leaves an unbalanced asterisk run as literal text', () => {
		expect(tokenizeMarkdown('2 ** 3 is not bold')).toEqual([
			{ kind: 'text', text: '2 ** 3 is not bold' }
		]);
	});

	it('reassembles to the original string, so nothing is dropped', () => {
		// The renderer emits one node per token; if the concatenation ever stops
		// matching, copy has silently gone missing from the page.
		for (const page of allPages as Record<string, unknown>[]) {
			for (const [key, text] of Object.entries(extractCopy(page as never))) {
				const rebuilt = tokenizeMarkdown(text)
					.map((t) =>
						t.kind === 'strong'
							? `**${t.text}**`
							: t.kind === 'link'
								? `[${t.text}](${t.target})`
								: t.text
					)
					.join('');
				expect(rebuilt, `${String(page.slug)} / ${key}`).toBe(text);
			}
		}
	});
});

describe('the readings the analysis modules share', () => {
	it('reduces a link to its label', () => {
		expect(withoutMarkdownLinks('See [the guide](https://sf.gov/x).')).toBe('See the guide.');
	});

	it('extracts label and url pairs', () => {
		expect(markdownLinksIn('[a](https://x) and [b](afterReport)')).toEqual([
			{ label: 'a', url: 'https://x' },
			{ label: 'b', url: 'afterReport' }
		]);
	});

	it('normalises a label for vague-text comparison', () => {
		expect(normalizeLabel('**Learn more.**')).toBe('learn more');
	});

	it('agrees with the tokenizer about how many links a string has', () => {
		const text = 'See [a](https://x) and **bold** and [b](afterReport).';
		expect(markdownLinksIn(text).length).toBe(
			tokenizeMarkdown(text).filter((t) => t.kind === 'link').length
		);
	});
});
