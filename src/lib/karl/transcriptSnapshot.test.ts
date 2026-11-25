/**
 * The Markdown transcript for every corpus page, pinned.
 *
 * `buildTranscript` is an untyped 1,185-line legacy module that the walkthrough,
 * the Markdown export and now the Karl outline all read. A change made for one
 * of them must not silently move what the others say, so the whole rendered
 * output is held as a snapshot: an intended change shows up as a reviewable
 * diff in `__snapshots__/`, and an unintended one fails here.
 */
import { describe, expect, it } from 'vitest';
import { buildTranscript, renderTranscriptMarkdown } from '$lib/legacy-core/karl-transcript.js';
import { pagesByKey } from '$lib/data/index';

const keys = Object.keys(pagesByKey).sort();

describe('transcript Markdown, every corpus page', () => {
	it('covers the whole corpus', () => {
		expect(keys).toHaveLength(38);
	});

	it.each(keys)('%s', (key) => {
		const page = (pagesByKey as Record<string, object>)[key];
		expect(renderTranscriptMarkdown(buildTranscript(page, null, pagesByKey))).toMatchSnapshot();
	});
});
