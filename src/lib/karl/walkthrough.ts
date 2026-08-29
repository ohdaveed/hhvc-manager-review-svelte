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
import { buildTranscript } from '$lib/legacy-core/karl-transcript.js';
import { KARL_NAV, panelByRawName } from '$lib/legacy-core/karl-blocks.js';

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
/* `buildTranscript` is JSDoc-typed for the legacy caller, which passed a keyed
   object rather than the corpus array. The runtime only iterates it, so this
   narrows the call rather than reshaping a 1141-line module around one caller. */
const transcriptFor = (page: AnyEntry, pages: AnyEntry[]): AnyEntry =>
	(buildTranscript as unknown as (p: unknown, r: unknown, ps: unknown) => AnyEntry)(
		page,
		null,
		pages
	);

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
	choices: string[];
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
	 */
	gaps: { path: string; reason: string }[];
	/** How many steps offer something to copy; the header counts against this. */
	copyableCount: number;
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
	Report: 'report'
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
 * Build the walkthrough for one page.
 *
 * `pages` is the full corpus, which `buildTranscript` needs to resolve the
 * page's own key and its cross-references.
 */
export function buildWalkthrough(page: AnyEntry, pages: AnyEntry[]): Walkthrough {
	const transcript = transcriptFor(page, pages);
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
			choices: Array.isArray(entry.choices) ? entry.choices.map(String) : [],
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
		gaps: Array.isArray(transcript.flags)
			? transcript.flags.map((f: AnyEntry) => ({
					path: String(f.path ?? ''),
					reason: String(f.reason ?? '')
				}))
			: [],
		copyableCount: steps.filter((s) => s.values.length > 0).length
	};
}
