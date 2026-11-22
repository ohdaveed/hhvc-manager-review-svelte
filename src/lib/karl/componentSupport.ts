/**
 * Which Karl components each SF.gov content type offers, and their limits.
 *
 * Read off the Karl Editor Help Center's Components pages on 2026-11-22 (each
 * row cites the page it came from). Types are written in THIS CORPUS'S
 * vocabulary, not the help center's: Karl's "About" is the corpus's
 * `About us`, and "Resource collection" is `Resource Collection`. Types the
 * corpus never uses (Event, Meeting, Data story, Profile) are kept anyway, so
 * the rows read the same as the pages they cite.
 *
 * Three states, not two. `unknown` is for a type the help center itself leaves
 * unsettled; reporting it as unsupported would be a claim this tool has not
 * earned, and reporting it as supported would hide the question.
 *
 * `Step by step` appears in no row. That is deliberate: the help center
 * documents it as a content type (intro and steps only) and leaves it off
 * every component's supported list, so it reads as `no` like any other
 * unlisted type. No corpus Step by step page uses these components today.
 */
import { RELATED_PERMITTED_TYPES } from './sitemap';

const COMPONENTS =
	'https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/components';

export type KarlComponent =
	| 'callout'
	| 'accordion'
	| 'button'
	| 'spotlightButton'
	| 'spotlight'
	| 'resources'
	| 'related'
	| 'table'
	| 'alert'
	| 'contact';

export type Support = 'yes' | 'no' | 'unknown';

export type ComponentRule = {
	/** What a reviewer calls it. */
	label: string;
	/** The help center page this row was read from. */
	url: string;
	/** The help page's own title, so a reviewer can find it again. */
	helpTitle: string;
	/** Content types Karl offers the component on. */
	types: readonly string[];
	/** Types the help center leaves unsettled. */
	unknownTypes?: readonly string[];
	/** What to do instead, when the component is not offered. */
	instead: string;
	/** Most of this component one page may carry, by type. */
	maxPerPage?: Readonly<Record<string, number>>;
	/** Character limits, by field. */
	maxChars?: Readonly<Record<string, number>>;
};

export const COMPONENT_SUPPORT: Record<KarlComponent, ComponentRule> = {
	// "3 content types support callouts: Transaction, Information, Data story"
	callout: {
		label: 'Callout',
		url: `${COMPONENTS}/callout`,
		helpTitle: 'Callout',
		types: ['Transaction', 'Information', 'Data story'],
		instead: 'Put this text in the section’s body copy instead.'
	},
	// "4 content types support accordions: Campaign, Location, Meeting, Transaction"
	// "Title of the Accordion section: up to 65 characters". This corpus marks an
	// accordion section as `component: 'supporting'`.
	accordion: {
		label: 'Accordion',
		url: `${COMPONENTS}/accordions`,
		helpTitle: 'Accordions',
		types: ['Campaign', 'Location', 'Meeting', 'Transaction'],
		instead: 'Use an ordinary body section instead.',
		maxChars: { title: 65 }
	},
	// "You can add a button as part of a call to action on: Transaction" and "as a
	// link to a signup platform or online session on: Event, Meeting".
	// "Buttons can only be 25 characters long."
	button: {
		label: 'Button',
		url: `${COMPONENTS}/button`,
		helpTitle: 'Button',
		types: ['Transaction', 'Event', 'Meeting'],
		instead: 'Use a text link in the body copy instead.',
		maxChars: { label: 25 }
	},
	// Same page: "You can add a button as part of a Spotlight on: Agency, Campaign,
	// Report". The Spotlight page says "You have the option to add a button in the
	// spotlight" without restricting it, so its other two types are unsettled.
	spotlightButton: {
		label: 'Spotlight button',
		url: `${COMPONENTS}/button`,
		helpTitle: 'Button',
		types: ['Agency', 'Campaign', 'Report'],
		unknownTypes: ['Profile', 'Topic'],
		instead: 'Use a text link in the spotlight’s copy instead.',
		maxChars: { label: 25 }
	},
	// "5 content types support spotlights: Agency, Campaign, Report, Profile, Topic.
	// Agency and Campaign allow up to 2 spotlights. Report, Profile, and Topic only
	// allow 1 spotlight."
	spotlight: {
		label: 'Spotlight',
		url: `${COMPONENTS}/spotlight`,
		helpTitle: 'Spotlight',
		types: ['Agency', 'Campaign', 'Report', 'Profile', 'Topic'],
		instead: 'Use an ordinary body section instead.',
		maxPerPage: { Agency: 2, Campaign: 2, Report: 1, Profile: 1, Topic: 1 }
	},
	// "5 content types support resource tiles" -- then lists four: About, Campaign,
	// Resource collection, Topic. The fifth is most likely Agency (there is a
	// "Resources on an Agency page" help page under content-types/.../agency), but
	// the component page does not say so, so Agency stays unknown.
	resources: {
		label: 'Resource tile',
		url: `${COMPONENTS}/resources`,
		helpTitle: 'Resources',
		types: ['About us', 'Campaign', 'Resource Collection', 'Topic'],
		unknownTypes: ['Agency'],
		instead: 'List these links in the body copy instead.'
	},
	// "Only a few content types can be tagged as Related pages: Transaction,
	// Information, Campaign, Topic." This row's `types` are the types a Related
	// card may LINK TO, not the page that carries it -- so `isSupported('related',
	// t)` takes the linked page's type. Shared with the site map, so the two
	// cannot drift.
	related: {
		label: 'Related page',
		url: `${COMPONENTS}/related`,
		helpTitle: 'Related',
		types: RELATED_PERMITTED_TYPES,
		instead: 'Link to this page from the body copy instead.'
	},
	// The help center's Contact section page lists no content types, so this row
	// comes from the repo's own Karl field map instead: `KARL_PANELS` in
	// src/lib/legacy-core/karl-blocks.js gives a "Contact us" panel to
	// Transaction (`get_help`), Campaign, Agency and Location, and none to
	// Information (its U22 records the two Information pages that carry one).
	contact: {
		label: 'Contact section',
		url: `${COMPONENTS}/contact-section`,
		helpTitle: 'Contact section',
		types: ['Transaction', 'Campaign', 'Agency', 'Location'],
		instead: 'Put the phone and email in the body copy instead.'
	},
	// "Report is the only content type on SF.gov that supports tables."
	table: {
		label: 'Table',
		url: `${COMPONENTS}/tables`,
		helpTitle: 'Tables',
		types: ['Report'],
		instead: 'Use a bulleted list instead.'
	},
	// "2 content types support alerts: Agency, Location". "Title ... 30 characters
	// maximum. Description ... 120 characters maximum". No corpus page carries an
	// alert, so nothing checks this row yet.
	alert: {
		label: 'Alert',
		url: `${COMPONENTS}/alert`,
		helpTitle: 'Alert',
		types: ['Agency', 'Location'],
		instead: 'Put this message in the page’s body copy instead.',
		maxChars: { title: 30, description: 120 }
	}
};

/**
 * Whether Karl offers `component` on a page of `pageType`. For `related`, pass
 * the type of the page being linked TO.
 */
export function isSupported(component: KarlComponent, pageType: string): Support {
	const rule = COMPONENT_SUPPORT[component];
	if (rule.types.includes(pageType)) return 'yes';
	if (rule.unknownTypes?.includes(pageType)) return 'unknown';
	return 'no';
}
