/**
 * Whether a page's shape fits the rules Karl states for its content type: the
 * Step by step step limit and required step titles, a Transaction's What to do
 * panel, and an Information page staying non-actionable.
 *
 * The rules and their citations live in `$lib/karl/contentTypeRules`; this only
 * walks a page and says what they say about it. Like `karlComponentChecks`, a
 * finding appears only for the type it governs, so a Transaction is never told
 * its steps fit a Step by step limit.
 *
 * Information findings are structural, not linguistic. Karl's test is "if
 * there's something the user must do with the City", and deciding that from
 * wording would flag every "you can call 311". What is checked instead is the
 * shape Karl associates with action: steps (which an Information section has
 * no field for) and headings numbered as a sequence.
 */
import {
	CONTENT_TYPE_RULES,
	STEP_LIMIT,
	STEP_TARGET,
	type ContentTypeRuleKey
} from '$lib/karl/contentTypeRules';
import { pagesByKey } from '$lib/data';
import { placementsFor } from '$lib/karl/placement';
import type { KarlHelpLink } from './karlHelp';
import type { ComponentFinding } from './karlComponentChecks';
import type { FindingItem } from './index';

/* eslint-disable-next-line @typescript-eslint/no-explicit-any --
   corpus modules are plain untyped objects; same scoped boundary as
   karlComponentChecks.ts. */
type AnyPage = Record<string, any>;

const help = (key: ContentTypeRuleKey): KarlHelpLink => {
	const rule = CONTENT_TYPE_RULES[key];
	return { title: rule.helpTitle, url: rule.url, why: `Karl: “${rule.says}”` };
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** A heading that numbers itself as one item in a sequence: "1. Do this", "2) Then that". */
const NUMBERED_HEADING = /^\s*\d+[.)]\s+\S/;

/** A section the corpus maps onto Karl's What to do panel. */

function stepByStepFindings(page: AnyPage): ComponentFinding[] {
	const steps: { title: string; where: string }[] = [];
	for (const section of page.sections ?? []) {
		for (const step of section.steps ?? []) {
			steps.push({
				title: String(step?.title ?? '').trim(),
				where: `Section “${section.heading ?? ''}”`
			});
		}
	}

	if (steps.length === 0) {
		return [
			{
				id: 'karl-step-count',
				title: 'Number of steps',
				status: 'unavailable',
				summary: 'This Step by step page has no steps to count.',
				help: help('stepCount'),
				items: []
			}
		];
	}

	const n = steps.length;
	const count: ComponentFinding =
		n > STEP_LIMIT
			? {
					id: 'karl-step-count',
					title: 'Number of steps',
					status: 'issue',
					summary: `${plural(n, 'step')}; Karl allows ${STEP_LIMIT}.`,
					help: help('stepCount'),
					items: [
						{
							text: plural(n, 'step'),
							detail: `Karl will not accept more than ${STEP_LIMIT}. Merge steps, or move detail onto the Transaction or Information page each step links to.`
						}
					]
				}
			: n > STEP_TARGET
				? {
						id: 'karl-step-count',
						title: 'Number of steps',
						status: 'issue',
						summary: `${plural(n, 'step')}; Karl recommends no more than ${STEP_TARGET}.`,
						help: help('stepCount'),
						items: [
							{
								text: plural(n, 'step'),
								detail: `Within Karl’s limit of ${STEP_LIMIT}, but over the ${STEP_TARGET} it says to aim for. Consider merging steps that happen together, or using an “and”/“or” step.`
							}
						]
					}
				: {
						id: 'karl-step-count',
						title: 'Number of steps',
						status: 'pass',
						summary: `${plural(n, 'step')}, within Karl’s recommended ${STEP_TARGET}.`,
						help: help('stepCount'),
						items: []
					};

	const untitled: FindingItem[] = steps
		.map((s, i) => ({ ...s, i }))
		.filter((s) => s.title === '')
		.map((s) => ({
			key: s.where,
			text: `Step ${s.i + 1}`,
			detail: 'Karl requires a title on every step.'
		}));

	const titles: ComponentFinding = {
		id: 'karl-step-titles',
		title: 'Step titles',
		status: untitled.length > 0 ? 'issue' : 'pass',
		summary:
			untitled.length > 0
				? `${untitled.length} of ${plural(n, 'step')} have no title.`
				: `All ${plural(n, 'step')} have a title.`,
		help: help('stepTitle'),
		items: untitled
	};

	return [count, titles];
}

/**
 * A Transaction's What to do section, read off its placement.
 *
 * It used to pass any section whose `karl` NOTE mentioned what_to_do, so a page
 * whose prose said so but whose section went elsewhere passed -- the known gap.
 * Now a section counts only when the transcript places it in `what_to_do`, and
 * its heading must be the "What to do" Karl hard-codes there.
 */
function transactionFindings(page: AnyPage): ComponentFinding[] {
	const placements = placementsFor(page as never, null, pagesByKey);
	const whatToDo = [...placements.sections.values()].filter((s) => s.rawName === 'what_to_do');
	const items: FindingItem[] = [];
	if (whatToDo.length === 0) {
		items.push({
			text: 'No What to do section',
			detail:
				'Add the steps that move the reader forward, or, if the page only explains something, make it an Information page.'
		});
	}
	for (const s of whatToDo) {
		if (s.heading.trim().toLowerCase() !== 'what to do') {
			items.push({
				key: s.label,
				text: s.heading,
				detail: 'Karl always shows the heading “What to do” here, so this heading will not appear.'
			});
		}
	}
	return [
		{
			id: 'karl-transaction-what-to-do',
			title: 'What to do section',
			status: items.length ? 'issue' : 'pass',
			summary:
				whatToDo.length === 0
					? 'This Transaction has no section in Karl’s What to do panel, so nothing on it tells the reader what to do.'
					: items.length
						? 'This Transaction’s What to do section has a heading Karl will not show.'
						: 'This Transaction has a What to do section, headed “What to do”.',
			help: help('transactionWhatToDo'),
			items
		}
	];
}

function informationFindings(page: AnyPage): ComponentFinding[] {
	const sections: AnyPage[] = page.sections ?? [];
	const items: FindingItem[] = [];
	let numbered = 0;

	for (const section of sections) {
		const where = `Section “${section.heading ?? ''}”`;
		const n = (section.steps ?? []).length;
		if (n > 0) {
			items.push({
				key: where,
				text: String(section.heading ?? ''),
				detail: `${plural(n, 'step')} on a non-actionable page type. If the reader has to do these with the City, they belong on a Transaction or Step by step page. If they describe what the City does, rewrite them as text.`
			});
		}
		if (NUMBERED_HEADING.test(String(section.heading ?? ''))) numbered++;
	}

	if (numbered >= 2) {
		items.push({
			text: `${numbered} numbered section headings`,
			detail:
				'Karl names numbered steps as the sign of a Step by step page. If these are things to do in order, that is the better type. If they are reference categories, drop the numbers.'
		});
	}

	return [
		{
			id: 'karl-information-actionable',
			title: 'Information stays non-actionable',
			status: items.length > 0 ? 'issue' : 'pass',
			summary:
				items.length > 0
					? `${plural(items.length, 'part')} of this Information page ${items.length === 1 ? 'is' : 'are'} shaped like actions.`
					: 'No steps or numbered sequences on this Information page.',
			help: help('informationNotActionable'),
			items
		}
	];
}

export function karlContentTypeFindings(page: AnyPage): ComponentFinding[] {
	switch (String(page.type ?? '')) {
		case 'Step by step':
			return stepByStepFindings(page);
		case 'Transaction':
			return transactionFindings(page);
		case 'Information':
			return informationFindings(page);
		default:
			return [];
	}
}
