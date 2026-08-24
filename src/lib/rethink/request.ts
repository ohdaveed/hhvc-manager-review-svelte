import { requestGeneration } from '$lib/ai/generate';
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

type Section = { fieldKey?: unknown; heading?: unknown; editorNote?: unknown };

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

	const current = sectionsOf(page).find((s) => s.fieldKey === sectionKey);
	if (!current) throw new Error(`That section is not on this page (${sectionKey}).`);

	const prompt = buildRethinkPrompt({
		page,
		sectionKey,
		instruction,
		corpusIndex: buildCorpusIndex(pagesByKey)
	});

	const data = await requestGeneration(
		{ task: 'content', provider: 'claude', prompt, page },
		signal
	);

	// `valid: false` means the backend's own Zod validation still failed after
	// its retry. Its `issues` name what is wrong; showing them beats a diff
	// computed from a page the backend already rejected.
	if (data?.valid === false) {
		const issues = Array.isArray(data.issues) ? data.issues.join('; ') : 'unknown validation error';
		throw new Error(`The assistant's draft did not validate: ${issues}`);
	}

	const proposedPage = data?.result;
	const proposed = sectionsOf(proposedPage).find((s) => s.fieldKey === sectionKey);
	if (!proposed) {
		throw new Error('The assistant did not return that section.');
	}

	const before = new Map(sectionsOf(page).map((s) => [s.fieldKey, s]));
	const otherSections = sectionsOf(proposedPage)
		.filter((s) => s.fieldKey !== sectionKey)
		// Compared by KEY, never by array position: the model may return the
		// sections in a different order, and an index comparison would then report
		// every section as changed.
		.filter((s) => JSON.stringify(before.get(s.fieldKey)) !== JSON.stringify(s))
		// Fall back to the proposed section's own heading when there is no
		// match in the original: an invented section (a fieldKey not on the
		// original page) is the one case most worth telling the reviewer
		// about, and must not vanish just because there is nothing to look
		// its old heading up against.
		.map((s) => text(before.get(s.fieldKey)?.heading) || text(s.heading))
		.filter(Boolean);

	return {
		rationale: text((proposed as { editorNote?: unknown }).editorNote),
		ops: diffSection(current, proposed, sectionKey),
		otherSections,
		model: text(data?.model),
		disclosure: text(data?.disclosure)
	};
}
