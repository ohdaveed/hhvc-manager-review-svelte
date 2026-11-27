/**
 * The Propose a page form's choices, and how they reach the drafter.
 *
 * The drafter takes ONE free-text prompt (`requestGeneration({ task: 'content',
 * prompt })`), and `draft_pages` stores one `description` -- the prompt a retry
 * drafts from again. So the section, template and path a reviewer picks are
 * not columns: they are written into that text, after a blank line, where the
 * model reads them as part of the request and a retry gets the same request.
 * The server titles a draft from the FIRST paragraph only, so they never leak
 * into the queue row's title.
 *
 * Nothing places a draft by its section: drafts stay under "Proposed pages",
 * because `groupPaths` sorts by `PAGE_GROUPS`, which can only name corpus ids.
 */

export const TEMPLATE_CHOICES = [
	{
		value: 'Transaction',
		label: 'Transaction',
		hint: 'Resident completes a task: report, apply, pay'
	},
	{ value: 'Step by step', label: 'Step by step', hint: 'Ordered process across several steps' },
	{ value: 'Information', label: 'Information', hint: 'Guidance to read' },
	{ value: 'suggest', label: 'Let the drafter suggest one', hint: '' }
] as const;

export type TemplateChoice = (typeof TEMPLATE_CHOICES)[number]['value'];

/**
 * `sf.gov/report-dead-animal`, `/report-dead-animal` and `report-dead-animal`
 * all name one path; written out as `sf.gov/report-dead-animal`. Blank is none.
 */
export function normalizeSfPath(raw: string): string {
	const rest = raw
		.trim()
		.replace(/^https?:\/\//i, '')
		.replace(/^(www\.)?sf\.gov/i, '')
		.replace(/^\/+/, '');
	return rest ? `sf.gov/${rest}` : '';
}

/**
 * The description as sent and stored: the reviewer's words, then one line per
 * choice they made. With no choices it is exactly the trimmed words, so a
 * plain description is stored as it was before the choices existed.
 */
export function composeDraftRequest(opts: {
	description: string;
	section: string;
	template: TemplateChoice;
	path: string;
}): string {
	const text = opts.description.trim();
	const path = normalizeSfPath(opts.path);
	const lines = [
		opts.template !== 'suggest' && `Karl template: ${opts.template}.`,
		opts.section && `Section of the HHVC site: ${opts.section}.`,
		path && `Suggested path: ${path}`
	].filter((l): l is string => typeof l === 'string' && l !== '');
	return lines.length > 0 ? `${text}\n\n${lines.join('\n')}` : text;
}
