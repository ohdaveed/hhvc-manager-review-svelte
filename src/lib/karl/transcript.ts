/**
 * The one way into the legacy transcript (`karl-transcript.js`).
 *
 * `buildTranscript(page, reviewRecord, pages)` is untyped JS, and every caller
 * used to cast it and relearn its boundary rules on its own. Those rules live
 * here now:
 *
 * - **The page carries the copy; the record carries only metadata.** The
 *   transcript overlays `reviewRecord.section_edits` by POSITIONAL container
 *   paths (`sections.2.paragraphs`, the whole array), while saved edits are
 *   keyed by field id (`sections.<key>.paragraphs.0`), so a section edit never
 *   reached it -- body copy came from the page object, and only the title and
 *   summary came from the record. The caller now hands in the copy it means
 *   (the copy as shown for the Karl outline, the copy as recorded for the
 *   walkthrough), and the record keeps what a page object cannot hold: the
 *   decision, the edited slug and the stale-edit flags.
 * - **Whether a record exists is kept exactly.** `buildTranscript` sets
 *   `reviewed` from the record's mere presence, and its "NOT APPROVED" banner
 *   reads differently for a page with no review at all.
 * - **The routable `id` is dropped.** It is not copy, and the transcript's sweep
 *   reports any page key it does not know as having no Karl field.
 * - **The corpus is KEYED BY PAGE KEY** (`pagesByKey`), not the `allPages`
 *   array: every lookup the transcript does is a target lookup by key, and
 *   handed the array it resolved none (130 chooser labels degraded to raw keys).
 */
import { pagesByKey } from '$lib/data';
import { buildTranscript, renderTranscriptMarkdown } from '$lib/legacy-core/karl-transcript.js';
import type { ReviewRecord } from './reviewRecord';

/* The transcript's output is read field by field by its two consumers, each in
   its own vocabulary, so entries stay loose rather than being re-modelled here.
   `any` rather than `unknown` for the same reason `fieldResolver.ts` gives. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TranscriptEntry = Record<string, any>;

export type Transcript = {
	type: string;
	entries: TranscriptEntry[];
	/** Positional path -> raw Karl panel name, for each piece of copy placed. */
	claims: Record<string, string>;
	unmapped: { path: string; shape: string; reason: string }[];
	[key: string]: unknown;
};

/** The corpus keyed by page key -- what `pagesByKey` is. */
export type Corpus = Record<string, object>;

const build = buildTranscript as unknown as (
	page: object,
	record: ReviewRecord | null,
	pages: Corpus
) => Transcript;

/** The record with its copy taken out: the page object carries the copy. */
function metadataOf(record: ReviewRecord | null): ReviewRecord | null {
	if (!record) return null;
	const { decision, url_slug, expired, orphaned } = record;
	return {
		section_edits: {},
		decision,
		...(url_slug !== undefined ? { url_slug } : {}),
		...(expired ? { expired } : {}),
		...(orphaned ? { orphaned } : {})
	};
}

/**
 * The transcript of `page` exactly as given.
 *
 * @param page the copy to transcribe: the copy as shown or the copy as
 *   recorded (`CONTEXT.md`), whichever the caller means.
 * @param record the review record from `reviewRecordFor`, or `null` when there
 *   is no review. Only its decision, slug and stale flags are read.
 * @param corpus the corpus keyed by page key; `pagesByKey` unless a test hands
 *   in another.
 */
export function transcriptFor(
	page: object,
	record: ReviewRecord | null,
	corpus: Corpus = pagesByKey as unknown as Corpus
): Transcript {
	const { id: _routableId, ...corpusPage } = page as { id?: unknown };
	void _routableId;
	return build(corpusPage, metadataOf(record), corpus);
}

/** The transcript as the markdown the Help tab shows. */
export const transcriptMarkdown = renderTranscriptMarkdown as unknown as (
	transcript: Transcript
) => string;
