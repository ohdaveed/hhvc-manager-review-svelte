/**
 * The Karl Editor Help Center pages this tool cites when it makes a claim.
 *
 * Karl Jr. — the browser extension this analysis is ported from — states its
 * findings bare: "Inaccessible links and buttons found (3)", "Improperly nested
 * headings found (1)". A reviewer who disagrees, or who wants to know what the
 * rule actually is, has nowhere to go from the panel. That is the one thing
 * this port deliberately does differently: a finding is not renderable without
 * a citation, because `Finding.help` below is a required key and every renderer
 * reads it.
 *
 * Every URL here was resolved against the live help center on 2026-08-29 via
 * the Karl documentation MCP server, not composed from a slug pattern. Two of
 * them are not where you would guess: readability lives under `writing-on-sf.gov`
 * while plain language lives under `sf.gov-and-karl-foundations`, and the only
 * published guidance on heading levels is a paragraph on the *Report* content
 * type's body page. Re-verify with `searchDocumentation` before editing a URL —
 * GitBook reorganises, and a citation that 404s is worse than no citation.
 */

const BASE = 'https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center';

export type KarlHelpKey =
	| 'readability'
	| 'plainLanguage'
	| 'howToWritePlainLanguage'
	| 'contentPrinciples'
	| 'plainLanguageForTranslations'
	| 'contentResources'
	| 'keepPagesAccessible'
	| 'legalRequirements'
	| 'headingLevels'
	| 'altText'
	| 'descriptiveAltText'
	| 'descriptiveLinks'
	| 'linkBestPractices'
	| 'tables'
	| 'videos'
	| 'videoTranscript'
	| 'karlJr';

export type KarlHelpLink = {
	/** Link text. The help page's own title, so a reviewer can find it again. */
	title: string;
	url: string;
	/** Why this page is being cited here, in the reviewer's terms. */
	why: string;
};

export const KARL_HELP: Record<KarlHelpKey, KarlHelpLink> = {
	readability: {
		title: 'Readability',
		url: `${BASE}/writing-on-sf.gov/write-your-content/readability`,
		why: 'How SF.gov thinks about reading level, and why 5th grade is the guideline.'
	},
	plainLanguage: {
		title: 'Plain language',
		url: `${BASE}/sf.gov-and-karl-foundations/writing-for-sf.gov/plain-language`,
		why: 'What plain language is — and what it is not.'
	},
	howToWritePlainLanguage: {
		title: 'How to write in plain language',
		url: `${BASE}/sf.gov-and-karl-foundations/writing-for-sf.gov/plain-language/how-to-write-in-plain-language`,
		why: 'Concrete moves: under 3 sentences per paragraph, white space, scannability.'
	},
	contentPrinciples: {
		title: 'Content principles',
		url: `${BASE}/writing-on-sf.gov/content-principles`,
		why: 'The principle this check is measuring against: write simply, use plain English.'
	},
	plainLanguageForTranslations: {
		title: 'Plain language for translations',
		url: `${BASE}/about-sf.gov/translations-on-sf.gov/plain-language-for-translations`,
		why: 'Simpler English translates better — reading level is a translation cost.'
	},
	contentResources: {
		title: 'Content resources',
		url: `${BASE}/writing-on-sf.gov/content-resources`,
		why: 'Federal plain language checklists and further reading.'
	},
	keepPagesAccessible: {
		title: 'How you keep pages accessible',
		url: `${BASE}/sf.gov-and-karl-foundations/sf.gov-concepts-and-structure/accessibility/how-you-keep-pages-accessible`,
		why: 'The editor-facing accessibility duties this panel checks.'
	},
	legalRequirements: {
		title: 'Legal requirements',
		url: `${BASE}/sf.gov-and-karl-foundations/sf.gov-concepts-and-structure/accessibility/legal-requirements`,
		why: 'WCAG 2.1 Level AA is a compliance deadline for CCSF, not a preference.'
	},
	headingLevels: {
		title: 'Body on a Report page',
		url: `${BASE}/using-karl-the-cms/content-types/building-a-page-by-content-type/report/body-on-a-report-page`,
		why: 'Karl’s own guidance on heading levels and what each one does.'
	},
	altText: {
		title: 'Alt text',
		url: `${BASE}/using-karl-the-cms/components/images/alt-text`,
		why: 'Alt text is required on upload; this is what it should say.'
	},
	descriptiveAltText: {
		title: 'Descriptive alt text in context',
		url: `${BASE}/using-karl-the-cms/components/images/descriptive-alt-text-in-context`,
		why: 'Worked examples of ideal, adequate and failing alt text.'
	},
	descriptiveLinks: {
		title: 'Write descriptive links',
		url: `${BASE}/sf.gov-and-karl-foundations/writing-for-sf.gov/sf.gov-style/write-descriptive-links`,
		why: 'Link text should say where the link goes.'
	},
	linkBestPractices: {
		title: 'Best practices for linking',
		url: `${BASE}/using-karl-the-cms/components/links/best-practices-for-linking`,
		why: 'The do/do-not table, including why “click here” fails for screen readers.'
	},
	tables: {
		title: 'Tables',
		url: `${BASE}/using-karl-the-cms/components/tables`,
		why: 'Where the caption and header-row settings live in the table editor.'
	},
	videos: {
		title: 'Videos',
		url: `${BASE}/using-karl-the-cms/components/videos`,
		why: 'The embed form has a Video transcript field; it is not optional in practice.'
	},
	videoTranscript: {
		title: 'Get a video transcript from YouTube',
		url: `${BASE}/using-karl-the-cms/components/videos/get-a-video-transcript-from-youtube`,
		why: 'How to produce the transcript, and why the auto one needs editing.'
	},
	karlJr: {
		title: 'Karl Jr',
		url: `${BASE}/about-sf.gov/karl-labs/karl-jr`,
		why: 'The extension these checks are ported from, and what each test means.'
	}
};

/** Resolve a citation key. Throws on an unknown key rather than rendering a dead link. */
export function karlHelp(key: KarlHelpKey): KarlHelpLink {
	const link = KARL_HELP[key];
	if (!link) throw new Error(`Unknown Karl help key: ${key}`);
	return link;
}
