import { describe, it, expect } from 'vitest';
import { sectionBlocks, proposedBlocks } from './blocks';

const section = {
	heading: 'What we do',
	paragraphs: ['Our work covers:', { text: 'Unsourced.', unverified: true }],
	bullets: ['Rats', 'Garbage'],
	callout: { title: 'Emergency', text: 'Call 311.' }
};

describe('sectionBlocks', () => {
	it('flattens every in-scope block with its field id, in reading order', () => {
		expect(sectionBlocks(section, 'what-we-do')).toEqual([
			{ kind: 'heading', index: 0, text: 'What we do', fieldId: 'sections.what-we-do.heading' },
			{
				kind: 'paragraph',
				index: 0,
				text: 'Our work covers:',
				fieldId: 'sections.what-we-do.paragraphs.0'
			},
			{
				kind: 'paragraph',
				index: 1,
				text: 'Unsourced.',
				fieldId: 'sections.what-we-do.paragraphs.1'
			},
			{ kind: 'bullet', index: 0, text: 'Rats', fieldId: 'sections.what-we-do.bullets.0' },
			{ kind: 'bullet', index: 1, text: 'Garbage', fieldId: 'sections.what-we-do.bullets.1' },
			{
				kind: 'calloutTitle',
				index: 0,
				text: 'Emergency',
				fieldId: 'sections.what-we-do.callout.title'
			},
			{
				kind: 'calloutText',
				index: 0,
				text: 'Call 311.',
				fieldId: 'sections.what-we-do.callout.text'
			}
		]);
	});

	it('unwraps the {text, unverified} entry shape rather than stringifying it', () => {
		const blocks = sectionBlocks({ paragraphs: [{ text: 'Wrapped.' }] }, 'k');
		expect(blocks[0].text).toBe('Wrapped.');
	});

	it('ignores block types out of scope for slice 1', () => {
		const blocks = sectionBlocks(
			{ heading: 'H', steps: [{ title: 'S' }], cards: [{ title: 'C' }] },
			'k'
		);
		expect(blocks.map((b) => b.kind)).toEqual(['heading']);
	});

	it('returns nothing for a section with no in-scope copy', () => {
		expect(sectionBlocks({ cards: [{ title: 'C' }] }, 'k')).toEqual([]);
	});
});

describe('proposedBlocks', () => {
	it('addresses nothing -- a proposed block has no field until the diff matches it', () => {
		const blocks = proposedBlocks(section);
		expect(blocks.every((b) => b.fieldId === null)).toBe(true);
		expect(blocks.map((b) => b.text)).toEqual([
			'What we do',
			'Our work covers:',
			'Unsourced.',
			'Rats',
			'Garbage',
			'Emergency',
			'Call 311.'
		]);
	});
});
