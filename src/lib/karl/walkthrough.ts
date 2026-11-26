/**
 * The Karl rebuild walkthrough: an ordered list of steps for rebuilding one
 * approved mockup by hand in the real Karl CMS.
 *
 * **Nothing here invents Karl's vocabulary.** `buildTranscript` in
 * `$lib/legacy-core/karl-transcript.js` already walks a page against
 * `KARL_PANELS` -- the per-type panel inventory generated from
 * `docs/karl-export-field-map.md` -- and returns the panels in the order the
 * form presents them, with the page's own copy resolved into each one. This
 * module re-presents that as steps; it does not re-derive it.
 *
 * That distinction is the whole reason this file is thin. The handoff's build
 * plan is explicit that the step list must be generated from the field map
 * rather than written from what someone infers about Karl, and that the
 * prototype's own step content is sample data for a single page. Measured
 * across the corpus, `buildTranscript` yields 7 to 17 entries per page and 333
 * in total, which is the list -- so the correct move is to consume it.
 *
 * Panel order is the form's order, top to bottom, because the reviewer works
 * down the real Karl form beside this drawer. Re-sorting the steps -- by
 * outcome, by whether they are done, by anything -- would send them scrolling
 * back up the form.
 */
import { buildTranscript, renderTranscriptMarkdown } from '$lib/legacy-core/karl-transcript.js';
import { KARL_NAV, panelByRawName } from '$lib/legacy-core/karl-blocks.js';
import type { ReviewRecord } from './reviewRecord';

/* eslint-disable-next-line @typescript-eslint/no-explicit-any --
   the legacy Karl modules are untyped JS, so this is the boundary where their
   output enters. Narrowing to `unknown` would only push a cast onto every read
   below; the same call `fieldResolver.ts` already makes for corpus modules. */
type AnyEntry = Record<string, any>;

/** The inventory is untyped legacy JS; these narrow its reads at the boundary. */
type KarlPanel = { required?: unknown; requiredDoc?: unknown } | null;
const navFor = (type: string): string =>
	(KARL_NAV as unknown as Record<string, string>)[type] ?? '';
const panelFor = (type: string, rawName: string): KarlPanel =>
	(panelByRawName as unknown as (t: string, r: string) => KarlPanel)(type, rawName);
/**
 * The corpus as `buildTranscript` wants it: KEYED BY PAGE KEY.
 *
 * Every lookup it does against this map is a TARGET lookup --
 * `linkRepresentation`, `buttonTarget`, `card.target` -- and a target is a
 * `pagesByKey` key (`afterReport`). Handed the `allPages` array instead,
 * `findPageKey` resolves through `Object.entries` and returns an array INDEX,
 * and no target resolves: measured across the corpus, 130 of the choice labels
 * degraded from a page title to the raw key and every internal link read
 * "unresolved target". `tests/helpPanelLinkTargets.test.ts` exists for exactly
 * this, which is why the type now says so instead of leaving it to the caller.
 */
type Corpus = Record<string, AnyEntry>;

/* `buildTranscript` is untyped legacy JS, so this is the boundary where the
   call is narrowed -- rather than reshaping a 1185-line module around it.

   The layout passes `pageStore.pages[n]`, which `toStorePage` gives a routable
   `id`. It is not copy, and the transcript's sweep reports any page key it does
   not know, so every page's drawer said "The page carries `id`" under No Karl
   field for this content. Stripped here, as `placementsFor` already does. */
const transcriptFor = (page: AnyEntry, pages: Corpus, record: ReviewRecord | null): AnyEntry => {
	const { id: _routableId, ...corpusPage } = page;
	void _routableId;
	return (buildTranscript as unknown as (p: unknown, r: unknown, ps: unknown) => AnyEntry)(
		corpusPage,
		record,
		pages
	);
};

const markdownFor = (transcript: AnyEntry): string =>
	(renderTranscriptMarkdown as unknown as (t: unknown) => string)(transcript);

/** One saved edit that no longer answers its base copy (ADR 0001). */
export type StaleEdit =
	| { kind: 'expired'; fieldId: string; accepted: string; base: string }
	| { kind: 'orphaned'; fieldId: string; accepted: string };

/** The record's expired and orphaned edits, expired first, each by field id. */
export function staleEditsOf(record: ReviewRecord | null): StaleEdit[] {
	if (!record) return [];
	const byId = (a: [string, unknown], b: [string, unknown]) => a[0].localeCompare(b[0]);
	return [
		...Object.entries(record.expired ?? {})
			.sort(byId)
			.map(([fieldId, e]): StaleEdit => ({ kind: 'expired', fieldId, ...e })),
		...Object.entries(record.orphaned ?? {})
			.sort(byId)
			.map(([fieldId, accepted]): StaleEdit => ({ kind: 'orphaned', fieldId, accepted }))
	];
}

/** Puts the stale-edits section above the first panel of a rendered transcript. */
function withStale(markdown: string, stale: StaleEdit[]): string {
	const section = staleEditsMarkdown(stale);
	if (!section) return markdown;
	const at = markdown.indexOf('\n### ');
	return at === -1
		? markdown + '\n' + section
		: markdown.slice(0, at + 1) + section + markdown.slice(at + 1);
}

/**
 * The transcript section for stale edits, or '' when there are none -- so a
 * page with none renders exactly as before, and the pinned snapshots hold.
 * Above the panels, because an editor should settle these before typing
 * anything into Karl.
 */
export function staleEditsMarkdown(stale: StaleEdit[]): string {
	if (stale.length === 0) return '';
	const lines = ['## Saved edits that need a decision', ''];
	for (const e of stale) {
		if (e.kind === 'expired') {
			lines.push(`- **Expired** \`${e.fieldId}\` — the base copy changed after this was saved.`);
			lines.push(`  - Saved wording: ${e.accepted}`);
			lines.push(`  - Base copy now: ${e.base}`);
		} else {
			lines.push(`- **Orphaned** \`${e.fieldId}\` — this field is no longer on the page.`);
			lines.push(`  - Saved wording: ${e.accepted}`);
		}
	}
	lines.push('', '');
	return lines.join('\n');
}

/** One copyable value inside a step: a sub-field of the Karl panel. */
export type StepValue = {
	/** Sub-field name, e.g. `Title`, `Cost description`. */
	label: string;
	/**
	 * Plain, unstyled text. Copy has to yield exactly this -- no highlight
	 * markup, no markdown wrapper -- which is the entire point of the feature.
	 */
	value: string;
};

/**
 * One option in a Karl chooser.
 *
 * Kept as a record rather than flattened to a string: `entry.choices` carries
 * `{ label, pageKey, slug }`, and the drawer was rendering them through
 * `String(choice)` -- 157 chips reading `[object Object]` across the corpus,
 * measured. The label is the destination page's own title, so it is what a
 * reviewer searches Karl for; the key is what the corpus calls it, and is
 * shown beside the label because the two differ often enough to matter.
 */
export type StepChoice = {
	label: string;
	/** The corpus page key, where the target resolved to one. */
	pageKey: string;
	/** The destination's slug, where it has one. */
	slug: string;
};

/**
 * A link inside a step's text.
 *
 * The transcript's instruction about these is explicit and has no equivalent
 * anywhere else in the drawer: an editor must RECREATE each one with Karl's
 * Link tool rather than paste the markdown, because pasted markdown is stored
 * as literal text in a Wagtail rich-text field. 89 of them across the corpus
 * reached the markdown export and none reached the walkthrough.
 */
export type StepLink = {
	/** The link text as it appears in the copy. */
	label: string;
	/** `Internal link -> "Title"`, or the external URL. The transcript's own wording. */
	representation: string;
};

/**
 * What Karl asks of a step.
 *
 * These are `buildTranscript`'s own outcomes, not a second vocabulary:
 * - `TYPE`   the reviewer types or pastes a value (257 of 333 across the corpus)
 * - `CHOOSE` a chooser -- the value is not text, it is a page/snippet to pick (46)
 * - `FLAG`   the mockup cannot supply what Karl wants (30)
 */
export type StepOutcome = 'TYPE' | 'CHOOSE' | 'FLAG';

/**
 * Red blocks a save, amber needs a human decision but does not.
 *
 * Derived from the inventory rather than guessed from the wording of the
 * reason -- but NOT from `required` alone, which is a trap. Three panels are
 * flagged across the corpus and all three carry `required: true`:
 *
 *   primary_agency  requiredDoc: 'yes'                 Karl will not save without it
 *   public_records  requiredDoc: 'yes (panel marked)'  same
 *   cost            requiredDoc: 'yes (radio)'         NOT the same
 *
 * `cost` is a struct whose radio is required *once the block exists*, and the
 * block itself is optional -- the field map's own required column reads `no`
 * for it, and the 2026-08-23 precedence edits made Cost optional deliberately.
 * Keying off `required` alone therefore told a reviewer the page could not be
 * saved without a Cost, which is false and would send them inventing one.
 *
 * So a conditional requirement inside an optional block is advisory.
 */
export type GapSeverity = 'blocking' | 'advisory';

/**
 * Whether a flagged panel actually stops the page saving.
 *
 * `requiredDoc` is the field map's own required column, carried through the
 * inventory verbatim, so this reads the documentation rather than second-
 * guessing it. Anything qualified by `(radio)` is a requirement *within* a
 * block the page need not have at all.
 */
function blocksSave(panel: KarlPanel): boolean {
	if (!panel?.required) return false;
	const doc = String(panel.requiredDoc ?? '');
	return doc.startsWith('yes') && !doc.includes('radio');
}

export type WalkthroughStep = {
	/**
	 * Continuous 1..N, and the step's identity.
	 *
	 * A completed step KEEPS its number -- the design is explicit that a
	 * checkmark must never replace the numeral, because the numeral is how a
	 * reviewer refers to the step.
	 */
	n: number;
	/**
	 * Stable across reloads, so copied-state can be persisted against it.
	 * `rawName` alone is not unique -- a page can carry the same panel twice --
	 * so the ordinal is part of the id.
	 */
	id: string;
	/** Karl's own UI label for the panel, e.g. `Things to know`. */
	uiLabel: string;
	/** The raw Wagtail field name, shown in mono. */
	rawName: string;
	outcome: StepOutcome;
	values: StepValue[];
	/** Options when Karl asks the reviewer to choose rather than type. */
	choices: StepChoice[];
	/** Links in this step's text, each to be rebuilt with Karl's Link tool. */
	links: StepLink[];
	/** The prose behind "Why this mapping", which the design keeps collapsed. */
	notes: string[];
	/** Set only when `outcome` is `FLAG`. */
	severity?: GapSeverity;
};

export type Walkthrough = {
	type: string;
	title: string;
	/** e.g. `New: Transaction → Content` -- the tab the drawer is walking. */
	navPath: string;
	/** The real Karl add-page form, per content type. */
	formUrl: string;
	steps: WalkthroughStep[];
	/**
	 * Gaps about the page as a whole rather than one field. The design renders
	 * these as standalone cards between steps.
	 *
	 * `kind` keeps the transcript's two registers apart, because conflating
	 * them would tell a reviewer the wrong thing to do:
	 * - `flag`     a value with a known problem to resolve before saving.
	 * - `unmapped` content with NO documented Karl destination. There is
	 *   nothing to resolve and nowhere to type it; it is listed because an
	 *   absence reads as "there was nothing there". 94 across the corpus, and
	 *   the walkthrough carried none of them.
	 */
	gaps: { path: string; reason: string; kind: 'flag' | 'unmapped' }[];
	/** How many steps offer something to copy; the header counts against this. */
	copyableCount: number;
	/** Saved edits that no longer answer their base copy, for the editor to settle first. */
	stale: StaleEdit[];
	/**
	 * The same transcript as markdown, for the header's Copy and Download.
	 *
	 * Free: `buildWalkthrough` has already built the transcript this renders,
	 * so this is one call rather than a second consumer re-deriving it -- which
	 * is what the Help tab was doing with its own `buildTranscript` call and
	 * its own edit fold.
	 */
	markdown: string;
};

/**
 * Karl's add-page URL segment per content type.
 *
 * Two of the eight do not follow from the type name by any rule -- `About us`
 * is `aboutpage` and `Resource Collection` is `resourcecollection` -- so this
 * is a lookup rather than a slugify. The build plan calls out hardcoding
 * Transaction here as a mistake to avoid: a reviewer sent to the wrong form
 * builds the wrong page type and only finds out on save.
 */
const FORM_SEGMENT: Record<string, string> = {
	Transaction: 'transaction',
	Information: 'information',
	'Resource Collection': 'resourcecollection',
	Campaign: 'campaign',
	Topic: 'topic',
	Agency: 'agency',
	'About us': 'aboutpage',
	Report: 'report',
	// Model names from docs/karl-export-field-map.md's "Types not yet in use"
	// table, which records the `<model>` for every captured type -- so these are
	// read off the capture like the eight above, not slugified from the label.
	'Step by step': 'stepbystep',
	Location: 'locationpage'
};

/** The add-page form for a content type, or the Wagtail page list if unknown. */
export function karlFormUrl(type: unknown): string {
	const segment = FORM_SEGMENT[String(type)];
	return segment
		? `https://api.sf.gov/admin/pages/add/sf/${segment}/2/`
		: 'https://api.sf.gov/admin/pages/';
}

/** A value is worth a Copy button only if there is text to put on the clipboard. */
function usableValues(fields: unknown): StepValue[] {
	if (!Array.isArray(fields)) return [];
	const out: StepValue[] = [];
	for (const field of fields) {
		const label = field?.label;
		const value = field?.value;
		if (typeof label === 'string' && typeof value === 'string' && value.trim() !== '') {
			out.push({ label, value });
		}
	}
	return out;
}

/**
 * Chooser options, as records.
 *
 * A choice with no label is dropped rather than rendered empty: the label is
 * the only part a reviewer can act on -- it is what they type into Karl's page
 * chooser -- so a chip carrying just a key is a chip that cannot be followed.
 */
function usableChoices(choices: unknown): StepChoice[] {
	if (!Array.isArray(choices)) return [];
	const out: StepChoice[] = [];
	for (const choice of choices) {
		const label = String(choice?.label ?? '').trim();
		if (label === '') continue;
		out.push({
			label,
			pageKey: String(choice?.pageKey ?? ''),
			slug: String(choice?.slug ?? '')
		});
	}
	return out;
}

/** Links in a step's text, keeping the transcript's own representation string. */
function usableLinks(links: unknown): StepLink[] {
	if (!Array.isArray(links)) return [];
	const out: StepLink[] = [];
	for (const link of links) {
		const label = String(link?.label ?? '').trim();
		const representation = String(link?.representation ?? '').trim();
		if (label === '' || representation === '') continue;
		out.push({ label, representation });
	}
	return out;
}

/** The transcript's `flags`/`unmapped` arrays, tagged with which they are. */
function finding(
	found: unknown,
	kind: 'flag' | 'unmapped'
): { path: string; reason: string; kind: 'flag' | 'unmapped' }[] {
	if (!Array.isArray(found)) return [];
	return found.map((f) => ({
		path: String(f?.path ?? ''),
		reason: String(f?.reason ?? ''),
		kind
	}));
}

/**
 * Build the walkthrough for one page.
 *
 * @param page the corpus page module.
 * @param pages the full corpus keyed by page key (`pagesByKey`), which
 *   `buildTranscript` needs to resolve the page's own key and its
 *   cross-references. See `Corpus` above for what an array costs.
 * @param record the reviewer's saved edits and decision, from
 *   `reviewRecordFor`. **Omitting it transcribes the ORIGINAL mockup copy**:
 *   the walkthrough's whole job is rebuilding the page a reviewer approved, so
 *   a caller that has the record and does not pass it walks an editor through
 *   text the review replaced.
 */
export function buildWalkthrough(
	page: AnyEntry,
	pages: Corpus,
	record: ReviewRecord | null = null
): Walkthrough {
	const transcript = transcriptFor(page, pages, record);
	const stale = staleEditsOf(record);
	const type = String(transcript.type ?? '');
	const entries: AnyEntry[] = Array.isArray(transcript.entries) ? transcript.entries : [];

	const steps: WalkthroughStep[] = entries.map((entry, index) => {
		const rawName = String(entry.rawName ?? '');
		const outcome: StepOutcome =
			entry.outcome === 'CHOOSE' || entry.outcome === 'FLAG' ? entry.outcome : 'TYPE';

		const step: WalkthroughStep = {
			n: index + 1,
			id: `${rawName || 'panel'}#${index}`,
			uiLabel: String(entry.uiLabel ?? rawName),
			rawName,
			outcome,
			values: usableValues(entry.fields),
			choices: usableChoices(entry.choices),
			links: usableLinks(entry.links),
			notes: Array.isArray(entry.notes) ? entry.notes.map(String) : []
		};

		if (outcome === 'FLAG') {
			step.severity = blocksSave(panelFor(type, rawName)) ? 'blocking' : 'advisory';
		}

		return step;
	});

	return {
		type,
		title: String(transcript.title ?? ''),
		navPath: navFor(type),
		formUrl: karlFormUrl(type),
		steps,
		gaps: [
			...finding(transcript.flags, 'flag'),
			// After the flags, deliberately: a flag is work to do before saving,
			// an unmapped finding is work that has nowhere to go. Reading the
			// actionable ones first matches the order the markdown prints them in.
			...finding(transcript.unmapped, 'unmapped')
		],
		copyableCount: steps.filter((s) => s.values.length > 0).length,
		stale,
		markdown: withStale(markdownFor(transcript), stale)
	};
}
