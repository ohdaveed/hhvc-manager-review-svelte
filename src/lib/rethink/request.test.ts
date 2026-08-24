import { describe, it, expect, beforeEach, vi } from 'vitest';

const requestGeneration = vi.fn();

// A local `GenerationError`, not the real one: the real module imports
// `$lib/supabase`, which does `createClient(...)` at module scope, so
// `importOriginal` here would drag that into every run. `request.ts` imports
// `GenerationError` from `$lib/ai/generate` too, and that import resolves to
// THIS mock in tests, so the `instanceof` check on the fallback path lines up
// against the same class reference.
vi.mock('$lib/ai/generate', () => {
	class GenerationError extends Error {
		status: number;
		constructor(status: number, message: string) {
			super(message);
			this.name = 'GenerationError';
			this.status = status;
		}
	}
	return {
		GenerationError,
		requestGeneration: (payload: unknown, signal?: AbortSignal) =>
			requestGeneration(payload, signal)
	};
});

const { requestRethink } = await import('./request');
const { GenerationError } = (await import('$lib/ai/generate')) as unknown as {
	GenerationError: new (status: number, message: string) => Error & { status: number };
};

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

	describe('karlChanged (decision 9, normalized comparison)', () => {
		// Local page/response builders, never mutating the shared `page`
		// fixture other tests in this file depend on.
		const pageWithKarl = (karl: string) => ({
			...page,
			sections: [{ ...page.sections[0], karl }, page.sections[1]]
		});
		const responseWithKarl = (karl: string) =>
			envelope([withoutFieldKey({ ...page.sections[0], karl }), unchangedResponseSections[1]]);

		it('is false for identical strings', async () => {
			const karl =
				'Information block, styled after the pattern the reference page itself uses for its own “What we do” block.';
			requestGeneration.mockResolvedValue(responseWithKarl(karl));
			const result = await requestRethink({
				page: pageWithKarl(karl),
				pageId: page.id,
				sectionKey: 'what-we-do'
			});
			expect(result.karlChanged).toBe(false);
		});

		it('is false when the only difference is typographic vs. straight quotes (observed regression)', async () => {
			// Observed live: the model re-emitted the note with straight single
			// quotes instead of the typographic double quotes the corpus uses --
			// nothing about the CMS mapping changed. This is the exact pair
			// observed in a real browser against the real backend.
			const before =
				'...the pattern the reference page itself uses for its own “What we do” block.';
			const after = "...the pattern the reference page itself uses for its own 'What we do' block.";
			requestGeneration.mockResolvedValue(responseWithKarl(after));
			const result = await requestRethink({
				page: pageWithKarl(before),
				pageId: page.id,
				sectionKey: 'what-we-do'
			});
			expect(result.karlChanged).toBe(false);
		});

		it('is false when the only difference is whitespace, including a trailing newline', async () => {
			const before = 'Information block.';
			const after = '  Information   block.\n';
			requestGeneration.mockResolvedValue(responseWithKarl(after));
			const result = await requestRethink({
				page: pageWithKarl(before),
				pageId: page.id,
				sectionKey: 'what-we-do'
			});
			expect(result.karlChanged).toBe(false);
		});

		it('is true for a genuine mapping change', async () => {
			const before = 'Information block.';
			const after = 'Resources block.';
			requestGeneration.mockResolvedValue(responseWithKarl(after));
			const result = await requestRethink({
				page: pageWithKarl(before),
				pageId: page.id,
				sectionKey: 'what-we-do'
			});
			expect(result.karlChanged).toBe(true);
		});
	});

	it('reports no other sections when the model left them unchanged, in the real backend response shape', async () => {
		// The real backend response never carries `fieldKey`, adds `component`
		// and `kind` to every section, and its keys come back in a different
		// order than the local corpus object's -- confirmed against a live
		// request. `otherSections` must not mistake any of that for a change.
		requestGeneration.mockResolvedValue(
			envelope([
				{
					bullets: ['Rats', 'Garbage'],
					component: 'text',
					heading: 'What we do',
					karl: 'Information block.',
					kind: 'body',
					paragraphs: ['Our work covers:']
				},
				{ component: 'text', heading: 'Who we are', karl: 'Information block.', kind: 'body' }
			])
		);

		const result = await requestRethink({ page, pageId: page.id, sectionKey: 'what-we-do' });

		expect(result.otherSections).toEqual([]);
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

	describe('provider fallback (Claude first, Gemini once on a provider failure)', () => {
		it('does not call Gemini when Claude succeeds', async () => {
			requestGeneration.mockResolvedValue(envelope(unchangedResponseSections));
			await requestRethink({ page, pageId: page.id, sectionKey: 'what-we-do' });
			expect(requestGeneration).toHaveBeenCalledTimes(1);
			expect(requestGeneration.mock.calls[0][0].provider).toBe('claude');
		});

		it('retries once with Gemini when Claude fails with a provider-level 400, and reports the model that actually answered', async () => {
			requestGeneration
				.mockRejectedValueOnce(
					new GenerationError(
						400,
						'You have reached your specified API usage limits. You will regain access on 2026-09-01.'
					)
				)
				.mockResolvedValueOnce({
					...envelope(unchangedResponseSections),
					provider: 'gemini',
					model: 'gemini-3.7-flash'
				});

			const result = await requestRethink({ page, pageId: page.id, sectionKey: 'what-we-do' });

			expect(requestGeneration).toHaveBeenCalledTimes(2);
			expect(requestGeneration.mock.calls[1][0].provider).toBe('gemini');
			expect(result.model).toBe('gemini-3.7-flash');
		});

		it('retries once with Gemini when Claude fails at the provider level with a 5xx', async () => {
			requestGeneration
				.mockRejectedValueOnce(new GenerationError(503, 'Service unavailable'))
				.mockResolvedValueOnce(envelope(unchangedResponseSections));

			await requestRethink({ page, pageId: page.id, sectionKey: 'what-we-do' });

			expect(requestGeneration).toHaveBeenCalledTimes(2);
			expect(requestGeneration.mock.calls[1][0].provider).toBe('gemini');
		});

		it('does not fall back on a 422 content refusal -- the error surfaces as-is', async () => {
			requestGeneration.mockRejectedValueOnce(
				new GenerationError(422, 'Refused on content grounds')
			);

			await expect(
				requestRethink({ page, pageId: page.id, sectionKey: 'what-we-do' })
			).rejects.toThrow(/refused on content grounds/i);
			expect(requestGeneration).toHaveBeenCalledTimes(1);
		});

		it('does not fall back on a proxy 413 -- the payload is wrong regardless of provider', async () => {
			requestGeneration.mockRejectedValueOnce(new GenerationError(413, 'Request body too large'));

			await expect(
				requestRethink({ page, pageId: page.id, sectionKey: 'what-we-do' })
			).rejects.toThrow(/request body too large/i);
			expect(requestGeneration).toHaveBeenCalledTimes(1);
		});

		it('does not fall back on a 401 -- the caller is not signed in', async () => {
			requestGeneration.mockRejectedValueOnce(new GenerationError(401, 'Unauthorized'));

			await expect(
				requestRethink({ page, pageId: page.id, sectionKey: 'what-we-do' })
			).rejects.toThrow(/unauthorized/i);
			expect(requestGeneration).toHaveBeenCalledTimes(1);
		});

		it('does not fall back, and rethrows as-is, when Claude fails with a non-GenerationError (e.g. Cancel)', async () => {
			const abortError = Object.assign(new Error('Aborted'), { name: 'AbortError' });
			requestGeneration.mockRejectedValueOnce(abortError);

			await expect(
				requestRethink({ page, pageId: page.id, sectionKey: 'what-we-do' })
			).rejects.toBe(abortError);
			expect(requestGeneration).toHaveBeenCalledTimes(1);
		});
	});
});
