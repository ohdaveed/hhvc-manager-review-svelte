import { requestGeneration, GenerationError } from '$lib/ai/generate';
import { pagesByKey } from '$lib/data';
import { buildCorpusIndex } from './corpusIndex';
import { buildRethinkPrompt } from './prompt';
import { diffSection, type Op } from './diff';

export type RethinkResult = {
	/** The assistant's reasoning. Slice 4 files this as a note. */
	rationale: string;
	ops: Op[];
	/** Headings of sections the assistant also wanted to change (decision 17). */
	otherSections: string[];
	/**
	 * The section's Karl mapping before and after (decision 9). Always
	 * populated -- `karl` is required on every section by the backend schema
	 * -- and equal when the proposal did not change it. These are the RAW
	 * strings, for display; the panel gates its notice on `karlChanged`
	 * below, not on comparing these directly.
	 */
	karlBefore: string;
	karlAfter: string;
	/**
	 * Whether `karlBefore` and `karlAfter` differ after normalizing away
	 * cosmetic re-rendering (see `normalizeKarl`). The panel renders its
	 * "Karl mapping changed" notice only when this is true, so a change to
	 * what someone must build in Wagtail cannot pass unnoticed below the ops
	 * list -- and so a cosmetic re-emission of the same note cannot fire it
	 * either.
	 */
	karlChanged: boolean;
	model: string;
	disclosure: string;
};

type RethinkInput = {
	page: unknown;
	pageId: string;
	sectionKey: string;
	instruction?: string;
	signal?: AbortSignal;
};

type Section = { fieldKey?: unknown; heading?: unknown; karl?: unknown };

const sectionsOf = (page: unknown): Section[] => {
	const list = ((page ?? {}) as { sections?: unknown }).sections;
	return Array.isArray(list) ? (list as Section[]) : [];
};

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

/**
 * Fields significant to "did this OTHER section change" (decision 17).
 * Deliberately the same surface the diff itself covers (`blocks.ts`'s
 * `walk`), which already excludes `steps`/`cards` for slice 1 (decision 16).
 *
 * A raw `JSON.stringify(section)` comparison looked right but is not: the
 * LOCAL section carries `fieldKey` (stamped by `deriveFieldKey`) and the
 * RESPONSE section never does and adds backend-only `component`/`kind`
 * fields in a different key order -- confirmed against a live request. That
 * asymmetry made every section register as "changed" on every real request,
 * regardless of what the model actually did. Projecting both sides onto the
 * same fixed field list, in a fixed order, is what makes the comparison mean
 * anything.
 */
const CONTENT_KEYS = ['heading', 'karl', 'paragraphs', 'bullets', 'callout'] as const;

const contentSignature = (section: unknown): string => {
	const s = (section ?? {}) as Record<string, unknown>;
	const projected: Record<string, unknown> = {};
	for (const key of CONTENT_KEYS) projected[key] = s[key] ?? null;
	return JSON.stringify(projected);
};

/**
 * Fold away cosmetic re-rendering before comparing a Karl mapping note
 * (decision 9).
 *
 * Observed live, against the real backend: the model re-emitted an unchanged
 * Karl note verbatim except for the quote marks around one phrase, changing
 * from the corpus's own typographic double quotes to straight single quotes
 * -- "...its own "What we do" block." became "...its own 'What we do'
 * block." -- which made the raw `karlBefore !== karlAfter` comparison fire on
 * a run where the CMS mapping had not changed at all. A notice that fires on
 * nearly every run is one nobody reads, defeating decision 9's purpose. Since
 * the observed swap crossed quote FAMILIES (double to single) as well as
 * style (curly to straight), every quote-like character -- both families,
 * both styles -- folds to one canonical mark; a model re-quoting the same
 * phrase differently is not a content change.
 *
 * Only quote characters and whitespace are folded. Deliberately NOT
 * lowercased and no punctuation beyond quotes is touched -- a genuine
 * mapping change that differs only in case or in real punctuation must still
 * be reported. This normalizes the COMPARISON only; `karlBefore`/`karlAfter`
 * on `RethinkResult` stay the raw strings so the panel can display what the
 * assistant actually said.
 */
const normalizeKarl = (value: string): string =>
	value
		.replace(/[“”„‘’‚"']/g, "'")
		.replace(/\s+/g, ' ')
		.trim();

/**
 * Ask the assistant to rethink one section, and return the differences.
 *
 * The `content` task answers with a whole page. Only the target section is
 * diffed; the others are reported by heading and otherwise discarded, because
 * cross-section changes are out of scope and silently dropping them would
 * throw away the most useful thing a rethink notices.
 */
export async function requestRethink({
	page,
	pageId,
	sectionKey,
	instruction,
	signal
}: RethinkInput): Promise<RethinkResult> {
	// Field ids are page-relative — `title` resolves on all 29 pages — so a
	// proposal produced for page A must be structurally unable to reach page B.
	// Guarded on `typeof === 'string'` deliberately: a page object without an
	// `id` is not an error, it is a fixture.
	const actualPageId = ((page ?? {}) as { id?: unknown }).id;
	if (typeof actualPageId === 'string' && actualPageId !== pageId) {
		throw new Error(`That page is not the one this rethink was for (${pageId}).`);
	}

	const currentSections = sectionsOf(page);
	const targetIndex = currentSections.findIndex((s) => s.fieldKey === sectionKey);
	if (targetIndex === -1) throw new Error(`That section is not on this page (${sectionKey}).`);
	const current = currentSections[targetIndex];

	const prompt = buildRethinkPrompt({
		page,
		sectionKey,
		instruction,
		corpusIndex: buildCorpusIndex(pagesByKey)
	});

	// `fieldKey` is client-derived metadata and is not accepted by the backend
	// section schema. Keep the original page for local lookup and diffing.
	const requestPage = (() => {
		if (!page || typeof page !== 'object') return page;
		const pageRecord = page as Record<string, unknown>;
		const sections = pageRecord.sections;
		if (!Array.isArray(sections)) return page;
		return {
			...pageRecord,
			sections: sections.map((section) => {
				if (!section || typeof section !== 'object') return section;
				const backendSection = { ...(section as Record<string, unknown>) };
				delete backendSection.fieldKey;
				return backendSection;
			})
		};
	})();

	const ask = (provider: 'claude' | 'gemini') =>
		requestGeneration({ task: 'content', provider, prompt, page: requestPage }, signal);

	// Provider fallback (decision 15, plus the ruling that followed it once
	// the backend's Anthropic key hit its usage cap): try Claude, and on a
	// PROVIDER-level failure -- the backend's 5xx, or the 400 it raises when
	// the model itself rejected the call -- retry once with Gemini.
	//
	// Never on 422 (a content refusal: a different model declining
	// differently is not an improvement, and shopping for one that will
	// comply is the wrong behaviour on a government content tool), 401 (the
	// caller isn't signed in -- a different model answers nothing), or 413
	// (the payload is too big regardless of which model receives it). A 400
	// the PROXY itself raises for a bad payload would be just as
	// indiscriminate to retry -- but this caller only ever sends `prompt` and
	// `page`, never the `fieldText`/`instruction` fields the proxy's own 400
	// checks inspect, so a 400 reaching this catch can only be the backend's.
	//
	// A backend 400 is itself ambiguous, though: it can be the model provider
	// rejecting the call, or the backend's own Zod validation failing on the
	// grounding page passed in `prompt`. The second case wastes one Gemini
	// call before failing identically -- not revisited, since distinguishing
	// the two would need message-sniffing that is not worth building.
	let data;
	try {
		data = await ask('claude');
	} catch (e) {
		const status = e instanceof GenerationError ? e.status : undefined;
		const isProviderFailure = status !== undefined && (status >= 500 || status === 400);
		if (!isProviderFailure) throw e;
		data = await ask('gemini');
	}

	// `valid: false` means the backend's own Zod validation still failed after
	// its retry. Its `issues` name what is wrong; showing them beats a diff
	// computed from a page the backend already rejected.
	if (data?.valid === false) {
		const issues = Array.isArray(data.issues) ? data.issues.join('; ') : 'unknown validation error';
		throw new Error(`The assistant's draft did not validate: ${issues}`);
	}

	const proposedPage = data?.result;
	const proposedSections = sectionsOf(proposedPage);

	// Failing loudly beats diffing the wrong section. `fieldKey` cannot
	// round-trip through the backend (see prompt.ts), so the target is
	// matched by ORDINAL position -- sound only because both sides are
	// verified to be the same length first.
	if (proposedSections.length !== currentSections.length) {
		throw new Error(
			`The assistant returned ${proposedSections.length} sections; the page has ${currentSections.length}.`
		);
	}

	const proposed = proposedSections[targetIndex];
	if (!proposed) {
		throw new Error('The assistant did not return that section.');
	}

	// Compared by INDEX, never by key: the response carries no `fieldKey` to
	// match on. Sound because of the length guard above -- without it, an
	// index comparison would not be.
	const otherSections = proposedSections
		.map((s, i) => ({ s, i }))
		.filter(({ i }) => i !== targetIndex)
		.filter(({ s, i }) => contentSignature(currentSections[i]) !== contentSignature(s))
		.map(({ s, i }) => text(currentSections[i]?.heading) || text(s.heading))
		.filter(Boolean);

	return {
		// Page-level, not section-level: `editorNote` is not on `sectionSchema`
		// at all -- see prompt.ts.
		rationale: text((proposedPage as { editorNote?: unknown } | undefined)?.editorNote),
		ops: diffSection(current, proposed, sectionKey),
		otherSections,
		karlBefore: text(current.karl),
		karlAfter: text(proposed.karl),
		karlChanged: normalizeKarl(text(current.karl)) !== normalizeKarl(text(proposed.karl)),
		model: text(data?.model),
		disclosure: text(data?.disclosure)
	};
}
