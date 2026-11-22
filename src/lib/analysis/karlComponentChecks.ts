/**
 * Components a page uses that Karl does not offer on its content type, and
 * component text over Karl's character limits.
 *
 * The rules live in `$lib/karl/componentSupport`; this only walks a page and
 * states what they say about it. One finding per component the page actually
 * uses, so a page without callouts is not told its callouts pass.
 *
 * These findings cite their component's help page directly rather than a
 * `KarlHelpKey`: the citation comes from the same row as the rule, so the two
 * cannot point at different pages.
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
	const type = String(page.type ?? '');
	const uses: Use[] = [];
	const add = (component: KarlComponent, text: unknown, where: string, judged = type) =>
		uses.push({
			component,
			type: judged,
			text: snippet(text),
			length: String(text ?? '').trim().length,
			where
		});

	if (page.spotlight) {
		add('spotlight', page.spotlight.title, 'Page spotlight');
		if (page.spotlight.button) add('spotlightButton', page.spotlight.button, 'Page spotlight');
	}

	for (const section of page.sections ?? []) {
		const where = `Section “${section.heading ?? ''}”`;
		const isSpotlight = section.component === 'spotlight';

		if (isSpotlight) add('spotlight', section.heading, where);
		if (section.component === 'supporting') add('accordion', section.heading, where);
		if (section.component === 'resources') add('resources', section.heading, where);
		if (section.component === 'related') {
			for (const card of section.cards ?? []) {
				// A target outside the corpus has no known type; the site map reports those.
				const target = typeOf(card?.target);
				if (target) add('related', card.title, `${where} → ${target} page`, target);
			}
		}
		if (section.callout) add('callout', section.callout.title ?? section.callout.text, where);
		if (section.button) add(isSpotlight ? 'spotlightButton' : 'button', section.button, where);
		if (section.table) add('table', section.table.caption ?? section.heading, where);

		// Steps are part of their page, so Karl judges them by the page's type.
		for (const step of section.steps ?? []) {
			const at = `Step “${step.title ?? ''}”`;
			if (step.callout) add('callout', step.callout.title ?? step.callout.text, at);
			if (step.button) add('button', step.button, at);
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
