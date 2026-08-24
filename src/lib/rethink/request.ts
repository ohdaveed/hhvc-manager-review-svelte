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
		.map((s) => text(before.get(s.fieldKey)?.heading))
		.filter(Boolean);

	return {
		rationale: text((proposed as { editorNote?: unknown }).editorNote),
		ops: diffSection(current, proposed, sectionKey),
		otherSections,
		model: text(data?.model),
		disclosure: text(data?.disclosure)
	};
}
