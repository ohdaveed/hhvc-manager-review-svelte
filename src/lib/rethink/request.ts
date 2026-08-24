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
	 * -- and equal when the proposal did not change it. The panel renders a
	 * notice only when they differ, so a change to what someone must build in
	 * Wagtail cannot pass unnoticed below the ops list.
	 */
	karlBefore: string;
	karlAfter: string;
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

	const ask = (provider: 'claude' | 'gemini') =>
		requestGeneration({ task: 'content', provider, prompt, page }, signal);

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
		.filter(({ s, i }) => JSON.stringify(currentSections[i]) !== JSON.stringify(s))
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
		model: text(data?.model),
		disclosure: text(data?.disclosure)
	};
}
