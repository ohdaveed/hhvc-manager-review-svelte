import { env } from '$env/dynamic/private';
import { ProviderTimeoutError, RefusalError } from './vendor/errors.js';
import { numberFromEnv } from './vendor/env.js';

/**
 * Gemini over REST -- a port of the Railway backend's `provider-gemini.js`
 * without `@google/genai`. Same defaults, same refusal handling, same error
 * classes, so `generate.ts` and the route map failures exactly as the backend
 * did.
 */

export const NAME = 'gemini';
/**
 * Chosen by measurement, not by tier (2026-11-22, whole-page Rethink, thinking
 * `low`). gemini-3.1-flash-lite: 9-16s over four runs, every draft valid with
 * every section kept. gemini-3.8-flash: 27s, 55s, 103s and 28s, once
 * ballooning to 15.9k output tokens -- half those runs overrun the 55s budget
 * `generate.ts` must keep under Netlify's 60s limit. gemini-3.5-flash-lite was
 * fastest (7s) but emptied required callouts. The Railway backend's default,
 * gemini-pro-latest, is slower than any of them. Re-measure before changing.
 */
export const DEFAULT_MODEL = 'gemini-3.1-flash-lite';

/**
 * Thinking tokens count against `maxOutputTokens` and dominate latency: at the
 * model's default level a Rethink spent 13.5k tokens thinking, took 138s and
 * was cut off at MAX_TOKENS. `GEMINI_THINKING_LEVEL` overrides; set it to
 * `default` to send no thinking config at all (for a model that rejects one).
 */
const DEFAULT_THINKING_LEVEL = 'low';
const MAX_OUTPUT_TOKENS = 16_000;
/**
 * `GEMINI_BASE_URL` points the route at a local stub (the backend honoured the
 * same variable), so the whole chain can be driven without spending quota.
 */
const DEFAULT_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/** Finish reasons that mean the model declined, not that it broke. */
const REFUSAL_FINISH_REASONS = new Set(['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII']);

/** Statuses worth one more try: rate limits and transient upstream faults. */
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

type Part = { text?: string; thought?: boolean };
type Candidate = {
	content?: { parts?: Part[] };
	finishReason?: string;
	finishMessage?: string;
	safetyRatings?: { blocked?: boolean; category?: string }[];
};
type GeminiResponse = {
	candidates?: Candidate[];
	promptFeedback?: { blockReason?: string; blockReasonMessage?: string };
	usageMetadata?: Record<string, unknown>;
	modelVersion?: string;
};

/** A non-2xx from Gemini. `status` is what the route reports as `upstreamStatus`. */
export class ProviderHttpError extends Error {
	readonly status: number;
	constructor(status: number, message: string) {
		super(message);
		this.name = 'ProviderHttpError';
		this.status = status;
	}
}

/**
 * The model answered, but not with something usable. Its messages are written
 * here and safe to show a reviewer -- unlike an arbitrary error, which can
 * carry a network address or stack detail.
 */
export class ModelOutputError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ModelOutputError';
	}
}

export function isConfigured(): boolean {
	return Boolean(env.GEMINI_API_KEY);
}

export function getModel(): string {
	return env.GEMINI_MODEL || DEFAULT_MODEL;
}

export function normalizeUsage(usage: Record<string, unknown> | undefined) {
	const input = Number(usage?.promptTokenCount) || 0;
	const output = Number(usage?.candidatesTokenCount) || 0;
	const total = Number(usage?.totalTokenCount) || input + output;
	return { inputTokens: input, outputTokens: output, totalTokens: total };
}

function explainRefusal(candidate: Candidate | undefined): string | null {
	if (candidate?.finishMessage) return candidate.finishMessage;
	const blocked = (candidate?.safetyRatings ?? [])
		.filter((rating) => rating?.blocked)
		.map((rating) => rating.category)
		.filter(Boolean);
	return blocked.length ? `Blocked on ${blocked.join(', ')}.` : null;
}

/**
 * One HTTP call, bounded by both the caller's signal and the timeout. An abort
 * the CALLER did not ask for is the timeout, and is reported as one -- the same
 * distinction the backend's `classifyAbort` draws.
 */
async function post(url: string, body: string, signal: AbortSignal | undefined, timeoutMs: number) {
	const timeout = AbortSignal.timeout(timeoutMs);
	try {
		return await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY ?? '' },
			body,
			signal: signal ? AbortSignal.any([signal, timeout]) : timeout
		});
	} catch (error) {
		if (timeout.aborted && !signal?.aborted) throw new ProviderTimeoutError(NAME);
		throw error;
	}
}

export async function generateObject({
	system,
	userPrompt,
	jsonSchema,
	signal,
	deadline
}: {
	system: string;
	userPrompt: string;
	jsonSchema: object;
	signal?: AbortSignal;
	/** Epoch ms past which no call may run -- the caller's whole-request budget. */
	deadline?: number;
}) {
	const model = getModel();
	const maxAttempts = numberFromEnv('GEMINI_MAX_ATTEMPTS', 2, { min: 1, max: 10 });
	const perCallMs = numberFromEnv('GEMINI_TIMEOUT_MS', 150_000, { max: 3_600_000 });
	// Each HTTP attempt gets the smaller of its own cap and what is left of the
	// caller's budget, so a transient-fault retry cannot outlive the request.
	const timeoutMs = () => {
		const ms = deadline === undefined ? perCallMs : Math.min(perCallMs, deadline - Date.now());
		if (ms <= 0) throw new ProviderTimeoutError(NAME);
		return ms;
	};
	const base = env.GEMINI_BASE_URL || DEFAULT_API_BASE;
	const url = `${base}/models/${encodeURIComponent(model)}:generateContent`;
	const thinkingLevel = env.GEMINI_THINKING_LEVEL || DEFAULT_THINKING_LEVEL;
	const body = JSON.stringify({
		systemInstruction: { parts: [{ text: system }] },
		contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
		generationConfig: {
			maxOutputTokens: MAX_OUTPUT_TOKENS,
			responseMimeType: 'application/json',
			responseJsonSchema: jsonSchema,
			...(thinkingLevel === 'default' ? {} : { thinkingConfig: { thinkingLevel } })
		}
	});

	let res: Response | undefined;
	for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
		res = await post(url, body, signal, timeoutMs());
		if (res.ok || !RETRYABLE_STATUSES.has(res.status) || attempt === maxAttempts) break;
		await res.body?.cancel();
	}
	if (!res!.ok) {
		const detail: unknown = await res!.json().catch(() => null);
		const message =
			(detail as { error?: { message?: unknown } } | null)?.error?.message ?? res!.statusText;
		throw new ProviderHttpError(res!.status, String(message));
	}

	const response = (await res!.json()) as GeminiResponse;

	const blockReason = response.promptFeedback?.blockReason;
	if (blockReason) {
		throw new RefusalError({
			category: blockReason,
			explanation: response.promptFeedback?.blockReasonMessage || null
		});
	}

	const candidate = response.candidates?.[0];
	const finishReason = candidate?.finishReason;
	if (finishReason && REFUSAL_FINISH_REASONS.has(finishReason)) {
		throw new RefusalError({ category: finishReason, explanation: explainRefusal(candidate) });
	}
	if (finishReason === 'MAX_TOKENS') {
		throw new ModelOutputError(
			'The model hit the output limit before finishing. Try a narrower request.'
		);
	}

	// Thinking models can return thought parts beside the answer; only the
	// answer is JSON. The SDK's `response.text` skips them the same way.
	const text = (candidate?.content?.parts ?? [])
		.filter((part) => !part.thought && typeof part.text === 'string')
		.map((part) => part.text)
		.join('');
	if (!text) throw new ModelOutputError('The model returned no text content.');

	let object: unknown;
	try {
		object = JSON.parse(text);
	} catch {
		throw new ModelOutputError('The model returned text that was not valid JSON.');
	}

	return {
		object,
		model: response.modelVersion || model,
		usage: normalizeUsage(response.usageMetadata),
		rawUsage: response.usageMetadata ?? {},
		stopReason: finishReason || 'STOP'
	};
}
