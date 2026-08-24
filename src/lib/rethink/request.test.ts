import { describe, it, expect, beforeEach, vi } from 'vitest';

const requestGeneration = vi.fn();
vi.mock('$lib/ai/generate', () => ({
	requestGeneration: (payload: unknown, signal?: AbortSignal) => requestGeneration(payload, signal)
}));

const { requestRethink } = await import('./request');

const page = {
	id: 'topic-x--about',
	title: 'About vector control',
	type: 'About us',
	reading: 'Grade 6',
	sections: [
		{
			fieldKey: 'what-we-do',
			heading: 'What we do',
			karl: 'Information block.',
			paragraphs: ['Our work covers:'],
			bullets: ['Rats', 'Garbage']
		},
		{ fieldKey: 'who-we-are', heading: 'Who we are', karl: 'Information block.' }
	]
};

/**
 * The backend's own schema declares `additionalProperties: false` on a
 * section and does not list `fieldKey` -- it is client-derived, stamped on
 * after the corpus loads (`deriveFieldKey` in `pageData.svelte.ts`), and the
 * model has never heard of it. Response fixtures must never carry one; this
 * strips it from the input fixture so there is one source of truth for "same
 * section, no fieldKey" rather than two copies that could drift apart.
 */
const withoutFieldKey = (section: (typeof page.sections)[number]) => {
	const { fieldKey: _fieldKey, ...rest } = section;
	void _fieldKey;
	return rest;
};

const unchangedResponseSections = page.sections.map(withoutFieldKey);

const envelope = (sections: unknown[], resultExtra: object = {}, extra: object = {}) => ({
	task: 'content',
	provider: 'claude',
	model: 'claude-opus-5',
	attempts: 1,
	valid: true,
	issues: [],
	disclosure: 'Drafted with generative AI.',
	result: {
		id: page.id,
		title: page.title,
		type: page.type,
		reading: page.reading,
		sections,
		...resultExtra
	},
	...extra
});

describe('requestRethink', () => {
	beforeEach(() => requestGeneration.mockReset());

	it('asks for the content task from Claude, grounded on the live page', async () => {
		requestGeneration.mockResolvedValue(envelope(unchangedResponseSections));

		await requestRethink({ page, pageId: page.id, sectionKey: 'what-we-do' });

		const [payload] = requestGeneration.mock.calls[0];
		expect(payload.task).toBe('content');
		expect(payload.provider).toBe('claude');
		expect(payload.page).toBe(page);
		expect(payload.prompt).toContain('What we do');
	});

	it('diffs only the target section and reports the rest by heading, matched by position', async () => {
		requestGeneration.mockResolvedValue(
			envelope([
				withoutFieldKey({ ...page.sections[0], heading: 'What we can inspect' }),
				withoutFieldKey({ ...page.sections[1], heading: 'Who we are, rewritten' })
			])
		);

		const result = await requestRethink({ page, pageId: page.id, sectionKey: 'what-we-do' });

		expect(result.ops.find((op) => op.kind === 'heading')).toMatchObject({
			type: 'rewrite',
			to: 'What we can inspect'
		});
		expect(result.ops.some((op) => 'text' in op && op.text === 'Who we are, rewritten')).toBe(
			false
		);
		expect(result.otherSections).toEqual(['Who we are']);
	});

	it('carries the model and disclosure through for the record', async () => {
		requestGeneration.mockResolvedValue(envelope(unchangedResponseSections));
		const result = await requestRethink({ page, pageId: page.id, sectionKey: 'what-we-do' });
		expect(result.model).toBe('claude-opus-5');
		expect(result.disclosure).toBe('Drafted with generative AI.');
	});

	it('reads the rationale from the page-level editorNote, not the section', async () => {
		requestGeneration.mockResolvedValue(
			envelope(unchangedResponseSections, {
				editorNote: 'Leads with staff process, not tenant need.'
			})
		);
		const result = await requestRethink({ page, pageId: page.id, sectionKey: 'what-we-do' });
		expect(result.rationale).toBe('Leads with staff process, not tenant need.');
	});

	it('carries the section Karl mapping through, before and after (decision 9)', async () => {
		requestGeneration.mockResolvedValue(
			envelope([
				withoutFieldKey({ ...page.sections[0], karl: 'Rich text, restructured as steps.' }),
				unchangedResponseSections[1]
			])
		);
		const result = await requestRethink({ page, pageId: page.id, sectionKey: 'what-we-do' });
		expect(result.karlBefore).toBe('Information block.');
		expect(result.karlAfter).toBe('Rich text, restructured as steps.');
	});

	it('throws, naming both counts, when the response has a different number of sections than the page', async () => {
		requestGeneration.mockResolvedValue(envelope([unchangedResponseSections[0]]));
		await expect(
			requestRethink({ page, pageId: page.id, sectionKey: 'what-we-do' })
		).rejects.toThrow(/returned 1 section.*page has 2/i);
	});

	it('fails loudly when the backend could not validate its own draft', async () => {
		requestGeneration.mockResolvedValue(
			envelope(unchangedResponseSections, {}, { valid: false, issues: ['heading missing'] })
		);
		await expect(
			requestRethink({ page, pageId: page.id, sectionKey: 'what-we-do' })
		).rejects.toThrow(/heading missing/);
	});

	it('passes the abort signal through so Cancel actually cancels', async () => {
		requestGeneration.mockResolvedValue(envelope(unchangedResponseSections));
		const controller = new AbortController();
		await requestRethink({
			page,
			pageId: page.id,
			sectionKey: 'what-we-do',
			signal: controller.signal
		});
		expect(requestGeneration.mock.calls[0][1]).toBe(controller.signal);
	});

	it('refuses a page that does not match the pageId the rethink was for', async () => {
		requestGeneration.mockResolvedValue(envelope(unchangedResponseSections));
		await expect(
			requestRethink({ page, pageId: 'some-other-page', sectionKey: 'what-we-do' })
		).rejects.toThrow(/not the one this rethink was for/i);
		expect(requestGeneration).not.toHaveBeenCalled();
	});

	it('still works against a page fixture with no id at all', async () => {
		const { id: _id, ...pageWithoutId } = page;
		void _id;
		requestGeneration.mockResolvedValue(
			envelope(pageWithoutId.sections.map(withoutFieldKey), {
				id: undefined,
				title: pageWithoutId.title,
				type: pageWithoutId.type,
				reading: pageWithoutId.reading
			})
		);

		const result = await requestRethink({
			page: pageWithoutId,
			pageId: 'topic-x--about',
			sectionKey: 'what-we-do'
		});

		expect(result.model).toBe('claude-opus-5');
	});
});
