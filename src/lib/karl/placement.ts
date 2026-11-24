/**
 * Placements: which Karl panel each rendered field lands in, and its status.
 *
 * Nothing here decides where copy goes. `buildTranscript` already walks a page
 * against the live-form inventory; this module joins its answer to the field
 * ids the mockup renders, and judges the copy against `schema.ts`'s rules. See
 * `CONTEXT.md` for the vocabulary: placement, unplaced, and the four statuses.
 *
 * **The join.** The transcript keys sections by POSITION (`sections.0.steps`)
 * and claims containers; the mockup keys them by SECTION KEY
 * (`sections.what-to-do.steps.0.text.0`) and renders leaves. So an index is
 * converted with `deriveFieldKey` -- the one definition of a section key -- and
 * each field id takes its longest matching prefix.
 *
 * **The copy judged is the copy on screen**: the base corpus with the
 * reviewer's accepted edits on top, read from the review record by field id.
 *
 * Nothing is stored. Placements are recomputed from the page and its record,
 * so `edits.field_id`, the record fold and the export are untouched.
 */
import { buildTranscript } from '$lib/legacy-core/karl-transcript.js';
import { PROMOTE_PANEL, panelByRawName } from '$lib/legacy-core/karl-blocks.js';
import { deriveFieldKey } from '$lib/corpus/fieldKey';
import { extractCopy, type CorpusPage } from '$lib/corpus/fields';
import type { ReviewRecord } from './reviewRecord';
import { formLabel, schemaFor, type FieldRule } from './schema';
import { COMPONENT_SUPPORT, isSupported } from './componentSupport';

export type PlacementStatus = 'placed' | 'needs-fix' | 'unconfirmed' | 'unplaced';

/** Worst first: what a chip shows when several statuses apply. */
const PRECEDENCE: readonly PlacementStatus[] = ['unplaced', 'needs-fix', 'unconfirmed', 'placed'];

export const STATUS_TEXT: Record<PlacementStatus, string> = {
	placed: 'Goes into Karl',
	'needs-fix': 'Needs a fix',
	unconfirmed: 'Karl’s rule unconfirmed',
	unplaced: 'Won’t carry over to Karl'
};

export function worstOf(statuses: readonly PlacementStatus[]): PlacementStatus {
	for (const status of PRECEDENCE) if (statuses.includes(status)) return status;
	return 'placed';
}

export type Placement = {
	fieldId: string;
	/** The panel's raw Wagtail name, or `null` for unplaced copy. */
	rawName: string | null;
	/** e.g. `What to Do · Section 2 · Button link`. Empty for unplaced copy. */
	label: string;
	/** This field's status, including what it inherits from its section. */
	status: PlacementStatus;
	/** Reasons that are this field's own, not its section's, as one plain sentence each. */
	reasons: string[];
	/**
	 * Whether this field gets its own chip: when it has reasons of its own, or
	 * when it is a page-level block (title, description, agency) that no section
	 * chip speaks for.
	 */
	chip: boolean;
};

export type SectionPlacement = {
	sectionKey: string;
	heading: string;
	rawName: string | null;
	label: string;
	status: PlacementStatus;
	reasons: string[];
};

/** One finding for the "Won't carry over to Karl" tray. */
export type UnplacedItem = {
	/** What the reviewer sees: the section heading, or the page field's name. */
	subject: string;
	/** The transcript's own reason, which says where the copy could go where it knows. */
	reason: string;
	/** The rendered field ids it covers, for jumping to it. Empty when nothing renders. */
	fieldIds: string[];
};

/** One Karl panel, as the Blueprint draws it. */
export type PanelFill = {
	rawName: string;
	label: string;
	required: boolean;
	inert: boolean;
	filled: boolean;
	/** The values the transcript resolved into this panel, in the form's terms. */
	values: { label: string; value: string }[];
	/** The rendered field ids it holds, for jumping to them. */
	fieldIds: string[];
	status: PlacementStatus;
	/** Why a slot is not simply placed, prefixed with the section it comes from. */
	reasons: string[];
	/** What Karl's own pages disagree on about how this panel behaves. */
	caveats: string[];
	/** What Karl says plainly about how this panel behaves, worth knowing first. */
	notes: string[];
};

export type PagePlacements = {
	type: string;
	fields: Map<string, Placement>;
	sections: Map<string, SectionPlacement>;
	/** The What to know box, which holds two panels and is chipped as one block. */
	whatToKnow: SectionPlacement | null;
	unplaced: UnplacedItem[];
	panels: PanelFill[];
	url: { pattern: string; status: PlacementStatus; says: string } | null;
	/** What Karl says about the content type as a whole, in one plain line each. */
	pageCaveats: string[];
};

/* The legacy transcript is untyped; these narrow what this module reads from it. */
type Entry = {
	rawName: string;
	uiLabel: string;
	inferred?: boolean;
	sectionIndex?: number;
	fields: { label: string; value: string }[];
	choices: { label: string }[];
};
type Transcript = {
	type: string;
	entries: Entry[];
	claims: Record<string, string>;
	unmapped: { path: string; shape: string; reason: string }[];
};
type Section = { heading?: unknown; fieldKey?: unknown };
type Page = CorpusPage & { type?: unknown; sections?: Section[] };

const transcriptOf = (page: Page, record: ReviewRecord | null, pages: object): Transcript =>
	(buildTranscript as unknown as (p: unknown, r: unknown, ps: unknown) => Transcript)(
		page,
		record,
		pages
	);

const panelLabel = (type: string, rawName: string): string => {
	if (rawName === 'promote') return PROMOTE_PANEL.uiLabel;
	const panel = (
		panelByRawName as unknown as (t: string, r: string) => { uiLabel?: string } | null
	)(type, rawName);
	return panel?.uiLabel ? formLabel(panel.uiLabel) : rawName;
};

/**
 * Topic's content stream holds several kinds of block, and the stream and one
 * of its block choices are both called "Child topics" on Karl's form (the field
 * map's "Naming trap"). So a Topic section is labelled by stream AND block:
 * `Child topics · Spotlight block`, never the stream alone.
 */
/** Page-level fields, named as a reader sees them rather than by field id. */
const PAGE_FIELD_NAMES: Record<string, string> = {
	audience: 'The “Who this is for” list',
	primaryAgency: 'Primary agency',
	summary: 'The summary under the title',
	partnerAgencies: 'Partner agencies',
	contact: 'Contact us'
};

/** What a block kind is called when it is counted. */
const BLOCK_NOUNS: Record<string, string> = { supporting: 'accordion', spotlight: 'spotlight' };

const TOPIC_BLOCKS: Record<string, string> = {
	spotlight: 'Spotlight block',
	services: 'Services block',
	resources: 'Resources block',
	content: 'Content block'
};

/**
 * The part of a field id after its section key, as Karl's form names it.
 *
 * Steps are named by type: on Step by step they are Step blocks (Title, Step
 * description, Transaction link); everywhere else they are Transaction's
 * what_to_do Sections. Same split as the transcript's `emitSteps`.
 */
function subLabel(rest: string, type = ''): string {
	const stepByStep = type === 'Step by step';
	// Report's Content stream offers two blocks: Body (rich text, whose H2s
	// make the table of contents) and Table.
	if (type === 'Report') {
		if (rest === 'heading') return 'Body · Heading';
		if (/^(paragraphs|bullets)\.\d+$/.test(rest)) return 'Body';
		if (/^table\./.test(rest)) return 'Table';
	}
	const step = rest.match(/^steps\.(\d+)\.(.+)$/);
	if (step && stepByStep) {
		const n = Number(step[1]) + 1;
		const field = step[2];
		if (field === 'title') return `Step ${n} · Title`;
		if (/^(text|bullets)\.\d+$/.test(field)) return `Step ${n} · Step description`;
		if (field === 'button' || field === 'buttonUrl') return `Step ${n} · Transaction link`;
		return `Step ${n}`;
	}
	if (step) {
		const n = Number(step[1]) + 1;
		const field = step[2];
		if (field === 'title') return `Section ${n} · Section title`;
		if (/^(text|bullets)\.\d+$/.test(field)) return `Section ${n} · Text`;
		if (field === 'button') return `Section ${n} · Button link`;
		if (field === 'buttonUrl') return `Section ${n} · Button link (URL)`;
		if (field.startsWith('callout.')) return `Section ${n} · Callout`;
		return `Section ${n}`;
	}
	if (rest === 'heading') return 'Title';
	if (/^(paragraphs|bullets)\.\d+$/.test(rest)) return 'Text';
	const card = rest.match(/^cards\.(\d+)\./);
	if (card) return `Item ${Number(card[1]) + 1}`;
	if (rest.startsWith('callout.')) return 'Callout';
	return '';
}

const HAS_PLACEHOLDER = /PLACEHOLDER/;
const RELATED_HEADING = /^\s*related\b/i;
const RELATED_PANELS = new Set(['related', 'related_links']);

/** Page-level fields that are a block of their own on the rendered page. */
const PAGE_BLOCKS = new Set(['title', 'summary', 'primaryAgency']);

/**
 * A transcript reason as a chip can show it: the first sentence, with the
 * register id and the markdown stripped. The transcript writes for a Karl
 * editor; a chip is read by a manager who is not one. The whole reason stays
 * available in the Blueprint's tray.
 */
export function plainReason(reason: string): string {
	const text = reason
		.replace(/^U\d+\s*[—-]\s*/, '')
		.replace(/\*\*|`|__/g, '')
		.trim();
	const first = text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text;
	return first.charAt(0).toUpperCase() + first.slice(1);
}

/**
 * The placements for one page.
 *
 * @param pages the corpus KEYED BY PAGE KEY (`pagesByKey`), which the
 *   transcript needs to resolve link targets -- not the `allPages` array.
 */
export function placementsFor(
	page: Page,
	record: ReviewRecord | null,
	pages: object
): PagePlacements {
	// The app renders `pageStore` pages, which `toStorePage` gives a routable
	// `id`. It is not copy, but the transcript's sweep reports any page key it
	// does not know, so it would surface as unplaced. Dropped here, at the one
	// boundary this module owns, rather than taught to the transcript.
	const { id: _routableId, ...corpusPage } = page as Page & { id?: unknown };
	void _routableId;
	const transcript = transcriptOf(corpusPage, record, pages);
	const type = String(page.type ?? '');
	const schema = schemaFor(type);
	const sections: Section[] = Array.isArray(page.sections) ? page.sections : [];
	const keyOf = (index: number) => deriveFieldKey(sections[index] ?? {}, index);
	const idOf = (path: string) =>
		path.replace(/^sections\.(\d+)/, (_, i: string) => `sections.${keyOf(Number(i))}`);

	// Copy as rendered: base corpus plus accepted edits.
	const copy: Record<string, string> = { ...extractCopy(page) };
	for (const [id, value] of Object.entries(record?.section_edits ?? {})) copy[id] = value;
	if (record?.edited_title) copy.title = record.edited_title;
	if (record?.edited_summary) copy.summary = record.edited_summary;

	const claims = Object.entries(transcript.claims ?? {}).map(([path, raw]) => [idOf(path), raw]);
	const unmapped = (transcript.unmapped ?? []).map((u) => ({ ...u, id: idOf(u.path) }));
	const longest = <T extends { id: string }>(id: string, list: T[]): T | undefined =>
		list
			.filter((item) => id === item.id || id.startsWith(`${item.id}.`))
			.sort((a, b) => b.id.length - a.id.length)[0];

	// Sections a panel took through an INFERRED mapping: the transcript tells the
	// editor to verify those, so the outline cannot call them settled.
	const inferredSections = new Set(
		transcript.entries
			.filter((e) => e.inferred && typeof e.sectionIndex === 'number')
			.map((e) => keyOf(e.sectionIndex as number))
	);

	// Instance numbers: the second Custom Section on a page is "Custom Section 2".
	const instances = new Map<string, string[]>();
	for (const [id, raw] of claims) {
		const key = id.match(/^sections\.([^.]+)\./)?.[1];
		if (!key) continue;
		const seen = instances.get(raw) ?? [];
		if (!seen.includes(key)) seen.push(key);
		instances.set(raw, seen);
	}
	const componentOf = new Map(
		sections.map((section, index) => [
			keyOf(index),
			String((section as { component?: unknown }).component ?? '')
		])
	);
	const instanceLabel = (raw: string, key: string) => {
		const block =
			type === 'Topic' && raw === 'content_fields'
				? TOPIC_BLOCKS[componentOf.get(key) ?? '']
				: undefined;
		if (block) {
			const same = (instances.get(raw) ?? []).filter(
				(k) => componentOf.get(k) === componentOf.get(key)
			);
			return `${panelLabel(type, raw)} · ${block}${same.length > 1 ? ` ${same.indexOf(key) + 1}` : ''}`;
		}
		const seen = instances.get(raw) ?? [];
		return raw !== 'what_to_do' && seen.length > 1
			? `${panelLabel(type, raw)} ${seen.indexOf(key) + 1}`
			: panelLabel(type, raw);
	};

	const rulesOf = (raw: string): readonly FieldRule[] =>
		schema?.panels.find((p) => p.rawName === raw)?.rules ?? [];
	const lengthReason = (rule: FieldRule & { kind: 'maxChars' }, text: string, what: string) => {
		const over = rule.strict ? text.length >= rule.max : text.length > rule.max;
		if (!over) return null;
		const limit = rule.strict ? `under ${rule.max}` : `${rule.max} or fewer`;
		return `${what} is ${text.length} characters; Karl wants ${limit}.`;
	};

	const thingsToKnow = (() => {
		const list = page.whatToKnow?.thingsToKnow;
		return Array.isArray(list) ? list.length : 0;
	})();

	// Section-level judgements, which every field in the section inherits.
	const sectionPlacements = new Map<string, SectionPlacement>();
	sections.forEach((section, index) => {
		const key = keyOf(index);
		const prefix = `sections.${key}`;
		const heading = typeof section.heading === 'string' ? section.heading : '';
		const ids = Object.keys(copy).filter((id) => id.startsWith(`${prefix}.`));
		const claimant =
			claims.find(([id]) => id === prefix || id.startsWith(`${prefix}.`))?.[1] ?? null;
		const reasons: string[] = [];
		let status: PlacementStatus = 'placed';

		const sectionUnmapped = unmapped.filter(
			(u) => u.id === prefix || u.id.startsWith(`${prefix}.`)
		);
		const unplacedIds = ids.filter((id) => longest(id, sectionUnmapped));
		if (!claimant || (ids.length > 0 && unplacedIds.length === ids.length)) {
			status = 'unplaced';
			reasons.push(
				sectionUnmapped[0]
					? plainReason(sectionUnmapped[0].reason)
					: 'No Karl panel on this page type takes this section.'
			);
		} else {
			if (inferredSections.has(key)) {
				status = worstOf([status, 'unconfirmed']);
				reasons.push(
					'Karl’s field map does not document this mapping; the editor should check it before saving.'
				);
			}
			if (RELATED_HEADING.test(heading) && !RELATED_PANELS.has(claimant)) {
				status = worstOf([status, 'needs-fix']);
				reasons.push(
					`This page type has no Related panel, so these links go into ${panelLabel(type, claimant)} instead.`
				);
			}
			// Step count and step titles: judged on the section, since a missing
			// title has no string of its own to hang a chip on.
			const steps = (section as { steps?: unknown[] }).steps;
			const stepCount = Array.isArray(steps) ? steps.length : 0;
			for (const rule of rulesOf(claimant)) {
				// A block-count limit, e.g. Topic's one spotlight: count this page's
				// sections of that kind, and mark each of them.
				if (rule.kind === 'maxItems' && rule.block && componentOf.get(key) === rule.block) {
					const count = [...componentOf.values()].filter((c) => c === rule.block).length;
					if (count > rule.max) {
						status = worstOf([status, 'needs-fix']);
						reasons.push(
							`This page has ${count} ${rule.block} blocks; Karl allows ${rule.max} on a ${type} page.`
						);
					}
				}
				if (
					stepCount &&
					rule.kind === 'maxItems' &&
					!rule.per &&
					!rule.block &&
					stepCount > rule.max
				) {
					status = worstOf([status, 'needs-fix']);
					reasons.push(`This page has ${stepCount} steps; Karl allows up to ${rule.max}.`);
				}
				// Advisory: Karl's "aim for" is reported, but it is not a rule the
				// copy breaks, so the status does not change.
				// Karl's advice on a table's width: reported, never a fix.
				if (rule.kind === 'targetColumns') {
					const table = (section as { table?: unknown[][] }).table;
					const columns = Array.isArray(table)
						? Math.max(0, ...table.map((row) => (Array.isArray(row) ? row.length : 0)))
						: 0;
					if (columns > rule.target)
						reasons.push(
							`This table has ${columns} columns; Karl says tables work best with ${rule.target} or fewer.`
						);
				}
				// Karl's advice on a block count, e.g. at most 5 accordions on a
				// Campaign page: reported, never a fix.
				if (rule.kind === 'targetItems' && rule.block && componentOf.get(key) === rule.block) {
					const count = [...componentOf.values()].filter((c) => c === rule.block).length;
					if (count > rule.target) {
						const noun = BLOCK_NOUNS[rule.block] ?? `${rule.block} block`;
						reasons.push(
							`This page has ${count} ${noun}s; Karl suggests no more than ${rule.target}.`
						);
					}
				}
				if (stepCount && rule.kind === 'targetItems' && !rule.block && stepCount > rule.target) {
					reasons.push(
						`This page has ${stepCount} steps; Karl suggests aiming for no more than ${rule.target}.`
					);
				}
				if (stepCount && rule.kind === 'required' && rule.sub === 'Title') {
					const untitled = Array.from({ length: stepCount }, (_, i) => i).filter(
						(i) => !(copy[`${prefix}.steps.${i}.title`] ?? '').trim()
					);
					if (untitled.length) {
						status = worstOf([status, 'needs-fix']);
						reasons.push(
							`${untitled.map((i) => `Step ${i + 1}`).join(', ')} ${untitled.length === 1 ? 'has' : 'have'} no title; Karl requires one on every step.`
						);
					}
				}
				// One Transaction link per step (`per: 'step'`) cannot be exceeded:
				// a corpus step holds a single `button`, so there is nothing to count.
				if (
					rule.kind === 'fixedHeading' &&
					heading.trim().toLowerCase() !== rule.heading.toLowerCase()
				) {
					status = worstOf([status, 'needs-fix']);
					reasons.push(
						`Karl always shows the heading “${rule.heading}” here, so “${heading}” will not appear.`
					);
				}
			}
		}

		sectionPlacements.set(key, {
			sectionKey: key,
			heading,
			rawName: status === 'unplaced' ? null : claimant,
			label: claimant && status !== 'unplaced' ? instanceLabel(claimant, key) : '',
			status,
			reasons
		});
	});

	const fields = new Map<string, Placement>();
	// One finding, one chip: four audience lines share a single `audience` gap,
	// so only the first carries its reason (decision 8).
	const reportedGaps = new Set<string>();
	const reportedCaveats = new Set<string>();
	for (const id of Object.keys(copy)) {
		const claim = longest(
			id,
			claims.map(([cid, raw]) => ({ id: cid, raw }))
		);
		const gap = longest(id, unmapped);
		const sectionKey = id.match(/^sections\.([^.]+)\./)?.[1];
		const section = sectionKey ? sectionPlacements.get(sectionKey) : undefined;
		const text = copy[id] ?? '';
		const reasons: string[] = [];

		// A heading the sweep folded into its section's finding has no claim and
		// no gap of its own; it shares the section's fate.
		const unplaced =
			(gap && (!claim || gap.id.length >= claim.id.length)) ||
			(!claim && section?.status === 'unplaced');
		if (unplaced) {
			if (gap && section?.status !== 'unplaced' && !reportedGaps.has(gap.id)) {
				reportedGaps.add(gap.id);
				reasons.push(plainReason(gap.reason));
			}
			fields.set(id, {
				fieldId: id,
				rawName: null,
				label: '',
				status: 'unplaced',
				reasons,
				chip: reasons.length > 0
			});
			continue;
		}
		if (!claim) continue; // not migrated by design: nothing to say

		const raw = claim.raw;
		let label = panelLabel(type, raw);
		if (sectionKey) {
			const rest = id.slice(`sections.${sectionKey}.`.length);
			const sub = raw === 'what_to_do' && rest === 'heading' ? 'Heading' : subLabel(rest, type);
			label = [instanceLabel(raw, sectionKey), sub].filter(Boolean).join(' · ');
		} else {
			const ttk = id.match(/^whatToKnow\.thingsToKnow\.(\d+)\.(label|text)$/);
			if (ttk)
				label = `${label} · Block ${Number(ttk[1]) + 1} · ${ttk[2] === 'label' ? 'Title' : 'Text'}`;
		}

		let own: PlacementStatus = 'placed';
		const fail = (reason: string | null) => {
			if (!reason) return;
			own = worstOf([own, 'needs-fix']);
			reasons.push(reason);
		};
		// A field resting on a rule Karl's own pages contradict.
		const doubt = (reason: string) => {
			own = worstOf([own, 'unconfirmed']);
			reasons.push(reason);
		};
		if (sectionKey && componentOf.get(sectionKey) === 'spotlight' && /\.button(Url)?$/.test(id)) {
			for (const rule of rulesOf(raw))
				if (rule.kind === 'caveat' && rule.sub === 'Spotlight button') doubt(rule.plain);
		}

		if (HAS_PLACEHOLDER.test(text)) fail('Still holds PLACEHOLDER text.');
		// A callout on a type Karl offers none on: the transcript folds its text
		// into the block, so the words survive but not as a callout -- the same
		// shape as a Related list landing as Resource tiles. The in-mockup
		// KarlOrphanNotice has said so all along; the outline now agrees.
		if (/(^|\.)callout\.(text|title)$/.test(id) && isSupported('callout', type) === 'no') {
			fail(`Karl has no callout on a ${type} page. ${COMPONENT_SUPPORT.callout.instead}`);
		}
		// A button inside a panel with a Button limit, e.g. a Campaign spotlight's.
		if (/\.button$/.test(id)) {
			for (const rule of rulesOf(raw))
				if (rule.kind === 'maxChars' && rule.sub === 'Button')
					fail(lengthReason(rule, text, 'Button text'));
		}
		// A whole panel Karl's own pages disagree on (Campaign's Contact us): one
		// chip, on the first of its fields, as with the audience list.
		for (const rule of rulesOf(raw)) {
			if (rule.kind !== 'caveat' || rule.status !== 'unconfirmed' || rule.sub || sectionKey)
				continue;
			if (reportedCaveats.has(raw)) own = worstOf([own, 'unconfirmed']);
			else {
				reportedCaveats.add(raw);
				doubt(rule.plain);
			}
		}
		for (const rule of rulesOf(raw)) {
			if (rule.kind !== 'maxChars' || rule.sub) continue;
			if (id === 'title' || id === 'summary')
				fail(lengthReason(rule, text, raw === 'title' ? 'Title' : 'Description'));
		}
		if (raw === 'cost' && id === 'whatToKnow.cost') {
			for (const rule of rulesOf('cost'))
				if (rule.kind === 'maxChars') fail(lengthReason(rule, text, rule.sub ?? 'Cost'));
		}
		if (raw === 'things_to_know' && id.startsWith('whatToKnow.thingsToKnow.')) {
			for (const rule of rulesOf('things_to_know'))
				if (rule.kind === 'maxItems' && thingsToKnow > rule.max)
					fail(
						`The page has ${thingsToKnow} Things to know; Karl recommends no more than ${rule.max}.`
					);
		}
		if (raw === 'what_to_do' && /\.steps\.\d+\.button$/.test(id)) {
			for (const rule of rulesOf('section_specifics'))
				if (rule.kind === 'maxChars' && rule.sub === 'Button link')
					fail(lengthReason(rule, text, 'Button text'));
		}
		if (raw === 'supporting_information' && id.endsWith('.heading')) {
			for (const rule of rulesOf('supporting_information'))
				if (rule.kind === 'maxChars' && rule.sub === 'Title')
					fail(lengthReason(rule, text, 'Accordion title'));
		}

		fields.set(id, {
			fieldId: id,
			rawName: raw,
			label,
			status: worstOf([own, section?.status ?? 'placed']),
			reasons,
			chip: reasons.length > 0 || PAGE_BLOCKS.has(id)
		});
	}

	// The tray: one item per transcript finding, which already groups a whole
	// unplaced section (or the whole audience list) into one.
	const findings: UnplacedItem[] = unmapped.map((u) => {
		const key = u.id.match(/^sections\.([^.]+)/)?.[1];
		const heading = key ? sectionPlacements.get(key)?.heading : undefined;
		const fieldIds = [...fields.keys()].filter(
			(id) => (id === u.id || id.startsWith(`${u.id}.`)) && fields.get(id)?.status === 'unplaced'
		);
		const subject =
			PAGE_FIELD_NAMES[u.id] ??
			(heading ? `“${heading}”${/\.button(Url)?$/.test(u.id) ? ' — its button' : ''}` : u.id);
		return { subject, reason: u.reason.replace(/\*\*|`|__/g, ''), fieldIds };
	});
	// A button and its URL are two transcript findings about one thing a reader
	// sees; merge items naming the same subject.
	const unplacedItems: UnplacedItem[] = [];
	for (const item of findings) {
		// By subject alone: a section's paragraphs and bullets are two findings
		// with two reasons, but one thing a reader sees.
		const same = unplacedItems.find((i) => i.subject === item.subject);
		if (same) same.fieldIds.push(...item.fieldIds.filter((id) => !same.fieldIds.includes(id)));
		else unplacedItems.push(item);
	}
	// A section's folded heading is covered by its section's finding; make sure
	// jumping to it lands on the section, not on nothing.
	for (const item of unplacedItems) {
		const key = item.fieldIds[0]?.match(/^sections\.([^.]+)\./)?.[1];
		const headingId = key ? `sections.${key}.heading` : '';
		if (
			headingId &&
			fields.get(headingId)?.status === 'unplaced' &&
			!item.fieldIds.includes(headingId)
		)
			item.fieldIds.unshift(headingId);
	}

	const inventory = schema
		? schema.panels
		: (transcript.entries.map((e) => ({
				rawName: e.rawName,
				label: e.uiLabel,
				required: false,
				inert: false,
				subPanelOf: undefined
			})) as {
				rawName: string;
				label: string;
				required: boolean;
				inert: boolean;
				subPanelOf?: string;
			}[]);
	const seenPanels = new Set<string>();
	const panels: PanelFill[] = [];
	for (const panel of inventory) {
		if (panel.subPanelOf || seenPanels.has(panel.rawName)) continue;
		seenPanels.add(panel.rawName);
		const entries = transcript.entries.filter((e) => e.rawName === panel.rawName);
		const values = entries.flatMap((e) => [
			...e.fields,
			...e.choices.map((c) => ({ label: 'Choose page', value: c.label }))
		]);
		const fieldIds = [...fields.values()]
			.filter((f) => f.rawName === panel.rawName)
			.map((f) => f.fieldId);
		panels.push({
			rawName: panel.rawName,
			label: panel.label,
			required: panel.required,
			inert: panel.inert,
			filled: values.length > 0,
			values,
			fieldIds,
			status: worstOf(fieldIds.map((id) => fields.get(id)!.status)),
			// A repeatable panel holds several sections; the slot's status is the
			// worst of them, so it has to say which one and why.
			reasons: [
				...new Set([
					...[...sectionPlacements.values()]
						.filter((s) => s.rawName === panel.rawName && s.reasons.length > 0)
						.flatMap((s) => s.reasons.map((r) => (s.heading ? `“${s.heading}”: ${r}` : r))),
					...fieldIds.flatMap((id) => fields.get(id)!.reasons)
				])
			],
			caveats: rulesOf(panel.rawName).flatMap((rule) =>
				rule.kind === 'caveat' && rule.status === 'unconfirmed' ? [rule.plain] : []
			),
			notes: rulesOf(panel.rawName).flatMap((rule) =>
				rule.kind === 'caveat' && rule.status === 'confirmed' ? [rule.plain] : []
			)
		});
	}

	const wtkFields = [...fields.values()].filter((f) => f.fieldId.startsWith('whatToKnow.'));
	const wtkPanels = [...new Set(wtkFields.map((f) => f.rawName).filter(Boolean))] as string[];
	const whatToKnow: SectionPlacement | null = wtkFields.length
		? {
				sectionKey: 'whatToKnow',
				heading: 'What to know',
				rawName: wtkPanels[0] ?? null,
				label: wtkPanels.map((raw) => panelLabel(type, raw)).join(' · '),
				status: worstOf(wtkFields.map((f) => f.status)),
				reasons: []
			}
		: null;

	return {
		type,
		fields,
		sections: sectionPlacements,
		whatToKnow,
		unplaced: unplacedItems,
		panels,
		pageCaveats: (schema?.pageCaveats ?? []).map((caveat) => caveat.plain),
		url: schema
			? {
					pattern: schema.url.pattern,
					status: schema.url.status === 'confirmed' ? 'placed' : 'unconfirmed',
					says: schema.url.cite.says
				}
			: null
	};
}

/**
 * The outline's one-line summary, in findings a manager can count: sections,
 * plus the things that won't carry over -- never leaf strings, which would
 * report "61 placed" for a page of five sections.
 */
export function outlineSummary(placements: PagePlacements): string {
	const sections = [...placements.sections.values()].filter((s) => s.status !== 'unplaced');
	const count = (status: PlacementStatus) => sections.filter((s) => s.status === status).length;
	const parts = (
		[
			['placed', 'goes into Karl', 'go into Karl'],
			['needs-fix', 'needs a fix', 'need a fix'],
			['unconfirmed', 'unconfirmed', 'unconfirmed']
		] as const
	)
		.map(([status, one, many]) => [count(status), one, many] as const)
		.filter(([n]) => n > 0)
		.map(([n, one, many]) => `${n} ${n === 1 ? one : many}`);
	const lead = `${sections.length} ${sections.length === 1 ? 'section' : 'sections'}${parts.length ? `: ${parts.join(', ')}` : ''}.`;
	// Findings on single strings inside placed sections -- a callout on a type
	// with none, a button over 25 characters, PLACEHOLDER text. Counting
	// sections alone reported "7 go into Karl" over a page with two of these.
	const details = [...placements.fields.values()].filter(
		(f) => f.reasons.length > 0 && f.status !== 'unplaced'
	);
	const fixes = details.filter((f) => f.status === 'needs-fix').length;
	const doubts = details.filter((f) => f.status === 'unconfirmed').length;
	const detailParts = [
		fixes ? `${fixes} ${fixes === 1 ? 'detail needs' : 'details need'} a fix` : '',
		doubts ? `${doubts} ${doubts === 1 ? 'detail is' : 'details are'} unconfirmed` : ''
	].filter(Boolean);
	const detail = detailParts.length
		? ` ${detailParts.join(', ').replace(/^./, (c) => c.toUpperCase())}.`
		: '';
	const gaps = placements.unplaced.length;
	return gaps
		? `${lead}${detail} ${gaps} ${gaps === 1 ? 'thing won’t' : 'things won’t'} carry over to Karl.`
		: `${lead}${detail}`;
}
