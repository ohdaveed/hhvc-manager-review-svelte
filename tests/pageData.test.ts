import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fitFrame, pageStore } from '../src/lib/stores/pageData.svelte.js';

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

	it('re-selecting the section already selected leaves a request in flight alone', () => {
		// The reset used to be unconditional, so a second click on the same
		// section dropped `rethink` to idle and re-enabled submit -- while
		// RethinkPanel's abort effect, keyed on the section, saw no change and
		// aborted nothing. That bought a second metered call whose response
		// raced the first.
		pageStore.selectSection('what-we-do');
		pageStore.rethink = { state: 'loading', pageId: 'page-a', sectionKey: 'what-we-do' };

		pageStore.selectSection('what-we-do');

		expect(pageStore.rethink.state).toBe('loading');
	});

	it('re-selecting the section already selected keeps a ready proposal and its decisions', () => {
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
			decisions: { 'drop:bullet:2': true }
		};

		pageStore.selectSection('what-we-do');

		expect(pageStore.rethink.state).toBe('ready');
		expect(pageStore.rethink).toMatchObject({ decisions: { 'drop:bullet:2': true } });
	});

	it('but moving to a different section does drop the previous proposal', () => {
		pageStore.selectSection('what-we-do');
		pageStore.rethink = { state: 'loading', pageId: 'page-a', sectionKey: 'what-we-do' };

		pageStore.selectSection('who-we-are');

		expect(pageStore.rethink.state).toBe('idle');
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

describe('fitFrame', () => {
	it('scales a desktop layout down to a pane narrower than 1024px', () => {
		const frame = fitFrame(683);
		expect(frame?.width).toBe(1024);
		expect(frame?.scale).toBeCloseTo(683 / 1024);
	});

	it('sets no frame when the pane already fits a desktop layout', () => {
		expect(fitFrame(1024)).toBeNull();
		expect(fitFrame(1300)).toBeNull();
	});

	it('reflows below half desktop size while the pane is still phone-wide', () => {
		expect(fitFrame(512)).toEqual({ width: 1024, scale: 0.5 });
		expect(fitFrame(511)).toBeNull();
		expect(fitFrame(390)).toBeNull();
	});

	it('zooms a real phone width into a pane narrower than any phone', () => {
		const frame = fitFrame(278);
		expect(frame?.width).toBe(390);
		expect(frame?.scale).toBeCloseTo(278 / 390);
	});

	it('sets no frame before the pane has been measured', () => {
		expect(fitFrame(0)).toBeNull();
	});
});

describe('rail default', () => {
	it('opens the queue on a fresh load at 1440 -- no viewport-based default', () => {
		localStorage.clear();
		window.innerWidth = 1440;
		pageStore.railCollapsed = { queue: false, panel: false };
		pageStore.loadRailState();
		expect(pageStore.railCollapsed).toEqual({ queue: false, panel: false });
	});
});

describe('unsaved changes', () => {
	const A = () => pageStore.pages[0];
	const B = () => pageStore.pages[1];
	let titleA: string;
	let titleB: string;

	beforeEach(() => {
		pageStore.enterPage(undefined);
		pageStore.unsavedChanges = {};
		titleA = A().title;
		titleB = B().title;
		pageStore.enterPage(A().id);
		pageStore.select('title');
	});

	afterEach(() => {
		pageStore.unsavedChanges = {};
		A().title = titleA;
		B().title = titleB;
	});

	it('shows the unsaved change on the page as it is typed and remembers the original', () => {
		expect(pageStore.setChange(A().id, 'title', 'Typed')).toBe(true);
		expect(A().title).toBe('Typed');
		expect(pageStore.getChange(A().id, 'title')).toEqual({
			pageId: A().id,
			fieldId: 'title',
			original: titleA,
			value: 'Typed'
		});
		pageStore.setChange(A().id, 'title', 'Typed more');
		expect(pageStore.getChange(A().id, 'title')?.original).toBe(titleA);
		expect(pageStore.hasUnsavedChange(A().id, 'title')).toBe(true);
	});

	it('is not dirty when typed back to the original', () => {
		pageStore.setChange(A().id, 'title', 'Typed');
		pageStore.setChange(A().id, 'title', titleA);
		expect(pageStore.hasUnsavedChange(A().id, 'title')).toBe(false);
	});

	it('cancel restores the original copy', () => {
		pageStore.setChange(A().id, 'title', 'Typed');
		pageStore.cancelChange(A().id, 'title');
		expect(A().title).toBe(titleA);
		expect(pageStore.getChange(A().id, 'title')).toBeUndefined();
	});

	it('forget keeps the typed copy on the page', () => {
		pageStore.setChange(A().id, 'title', 'Saved copy');
		pageStore.forgetChange(A().id, 'title');
		expect(A().title).toBe('Saved copy');
		expect(pageStore.getChange(A().id, 'title')).toBeUndefined();
	});

	it('writes nothing for a field that does not resolve', () => {
		expect(pageStore.setChange(A().id, 'sections.nope.paragraphs.0', 'x')).toBe(false);
		expect(pageStore.unsavedChanges).toEqual({});
	});

	it('keeps unsaved changes for the same field id on two pages apart', () => {
		pageStore.setChange(A().id, 'title', 'Typed on A');
		pageStore.enterPage(B().id);
		pageStore.select('title');
		pageStore.setChange(B().id, 'title', 'Typed on B');
		expect(pageStore.getChange(A().id, 'title')?.original).toBe(titleA);
		expect(pageStore.getChange(B().id, 'title')?.original).toBe(titleB);
		pageStore.cancelChange(A().id, 'title');
		expect(A().title).toBe(titleA);
		expect(B().title).toBe('Typed on B');
	});

	it.each([
		['clearing the selection', () => pageStore.clearSelection()],
		['replacing the selection', () => pageStore.select('summary')],
		['shift-clicking the field off', () => pageStore.select('title', true)],
		['selecting a section', () => pageStore.selectSection('any')],
		['changing page', () => pageStore.enterPage(B().id)]
	])('keeps unsaved typing on %s', (_label, act) => {
		pageStore.setChange(A().id, 'title', 'Unsaved');
		act();
		expect(A().title).toBe('Unsaved');
		expect(pageStore.hasUnsavedChange(A().id, 'title')).toBe(true);
	});

	it('drops an unsaved change that changes nothing once the selection moves off it', () => {
		pageStore.setChange(A().id, 'title', 'Typed');
		pageStore.setChange(A().id, 'title', titleA);
		pageStore.select('summary');
		expect(pageStore.getChange(A().id, 'title')).toBeUndefined();
		expect(A().title).toBe(titleA);
	});

	it('counts unsaved changes here and on other pages', () => {
		pageStore.setChange(A().id, 'title', 'Unsaved');
		expect(pageStore.unsavedChangesOn(A().id).map((d) => d.fieldId)).toEqual(['title']);
		expect(pageStore.unsavedChangesElsewhere(A().id)).toBe(0);
		expect(pageStore.unsavedChangesElsewhere(B().id)).toBe(1);
	});

	it("stamps each new change with its field's newest edit, once", () => {
		pageStore.setChange(A().id, 'title', 'Typed');
		pageStore.stampChangeBases(() => 'row-1');
		pageStore.stampChangeBases(() => 'row-2');
		expect(pageStore.getChange(A().id, 'title')?.baseEditId).toBe('row-1');
		// Typing on keeps the stamp.
		pageStore.setChange(A().id, 'title', 'Typed more');
		expect(pageStore.getChange(A().id, 'title')?.baseEditId).toBe('row-1');
	});

	it('flags a change only for an edit other than the one it started from', () => {
		pageStore.setChange(A().id, 'title', 'Typed');
		// Unstamped: nothing to compare against, so nothing is claimed.
		pageStore.markSavedElsewhere(A().id, 'title', 'row-9');
		expect(pageStore.getChange(A().id, 'title')?.savedElsewhere).toBeUndefined();

		pageStore.stampChangeBases(() => null);
		pageStore.markSavedElsewhere(A().id, 'title', 'row-9');
		expect(pageStore.getChange(A().id, 'title')?.savedElsewhere).toBe(true);
	});

	it('does not flag the edit the change started from', () => {
		pageStore.setChange(A().id, 'title', 'Typed');
		pageStore.stampChangeBases(() => 'row-1');
		pageStore.markSavedElsewhere(A().id, 'title', 'row-1');
		expect(pageStore.getChange(A().id, 'title')?.savedElsewhere).toBeUndefined();
	});
});
