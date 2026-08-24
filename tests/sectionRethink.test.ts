/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import Section from '../src/lib/components/Section.svelte';
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
