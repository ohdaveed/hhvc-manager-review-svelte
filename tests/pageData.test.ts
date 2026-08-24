import { describe, it, expect, beforeEach } from 'vitest';
import { pageStore } from '../src/lib/stores/pageData.svelte.js';

describe('Page Data Store', () => {
	it('should initialize with all ported pages', () => {
		expect(pageStore.pages.length).toBeGreaterThan(0);
	});

	it('should allow adding a page', () => {
		const initialCount = pageStore.pages.length;
		pageStore.addPage({ id: 'test-page', title: 'Test Page' });
		expect(pageStore.pages.length).toBe(initialCount + 1);
		expect(pageStore.pages[pageStore.pages.length - 1].id).toBe('test-page');
	});
});

describe('section selection and rethink state', () => {
	beforeEach(() => {
		pageStore.clearSelection();
		pageStore.clearSectionSelection();
		pageStore.enterPage(undefined);
	});

	it('is a different selection kind -- picking a section clears the field selection', () => {
		pageStore.select('title');
		pageStore.selectSection('what-we-do');
		expect(pageStore.selectedSectionKey).toBe('what-we-do');
		expect(pageStore.selectedFieldIds).toEqual([]);
	});

	it('and picking a field clears the section selection', () => {
		pageStore.selectSection('what-we-do');
		pageStore.select('title');
		expect(pageStore.selectedSectionKey).toBeUndefined();
	});

	it('drops the selection and any proposal when the page changes', () => {
		pageStore.enterPage('page-a');
		pageStore.selectSection('what-we-do');
		pageStore.rethink = {
			state: 'ready',
			pageId: 'page-a',
			sectionKey: 'what-we-do',
			result: {
				rationale: '',
				ops: [],
				otherSections: [],
				karlBefore: '',
				karlAfter: '',
				karlChanged: false,
				structureChanged: false,
				model: '',
				disclosure: ''
			},
			decisions: {}
		};

		pageStore.enterPage('page-b');

		expect(pageStore.selectedSectionKey).toBeUndefined();
		expect(pageStore.rethink.state).toBe('idle');
	});

	it('accepts every op by default except a drop', () => {
		const ops = [
			{
				id: 'rewrite:heading:0',
				type: 'rewrite',
				kind: 'heading',
				fieldId: 'f',
				from: 'a',
				to: 'b',
				moved: false
			},
			{ id: 'drop:bullet:1', type: 'drop', kind: 'bullet', fieldId: 'g', text: 'gone' }
		] as never[];

		expect(pageStore.isOpAccepted(ops[0])).toBe(true);
		expect(pageStore.isOpAccepted(ops[1])).toBe(false);
	});

	it('remembers a toggled decision, and counts what would apply', () => {
		pageStore.rethink = {
			state: 'ready',
			pageId: 'page-a',
			sectionKey: 'what-we-do',
			result: {
				rationale: '',
				otherSections: [],
				model: '',
				disclosure: '',
				ops: [
					{
						id: 'rewrite:heading:0',
						type: 'rewrite',
						kind: 'heading',
						fieldId: 'f',
						from: 'a',
						to: 'b',
						moved: false
					},
					{ id: 'drop:bullet:1', type: 'drop', kind: 'bullet', fieldId: 'g', text: 'gone' },
					{ id: 'keep:bullet:2', type: 'keep', kind: 'bullet', fieldId: 'h', text: 'stays' }
				]
			},
			decisions: {}
		} as never;

		expect(pageStore.acceptedOpCount()).toBe(1); // the rewrite; keep is not a change

		pageStore.setOpAccepted('drop:bullet:1', true);
		expect(pageStore.acceptedOpCount()).toBe(2);

		pageStore.setOpAccepted('rewrite:heading:0', false);
		expect(pageStore.acceptedOpCount()).toBe(1);
	});
});
