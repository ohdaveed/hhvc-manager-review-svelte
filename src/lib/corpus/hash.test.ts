import { describe, it, expect } from 'vitest';
import { hashText, hashFields } from './hash.js';

describe('hashText', () => {
	it('is a stable hex sha256', () => {
		expect(hashText('hello')).toBe(hashText('hello'));
		expect(hashText('hello')).toMatch(/^[0-9a-f]{64}$/);
	});

	it('is sensitive to content', () => {
		expect(hashText('hello')).not.toBe(hashText('hello '));
	});
});

describe('hashFields', () => {
	it('is stable under key insertion order', () => {
		const a = hashFields({ title: 'T', summary: 'S', 'audience.0': 'A' });
		const b = hashFields({ 'audience.0': 'A', title: 'T', summary: 'S' });
		expect(a.pageHash).toBe(b.pageHash);
		expect(a.fieldHashes).toEqual(b.fieldHashes);
	});

	it('changes when any field changes', () => {
		const before = hashFields({ title: 'T', summary: 'S' });
		const after = hashFields({ title: 'T', summary: 'S!' });
		expect(after.pageHash).not.toBe(before.pageHash);
		expect(after.fieldHashes['title']).toBe(before.fieldHashes['title']);
		expect(after.fieldHashes['summary']).not.toBe(before.fieldHashes['summary']);
	});

	it('changes when a field is added or removed', () => {
		const base = hashFields({ title: 'T' });
		expect(hashFields({ title: 'T', summary: 'S' }).pageHash).not.toBe(base.pageHash);
		expect(hashFields({}).pageHash).not.toBe(base.pageHash);
	});

	it('gives every field its own hash', () => {
		const { fieldHashes } = hashFields({ title: 'same', summary: 'same' });
		expect(fieldHashes['title']).toBe(hashText('same'));
		expect(fieldHashes['summary']).toBe(hashText('same'));
	});
});
