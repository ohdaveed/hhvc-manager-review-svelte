// src/lib/rethink/diff.test.ts
import { describe, it, expect } from 'vitest';
import { diffSection, similarity, MATCH_THRESHOLD } from './diff';

const current = {
	heading: 'What we do',
	paragraphs: ['Our work covers the following areas:'],
	bullets: [
		'Investigating reports of rats and mice',
		'Inspecting apartments',
		'Answering questions'
	]
};

describe('similarity', () => {
	it('scores identical text 1 and unrelated text near 0', () => {
		expect(similarity('rats and mice', 'rats and mice')).toBe(1);
		expect(similarity('rats and mice', 'zoning permit appeals')).toBeLessThan(0.2);
	});

	it('ignores case and punctuation, so a reworded sentence still matches', () => {
		expect(similarity('Inspecting apartments.', 'inspecting apartments')).toBe(1);
		expect(similarity('Inspecting apartments', 'Inspecting apartments and hotels')).toBeGreaterThan(
			MATCH_THRESHOLD
		);
	});

	it('scores two empty strings 1 rather than dividing by zero', () => {
		expect(similarity('', '')).toBe(1);
	});
});

describe('diffSection', () => {
	it('reports an unchanged block as keep', () => {
		const ops = diffSection(current, current, 'what-we-do');
		expect(ops.every((op) => op.type === 'keep')).toBe(true);
		expect(ops).toHaveLength(5);
	});

	it('reports a reworded block as a rewrite against its own field id', () => {
		const proposed = { ...current, heading: 'What we can inspect' };
		const ops = diffSection(current, proposed, 'what-we-do');

		expect(ops.find((op) => op.kind === 'heading')).toMatchObject({
			type: 'rewrite',
			fieldId: 'sections.what-we-do.heading',
			from: 'What we do',
			to: 'What we can inspect',
			moved: false
		});
	});

	it('reports a block only the proposal has as an add, anchored after its neighbour', () => {
		const proposed = { ...current, bullets: [...current.bullets, 'Following up on violations'] };
		const ops = diffSection(current, proposed, 'what-we-do');
		const add = ops.find((op) => op.type === 'add');
		expect(add).toMatchObject({
			type: 'add',
			kind: 'bullet',
			text: 'Following up on violations',
			afterFieldId: 'sections.what-we-do.bullets.2'
		});
	});

	it('reports a block only the current section has as a drop', () => {
		const proposed = { ...current, bullets: ['Investigating reports of rats and mice'] };
		const ops = diffSection(current, proposed, 'what-we-do');
		expect(ops.filter((op) => op.type === 'drop').map((op) => op.text)).toEqual([
			'Inspecting apartments',
			'Answering questions'
		]);
	});

	it('reports a reordered block as a move, and leaves its unmoved siblings alone', () => {
		const proposed = {
			...current,
			bullets: [
				'Answering questions',
				'Investigating reports of rats and mice',
				'Inspecting apartments'
			]
		};
		const ops = diffSection(current, proposed, 'what-we-do');
		const bulletOps = ops.filter((op) => op.kind === 'bullet');
		const moved = bulletOps.filter((op) => op.type === 'move');
		expect(moved).toHaveLength(1);
		expect(moved[0]).toMatchObject({ type: 'move', text: 'Answering questions' });
		expect(bulletOps.filter((op) => op.type === 'keep').map((op) => op.text)).toEqual([
			'Investigating reports of rats and mice',
			'Inspecting apartments'
		]);
	});

	it('does not mark surviving blocks as moved just because an earlier one was dropped', () => {
		const proposed = { ...current, bullets: ['Inspecting apartments', 'Answering questions'] };
		const ops = diffSection(current, proposed, 'what-we-do');
		expect(ops.some((op) => op.type === 'move')).toBe(false);
		expect(ops.filter((op) => op.type === 'drop')).toHaveLength(1);
	});

	it('emits one op per block when text and position both change', () => {
		const proposed = {
			...current,
			bullets: [
				'Answering questions from tenants',
				'Investigating reports of rats and mice',
				'Inspecting apartments'
			]
		};
		const ops = diffSection(current, proposed, 'what-we-do');
		const forThatBullet = ops.filter(
			(op) => 'fieldId' in op && op.fieldId === 'sections.what-we-do.bullets.2'
		);
		expect(forThatBullet).toHaveLength(1);
		expect(forThatBullet[0]).toMatchObject({ type: 'rewrite', moved: true });
	});

	it('gives every op a stable, unique id so a toggle survives a re-render', () => {
		const proposed = { ...current, bullets: [...current.bullets, 'A new bullet'] };
		const ops = diffSection(current, proposed, 'what-we-do');
		const ids = ops.map((op) => op.id);
		expect(new Set(ids).size).toBe(ids.length);
		expect(diffSection(current, proposed, 'what-we-do').map((op) => op.id)).toEqual(ids);
	});
});
