/**
 * Related cards that point at a page type Karl's Related field cannot hold.
 *
 * This is the one Karl check that is NOT judged by placements: a placement says
 * which panel a card lands in, not what type of page the card links to. Every
 * other component check this module used to run -- a callout, accordion,
 * button, spotlight, resource tile, contact section, table or alert on a type
 * that does not offer it, and their character limits -- is now part of the
 * placement (`$lib/karl/placement`), which the Karl outline and
 * `karlPlacementChecks` both read, so the two cannot disagree.
 *
 * The finding cites the component's help page directly rather than a
 * `KarlHelpKey`: the citation comes from the same row as the rule.
 */
import { pagesByKey } from '$lib/data';
import {
	COMPONENT_SUPPORT,
	isSupported,
	type KarlComponent,
	type Support
} from '$lib/karl/componentSupport';
import type { KarlHelpLink } from './karlHelp';
import type { FindingItem, FindingStatus } from './index';

export type ComponentFinding = {
	id: string;
	title: string;
	status: FindingStatus;
	summary: string;
	help: KarlHelpLink;
	items: FindingItem[];
};

/* eslint-disable-next-line @typescript-eslint/no-explicit-any --
   corpus modules are plain untyped objects; same scoped boundary as
   sitemap.ts. */
type AnyPage = Record<string, any>;

/** One use of a component on the page. `type` is the type being judged. */
type Use = { component: KarlComponent; type: string; text: string; length: number; where: string };

const typeOf = (key: unknown): string =>
	String((pagesByKey as unknown as AnyPage)[String(key)]?.type ?? '');

const snippet = (text: unknown): string => {
	const s = String(text ?? '')
		.replace(/\*\*/g, '')
		.trim();
	return s.length > 80 ? `${s.slice(0, 79)}…` : s;
};

function usesOn(page: AnyPage): Use[] {
	const uses: Use[] = [];
	for (const section of page.sections ?? []) {
		if (section.component !== 'related') continue;
		const where = `Section “${section.heading ?? ''}”`;
		for (const card of section.cards ?? []) {
			// A target outside the corpus has no known type; the site map reports those.
			const target = typeOf(card?.target);
			if (!target) continue;
			const text = snippet(card.title);
			uses.push({
				component: 'related',
				type: target,
				text,
				length: String(card.title ?? '').trim().length,
				where: `${where} → ${target} page`
			});
		}
	}
	return uses;
}

const list = (types: readonly string[]) =>
	types.length < 2 ? types.join('') : `${types.slice(0, -1).join(', ')} and ${types.at(-1)}`;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function karlComponentFindings(page: AnyPage): ComponentFinding[] {
	const pageType = String(page.type ?? '');
	const uses = usesOn(page);
	const findings: ComponentFinding[] = [];

	for (const component of Object.keys(COMPONENT_SUPPORT) as KarlComponent[]) {
		const mine = uses.filter((u) => u.component === component);
		if (mine.length === 0) continue;
		const rule = COMPONENT_SUPPORT[component];
		const items: FindingItem[] = [];
		const unknown: Use[] = [];

		for (const use of mine) {
			const support: Support = isSupported(component, use.type);
			if (support === 'unknown') unknown.push(use);
			if (support === 'no') {
				items.push({
					key: use.where,
					text: use.text,
					detail:
						component === 'related'
							? `Karl’s Related section can only link to ${list(rule.types)} pages, not ${use.type} pages. ${rule.instead}`
							: `Karl offers ${rule.label.toLowerCase()}s only on ${list(rule.types)} pages, not ${use.type} pages. ${rule.instead}`
				});
			}
			const max = rule.maxChars?.title ?? rule.maxChars?.label;
			if (max !== undefined && use.length > max) {
				items.push({
					key: use.where,
					text: use.text,
					detail: `${use.length} characters; Karl allows ${max}. Shorten it to ${max} or fewer.`
				});
			}
		}

		const cap = rule.maxPerPage?.[pageType];
		if (cap !== undefined && mine.length > cap) {
			items.push({
				text: `${plural(mine.length, rule.label.toLowerCase())} on this page`,
				detail: `A ${pageType} page allows ${cap}. Remove ${mine.length - cap}, or turn the extra into an ordinary body section.`
			});
		}

		const help: KarlHelpLink = {
			title: rule.helpTitle,
			url: rule.url,
			why: 'Which content types Karl offers this component on, and its limits.'
		};
		const noun = plural(mine.length, rule.label.toLowerCase());

		if (items.length > 0) {
			findings.push({
				id: `karl-${component}`,
				title: `${rule.label}s`,
				status: 'issue',
				summary: `${plural(items.length, 'problem')} with the ${noun} on this ${pageType} page.`,
				help,
				items
			});
		} else if (unknown.length > 0) {
			findings.push({
				id: `karl-${component}`,
				title: `${rule.label}s`,
				status: 'unavailable',
				summary: `Karl’s help center does not say whether ${pageType} pages offer ${rule.label.toLowerCase()}s. Confirm in Karl before publishing.`,
				help,
				items: unknown.map((u) => ({ key: u.where, text: u.text }))
			});
		} else {
			findings.push({
				id: `karl-${component}`,
				title: `${rule.label}s`,
				status: 'pass',
				summary: `${mine.length === 1 ? `The ${rule.label.toLowerCase()} matches` : `All ${noun} match`} Karl’s rules for a ${pageType} page.`,
				help,
				items: []
			});
		}
	}
	return findings;
}
