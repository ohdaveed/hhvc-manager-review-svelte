/**
 * Karl's rules per content type, as a typed view over the panel inventory.
 *
 * **This adds rules; it does not re-list fields.** Every field's name, label,
 * order and required flag is read from `KARL_PANELS`
 * (`$lib/legacy-core/karl-blocks.js`), the inventory transcribed from the live
 * Wagtail forms. A second hand-written list would be free to drift from it, and
 * the field-map tests only guard the first. What this file contributes is the
 * limits, keyed by `(type, rawName)`, each with a citation and a status:
 *
 * - `confirmed`  Karl's help center says it outright, and nothing contradicts it.
 * - `unconfirmed` the help center contradicts itself, or never says.
 *
 * The limits that already lived elsewhere are read from there rather than
 * restated: `KARL_FLAGS` (button label, cost description, Things to know) and
 * `COMPONENT_SUPPORT` (accordion title). Title and Description are new here --
 * the 65 and 110 had been cited only in docs.
 *
 * First slice: Transaction, Information and Resource Collection. A type with
 * no entry returns `null` from `schemaFor`, and the Karl outline judges its
 * pages on placement alone.
 */
import { KARL_FLAGS, panelsFor } from '$lib/legacy-core/karl-blocks.js';
import { COMPONENT_SUPPORT } from './componentSupport';
import { RELATED_PERMITTED_TYPES } from './sitemap';
import { CONTENT_TYPE_RULES, STEP_LIMIT, STEP_TARGET } from './contentTypeRules';

const HC = 'https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms';
const TYPES = `${HC}/content-types/building-a-page-by-content-type`;

export type RuleStatus = 'confirmed' | 'unconfirmed';

export type Cite = {
	/** The help page's own title, so a reviewer can find it again. */
	helpTitle: string;
	url: string;
	/** Karl's words, verbatim. */
	says: string;
};

export type FieldRule =
	| {
			kind: 'maxChars';
			/** The sub-field the limit applies to, where it is not the field's own text. */
			sub?: string;
			max: number;
			/** `true`: the text must be shorter than `max` ("less than 65"); `false`: at most `max`. */
			strict: boolean;
			status: RuleStatus;
			cite: Cite;
	  }
	| {
			kind: 'maxItems';
			max: number;
			/** Counted per step rather than per page, e.g. one Transaction link per step. */
			per?: 'step';
			/** Counted over the panel's blocks of one kind, e.g. Topic's one `spotlight`. */
			block?: string;
			status: RuleStatus;
			cite: Cite;
	  }
	/** Karl's own guidance below its hard limit: reported, but it does not make copy need a fix. */
	| {
			kind: 'targetItems';
			target: number;
			/** Counted over the panel's blocks of one kind, e.g. Campaign's accordions. */
			block?: string;
			status: RuleStatus;
			cite: Cite;
	  }
	/** A sub-field Karl marks required, e.g. each step's Title. */
	| { kind: 'required'; sub: string; status: RuleStatus; cite: Cite }
	| { kind: 'fixedHeading'; heading: string; status: RuleStatus; cite: Cite }
	/**
	 * Something Karl says about how the panel BEHAVES, rather than a limit on the
	 * copy in it. Only ever `unconfirmed` so far: it exists for the claims Karl's
	 * pages contradict each other on, which the Blueprint shows beside the slot.
	 */
	| {
			kind: 'caveat';
			/** The one sub-field it is about, where it is narrower than the panel. */
			sub?: string;
			/** The caveat in one plain line for a manager; `cite.says` keeps Karl's words. */
			plain: string;
			status: RuleStatus;
			cite: Cite;
	  };

/** Something Karl says about the content type as a whole, shown above the Blueprint. */
export type PageCaveat = { plain: string; status: RuleStatus; cite: Cite };

export type KarlPanelSchema = {
	rawName: string;
	/** The live Wagtail form's label: what the editor sees, and what a chip shows. */
	label: string;
	/** The help center's name for the panel, where it differs from the form's. */
	helpLabel?: string;
	order: number;
	required: boolean;
	repeatable: boolean;
	/** The inventory's own block-type note, verbatim. Prose, so nothing parses it. */
	blockTypes: string;
	/** The parent panel, for a field that only exists inside another's block. */
	subPanelOf?: string;
	/** A panel that is disabled by design and gets no Blueprint slot. */
	inert: boolean;
	rules: readonly FieldRule[];
};

export type ContentTypeSchema = {
	type: SchemaType;
	url: { pattern: string; status: RuleStatus; cite: Cite };
	/** Types a Related card may link to, or `null` when this type has no Related panel. */
	relatedTargets: readonly string[] | null;
	pageCaveats: readonly PageCaveat[];
	panels: readonly KarlPanelSchema[];
};

export const SCHEMA_TYPES = [
	'Transaction',
	'Information',
	'Resource Collection',
	'Step by step',
	'Topic',
	'Campaign'
] as const;

/** A panel's label as Karl's form shows it: the inventory's label without its trailing note. */
export const formLabel = (uiLabel: string): string => uiLabel.replace(/\s*\(.*\)\s*$/, '');
export type SchemaType = (typeof SCHEMA_TYPES)[number];

const TITLE: FieldRule = {
	kind: 'maxChars',
	max: 65,
	strict: true,
	status: 'confirmed',
	cite: {
		helpTitle: 'Title',
		url: `${HC}/components/title`,
		says: 'Titles should be less than 65 characters, as search results cut off longer titles.'
	}
};

const DESCRIPTION: FieldRule = {
	kind: 'maxChars',
	max: 110,
	strict: false,
	status: 'confirmed',
	cite: {
		helpTitle: 'Description',
		url: `${HC}/components/description`,
		says: 'You have up to 110 characters.'
	}
};

/** A spotlight's button: allowed on Campaign, Agency and Report, at 25 characters. */
const SPOTLIGHT_BUTTON: FieldRule = {
	kind: 'maxChars',
	sub: 'Button',
	max: KARL_FLAGS.buttonLabelMaxChars,
	strict: false,
	status: 'confirmed',
	cite: {
		helpTitle: COMPONENT_SUPPORT.button.helpTitle,
		url: COMPONENT_SUPPORT.button.url,
		says: 'You can add a button as part of a Spotlight on: Agency, Campaign, Report. … Buttons can only be 25 characters long.'
	}
};

const URLS: Cite = {
	helpTitle: 'URLs',
	url: `${HC}/components/urls`,
	says: ''
};

/** Panels disabled by design: the inventory documents them, but nothing goes in them. */
const INERT = new Set(['redirect_url', 'agency_redirect']);

type TypeRules = {
	url: ContentTypeSchema['url'];
	relatedTargets: readonly string[] | null;
	pageCaveats?: readonly PageCaveat[];
	helpLabels?: Record<string, string>;
	rules: Record<string, readonly FieldRule[]>;
};

const RULES: Record<SchemaType, TypeRules> = {
	Transaction: {
		// Both pages agree: the URLs page and the Transaction page.
		url: {
			pattern: 'sf.gov/[slug]',
			status: 'confirmed',
			cite: { ...URLS, says: 'Transaction - sf.gov/[slug]' }
		},
		relatedTargets: RELATED_PERMITTED_TYPES,
		helpLabels: {
			supporting_information: 'Supporting information'
		},
		rules: {
			title: [TITLE],
			description: [DESCRIPTION],
			cost: [
				{
					kind: 'maxChars',
					sub: 'Cost description',
					max: KARL_FLAGS.costDescriptionMaxChars,
					strict: false,
					status: 'confirmed',
					cite: {
						helpTitle: 'Live Transaction form (field map, E1)',
						url: 'docs/karl-export-field-map.md',
						says: 'All five cost radio variants end at the same "Cost description" rich text field, capped at 120 characters.'
					}
				}
			],
			things_to_know: [
				{
					kind: 'maxItems',
					max: KARL_FLAGS.thingsToKnowMaxItems,
					status: 'confirmed',
					cite: {
						helpTitle: 'What to know before you start section - Cost and Things to know',
						url: `${TYPES}/transaction/what-to-know-before-you-start-section-cost-and-things-to-know`,
						says: 'We recommend keeping it brief and no more than 2 items, if you can.'
					}
				}
			],
			what_to_do: [
				{
					kind: 'fixedHeading',
					heading: 'What to do',
					status: 'confirmed',
					cite: {
						helpTitle: 'What to do section on a Transaction page',
						url: `${TYPES}/transaction/what-to-do-section-on-a-transaction-page`,
						says: 'You cannot remove or change the heading "What to do." It is hard-coded in the CMS.'
					}
				}
			],
			section_specifics: [
				{
					kind: 'maxChars',
					sub: 'Button link',
					max: KARL_FLAGS.buttonLabelMaxChars,
					strict: false,
					status: 'confirmed',
					cite: {
						helpTitle: COMPONENT_SUPPORT.button.helpTitle,
						url: COMPONENT_SUPPORT.button.url,
						says: 'Buttons can only be 25 characters long.'
					}
				}
			],
			supporting_information: [
				{
					kind: 'maxChars',
					sub: 'Title',
					max: COMPONENT_SUPPORT.accordion.maxChars?.title ?? 65,
					strict: false,
					status: 'confirmed',
					cite: {
						helpTitle: COMPONENT_SUPPORT.accordion.helpTitle,
						url: COMPONENT_SUPPORT.accordion.url,
						says: 'Title of the Accordion section: up to 65 characters'
					}
				}
			]
		}
	},
	Information: {
		// The URLs page gives `sf.gov/[slug]`; the Information page gives
		// `sf.gov/information/title-of-page`. Karl contradicts itself.
		url: {
			pattern: 'sf.gov/[slug] or sf.gov/information/[slug]',
			status: 'unconfirmed',
			cite: {
				helpTitle: 'URLs; Information',
				url: `${HC}/components/urls`,
				says: 'URLs page: "Information - sf.gov/[slug]". Information page: "URL sf.gov/information/title-of-page".'
			}
		},
		relatedTargets: RELATED_PERMITTED_TYPES,
		rules: { title: [TITLE], description: [DESCRIPTION] }
	},
	'Resource Collection': {
		// The URLs page gives `sf.gov/[slug]`; the Resource Collection page gives
		// `sf.gov/resource/year/title-of-resource`.
		url: {
			pattern: 'sf.gov/[slug] or sf.gov/resource/[year]/[slug]',
			status: 'unconfirmed',
			cite: {
				helpTitle: 'URLs; Resource Collection',
				url: `${HC}/components/urls`,
				says: 'URLs page: "Resource Collection - sf.gov/[slug]". Resource Collection page: "URL sf.gov/resource/year/title-of-resource".'
			}
		},
		// No `related` panel in the live form's inventory.
		relatedTargets: null,
		rules: { title: [TITLE], description: [DESCRIPTION] }
	},
	'Step by step': {
		// The URLs page gives `sf.gov/[slug]`; the Step by step page gives
		// `sf.gov/step-by-step/title-of-step-by-step`.
		url: {
			pattern: 'sf.gov/[slug] or sf.gov/step-by-step/[slug]',
			status: 'unconfirmed',
			cite: {
				helpTitle: 'URLs; Step by step',
				url: `${HC}/components/urls`,
				says: 'URLs page: "Step by step - sf.gov/[slug]". Step by step page: "URL sf.gov/step-by-step/title-of-step-by-step".'
			}
		},
		// No `related` panel in the live form's inventory.
		relatedTargets: null,
		rules: {
			title: [TITLE],
			description: [DESCRIPTION],
			steps: [
				{
					kind: 'maxItems',
					max: STEP_LIMIT,
					status: 'confirmed',
					cite: { ...CONTENT_TYPE_RULES.stepCount }
				},
				{
					kind: 'targetItems',
					target: STEP_TARGET,
					status: 'confirmed',
					cite: { ...CONTENT_TYPE_RULES.stepCount }
				},
				{
					kind: 'required',
					sub: 'Title',
					status: 'confirmed',
					cite: { ...CONTENT_TYPE_RULES.stepTitle }
				},
				{
					kind: 'maxItems',
					max: 1,
					per: 'step',
					status: 'confirmed',
					cite: {
						helpTitle: 'How a Step by step page works',
						url: `${TYPES}/step-by-step/how-a-step-by-step-page-works`,
						says: 'Each step can link to one or no transaction on SF.gov.'
					}
				}
			],
			topics: [
				{
					kind: 'caveat',
					plain:
						'Karl’s own pages disagree on whether this page then shows up on that Topic page automatically.',
					status: 'unconfirmed',
					cite: {
						helpTitle: 'How a Step by step page works; Topic; Topics',
						url: `${TYPES}/step-by-step/how-a-step-by-step-page-works`,
						says: 'Step by step page: "You can add a topic, but the step by step will not automatically show on the topic page." Topic page: "Transaction and step by step pages tagged to the topic will automatically appear under the heading More services."'
					}
				}
			]
		}
	},
	Campaign: {
		// Both pages agree: the URLs page and the Campaign page.
		url: {
			pattern: 'sf.gov/[slug]',
			status: 'confirmed',
			cite: {
				helpTitle: 'URLs; Campaign',
				url: `${HC}/components/urls`,
				says: 'URLs page: "Campaign - sf.gov/[slug]". Campaign page: "URL sf.gov/title-of-campaign".'
			}
		},
		relatedTargets: RELATED_PERMITTED_TYPES,
		rules: {
			title: [TITLE],
			spotlight_1: [SPOTLIGHT_BUTTON],
			spotlight_2: [SPOTLIGHT_BUTTON],
			additional_content: [
				{
					kind: 'targetItems',
					target: 5,
					block: 'supporting',
					status: 'confirmed',
					cite: {
						helpTitle: 'Accordions on a Campaign page',
						url: `${TYPES}/campaign/additional-content/accordions-on-a-campaign-page`,
						says: 'Ideally, you should have a maximum of 5 accordions.'
					}
				}
			],
			// The live form has a Contact us panel; the help center's list of a
			// Campaign page's sections does not. Under the field map's precedence
			// (O14, help center first) that is a disagreement, not a settled field.
			contact: [
				{
					kind: 'caveat',
					plain:
						'Karl’s guide to Campaign pages does not list a Contact us section, though the editing form has one.',
					status: 'unconfirmed',
					cite: {
						helpTitle: 'How a Campaign page works',
						url: `${TYPES}/campaign/how-a-campaign-page-works`,
						says: "Create a Campaign page. You'll have the following sections: Title, Primary agency, Logo, Background header image, Color theme, Spotlight 1, Top facts, Additional content, Spotlight 2, About, Partner agencies, Related"
					}
				}
			]
		}
	},
	Topic: {
		// The URLs page gives `sf.gov/topic-[slug]`; the Topic page gives
		// `sf.gov/topics/name-of-topic`.
		url: {
			pattern: 'sf.gov/topic-[slug] or sf.gov/topics/[slug]',
			status: 'unconfirmed',
			cite: {
				helpTitle: 'URLs; Topic',
				url: `${HC}/components/urls`,
				says: 'URLs page: "Topic - sf.gov/topic-[slug]". Topic page: "URL sf.gov/topics/name-of-topic".'
			}
		},
		// No `related` panel: confirmed at E1, and the reason for U5.
		relatedTargets: null,
		pageCaveats: [
			{
				plain:
					'Only SF.gov Digital Services can create a new Topic page. HHVC can draft this one, but not publish it.',
				status: 'confirmed',
				cite: {
					helpTitle: 'Topic',
					url: `${TYPES}/topic`,
					says: 'Only DS can make new topics.'
				}
			}
		],
		// The form labels this stream "Child topics", and one of its block
		// choices is ALSO "Child topics" (field map, "Naming trap"); internally it
		// is "Page content". The help label says which one is meant.
		helpLabels: { content_fields: 'Page content' },
		rules: {
			title: [TITLE],
			description: [DESCRIPTION],
			content_fields: [
				{
					kind: 'maxItems',
					max: KARL_FLAGS.spotlightsAllowed.Topic,
					block: 'spotlight',
					status: 'confirmed',
					cite: {
						helpTitle: COMPONENT_SUPPORT.spotlight.helpTitle,
						url: COMPONENT_SUPPORT.spotlight.url,
						says: 'Report, Profile, and Topic only allow 1 spotlight.'
					}
				},
				{
					kind: 'caveat',
					sub: 'Spotlight button',
					plain: 'Karl’s own pages disagree on whether a Topic page’s spotlight can have a button.',
					status: 'unconfirmed',
					cite: {
						helpTitle: 'Button; Spotlight',
						url: COMPONENT_SUPPORT.spotlightButton.url,
						says: 'Button page: "You can add a button as part of a Spotlight on: Agency, Campaign, Report" (Topic not listed). Spotlight page: "You have the option to add a button in the spotlight" (no restriction).'
					}
				},
				{
					kind: 'caveat',
					sub: 'Services',
					plain:
						'Karl’s own pages disagree on whether tagged service pages are listed here automatically, under “More services”.',
					status: 'unconfirmed',
					cite: {
						helpTitle: 'Topic; How a Step by step page works',
						url: `${TYPES}/topic`,
						says: 'Topic page: "Transaction and step by step pages tagged to the topic will automatically appear under the heading More services." Step by step page: "You can add a topic, but the step by step will not automatically show on the topic page."'
					}
				}
			]
		}
	}
};

/* The inventory is untyped legacy JS; this is where its rows are narrowed. */
type InventoryPanel = {
	rawName: string;
	uiLabel: string;
	order: number;
	required: boolean;
	repeatable: boolean;
	blockTypesDoc?: string;
	subPanelOf?: string;
};
const inventory = (type: string): InventoryPanel[] =>
	(panelsFor as unknown as (t: string) => InventoryPanel[])(type);

const isSchemaType = (type: unknown): type is SchemaType =>
	typeof type === 'string' && (SCHEMA_TYPES as readonly string[]).includes(type);

/** Every rule this file declares for a type, by panel. Exposed for its own test. */
export function declaredRules(type: SchemaType): Record<string, readonly FieldRule[]> {
	return RULES[type].rules;
}

/** The schema for one content type, or `null` for a type this slice does not cover. */
export function schemaFor(type: unknown): ContentTypeSchema | null {
	if (!isSchemaType(type)) return null;
	const spec = RULES[type];
	return {
		type,
		url: spec.url,
		relatedTargets: spec.relatedTargets,
		pageCaveats: spec.pageCaveats ?? [],
		panels: inventory(type).map((panel) => ({
			rawName: panel.rawName,
			// The inventory keeps the field map's disambiguating parenthetical
			// ("Child topics (outer StreamField; ...)"); the form shows the part
			// before it. Same rule as karl-blocks' `crumbLabel`.
			label: formLabel(panel.uiLabel),
			...(spec.helpLabels?.[panel.rawName] ? { helpLabel: spec.helpLabels[panel.rawName] } : {}),
			order: panel.order,
			required: Boolean(panel.required),
			repeatable: Boolean(panel.repeatable),
			blockTypes: panel.blockTypesDoc ?? '',
			...(panel.subPanelOf ? { subPanelOf: panel.subPanelOf } : {}),
			inert: INERT.has(panel.rawName),
			rules: spec.rules[panel.rawName] ?? []
		}))
	};
}
