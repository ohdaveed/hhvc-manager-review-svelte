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
export const DEFAULT_MODEL = 'gemini-pro-latest';
const MAX_OUTPUT_TOKENS = 16_000;
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

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
	signal
}: {
	system: string;
	userPrompt: string;
	jsonSchema: object;
	signal?: AbortSignal;
}) {
	const model = getModel();
	const maxAttempts = numberFromEnv('GEMINI_MAX_ATTEMPTS', 2, { min: 1, max: 10 });
	const timeoutMs = numberFromEnv('GEMINI_TIMEOUT_MS', 150_000, { max: 3_600_000 });
	const url = `${API_BASE}/models/${encodeURIComponent(model)}:generateContent`;
	const body = JSON.stringify({
		systemInstruction: { parts: [{ text: system }] },
		contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
		generationConfig: {
			maxOutputTokens: MAX_OUTPUT_TOKENS,
			responseMimeType: 'application/json',
			responseJsonSchema: jsonSchema
		}
	});

	let res: Response | undefined;
	for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
		res = await post(url, body, signal, timeoutMs);
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
