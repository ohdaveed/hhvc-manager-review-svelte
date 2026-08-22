/**
 * @vitest-environment jsdom
 *
 * Guards the contract that makes inline copy edits persistable.
 *
 * `edits.field_id` is the path carried by each edit target's
 * `data-rewrite-field`. If the id handed to `pageStore.activeField` ever drifts
 * from that attribute, edits still save but land under a key nothing reads, and
 * `HelpPanel` folds them into the wrong slot -- the failure that let copy edits
 * go unpersisted without anything looking broken.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Page from '../src/lib/components/Page.svelte';
import { pageStore } from '../src/lib/stores/pageData.svelte.js';

const fixture = {
	id: 'topic-x--about',
	title: 'About vector control',
	summary: 'What the program does.',
	audience: ['Residents', 'Property owners'],
	sections: [
		{
			heading: 'How to report',
			paragraphs: ['First paragraph.', 'Second paragraph.'],
			bullets: ['First bullet.', 'Second bullet.']
		},
		{
			heading: 'What happens next',
			paragraphs: ['Only paragraph.'],
			callout: { title: 'Note', text: 'Callout body.' }
		}
	]
};

describe('inline edit field ids', () => {
	beforeEach(() => {
		pageStore.activeField = null;
	});

	it('hands activeField the same id the element advertises', async () => {
		const { container } = render(Page, { props: { page: structuredClone(fixture) } });
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
		const { container } = render(Page, { props: { page: structuredClone(fixture) } });
		const editable = container.querySelectorAll('.edit-target');
		const identified = container.querySelectorAll('.edit-target[data-rewrite-field]');

		expect(identified.length).toBe(editable.length);
	});

	it('uses the exact keys HelpPanel folds title and summary on', async () => {
		const { container } = render(Page, { props: { page: structuredClone(fixture) } });

		const title = container.querySelector<HTMLElement>('.page-title');
		await fireEvent.click(title!);
		expect(pageStore.activeField?.fieldId).toBe('title');

		const summary = container.querySelector<HTMLElement>('.page-summary');
		await fireEvent.click(summary!);
		expect(pageStore.activeField?.fieldId).toBe('summary');
	});

	it('gives each paragraph in a section its own id', async () => {
		const { container } = render(Page, { props: { page: structuredClone(fixture) } });
		const paragraphs = container.querySelectorAll<HTMLElement>(
			'[data-rewrite-field^="sections.0.paragraphs."]'
		);

		expect(paragraphs.length).toBe(2);

		const ids = new Set<string>();
		for (const el of paragraphs) {
			await fireEvent.click(el);
			ids.add(pageStore.activeField!.fieldId);
		}

		// The display name is `Section [1] Paragraph` for both; the ids must differ.
		expect([...ids].sort()).toEqual(['sections.0.paragraphs.0', 'sections.0.paragraphs.1']);
	});

	it('still edits in memory, which is what a signed-out reader gets', async () => {
		const page = structuredClone(fixture);
		const { container } = render(Page, { props: { page } });

		const target = container.querySelector<HTMLElement>(
			'[data-rewrite-field="sections.0.paragraphs.1"]'
		);
		await fireEvent.click(target!);
		pageStore.activeField!.update('Rewritten.');

		expect(page.sections[0].paragraphs[1]).toBe('Rewritten.');
	});
});
