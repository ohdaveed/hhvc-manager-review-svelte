/**
 * @vitest-environment jsdom
 *
 * The corpus writes `**bold**` and `[label](target)` inside plain strings, and
 * until `MarkdownText` existed nothing between the data module and the DOM
 * interpreted them -- so a copy-review tool showed reviewers `**Review time:**`
 * and a raw `[Pest prevention](https://…)` where SF.gov formatting belongs.
 *
 * The property that makes this safe to do at all is that RENDERING and EDITING
 * are different readings of the same string. `value` stays raw markdown all the
 * way through `resolveField`, `pageStore.suggestions` and `edits.new_content`;
 * only the pixels change. Both halves are asserted here, because fixing one and
 * breaking the other would corrupt saved copy rather than merely look wrong.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Page from '../src/lib/components/Page.svelte';
import { pageStore } from '../src/lib/stores/pageData.svelte.js';
import { resolveField } from '../src/lib/corpus/fieldResolver.js';
import { sessionStore } from '../src/lib/stores/session.svelte.js';
import { routableId } from '../src/lib/corpus/pageId.js';
import { pagesByKey } from '../src/lib/data/index.js';

const BULLET_MD = '**Notify your landlord:** See [what happens next](afterReport) for timelines.';
const PARA_MD =
	'Read the [pest prevention guide](https://ipm.ucanr.edu/prevention/) before you start.';
const UNSET_MD = 'A [destination not yet chosen](#) sits here.';

const fixture = {
	id: 'topic-x--about',
	title: 'About vector control',
	summary: 'What the program does.',
	sections: [
		{
			heading: 'How to report',
			fieldKey: 'how-to-report',
			paragraphs: [PARA_MD, UNSET_MD],
			bullets: [BULLET_MD]
		}
	]
};

const renderPage = () => render(Page, { props: { page: structuredClone(fixture) } });

describe('markdown in the mockup canvas', () => {
	beforeEach(() => {
		pageStore.clearSelection();
	});

	describe('signed in (copy sits inside the selection button)', () => {
		beforeEach(() => {
			sessionStore.signedIn = true;
		});

		it('renders a bold lead-in as <strong>, not as asterisks', () => {
			const { container } = renderPage();
			const bullet = container.querySelector(
				'[data-rewrite-field="sections.how-to-report.bullets.0"]'
			)!;
			expect(bullet.querySelector('strong')?.textContent).toBe('Notify your landlord:');
			expect(bullet.textContent).not.toContain('**');
		});

		it('renders a link label without the brackets and URL', () => {
			const { container } = renderPage();
			const para = container.querySelector(
				'[data-rewrite-field="sections.how-to-report.paragraphs.0"]'
			)!;
			expect(para.textContent).toContain('pest prevention guide');
			expect(para.textContent).not.toContain('https://');
			expect(para.textContent).not.toContain('](');
		});

		it('never nests an anchor inside the selection button', () => {
			// `<a>` inside `<button>` is invalid HTML and gives a screen reader two
			// nested controls. Signed in, links render as styled spans instead.
			const { container } = renderPage();
			for (const button of container.querySelectorAll('button.edit-target')) {
				expect(button.querySelector('a')).toBeNull();
			}
			const para = container.querySelector(
				'[data-rewrite-field="sections.how-to-report.paragraphs.0"]'
			)!;
			expect(para.querySelector('.md-link')?.textContent).toBe('pest prevention guide');
		});

		it('keeps the raw markdown as the value that round-trips to edits', () => {
			const page = structuredClone(fixture);
			expect(resolveField(page, 'sections.how-to-report.bullets.0')!.value).toBe(BULLET_MD);
			expect(resolveField(page, 'sections.how-to-report.paragraphs.0')!.value).toBe(PARA_MD);
		});

		it('still selects the field the element advertises', async () => {
			const { container } = renderPage();
			const bullet = container.querySelector<HTMLElement>(
				'[data-rewrite-field="sections.how-to-report.bullets.0"] .edit-target, .edit-target[data-rewrite-field="sections.how-to-report.bullets.0"]'
			)!;
			await fireEvent.click(bullet);
			expect(pageStore.selectedFieldIds).toEqual(['sections.how-to-report.bullets.0']);
		});

		it('marks a `#` target as having no destination rather than as a broken link', () => {
			const { container } = renderPage();
			const para = container.querySelector(
				'[data-rewrite-field="sections.how-to-report.paragraphs.1"]'
			)!;
			const unset = para.querySelector('.md-link-unset');
			expect(unset?.textContent).toBe('destination not yet chosen');
			expect(unset?.getAttribute('title')).toContain('no destination yet');
		});
	});

	describe('signed out (copy is plain text, so links can be links)', () => {
		beforeEach(() => {
			sessionStore.signedIn = false;
		});

		it('renders an internal page-key link as a route into the review tool', () => {
			const { container } = renderPage();
			const bullet = container.querySelector(
				'[data-rewrite-field="sections.how-to-report.bullets.0"]'
			)!;
			const anchor = bullet.querySelector('a')!;
			expect(anchor.textContent).toBe('what happens next');
			expect(anchor.getAttribute('href')).toContain(
				`/review/${routableId(pagesByKey.afterReport)}`
			);
		});

		it('renders an external link as an anchor that opens away safely', () => {
			const { container } = renderPage();
			const para = container.querySelector(
				'[data-rewrite-field="sections.how-to-report.paragraphs.0"]'
			)!;
			const anchor = para.querySelector('a')!;
			expect(anchor.getAttribute('href')).toBe('https://ipm.ucanr.edu/prevention/');
			expect(anchor.getAttribute('target')).toBe('_blank');
			expect(anchor.getAttribute('rel')).toContain('noopener');
		});

		it('still renders bold', () => {
			const { container } = renderPage();
			const bullet = container.querySelector(
				'[data-rewrite-field="sections.how-to-report.bullets.0"]'
			)!;
			expect(bullet.querySelector('strong')?.textContent).toBe('Notify your landlord:');
		});

		it('does not turn a `#` target into an anchor', () => {
			const { container } = renderPage();
			const para = container.querySelector(
				'[data-rewrite-field="sections.how-to-report.paragraphs.1"]'
			)!;
			expect(para.querySelector('a')).toBeNull();
			expect(para.querySelector('.md-link-unset')).not.toBeNull();
		});
	});

	describe('text that carries no markdown', () => {
		beforeEach(() => {
			sessionStore.signedIn = true;
		});

		// `.trim()` throughout: signed in, the copy sits after the badge's
		// `{#if selected}` block, and the newline between them contributes one
		// leading space. That predates this component -- `{value}` produced it
		// too, measured against main -- and HTML collapses it, so it is left
		// alone rather than fixed as a side effect here. What these tests are
		// actually for is INTERIOR spacing, which is what token rendering can
		// break: a newline between two inline constructs in the template would
		// insert a space mid-sentence on every page.
		it('renders exactly the original text when there is no markdown', () => {
			const { container } = renderPage();
			const summary = container.querySelector('[data-rewrite-field="summary"]')!;
			expect(summary.textContent?.trim()).toBe('What the program does.');
		});

		it('preserves the spacing around an inline construct', () => {
			const { container } = renderPage();
			const bullet = container.querySelector(
				'[data-rewrite-field="sections.how-to-report.bullets.0"]'
			)!;
			expect(bullet.textContent?.trim()).toBe(
				'Notify your landlord: See what happens next for timelines.'
			);
		});

		it('never doubles a space where two tokens meet', () => {
			const { container } = renderPage();
			for (const el of container.querySelectorAll('[data-rewrite-field]')) {
				expect(el.textContent?.trim(), el.getAttribute('data-rewrite-field') ?? '').not.toMatch(
					/ {2}/
				);
			}
		});
	});
});
