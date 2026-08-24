/**
 * The backend's cap on `prompt` for the `content` task, mirrored here so a
 * request that cannot succeed never leaves the browser. Stated in
 * `build_scripts/ai/schemas.js` as `prompt: z.string().min(1).max(8000)`.
 */
export const MAX_PROMPT_CHARS = 8_000;

type PromptInput = {
	page: unknown;
	sectionKey: string;
	instruction?: string;
	corpusIndex: string;
};

/**
 * What the assistant is asked to do, and what it may not do.
 *
 * Every line here is a constraint the mockup corpus already implies: the page
 * declares its reading level, the section declares its Karl mapping, and the
 * card schema already refuses an invented page key. Stating them keeps a
 * proposal publishable rather than merely well-written.
 */
const RUBRIC = [
	'Reconsider this section as a whole. Do not merely simplify or shorten it.',
	'Consider its structure, its order, and whether its shape suits its purpose.',
	'Say plainly what is missing — a step, a caveat, a link a reader needs.',
	'Hold the page reading level. A rethink that raises it is a regression.',
	'Never invent facts, numbers, dates, phone numbers or addresses.',
	'Preserve every link.',
	'Respect the section Karl mapping below. If your proposal changes which Karl',
	'block this becomes, say so explicitly in the section karl note.',
	'Propose link targets only from the page keys listed below. Never invent one.',
	'At most two paragraphs before switching to bullets.'
].join('\n');

export function buildRethinkPrompt({
	page,
	sectionKey,
	instruction,
	corpusIndex
}: PromptInput): string {
	const sections = ((page ?? {}) as { sections?: unknown }).sections;
	const section = (Array.isArray(sections) ? sections : []).find(
		(s) => (s as { fieldKey?: unknown }).fieldKey === sectionKey
	) as { heading?: unknown; karl?: unknown } | undefined;

	// A key that does not resolve means the corpus moved under the selection.
	// Rethinking whatever section happens to be first would be worse than failing.
	if (!section) {
		throw new Error(`That section is not on this page (${sectionKey}).`);
	}

	const reading = ((page ?? {}) as { reading?: unknown }).reading;
	const readingLine =
		typeof reading === 'string'
			? `Page reading level: ${reading}.`
			: 'Page reading level: Grade 6.';

	const prompt = [
		`Rethink the section whose fieldKey is "${sectionKey}"`,
		typeof section.heading === 'string' ? `(heading: "${section.heading}").` : '.',
		'',
		RUBRIC,
		'',
		readingLine,
		'',
		`Section Karl mapping: ${typeof section.karl === 'string' ? section.karl : '(none recorded)'}`,
		'',
		instruction ? `What the reviewer wants from this section: ${instruction}` : '',
		'',
		'Available page keys:',
		corpusIndex,
		'',
		'Return the whole page. Change only the named section; leave the others as given.'
	]
		.filter((line) => line !== '')
		.join('\n');

	if (prompt.length > MAX_PROMPT_CHARS) {
		throw new Error(
			`That request is ${prompt.length.toLocaleString()} characters; the limit is ${MAX_PROMPT_CHARS.toLocaleString()}.`
		);
	}

	return prompt;
}
