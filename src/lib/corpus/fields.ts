import { deriveFieldKey } from './fieldKey.js';

export type FieldMap = Record<string, string>;

type Callout = { title?: unknown; text?: unknown };
type Section = {
	heading?: unknown;
	paragraphs?: unknown;
	bullets?: unknown;
	callout?: Callout;
};
export type CorpusPage = {
	title?: unknown;
	summary?: unknown;
	audience?: unknown;
	sections?: unknown;
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
