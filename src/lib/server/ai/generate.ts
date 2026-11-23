import { pagesByKey } from '$lib/data';
import * as gemini from './gemini';
import {
	buildContentSystemPrompt,
	buildContentUserPrompt,
	buildRewriteSystemPrompt,
	buildRewriteUserPrompt
} from './vendor/prompts.js';
import { PAGE_OUTPUT_SCHEMA, REWRITE_OUTPUT_SCHEMA } from './vendor/schemas.js';
import { validateGeneratedPage, validateRewrite } from './vendor/validate-output.js';
import { numberFromEnv } from './vendor/env.js';
import { ProviderTimeoutError } from './vendor/errors.js';

/**
 * Generate, validate, retry once -- ported from the Railway backend's
 * `build_scripts/ai/index.js`, with Gemini as the only provider and this
 * repo's corpus (`pagesByKey`) standing in for the backend's page loader.
 *
 * One retry, not a loop: a second attempt with the failures named fixes most
 * mechanical violations, and a third doubles the worst-case latency for little.
 */
export const MAX_ATTEMPTS = 2;

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
export const DISCLOSURE =
	'AI-assisted draft. Not reviewed, not approved, and not publishable as-is. ' +
	'Fact-check every claim against HHVC source documents before use.';

type Usage = Record<string, unknown>;

/** Sum numeric usage counters across attempts; a retried request really cost two calls. */
export function addUsage(total: Usage, next: Usage | undefined): Usage {
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
	task: 'content' | 'rewrite-field';
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
	const { system, groundedBy } = buildContentSystemPrompt(Object.keys(pagesByKey));
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
	const { system, groundedBy } = buildRewriteSystemPrompt();
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
