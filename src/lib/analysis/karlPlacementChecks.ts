/**
 * The Analysis panel's Karl findings, derived from placements.
 *
 * These used to be judged by rules of their own -- a component inventory read
 * off section tags, and a "What to do" test that matched note prose -- so the
 * Analysis panel and the Karl outline could give different answers about the
 * same page. Now both read `placementsFor`, which reads the transcript and
 * `schema.ts`. See `CONTEXT.md` for placement, unplaced, and the statuses.
 *
 * Judged on the copy on screen: the base corpus plus the reviewer's saved
 * edits, folded the same way `reviewRecordFor` folds them.
 */
import { pagesByKey } from '$lib/data';
import { placementsFor, type PagePlacements } from '$lib/karl/placement';
import type { ReviewRecord } from '$lib/karl/reviewRecord';
import { schemaFor } from '$lib/karl/schema';
import type { CorpusPage } from '$lib/corpus/fields';
import type { ComponentFinding } from './karlComponentChecks';
import type { KarlHelpLink } from './karlHelp';
import type { EditRow } from './pageCopy';
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

/**
 * Saved edits as a review record: append-only rows, newest wins, with `title`
 * and `summary` split out as the record does.
 */
export function recordFromEdits(edits: EditRow[]): ReviewRecord {
	const sorted = [...edits].sort((a, b) =>
		String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''))
	);
	const record: ReviewRecord = { section_edits: {}, decision: '' };
	for (const row of sorted) {
		if (row.field_id === 'title') record.edited_title = row.new_content;
		else if (row.field_id === 'summary') record.edited_summary = row.new_content;
		else record.section_edits[row.field_id] = row.new_content;
	}
	return record;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function unplacedFinding(p: PagePlacements, help: KarlHelpLink): ComponentFinding {
	const items: FindingItem[] = p.unplaced.map((u) => ({ text: u.subject, detail: u.reason }));
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

function urlFinding(
	page: CorpusPage,
	p: PagePlacements,
	record: ReviewRecord
): ComponentFinding | null {
	const schema = schemaFor(p.type);
	if (!schema) return null;
	const slug = String(record.url_slug || (page as { slug?: unknown }).slug || '');
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
	const ok = FLAT_SLUG.test(slug);
	return {
		id: 'karl-url-pattern',
		title: 'URL pattern',
		status: ok ? 'pass' : 'issue',
		summary: ok
			? `The URL follows Karl’s ${schema.url.pattern} pattern for a ${p.type} page.`
			: `Karl gives ${schema.url.pattern} for a ${p.type} page; this URL does not follow it.`,
		help,
		items: ok
			? []
			: [
					{
						text: slug,
						detail: `Expected ${schema.url.pattern}: lowercase words joined by dashes, with no further path.`
					}
				]
	};
}

export function karlPlacementFindings(page: CorpusPage, edits: EditRow[] = []): ComponentFinding[] {
	const type = String((page as { type?: unknown }).type ?? '');
	if (!type) return [];
	const record = recordFromEdits(edits);
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
		...(url ? [url] : [])
	];
}
