import { deriveFieldKey } from './fieldKey.js';

export type FieldMap = Record<string, string>;

/** Same shape as `FieldMap`, distinguished by name only: `extractCopy` below
 * builds a `key -> text` map for hashing, not a `field_id -> text` map for
 * addressable edit targets. See decision 17. */
export type CopyMap = FieldMap;

type Callout = { title?: unknown; text?: unknown };
type Section = {
	heading?: unknown;
	paragraphs?: unknown;
	bullets?: unknown;
	callout?: Callout;
	button?: unknown;
	buttonUrl?: unknown;
	cards?: unknown;
	facts?: unknown;
	steps?: unknown;
	table?: unknown;
};
export type CorpusPage = {
	title?: unknown;
	summary?: unknown;
	audience?: unknown;
	sections?: unknown;
	contact?: { phone?: unknown; email?: unknown; other?: unknown };
	metaDescription?: unknown;
	partnerAgencies?: unknown;
	reportDate?: unknown;
	seoTitle?: unknown;
	spotlight?: { title?: unknown; paragraphs?: unknown; button?: unknown; buttonUrl?: unknown };
	topicTag?: unknown;
	whatToKnow?: { cost?: unknown; thingsToKnow?: unknown };
};

const str = (value: unknown): string | null => (typeof value === 'string' ? value : null);
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/**
 * Reader-visible copy only, keyed by the same ids the edit targets advertise as
 * `data-rewrite-field`. Annotations (`karl`, `editorNote`, `editorStatus`) and
 * metadata (`slug`, `type`, `reading`) are deliberately absent: they travel in
 * `page_versions.content` but must not feed the hash, or editing a note would
 * mint a corpus version and show up as a copy change.
 */
export function extractFields(page: CorpusPage): FieldMap {
	const fields: FieldMap = {};

	const title = str(page.title);
	if (title !== null) fields['title'] = title;

	const summary = str(page.summary);
	if (summary !== null) fields['summary'] = summary;

	list(page.audience).forEach((entry, i) => {
		const text = str(entry);
		if (text !== null) fields[`audience.${i}`] = text;
	});

	list(page.sections).forEach((raw, index) => {
		const section = (raw ?? {}) as Section;
		const key = deriveFieldKey(section, index);

		const heading = str(section.heading);
		if (heading !== null) fields[`sections.${key}.heading`] = heading;

		list(section.paragraphs).forEach((entry, i) => {
			const text = str(entry);
			if (text !== null) fields[`sections.${key}.paragraphs.${i}`] = text;
		});

		list(section.bullets).forEach((entry, i) => {
			const text = str(entry);
			if (text !== null) fields[`sections.${key}.bullets.${i}`] = text;
		});

		const calloutTitle = str(section.callout?.title);
		if (calloutTitle !== null) fields[`sections.${key}.callout.title`] = calloutTitle;

		const calloutText = str(section.callout?.text);
		if (calloutText !== null) fields[`sections.${key}.callout.text`] = calloutText;
	});

	return fields;
}

type Card = { title?: unknown; text?: unknown; url?: unknown };
type Fact = { label?: unknown; text?: unknown };
type Step = {
	title?: unknown;
	text?: unknown;
	button?: unknown;
	buttonUrl?: unknown;
	callout?: Callout;
	bullets?: unknown;
};
type PartnerAgency = { title?: unknown; url?: unknown };

/**
 * Every reader-visible string on the page: everything `extractFields`
 * returns, plus copy in structures the UI does not (yet) expose as
 * `data-rewrite-field` edit targets -- `cards`, `steps`, `whatToKnow`,
 * `button`/`buttonUrl`, `table`, `facts`, `partnerAgencies`, `contact`,
 * `spotlight`, and the page-level SEO/meta strings.
 *
 * This feeds `content_hash` (decision 17), which answers "did the mockup
 * change" -- a different question from `field_hashes`' "did this edit
 * target's copy move." `extractFields` stays the single source of truth for
 * edit-target ids; this function does not add to that map, it reads the same
 * page a second time for a wider set of keys.
 *
 * Annotations (`karl`, `editorNote`, `editorStatus`, `unverifiedReason`) and
 * structural/enum values (`slug`, `type`, `reading`, `callout.variant`,
 * `cards[].target`, `buttonStyle`, `buttonTarget`, `unverified`) are excluded
 * at every depth they appear, for the same reason `extractFields` excludes
 * them at the top: editing a note or a routing id must not look like a copy
 * change. `unverifiedReason` in particular reads like `editorNote` in every
 * instance in the corpus ("Confirm with HHVC before publication...") -- an
 * internal verification note, not something a reader sees.
 */
export function extractCopy(page: CorpusPage): CopyMap {
	const copy: CopyMap = { ...extractFields(page) };

	const set = (key: string, value: unknown) => {
		const text = str(value);
		if (text !== null) copy[key] = text;
	};

	// An entry that is either a bare string, or the `{ text, unverified,
	// unverifiedReason }` wrapper used throughout the corpus for a sourced
	// claim -- only `.text` is reader-visible.
	const setEntryText = (key: string, entry: unknown) => {
		const direct = str(entry);
		if (direct !== null) {
			copy[key] = direct;
			return;
		}
		if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
			set(key, (entry as { text?: unknown }).text);
		}
	};

	list(page.sections).forEach((raw, index) => {
		const section = (raw ?? {}) as Section;
		const key = deriveFieldKey(section, index);

		// extractFields only reads a paragraphs/bullets entry when it is a bare
		// string, so a `{ text, unverified, unverifiedReason }` entry never
		// makes it into the field map above. Fill in exactly those gaps here --
		// same ids `extractFields` would have used, only where it produced
		// nothing at all, so there is no collision with its output.
		list(section.paragraphs).forEach((entry, i) => {
			if (str(entry) !== null) return;
			setEntryText(`sections.${key}.paragraphs.${i}`, entry);
		});
		list(section.bullets).forEach((entry, i) => {
			if (str(entry) !== null) return;
			setEntryText(`sections.${key}.bullets.${i}`, entry);
		});

		set(`sections.${key}.button`, section.button);
		set(`sections.${key}.buttonUrl`, section.buttonUrl);

		list(section.cards).forEach((raw, i) => {
			const card = (raw ?? {}) as Card;
			set(`sections.${key}.cards.${i}.title`, card.title);
			set(`sections.${key}.cards.${i}.text`, card.text);
			set(`sections.${key}.cards.${i}.url`, card.url);
			// card.karl (annotation) and card.target (an internal routing id --
			// the cards-level equivalent of buttonTarget) are deliberately unread.
		});

		list(section.facts).forEach((raw, i) => {
			const fact = (raw ?? {}) as Fact;
			set(`sections.${key}.facts.${i}.label`, fact.label);
			set(`sections.${key}.facts.${i}.text`, fact.text);
			// fact.unverified / fact.unverifiedReason: same treatment as above.
		});

		list(section.steps).forEach((raw, i) => {
			const step = (raw ?? {}) as Step;
			set(`sections.${key}.steps.${i}.title`, step.title);
			list(step.text).forEach((entry, j) => {
				setEntryText(`sections.${key}.steps.${i}.text.${j}`, entry);
			});
			list(step.bullets).forEach((entry, j) => {
				setEntryText(`sections.${key}.steps.${i}.bullets.${j}`, entry);
			});
			set(`sections.${key}.steps.${i}.button`, step.button);
			set(`sections.${key}.steps.${i}.buttonUrl`, step.buttonUrl);
			if (step.callout) {
				set(`sections.${key}.steps.${i}.callout.title`, step.callout.title);
				set(`sections.${key}.steps.${i}.callout.text`, step.callout.text);
			}
			// step.karl: annotation, unread.
		});

		list(section.table).forEach((row, r) => {
			list(row).forEach((cell, c) => {
				set(`sections.${key}.table.${r}.${c}`, cell);
			});
		});
	});

	if (page.contact) {
		list(page.contact.phone).forEach((entry, i) => set(`contact.phone.${i}`, entry));
		list(page.contact.email).forEach((entry, i) => set(`contact.email.${i}`, entry));
		list(page.contact.other).forEach((entry, i) => set(`contact.other.${i}`, entry));
	}

	set('metaDescription', page.metaDescription);

	list(page.partnerAgencies).forEach((raw, i) => {
		const agency = (raw ?? {}) as PartnerAgency;
		set(`partnerAgencies.${i}.title`, agency.title);
		set(`partnerAgencies.${i}.url`, agency.url);
	});

	set('reportDate', page.reportDate);
	set('seoTitle', page.seoTitle);
	set('topicTag', page.topicTag);

	if (page.spotlight) {
		set('spotlight.title', page.spotlight.title);
		list(page.spotlight.paragraphs).forEach((entry, i) => set(`spotlight.paragraphs.${i}`, entry));
		set('spotlight.button', page.spotlight.button);
		set('spotlight.buttonUrl', page.spotlight.buttonUrl);
		// spotlight.karl: annotation, unread.
	}

	if (page.whatToKnow) {
		set('whatToKnow.cost', page.whatToKnow.cost);
		list(page.whatToKnow.thingsToKnow).forEach((entry, i) => {
			const direct = str(entry);
			if (direct !== null) {
				copy[`whatToKnow.thingsToKnow.${i}`] = direct;
				return;
			}
			if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
				const item = entry as { label?: unknown; text?: unknown };
				set(`whatToKnow.thingsToKnow.${i}.label`, item.label);
				set(`whatToKnow.thingsToKnow.${i}.text`, item.text);
			}
		});
	}

	return copy;
}
