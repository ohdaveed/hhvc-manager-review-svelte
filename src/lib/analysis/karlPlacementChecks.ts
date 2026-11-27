/**
 * The Analysis panel's Karl findings, derived from placements.
 *
 * These used to be judged by rules of their own -- a component inventory read
 * off section tags, and a "What to do" test that matched note prose -- so the
 * Analysis panel and the Karl outline could give different answers about the
 * same page. Now both read `placementsFor`, which reads the transcript and
 * `schema.ts`. See `CONTEXT.md` for placement, unplaced, and the statuses.
 *
 * Judged on the copy as shown, with the same page object and review record the
 * Karl outline is given, so the panel and the outline cannot disagree.
 */
import { pagesByKey } from '$lib/data';
import { placementsFor, plainReason, type PagePlacements } from '$lib/karl/placement';
import type { ReviewRecord } from '$lib/karl/reviewRecord';
import { schemaFor } from '$lib/karl/schema';
import type { CorpusPage } from '$lib/corpus/fields';
import type { ComponentFinding } from './karlComponentChecks';
import type { KarlHelpLink } from './karlHelp';
import { titleWordsInDescription } from './textChecks';
import type { FindingItem } from './index';

const TYPES =
	'https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/building-a-page-by-content-type';

/** Each content type's own page in Karl's help center. */
const TYPE_PAGES: Record<string, string> = {
	Transaction: 'transaction',
	Information: 'information',
	'Resource Collection': 'resource-collection',
	'Step by step': 'step-by-step',
	Topic: 'topic',
	Campaign: 'campaign',
	Report: 'report',
	Agency: 'agency',
	Location: 'location',
	'About us': 'about'
};

const typeHelp = (type: string): KarlHelpLink => ({
	title: type,
	url: `${TYPES}/${TYPE_PAGES[type] ?? ''}`,
	why: `What a ${type} page holds in Karl, field by field.`
});

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function unplacedFinding(p: PagePlacements, help: KarlHelpLink): ComponentFinding {
	// The plain first sentence, as the outline's chips show it; the Blueprint's
	// tray keeps the transcript's full reason for whoever rebuilds the page.
	const items: FindingItem[] = p.unplaced.map((u) => ({
		text: u.subject,
		detail: plainReason(u.reason)
	}));
	return {
		id: 'karl-unplaced',
		title: 'Copy that won’t carry over',
		status: items.length ? 'issue' : 'pass',
		summary: items.length
			? `${plural(items.length, 'thing')} on this ${p.type} page ${items.length === 1 ? 'has' : 'have'} no Karl field to go into.`
			: `Every part of this ${p.type} page has a Karl field to go into.`,
		help,
		items
	};
}

function needsFixFinding(p: PagePlacements, help: KarlHelpLink): ComponentFinding {
	const items: FindingItem[] = [];
	for (const s of p.sections.values())
		if (s.status === 'needs-fix')
			items.push({ key: s.label, text: s.heading || s.label, detail: s.reasons.join(' ') });
	for (const f of p.fields.values())
		if (f.status === 'needs-fix' && f.reasons.length)
			items.push({ key: f.fieldId, text: f.label, detail: f.reasons.join(' ') });
	return {
		id: 'karl-needs-fix',
		title: 'Copy that needs a fix for Karl',
		status: items.length ? 'issue' : 'pass',
		summary: items.length
			? `${plural(items.length, 'place')} would go into Karl but ${items.length === 1 ? 'breaks' : 'break'} one of its rules.`
			: `Nothing on this ${p.type} page breaks a Karl rule this tool checks.`,
		help,
		items
	};
}

function unconfirmedFinding(
	p: PagePlacements,
	unconfirmedPageNotes: string[],
	help: KarlHelpLink
): ComponentFinding {
	const items: FindingItem[] = unconfirmedPageNotes.map((text) => ({
		text: 'This page',
		detail: text
	}));
	for (const s of p.sections.values())
		if (s.status === 'unconfirmed')
			items.push({ key: s.label, text: s.heading || s.label, detail: s.reasons.join(' ') });
	for (const f of p.fields.values())
		if (f.status === 'unconfirmed' && f.reasons.length)
			items.push({ key: f.fieldId, text: f.label || f.fieldId, detail: f.reasons.join(' ') });
	for (const panel of p.panels)
		for (const caveat of panel.caveats) items.push({ text: panel.label, detail: caveat });
	if (p.url?.status === 'unconfirmed')
		items.push({ text: 'URL', detail: `Karl’s own pages disagree: ${p.url.says}` });
	return {
		id: 'karl-unconfirmed',
		title: 'Karl rules not settled',
		// Not a fault in the page: Karl's own documentation leaves these open.
		status: items.length ? 'unavailable' : 'pass',
		summary: items.length
			? `${plural(items.length, 'point')} where Karl’s help center contradicts itself or does not say. Confirm in Karl before publishing.`
			: `Every Karl rule used on this ${p.type} page is settled in Karl’s help center.`,
		help,
		items
	};
}

function emptyFieldsFinding(p: PagePlacements, help: KarlHelpLink): ComponentFinding {
	const empty = p.panels.filter((x) => !x.filled && !x.inert);
	const required = empty.filter((x) => x.required);
	const items: FindingItem[] = [
		...required.map((x) => ({
			text: x.label,
			detail: 'Required: Karl won’t save the page without it.'
		})),
		...empty
			.filter((x) => !x.required)
			.map((x) => ({ text: x.label, detail: 'Optional, and empty.' }))
	];
	return {
		id: 'karl-empty-fields',
		title: 'Karl fields left empty',
		status: required.length ? 'issue' : 'pass',
		summary: required.length
			? `${plural(required.length, 'required field')} empty, plus ${plural(empty.length - required.length, 'optional one')}.`
			: empty.length
				? `No required field is empty; ${plural(empty.length, 'optional field')} left empty.`
				: 'Every Karl field on this page has something in it.',
		help,
		items
	};
}

/** A confirmed `sf.gov/[slug]` pattern: one path segment after the host. */
const FLAT_SLUG = /^sf\.gov\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

const ARTICLES = new Set(['a', 'an', 'the']);

function urlFinding(
	page: CorpusPage,
	p: PagePlacements,
	record: ReviewRecord | null
): ComponentFinding | null {
	const schema = schemaFor(p.type);
	if (!schema) return null;
	// The page object never carries an edited slug -- the mockup does not render
	// one -- so the record is where a reviewer's new URL is.
	const slug = String(record?.url_slug || (page as { slug?: unknown }).slug || '');
	const help: KarlHelpLink = {
		title: schema.url.cite.helpTitle,
		url: schema.url.cite.url,
		why: 'The URL pattern Karl gives each content type.'
	};
	if (schema.url.status === 'unconfirmed') {
		return {
			id: 'karl-url-pattern',
			title: 'URL pattern',
			status: 'unavailable',
			summary: `Karl’s own pages give two URL patterns for a ${p.type} page (${schema.url.pattern}), so this one cannot be checked.`,
			help,
			items: [{ text: slug }]
		};
	}
	// The only confirmed pattern is `sf.gov/[slug]`.
	const flat = FLAT_SLUG.test(slug);
	const items: FindingItem[] = [];
	if (!flat)
		items.push({
			text: slug,
			detail: `Expected ${schema.url.pattern}: lowercase words joined by dashes, with no further path.`
		});
	// Karl's URLs page drops articles: `apply-for-cannabis-equity-permit`.
	const articles = [...new Set(slug.replace(/^sf\.gov\//, '').split('-'))].filter((w) =>
		ARTICLES.has(w)
	);
	for (const a of articles)
		items.push({ text: slug, detail: `Karl drops articles from URLs: remove “${a}”.` });
	return {
		id: 'karl-url-pattern',
		title: 'URL pattern',
		status: items.length ? 'issue' : 'pass',
		summary: !flat
			? `Karl gives ${schema.url.pattern} for a ${p.type} page; this URL does not follow it.`
			: items.length
				? `The URL follows Karl’s ${schema.url.pattern} pattern but keeps an article Karl drops.`
				: `The URL follows Karl’s ${schema.url.pattern} pattern for a ${p.type} page.`,
		help,
		items
	};
}

const DESCRIPTION_HELP: KarlHelpLink = {
	title: 'Description',
	url: 'https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/components/description',
	why: 'Karl asks a Description not to reuse words from the title.'
};

/** Pass at 0 or 1 reused words: one shared key word is often unavoidable. */
function descriptionReuseFinding(page: CorpusPage): ComponentFinding {
	const p = page as { title?: unknown; summary?: unknown };
	const reused = titleWordsInDescription(String(p.title || ''), String(p.summary || ''));
	const ok = reused.length < 2;
	return {
		id: 'karl-description-reuse',
		title: 'Title words in the description',
		status: ok ? 'pass' : 'issue',
		summary: ok
			? 'The description says something the title does not.'
			: `The description repeats ${reused.length} words from the title. Use the space for what the title leaves out.`,
		help: DESCRIPTION_HELP,
		items: ok ? [] : [{ text: reused.join(', '), detail: 'Words the title already says.' }]
	};
}

/**
 * @param page the copy as shown -- the same page object the Karl outline reads.
 * @param record the page's review record from `reviewRecordFor`, the same one
 *   the outline is given, so the two cannot disagree. `null` signed out.
 */
export function karlPlacementFindings(
	page: CorpusPage,
	record: ReviewRecord | null = null
): ComponentFinding[] {
	const type = String((page as { type?: unknown }).type ?? '');
	if (!type) return [];
	const placements = placementsFor(page as never, record, pagesByKey);
	const help = typeHelp(type);
	const unconfirmedPageNotes = (schemaFor(type)?.pageCaveats ?? [])
		.filter((c) => c.status === 'unconfirmed')
		.map((c) => c.plain);
	const url = urlFinding(page, placements, record);
	return [
		unplacedFinding(placements, help),
		needsFixFinding(placements, help),
		unconfirmedFinding(placements, unconfirmedPageNotes, help),
		emptyFieldsFinding(placements, help),
		...(url ? [url] : []),
		descriptionReuseFinding(page)
	];
}
