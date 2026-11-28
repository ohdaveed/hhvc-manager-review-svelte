import { pagesByKey } from '$lib/data';
import * as gemini from './gemini';
import {
	buildContentSystemPrompt,
	buildContentUserPrompt,
	buildRewriteSystemPrompt,
	buildRewriteUserPrompt
} from './vendor/prompts.js';
import {
	MAX_PAGE_DEPTH,
	MAX_PAGE_JSON_BYTES,
	PAGE_OUTPUT_SCHEMA,
	REWRITE_OUTPUT_SCHEMA,
	measureDepth,
	serializePageForPrompt
} from './vendor/schemas.js';
import { validateGeneratedPage, validateRewrite } from './vendor/validate-output.js';
import { numberFromEnv } from './vendor/env.js';
import { ProviderTimeoutError } from './vendor/errors.js';
import { FACTS_DOCUMENT_NAME, factsPromptBlock } from '$lib/facts/prompt';
import { z } from 'zod';

/**
 * Append HHVC's verified facts and open questions to a vendor system prompt.
 * Done here, not in `vendor/prompts.js`, which stays diffable against upstream.
 */
function withFacts({ system, groundedBy }: { system: string; groundedBy: string[] }) {
	const block = factsPromptBlock();
	return block
		? { system: `${system}\n\n${block}`, groundedBy: [...groundedBy, FACTS_DOCUMENT_NAME] }
		: { system, groundedBy };
}

/**
 * Generate, validate, retry once -- ported from the Railway backend's
 * `build_scripts/ai/index.js`, with Gemini as the only provider and this
 * repo's corpus (`pagesByKey`) standing in for the backend's page loader.
 *
 * One retry, not a loop: a second attempt with the failures named fixes most
 * mechanical violations, and a third doubles the worst-case latency for little.
 */
const MAX_ATTEMPTS = 2;

/**
 * Netlify kills a synchronous function at 60 seconds, not configurable
 * (docs.netlify.com, functions configuration). A killed request reaches the
 * reviewer as Netlify's own error with no draft, so the whole generate --
 * every attempt -- has to finish inside this budget. 55s leaves room for
 * auth, parsing and the response. `GEMINI_DEADLINE_MS` overrides it.
 */
const DEFAULT_DEADLINE_MS = 55_000;

/**
 * A retry is only started with at least this much budget left. Measured
 * 2026-11-22 on gemini-3.8-flash: a field rewrite took ~10s, a whole-page
 * content draft ~46s -- so a page retry rarely fits, and the first draft is
 * returned with its issues listed instead of being lost to a timeout.
 */
const MIN_RETRY_BUDGET_MS = 15_000;

/**
 * SF.gov's AI guidelines require disclosure of generative AI in output, and
 * the HHVC standards manual §1.11 bars an automated agent from approving a
 * page. Rides along with every result so no draft is shown without it.
 */
const DISCLOSURE =
	'AI-assisted draft. Not reviewed, not approved, and not publishable as-is. ' +
	'Fact-check every claim against HHVC source documents before use.';

type Usage = Record<string, unknown>;

/** Sum numeric usage counters across attempts; a retried request really cost two calls. */
function addUsage(total: Usage, next: Usage | undefined): Usage {
	if (!next || typeof next !== 'object') return total;
	for (const [key, value] of Object.entries(next)) {
		if (typeof value === 'number')
			total[key] = (typeof total[key] === 'number' ? (total[key] as number) : 0) + value;
		else if (!(key in total)) total[key] = value;
	}
	return total;
}

type Generated = Awaited<ReturnType<typeof gemini.generateObject>>;

/**
 * The shared loop. `validate` judges one draft; `previous` picks what the
 * retry turn shows the model. Always resolves with the last draft, valid or
 * not: a draft with its problems listed is more use to a reviewer than none.
 */
async function generateValidated({
	task,
	system,
	groundedBy,
	jsonSchema,
	userPrompt,
	validate,
	previous,
	signal
}: {
	task: 'content' | 'rewrite-field' | 'page-suggestions';
	system: string;
	groundedBy: string[];
	jsonSchema: object;
	userPrompt: (retry?: { issues: string[]; previousDraft: unknown }) => string;
	validate: (object: unknown) => { valid: boolean; issues: string[] };
	previous: (object: unknown) => unknown;
	signal?: AbortSignal;
}) {
	let issues: string[] = [];
	let generated: Generated | null = null;
	let attempts = 0;
	const usage: Usage = {};
	const usageByAttempt: Usage[] = [];

	const deadline = Date.now() + numberFromEnv('GEMINI_DEADLINE_MS', DEFAULT_DEADLINE_MS);

	while (attempts < MAX_ATTEMPTS) {
		if (generated && deadline - Date.now() < MIN_RETRY_BUDGET_MS) break;
		const retry = generated ? { issues, previousDraft: previous(generated.object) } : undefined;
		let next: Generated;
		try {
			next = await gemini.generateObject({
				system,
				userPrompt: userPrompt(retry),
				jsonSchema,
				signal,
				deadline
			});
		} catch (err) {
			// A retry that runs out of budget keeps the first draft and its
			// issues; only a FIRST attempt's timeout has nothing to fall back on.
			if (generated && err instanceof ProviderTimeoutError) break;
			throw err;
		}
		attempts += 1;
		generated = next;
		addUsage(usage, generated.usage);
		usageByAttempt.push(generated.rawUsage);

		const validation = validate(generated.object);
		issues = validation.issues;
		if (validation.valid) break;
	}

	return {
		task,
		provider: gemini.NAME,
		model: generated!.model,
		attempts,
		valid: issues.length === 0,
		issues,
		result: generated!.object,
		usage,
		usageByAttempt,
		groundedBy,
		disclosure: DISCLOSURE
	};
}

export function generateContent({
	prompt,
	page,
	signal
}: {
	prompt: string;
	page?: object;
	signal?: AbortSignal;
}) {
	const { system, groundedBy } = withFacts(buildContentSystemPrompt(Object.keys(pagesByKey)));
	return generateValidated({
		task: 'content',
		system,
		groundedBy,
		jsonSchema: PAGE_OUTPUT_SCHEMA,
		userPrompt: (retry) =>
			buildContentUserPrompt({
				prompt,
				page,
				issues: retry?.issues,
				previousDraft: retry?.previousDraft as object | undefined
			}),
		validate: (object) => validateGeneratedPage(object as object, pagesByKey),
		previous: (object) => object,
		signal
	});
}

export function generateRewrite({
	fieldText,
	instruction,
	page,
	signal
}: {
	fieldText: string;
	instruction?: string;
	page?: { type?: string };
	signal?: AbortSignal;
}) {
	const { system, groundedBy } = withFacts(buildRewriteSystemPrompt());
	return generateValidated({
		task: 'rewrite-field',
		system,
		groundedBy,
		jsonSchema: REWRITE_OUTPUT_SCHEMA,
		userPrompt: (retry) =>
			buildRewriteUserPrompt({
				fieldText,
				instruction,
				page,
				issues: retry?.issues,
				previousDraft: retry?.previousDraft as string | undefined
			}),
		validate: (object) => validateRewrite(object as object, fieldText, page?.type),
		// The retry turn corrects the rewrite STRING, not the whole object.
		previous: (object) => (object as { rewrittenText?: unknown } | null)?.rewrittenText,
		signal
	});
}

const PAGE_SUGGESTIONS_OUTPUT_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	required: ['plainLanguage', 'structure', 'codeAndScope'],
	properties: {
		plainLanguage: {
			type: 'string',
			description:
				'One concise, actionable plain-language suggestion (1–2 sentences) for reading level, clarity, or active voice on this page.'
		},
		structure: {
			type: 'string',
			description:
				'One concise, actionable structure suggestion (1–2 sentences) for heading clarity, section order, or scannability.'
		},
		codeAndScope: {
			type: 'string',
			description:
				'One concise, actionable suggestion (1–2 sentences) for Karl CMS mapping, content-type rules, or scope.'
		}
	}
};

export const pageSuggestionsRequestSchema = z.object({
	task: z.literal('page-suggestions'),
	provider: z.enum(['gemini']).optional(),
	sectionKey: z.string().max(200).optional(),
	page: z
		.record(z.unknown())
		.refine(
			(page) => {
				try {
					return Buffer.byteLength(serializePageForPrompt(page), 'utf8') <= MAX_PAGE_JSON_BYTES;
				} catch {
					return false;
				}
			},
			{ message: `page must serialize to ${MAX_PAGE_JSON_BYTES} bytes or fewer` }
		)
		.refine((page) => measureDepth(page, MAX_PAGE_DEPTH) <= MAX_PAGE_DEPTH, {
			message: `page must not nest deeper than ${MAX_PAGE_DEPTH} levels`
		})
});

function validatePageSuggestions(object: unknown): { valid: boolean; issues: string[] } {
	const issues: string[] = [];
	if (!object || typeof object !== 'object') {
		return { valid: false, issues: ['Expected a JSON object with three suggestion fields.'] };
	}
	const record = object as Record<string, unknown>;
	for (const key of ['plainLanguage', 'structure', 'codeAndScope'] as const) {
		const value = record[key];
		if (typeof value !== 'string' || value.trim().length === 0) {
			issues.push(`${key} must be a non-empty string.`);
		} else if (value.trim().length > 600) {
			issues.push(`${key} must be 600 characters or fewer.`);
		}
	}
	return { valid: issues.length === 0, issues };
}

export function generatePageSuggestions({
	page,
	sectionKey,
	signal
}: {
	page: Record<string, unknown>;
	sectionKey?: string;
	signal?: AbortSignal;
}) {
	const { system, groundedBy } = withFacts(buildRewriteSystemPrompt());
	const serialized = serializePageForPrompt(page);
	return generateValidated({
		task: 'page-suggestions',
		system,
		groundedBy,
		jsonSchema: PAGE_SUGGESTIONS_OUTPUT_SCHEMA,
		userPrompt: (retry) => {
			const focus = sectionKey
				? `Focus especially on section "${sectionKey}" while keeping the whole page in mind.\n\n`
				: '';
			const retryNote = retry
				? `\n\nPrevious draft failed validation:\n- ${retry.issues.join('\n- ')}\nFix those issues and stay concise (1–2 sentences per field).`
				: '';
			return (
				`Review this SF.gov HHVC mockup page and provide three concise, concrete suggestions (1–2 sentences each):\n` +
				`1. plainLanguage: simplify vocabulary, sentence length, or passive voice.\n` +
				`2. structure: improve headings, section hierarchy, or layout flow.\n` +
				`3. codeAndScope: address Karl CMS mapping, content-type rules, or page scope.\n\n` +
				focus +
				`Page JSON:\n${serialized}${retryNote}`
			);
		},
		validate: validatePageSuggestions,
		previous: (object) => object,
		signal
	});
}
