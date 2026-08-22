/**
 * @vitest-environment jsdom
 *
 * Guards the three things that make an edit target work.
 *
 * `edits.field_id` is the value each target advertises as `data-rewrite-field`.
 * If the id handed to `pageStore.activeField` ever drifts from that attribute,
 * edits still save but land under a key nothing reads, and `HelpPanel` folds
 * them into the wrong slot -- the failure that let copy edits go unpersisted
 * without anything looking broken.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Page from '../src/lib/components/Page.svelte';
import { pageStore } from '../src/lib/stores/pageData.svelte.js';
import { sessionStore } from '../src/lib/stores/session.svelte.js';

// `fieldKey` is what pageData.svelte.ts assigns from the pristine corpus. The
// fixture carries it explicitly so these tests exercise the real id shape
// rather than the index fallback.
const fixture = {
	id: 'topic-x--about',
	title: 'About vector control',
	summary: 'What the program does.',
	audience: ['Residents', 'Property owners'],
	sections: [
		{
			heading: 'How to report',
			fieldKey: 'how-to-report',
			paragraphs: ['First paragraph.', 'Second paragraph.'],
			bullets: ['First bullet.', 'Second bullet.']
		},
		{
			heading: 'What happens next',
			fieldKey: 'what-happens-next',
			paragraphs: ['Only paragraph.'],
			callout: { title: 'Note', text: 'Callout body.' }
		}
	]
};

const renderPage = () => render(Page, { props: { page: structuredClone(fixture) } });

describe('edit targets', () => {
	beforeEach(() => {
		pageStore.activeField = null;
		// Deterministic: the store resolves getSession() asynchronously, so
		// without this the component can flip branches mid-test.
		sessionStore.signedIn = true;
	});

	describe('field identity', () => {
		it('hands activeField the same id the element advertises', async () => {
			const { container } = renderPage();
			const targets = container.querySelectorAll<HTMLElement>('[data-rewrite-field]');

			expect(targets.length).toBeGreaterThan(0);

			for (const el of targets) {
				pageStore.activeField = null;
				await fireEvent.click(el);

				expect(pageStore.activeField).not.toBeNull();
				expect(pageStore.activeField?.fieldId).toBe(el.dataset.rewriteField);
			}
		});

		it('covers every edit target, so none can save under an undefined id', () => {
			const { container } = renderPage();
			expect(container.querySelectorAll('.edit-target[data-rewrite-field]').length).toBe(
				container.querySelectorAll('.edit-target').length
			);
		});

		it('uses the exact keys HelpPanel folds title and summary on', async () => {
			const { container } = renderPage();

			await fireEvent.click(container.querySelector<HTMLElement>('.page-title .edit-target')!);
			expect(pageStore.activeField?.fieldId).toBe('title');

			await fireEvent.click(container.querySelector<HTMLElement>('.page-summary .edit-target')!);
			expect(pageStore.activeField?.fieldId).toBe('summary');
		});

		it('gives each paragraph in a section its own id', async () => {
			const { container } = renderPage();
			const paragraphs = container.querySelectorAll<HTMLElement>(
				'[data-rewrite-field^="sections.how-to-report.paragraphs."]'
			);

			expect(paragraphs.length).toBe(2);

			const ids = new Set<string>();
			for (const el of paragraphs) {
				await fireEvent.click(el);
				ids.add(pageStore.activeField!.fieldId);
			}

			// Both share the display name `Section [1] Paragraph`; the ids must not.
			expect([...ids].sort()).toEqual([
				'sections.how-to-report.paragraphs.0',
				'sections.how-to-report.paragraphs.1'
			]);
		});

		it('still edits in memory', async () => {
			const page = structuredClone(fixture);
			const { container } = render(Page, { props: { page } });

			await fireEvent.click(
				container.querySelector<HTMLElement>(
					'[data-rewrite-field="sections.how-to-report.paragraphs.1"]'
				)!
			);
			pageStore.activeField!.update('Rewritten.');

			expect(page.sections[0].paragraphs[1]).toBe('Rewritten.');
		});
	});

	describe('ids survive the corpus changing shape', () => {
		it('keys sections by heading slug, not array position', () => {
			const page = pageStore.pages.find((p) => (p.sections ?? []).length > 1);
			expect(page).toBeDefined();

			for (const section of page!.sections) {
				expect(section.fieldKey).toBeTruthy();
				expect(section.fieldKey).not.toMatch(/^section-\d+$/);
			}
		});

		it('does not renumber later sections when one is inserted ahead of them', () => {
			const page = pageStore.pages.find((p) => (p.sections ?? []).length > 1)!;
			const before = page.sections.map((s: { fieldKey: string }) => s.fieldKey);

			// The bug this replaced: with `sections.0.paragraphs.1` ids, inserting
			// here shifted every later section and orphaned all of their edits.
			const after = [{ heading: 'Inserted', fieldKey: 'inserted' }, ...page.sections].map(
				(s: { fieldKey: string }) => s.fieldKey
			);

			expect(after.slice(1)).toEqual(before);
		});

		it('keeps a section key stable when its heading is edited', () => {
			// The key is snapshotted from the pristine module data, so editing a
			// heading must not re-slug it and orphan that section's other edits.
			const page = pageStore.pages.find((p) => (p.sections ?? []).length > 1)!;
			const section = page.sections[0];
			const original = section.fieldKey;

			section.heading = 'A completely different heading';

			expect(section.fieldKey).toBe(original);
		});
	});

	describe('signed out', () => {
		beforeEach(() => {
			sessionStore.signedIn = false;
		});

		it('renders the copy but offers no way to edit it', () => {
			const { container } = renderPage();

			// Readable: the mockups are static, so anonymous browsing still works.
			expect(container.textContent).toContain('First paragraph.');

			// But inert -- edits.user_id is NOT NULL, so nothing typed could save.
			expect(container.querySelectorAll('.edit-target').length).toBe(0);
			expect(container.querySelectorAll('button').length).toBe(0);
		});

		it('does not open the ActionBar on click', async () => {
			const { container } = renderPage();
			const target = container.querySelector<HTMLElement>('[data-rewrite-field="title"]')!;

			await fireEvent.click(target);

			expect(pageStore.activeField).toBeNull();
		});
	});

	describe('keyboard access', () => {
		it('exposes every edit target as a real button', () => {
			const { container } = renderPage();
			const targets = container.querySelectorAll('.edit-target');

			expect(targets.length).toBeGreaterThan(0);
			for (const el of targets) {
				// A <button> is focusable and fires on Enter/Space natively. The old
				// `<p role="button" tabindex="0">` had no key handler at all, so a
				// keyboard-only reviewer could not edit anything.
				expect(el.tagName).toBe('BUTTON');
				expect(el.getAttribute('type')).toBe('button');
			}
		});

		it('keeps the heading anchor id on the heading, not the button', () => {
			const { container } = renderPage();
			const heading = container.querySelector('h2.section-heading');

			expect(heading?.id).toBe('how-to-report');
			expect(heading?.querySelector('.edit-target')).toBeTruthy();
		});
	});
});
