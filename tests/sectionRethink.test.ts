/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import Section from '../src/lib/components/Section.svelte';
import SectionOutlineHarness from './SectionOutlineHarness.svelte';
import { pageStore } from '../src/lib/stores/pageData.svelte.js';
import { sessionStore } from '../src/lib/stores/session.svelte.js';

const section = {
	fieldKey: 'what-we-do',
	heading: 'What we do',
	paragraphs: ['Our work covers:'],
	bullets: ['Rats']
};

describe('Section rethink control', () => {
	beforeEach(() => {
		pageStore.clearSectionSelection();
		sessionStore.signedIn = true;
	});

	it('is a real button, so a keyboard reviewer can reach it', () => {
		render(Section, { props: { section, index: 1 } });
		const button = screen.getByRole('button', { name: /rethink what we do/i });
		expect(button.tagName).toBe('BUTTON');
		expect(button.getAttribute('data-rethink-section')).toBe('what-we-do');
	});

	it('selects its own section, by key rather than by position', async () => {
		render(Section, { props: { section, index: 1 } });
		await fireEvent.click(screen.getByRole('button', { name: /rethink what we do/i }));
		expect(pageStore.selectedSectionKey).toBe('what-we-do');
	});

	it('does not render signed out -- the mockup is readable, not editable', () => {
		sessionStore.signedIn = false;
		render(Section, { props: { section, index: 1 } });
		expect(screen.queryByRole('button', { name: /rethink what we do/i })).toBeNull();
	});

	it('falls through to the positional label for an empty-string heading, not just a missing one', () => {
		// `section.heading ?? label` only falls through for `null`/`undefined`,
		// so a section whose heading is literally `''` produced the accessible
		// name "Rethink " -- `||` is needed to catch the empty string too.
		const blank = { ...section, fieldKey: 'section-3', heading: '' };
		render(Section, { props: { section: blank, index: 2 } });
		expect(screen.getByRole('button', { name: 'Rethink Section 3' })).toBeTruthy();
	});

	it('has a differentiated aria-label using the section heading for accessibility', () => {
		const section1 = { ...section, fieldKey: 'section-1', heading: 'What we do' };
		const section2 = { ...section, fieldKey: 'section-2', heading: 'How to report' };

		render(Section, { props: { section: section1, index: 1 } });
		render(Section, { props: { section: section2, index: 2 } });

		const button1 = screen.getByRole('button', { name: /rethink what we do/i });
		const button2 = screen.getByRole('button', { name: /rethink how to report/i });

		expect(button1.getAttribute('aria-label')).toBe('Rethink What we do');
		expect(button2.getAttribute('aria-label')).toBe('Rethink How to report');
	});
});

describe('Section Karl gap pill (outline off)', () => {
	const placements = (status: string) =>
		({
			fields: new Map(),
			sections: new Map([
				[
					'what-we-do',
					{
						sectionKey: 'what-we-do',
						heading: 'What we do',
						rawName: null,
						label: '',
						status,
						reasons: ['Why.']
					}
				]
			])
		}) as never;

	beforeEach(() => {
		sessionStore.signedIn = true;
	});

	it.each([
		['unconfirmed', 'Karl’s rule unconfirmed'],
		['unplaced', 'Won’t carry over to Karl']
	])('names a %s section beside its Rethink control', (status, text) => {
		const { container } = render(SectionOutlineHarness, {
			props: { section, index: 1, always: placements(status) }
		});
		const chrome = container.querySelector('.page-section-chrome')!;
		expect(chrome.querySelector(`[data-karl-chip="${status}"]`)?.textContent).toContain(text);
		expect(chrome.querySelector('[data-rethink-section="what-we-do"]')).toBeTruthy();
	});

	it('stays quiet for a section that goes into Karl', () => {
		const { container } = render(SectionOutlineHarness, {
			props: { section, index: 1, always: placements('placed') }
		});
		expect(container.querySelector('.page-section-chrome .karl-chip')).toBeNull();
	});

	it('defers to the outline when it is on, so the status is not said twice', () => {
		const p = placements('unconfirmed');
		const { container } = render(SectionOutlineHarness, {
			props: { section, index: 1, placements: p, always: p }
		});
		expect(container.querySelectorAll('.karl-chip')).toHaveLength(1);
		expect(container.querySelector('.page-section-chrome .karl-chip')).toBeNull();
	});

	it('still shows signed out, where there is no Rethink control', () => {
		sessionStore.signedIn = false;
		const { container } = render(SectionOutlineHarness, {
			props: { section, index: 1, always: placements('unplaced') }
		});
		expect(
			container.querySelector('.page-section-chrome [data-karl-chip="unplaced"]')
		).toBeTruthy();
	});
});
