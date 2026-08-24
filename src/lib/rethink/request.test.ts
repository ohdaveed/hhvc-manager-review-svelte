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

const envelope = (sections: unknown[], extra: object = {}) => ({
	task: 'content',
	provider: 'claude',
	model: 'claude-opus-5',
	attempts: 1,
	valid: true,
	issues: [],
	disclosure: 'Drafted with generative AI.',
	result: { ...page, sections },
	...extra
});

describe('requestRethink', () => {
	beforeEach(() => requestGeneration.mockReset());

	it('asks for the content task from Claude, grounded on the live page', async () => {
		requestGeneration.mockResolvedValue(envelope(page.sections));

		await requestRethink({ page, pageId: page.id, sectionKey: 'what-we-do' });

		const [payload] = requestGeneration.mock.calls[0];
		expect(payload.task).toBe('content');
		expect(payload.provider).toBe('claude');
		expect(payload.page).toBe(page);
		expect(payload.prompt).toContain('what-we-do');
	});

	it('diffs only the target section and reports the rest by heading', async () => {
		requestGeneration.mockResolvedValue(
			envelope([
				{
					fieldKey: 'what-we-do',
					heading: 'What we can inspect',
					karl: 'Information block.',
					paragraphs: ['Our work covers:'],
					bullets: ['Rats', 'Garbage']
				},
				{ fieldKey: 'who-we-are', heading: 'Who we are, rewritten', karl: 'Information block.' }
			])
		);

		const result = await requestRethink({ page, pageId: page.id, sectionKey: 'what-we-do' });

		expect(result.ops.find((op) => op.kind === 'heading')).toMatchObject({
			type: 'rewrite',
			to: 'What we can inspect'
		});
		expect(result.ops.some((op) => op.text === 'Who we are, rewritten')).toBe(false);
		expect(result.otherSections).toEqual(['Who we are']);
	});

	it('carries the model and disclosure through for the record', async () => {
		requestGeneration.mockResolvedValue(envelope(page.sections));
		const result = await requestRethink({ page, pageId: page.id, sectionKey: 'what-we-do' });
		expect(result.model).toBe('claude-opus-5');
		expect(result.disclosure).toBe('Drafted with generative AI.');
	});

	it('fails when the proposal does not contain the section that was asked about', async () => {
		requestGeneration.mockResolvedValue(envelope([{ fieldKey: 'who-we-are', heading: 'Who' }]));
		await expect(
			requestRethink({ page, pageId: page.id, sectionKey: 'what-we-do' })
		).rejects.toThrow(/did not return that section/i);
	});

	it('fails loudly when the backend could not validate its own draft', async () => {
		requestGeneration.mockResolvedValue(
			envelope(page.sections, { valid: false, issues: ['heading missing'] })
		);
		await expect(
			requestRethink({ page, pageId: page.id, sectionKey: 'what-we-do' })
		).rejects.toThrow(/heading missing/);
	});

	it('passes the abort signal through so Cancel actually cancels', async () => {
		requestGeneration.mockResolvedValue(envelope(page.sections));
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
		requestGeneration.mockResolvedValue(envelope(page.sections));
		await expect(
			requestRethink({ page, pageId: 'some-other-page', sectionKey: 'what-we-do' })
		).rejects.toThrow(/not the one this rethink was for/i);
		expect(requestGeneration).not.toHaveBeenCalled();
	});

	it('still works against a page fixture with no id at all', async () => {
		const { id: _id, ...pageWithoutId } = page;
		void _id;
		requestGeneration.mockResolvedValue({
			...envelope(pageWithoutId.sections),
			result: { ...pageWithoutId, sections: pageWithoutId.sections }
		});

		const result = await requestRethink({
			page: pageWithoutId,
			pageId: 'topic-x--about',
			sectionKey: 'what-we-do'
		});

		expect(result.model).toBe('claude-opus-5');
	});

	it('surfaces an invented section by its own heading, not silently dropped', async () => {
		requestGeneration.mockResolvedValue(
			envelope([
				...page.sections,
				{ fieldKey: 'brand-new-section', heading: 'A section that did not exist before' }
			])
		);

		const result = await requestRethink({ page, pageId: page.id, sectionKey: 'what-we-do' });

		expect(result.otherSections).toContain('A section that did not exist before');
	});
});
