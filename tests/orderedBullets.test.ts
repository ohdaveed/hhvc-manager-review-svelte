/**
 * A section's `ordered` flag numbers its bullets in BOTH places a reviewer or a
 * builder reads them: the mockup (`<ol>`) and the Karl transcript (`1.`).
 *
 * It exists for afterReport's "How a report moves through the City", a
 * five-step sequence that goes into Karl as a numbered list in an Information
 * section's rich text. Rendered as `<ul>`, the manager reviewed a bulleted list
 * that is not what gets built, and the transcript handed the builder bullets
 * for a sequence whose order matters (2026-11-26).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import Page from '../src/lib/components/Page.svelte';
import { sessionStore } from '../src/lib/stores/session.svelte.js';
import { buildTranscript } from '../src/lib/legacy-core/karl-transcript.js';
import { pagesByKey } from '../src/lib/data/index';

type Transcript = { entries: { fields: { label: string; value: string }[] }[] };

const page = (ordered: boolean) => ({
	id: 'x',
	type: 'Information',
	title: 'Sequence',
	sections: [
		{
			heading: 'Steps',
			fieldKey: 'steps',
			...(ordered ? { ordered: true } : {}),
			bullets: ['First', 'Second']
		}
	]
});

const textOf = (p: object) =>
	(buildTranscript(p, null, pagesByKey) as Transcript).entries
		.flatMap((s) => s.fields)
		.find((f) => f.label === 'Text')?.value;

describe('ordered bullets', () => {
	beforeEach(() => {
		sessionStore.signedIn = true;
	});

	it('renders an ordered section as <ol>, keeping the bullets.N field ids', () => {
		const { container } = render(Page, { props: { page: page(true) } });
		const list = container.querySelector('ol');
		expect(list).not.toBeNull();
		expect(list?.className).toContain('list-decimal');
		expect(
			container.querySelector('[data-rewrite-field="sections.steps.bullets.1"]')
		).not.toBeNull();
	});

	it('leaves an unflagged section as <ul>', () => {
		const { container } = render(Page, { props: { page: page(false) } });
		expect(container.querySelector('ol')).toBeNull();
		expect(container.querySelector('ul.list-disc')).not.toBeNull();
	});

	it('numbers the transcript text only when the section is ordered', () => {
		expect(textOf(page(true))).toBe('1. First\n2. Second');
		expect(textOf(page(false))).toBe('- First\n- Second');
	});
});
