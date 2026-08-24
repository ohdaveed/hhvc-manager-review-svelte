import { entryText } from '$lib/corpus/fieldResolver';

/**
 * The block types a Rethink may touch in slice 1 (decision 16).
 *
 * `steps` and `cards` are deliberately absent: both carry nested structure that
 * would each need their own diff treatment, and adding them turns one feature
 * into three.
 */
export type BlockKind = 'heading' | 'paragraph' | 'bullet' | 'calloutTitle' | 'calloutText';

export type Block = {
	kind: BlockKind;
	/** Position within its own kind, as authored. */
	index: number;
	text: string;
	/** The address this block already has, or null for a proposed one. */
	fieldId: string | null;
};

/** Walks a section in reading order, asking `address` for each block's id. */
function walk(section: unknown, address: (path: string) => string | null): Block[] {
	const s = (section ?? {}) as Record<string, unknown>;
	const blocks: Block[] = [];

	if (typeof s.heading === 'string' && s.heading !== '') {
		blocks.push({ kind: 'heading', index: 0, text: s.heading, fieldId: address('heading') });
	}

	const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

	list(s.paragraphs).forEach((entry, index) => {
		const text = entryText(entry);
		if (text !== '') {
			blocks.push({ kind: 'paragraph', index, text, fieldId: address(`paragraphs.${index}`) });
		}
	});

	list(s.bullets).forEach((entry, index) => {
		const text = entryText(entry);
		if (text !== '') {
			blocks.push({ kind: 'bullet', index, text, fieldId: address(`bullets.${index}`) });
		}
	});

	const callout = (s.callout ?? {}) as { title?: unknown; text?: unknown };
	if (typeof callout.title === 'string' && callout.title !== '') {
		blocks.push({
			kind: 'calloutTitle',
			index: 0,
			text: callout.title,
			fieldId: address('callout.title')
		});
	}
	if (typeof callout.text === 'string' && callout.text !== '') {
		blocks.push({
			kind: 'calloutText',
			index: 0,
			text: callout.text,
			fieldId: address('callout.text')
		});
	}

	return blocks;
}

/** The current section's blocks, each carrying the field id that addresses it. */
export function sectionBlocks(section: unknown, sectionKey: string): Block[] {
	return walk(section, (path) => `sections.${sectionKey}.${path}`);
}

/**
 * A proposed section's blocks, addressing nothing.
 *
 * Deliberately not `sectionBlocks(proposed, key)`: positional ids derived from
 * the model's output would look addressable while naming whatever happened to
 * sit at that index in the corpus.
 */
export function proposedBlocks(section: unknown): Block[] {
	return walk(section, () => null);
}
