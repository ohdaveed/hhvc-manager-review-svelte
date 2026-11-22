/**
 * One definition of "the reviewed page", shared by every Karl consumer.
 *
 * `buildTranscript` takes a `reviewRecord` -- the reviewer's saved edits and
 * their decision -- and resolves each Karl field against it, so a field the
 * reviewer rewrote is transcribed as the NEW text. Passing `null` instead
 * transcribes the original mockup copy. That is how the walkthrough came to
 * hand an editor pre-review text while the Help tab's transcript showed the
 * approved version of the same page: two callers, one of them passing `null`,
 * and nothing naming the difference.
 *
 * So the fold lives here and only here. Three of its properties are load-
 * bearing rather than incidental:
 *
 * 1. **Ordered explicitly by `created_at`.** `edits` is append-only and a
 *    field can hold several rows, so the fold is last-write-wins. Row order
 *    from PostgREST is not a guarantee; the timestamp is.
 * 2. **`title`, `summary` and `slug` are page fields, not sections.**
 *    `resolveValue` in `karl-transcript.js` reads them under those names
 *    (`edited_title`, `edited_summary`, `url_slug`); everything else is a
 *    section edit keyed by field id.
 * 3. **No edits and no decision yields `null`, not an empty record.**
 *    `buildTranscript` sets `reviewed` from the record's mere presence, so an
 *    empty object would report a review that never happened -- and the
 *    transcript's "NOT APPROVED" banner reads differently for the two.
 */
import type { Edit, ReviewPage } from '$lib/stores/reviewState';

/**
 * The legacy record shape `buildTranscript` consumes.
 *
 * `karl-transcript.js` is untyped JS, so this is the contract as its JSDoc and
 * `resolveValue` state it rather than a type imported from there.
 */
export type ReviewRecord = {
	section_edits: Record<string, string>;
	decision: string;
	edited_title?: string;
	edited_summary?: string;
	url_slug?: string;
};

/**
 * Decision labels, spelled the way the transcript's approval test spells them.
 *
 * `APPROVED_DECISIONS` in `karl-transcript.js` matches `Approved` and
 * `Approved with edits` as string literals, so a label invented here would
 * silently mark a signed-off page "NOT APPROVED — do not publish".
 */
const STATUS_LABELS: Record<ReviewPage['status'], string> = {
	'needs-review': 'Needs review',
	approved: 'Approved',
	blocked: 'Blocked',
	revise: 'Needs revision'
};

/**
 * The review record for one corpus page, or `null` if nothing is recorded.
 *
 * @param pageId the routable corpus id (`pageData.id`), matched against
 *   `pages.path` -- the same lookup the layout and the Fields tab use.
 * @param pages the live `pages` rows for the loaded review.
 * @param edits the live `edits` rows (`latest_edits`, one per field, but this
 *   folds a full history correctly either way).
 */
export function reviewRecordFor(
	pageId: string | undefined,
	pages: ReviewPage[],
	edits: Edit[]
): ReviewRecord | null {
	if (!pageId) return null;

	const livePage = pages.find((p) => p.path === pageId);
	const mine = edits
		.filter((e) => e.page_id === livePage?.id)
		.slice()
		.sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));

	if (mine.length === 0 && !livePage?.status) return null;

	const record: ReviewRecord = {
		section_edits: {},
		decision: STATUS_LABELS[livePage?.status as ReviewPage['status']] ?? 'Needs review'
	};

	for (const edit of mine) {
		if (edit.field_id === 'title') record.edited_title = edit.new_content;
		else if (edit.field_id === 'summary') record.edited_summary = edit.new_content;
		else if (edit.field_id === 'slug') record.url_slug = edit.new_content;
		else record.section_edits[edit.field_id] = edit.new_content;
	}

	return record;
}
