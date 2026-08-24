import { proposedBlocks, sectionBlocks, type Block, type BlockKind } from './blocks';

/**
 * How alike two blocks must read before the diff calls them the same block
 * reworded rather than one dropped and another added.
 *
 * 0.5 on a word-set Dice coefficient: a sentence that keeps half its words is
 * a rewrite, one that keeps fewer is new copy.
 */
export const MATCH_THRESHOLD = 0.5;

const words = (text: string): Set<string> =>
	new Set(
		text
			.toLowerCase()
			.replace(/[^a-z0-9\s]/g, ' ')
			.split(/\s+/)
			.filter(Boolean)
	);

/** Word-set Dice coefficient. 1 is identical, 0 shares nothing. */
export function similarity(a: string, b: string): number {
	const A = words(a);
	const B = words(b);
	if (A.size === 0 && B.size === 0) return 1;
	if (A.size === 0 || B.size === 0) return 0;
	let shared = 0;
	for (const word of A) if (B.has(word)) shared += 1;
	return (2 * shared) / (A.size + B.size);
}

export type Op =
	| { id: string; type: 'keep'; kind: BlockKind; fieldId: string; text: string }
	| {
			id: string;
			type: 'rewrite';
			kind: BlockKind;
			fieldId: string;
			from: string;
			to: string;
			/** The block also changed position. Folded in so one block is one toggle. */
			moved: boolean;
	  }
	| { id: string; type: 'move'; kind: BlockKind; fieldId: string; text: string }
	| {
			id: string;
			type: 'add';
			kind: BlockKind;
			text: string;
			/** The field id this block follows, or null when it leads its kind. */
			afterFieldId: string | null;
	  }
	| { id: string; type: 'drop'; kind: BlockKind; fieldId: string; text: string };

type Pair = { current: Block; proposed: Block };

/** Greedy best-first matching within one kind. */
function matchKind(currentBlocks: Block[], proposedBlocks_: Block[]): Pair[] {
	const pairs: Pair[] = [];
	const takenCurrent = new Set<number>();
	const takenProposed = new Set<number>();

	// Exact first, so an unchanged block can never be stolen by a merely
	// similar one that happens to score higher against it.
	currentBlocks.forEach((c, ci) => {
		proposedBlocks_.forEach((p, pi) => {
			if (takenCurrent.has(ci) || takenProposed.has(pi)) return;
			if (similarity(c.text, p.text) === 1) {
				pairs.push({ current: c, proposed: p });
				takenCurrent.add(ci);
				takenProposed.add(pi);
			}
		});
	});

	const candidates: { score: number; ci: number; pi: number }[] = [];
	currentBlocks.forEach((c, ci) => {
		if (takenCurrent.has(ci)) return;
		proposedBlocks_.forEach((p, pi) => {
			if (takenProposed.has(pi)) return;
			const score = similarity(c.text, p.text);
			if (score >= MATCH_THRESHOLD) candidates.push({ score, ci, pi });
		});
	});
	candidates.sort((a, b) => b.score - a.score || a.ci - b.ci || a.pi - b.pi);

	for (const { ci, pi } of candidates) {
		if (takenCurrent.has(ci) || takenProposed.has(pi)) continue;
		pairs.push({ current: currentBlocks[ci], proposed: proposedBlocks_[pi] });
		takenCurrent.add(ci);
		takenProposed.add(pi);
	}

	return pairs;
}

const KINDS: BlockKind[] = ['heading', 'paragraph', 'bullet', 'calloutTitle', 'calloutText'];

/**
 * The differences between the section as it stands and the section as proposed.
 *
 * Ops come back in proposed reading order, with drops appended: a dropped block
 * has no position in the new section to be listed at.
 */
export function diffSection(current: unknown, proposed: unknown, sectionKey: string): Op[] {
	const currentBlocks = sectionBlocks(current, sectionKey);
	const nextBlocks = proposedBlocks(proposed);

	const pairs: Pair[] = [];
	for (const kind of KINDS) {
		pairs.push(
			...matchKind(
				currentBlocks.filter((b) => b.kind === kind),
				nextBlocks.filter((b) => b.kind === kind)
			)
		);
	}

	const pairByProposed = new Map<Block, Block>();
	const matchedCurrent = new Set<Block>();
	for (const pair of pairs) {
		pairByProposed.set(pair.proposed, pair.current);
		matchedCurrent.add(pair.current);
	}

	// Ranks among MATCHED blocks only, per kind. Using positions in the full
	// list would mark every block after a drop as moved.
	const rankOf = (blocks: Block[], kind: BlockKind, block: Block): number =>
		blocks.filter((b) => b.kind === kind).indexOf(block);

	const matchedCurrentByKind = currentBlocks.filter((b) => matchedCurrent.has(b));
	const matchedProposedByKind = nextBlocks.filter((b) => pairByProposed.has(b));

	let counter = 0;
	const nextId = (type: string, kind: BlockKind) => `${type}:${kind}:${counter++}`;

	const ops: Op[] = [];

	for (const block of nextBlocks) {
		const match = pairByProposed.get(block);

		if (!match) {
			// The nearest preceding block of the same kind that DOES have an
			// address. Slice 3's shape row anchors the insertion on it.
			const sameKind = nextBlocks.filter((b) => b.kind === block.kind);
			const before = sameKind.slice(0, sameKind.indexOf(block)).reverse();
			const anchor = before.map((b) => pairByProposed.get(b)).find(Boolean);
			ops.push({
				id: nextId('add', block.kind),
				type: 'add',
				kind: block.kind,
				text: block.text,
				afterFieldId: anchor?.fieldId ?? null
			});
			continue;
		}

		const moved =
			rankOf(matchedCurrentByKind, block.kind, match) !==
			rankOf(matchedProposedByKind, block.kind, block);

		if (match.text !== block.text) {
			ops.push({
				id: nextId('rewrite', block.kind),
				type: 'rewrite',
				kind: block.kind,
				fieldId: match.fieldId as string,
				from: match.text,
				to: block.text,
				moved
			});
		} else if (moved) {
			ops.push({
				id: nextId('move', block.kind),
				type: 'move',
				kind: block.kind,
				fieldId: match.fieldId as string,
				text: match.text
			});
		} else {
			ops.push({
				id: nextId('keep', block.kind),
				type: 'keep',
				kind: block.kind,
				fieldId: match.fieldId as string,
				text: match.text
			});
		}
	}

	for (const block of currentBlocks) {
		if (matchedCurrent.has(block)) continue;
		ops.push({
			id: nextId('drop', block.kind),
			type: 'drop',
			kind: block.kind,
			fieldId: block.fieldId as string,
			text: block.text
		});
	}

	return ops;
}
