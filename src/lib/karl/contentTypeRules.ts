/**
 * Rules Karl states about a content type as a whole, as opposed to the
 * per-component rules in `./componentSupport`.
 *
 * Read off the Karl Editor Help Center on 2026-11-23 via the Karl documentation
 * MCP server. Only rules the help center states outright are here, each quoted
 * in `says` so a reviewer can check the claim against its citation. Karl's
 * softer selection signals ("Choose this content type if you see…") are kept
 * apart from its limits: a limit is a fact about what Karl will accept, a
 * signal is a reason to look again. Re-verify with `getPage` before editing a
 * URL or a quote — GitBook reorganises.
 */

const TYPES =
	'https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types';

export type ContentTypeRule = {
	/** The help page's own title, so a reviewer can find it again. */
	helpTitle: string;
	url: string;
	/** Karl's words, verbatim. */
	says: string;
};

export const STEP_LIMIT = 15;
export const STEP_TARGET = 5;

export const CONTENT_TYPE_RULES = {
	stepCount: {
		helpTitle: 'Steps',
		url: `${TYPES}/building-a-page-by-content-type/step-by-step/steps`,
		says: 'You can add up to 15 steps, but should aim for no more than 5.'
	},
	stepTitle: {
		helpTitle: 'Steps',
		url: `${TYPES}/building-a-page-by-content-type/step-by-step/steps`,
		says: 'Each step has: Title* …'
	},
	transactionWhatToDo: {
		helpTitle: 'Choosing a content type',
		url: `${TYPES}/choosing-a-content-type`,
		says: 'Transactions must be actionable. … Everything on a transaction page needs to move the user forward.'
	},
	informationNotActionable: {
		helpTitle: 'Choosing a content type',
		url: `${TYPES}/choosing-a-content-type`,
		says: 'Information — Use for: Non-actionable information or reference. If there’s something the user must do with the City, use a transaction instead.'
	}
} as const satisfies Record<string, ContentTypeRule>;

export type ContentTypeRuleKey = keyof typeof CONTENT_TYPE_RULES;
