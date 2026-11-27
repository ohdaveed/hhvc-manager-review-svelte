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
 * So the record is built here and only here. Three of its properties are load-
 * bearing rather than incidental:
 *
 * 1. **Last write wins, by `created_at`.** `edits` is append-only and a field
 *    can hold several rows; the fold is `latestByField` in `$lib/corpus/overlay`.
 * 2. **`title`, `summary` and `slug` are page fields, not sections.**
 *    `resolveValue` in `karl-transcript.js` reads them under those names
 *    (`edited_title`, `edited_summary`, `url_slug`); everything else is a
 *    section edit keyed by field id.
 * 3. **No edits and no decision yields `null`, not an empty record.**
 *    `buildTranscript` sets `reviewed` from the record's mere presence, so an
 *    empty object would report a review that never happened -- and the
 *    transcript's "NOT APPROVED" banner reads differently for the two.
 */
import { latestByField } from '$lib/corpus/overlay';
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
	/**
	 * Saved edits that no longer answer their base copy (ADR 0001), by field id.
	 * `expired`: the accepted wording and the base copy now. `orphaned`: the
	 * accepted wording of an edit whose field is gone. Not read by
	 * `karl-transcript.js`; `walkthrough.ts` renders them beside its output.
	 */
	expired?: Record<string, { accepted: string; base: string }>;
	orphaned?: Record<string, string>;
};

/** Which of a page's saved edits are stale, as the layout knows it. */
export type StaleEdits = {
	/** Field id -> the base copy now, for each expired edit. */
	expired: Record<string, string>;
	/** Field ids of orphaned edits. */
	orphaned: string[];
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
	edits: Edit[],
	stale?: StaleEdits
): ReviewRecord | null {
	if (!pageId) return null;

	const livePage = pages.find((p) => p.path === pageId);
	const latest = latestByField(edits.filter((e) => e.page_id === livePage?.id));

	if (latest.size === 0 && !livePage?.status) return null;

	const record: ReviewRecord = {
		section_edits: {},
		decision: STATUS_LABELS[livePage?.status as ReviewPage['status']] ?? 'Needs review'
	};

	// The newest wording per field: what the record carries and what a stale
	// flag is about.
	const accepted = new Map([...latest].map(([fieldId, e]) => [fieldId, e.new_content]));
	for (const [fieldId, text] of accepted) {
		if (fieldId === 'title') record.edited_title = text;
		else if (fieldId === 'summary') record.edited_summary = text;
		else if (fieldId === 'slug') record.url_slug = text;
		else record.section_edits[fieldId] = text;
	}
	for (const [fieldId, base] of Object.entries(stale?.expired ?? {})) {
		const text = accepted.get(fieldId);
		if (text !== undefined) (record.expired ??= {})[fieldId] = { accepted: text, base };
	}
	for (const fieldId of stale?.orphaned ?? []) {
		const text = accepted.get(fieldId);
		if (text !== undefined) (record.orphaned ??= {})[fieldId] = text;
	}

	return record;
}
