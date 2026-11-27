import { env } from '$env/dynamic/private';
import { SVELTE_PUBLIC_SUPABASE_ANON_KEY, SVELTE_PUBLIC_SUPABASE_URL } from '$env/static/public';
import { error, json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { draftPathFor, MAX_DESCRIPTION_CHARS } from '$lib/corpus/draftPath';

/**
 * Creates and finalizes AI-drafted pages.
 *
 * `pages` and `draft_pages` have no INSERT policy for `authenticated` -- pages
 * are seeded -- so both rows are written here with the service-role key, which
 * bypasses RLS. That makes the caller check the whole security surface: it runs
 * BEFORE the service-role client is built, as in `/api/invite`.
 *
 * Any authenticated reviewer may PATCH any draft id. That matches the existing
 * trust model -- every `authenticated` caller can already UPDATE any row of
 * `pages`, because a decision is a property of the page rather than of whoever
 * recorded it -- and is why this route does not scope by `created_by`.
 */
async function requireUser(request: Request) {
	const header = request.headers.get('Authorization');
	const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
	if (!token) throw error(401, 'Unauthorized');

	// Per-request client: no session is persisted or refreshed on the server.
	const supabase = createClient(SVELTE_PUBLIC_SUPABASE_URL, SVELTE_PUBLIC_SUPABASE_ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});

	const {
		data: { user },
		error: authError
	} = await supabase.auth.getUser(token);
	if (authError || !user) throw error(401, 'Unauthorized');

	return user;
}

/** Bounds the request before it is parsed. */
const MAX_BODY_BYTES = 64 * 1024;

const MAX_TITLE_CHARS = 80;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Checked before the client is built so an unset variable reads as what it is. */
function adminClient() {
	const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
	if (!serviceRoleKey) {
		throw error(500, 'SUPABASE_SERVICE_ROLE_KEY is not set for this deploy context');
	}
	return createClient(SVELTE_PUBLIC_SUPABASE_URL, serviceRoleKey, {
		auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
	});
}

async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
	const raw = await request.text();
	if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
		throw error(413, 'Request body too large');
	}
	let payload: unknown;
	try {
		payload = JSON.parse(raw);
	} catch {
		throw error(400, 'Invalid JSON body');
	}
	if (!isPlainObject(payload)) {
		throw error(400, 'Body must be a JSON object');
	}
	return payload;
}

/**
 * The reviewer's own words, cut at a word boundary so it fits a queue row.
 *
 * From the first paragraph only: the form writes the reviewer's section,
 * template and path choices after a blank line (`composeDraftRequest`), and
 * those are instructions to the drafter, not a name for the page.
 */
function titleFrom(description: string): string {
	const text = description
		.split(/\n\s*\n/)[0]
		.replace(/\s+/g, ' ')
		.trim();
	if (text.length <= MAX_TITLE_CHARS) return text;
	const room = text.slice(0, MAX_TITLE_CHARS - 1);
	const lastSpace = room.lastIndexOf(' ');
	// A single unbroken token has no boundary to cut at; hard-cut it.
	const cut = lastSpace > 0 && text[MAX_TITLE_CHARS - 1] !== ' ' ? room.slice(0, lastSpace) : room;
	return `${cut.trimEnd().replace(/[\s,;:.-]+$/, '')}…`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function handleUnexpected(err: unknown, label: string): never {
	// Rethrow deliberate HTTP errors so upstream status codes survive.
	if (typeof err === 'object' && err !== null && 'status' in err) throw err;
	// Generic on purpose: echoing err.message could leak a network address.
	console.error(`${label}:`, err);
	throw error(500, 'Could not complete the request');
}

export async function POST({ request }) {
	// Outside the try: a thrown HttpError is not an Error instance, so the
	// catch below would otherwise flatten this 401 into a 500.
	const caller = await requireUser(request);

	try {
		const payload = await readJsonObject(request);

		// Trimmed BEFORE validating: whitespace alone must not create a row.
		const description = typeof payload.description === 'string' ? payload.description.trim() : '';
		if (!description) {
			throw error(400, 'description is required');
		}
		if (description.length > MAX_DESCRIPTION_CHARS) {
			throw error(400, `description must be at most ${MAX_DESCRIPTION_CHARS} characters`);
		}

		const admin = adminClient();

		// The newest review, exactly as `loadReview()` picks it: a draft has to
		// join the review the app actually loaded.
		const { data: reviews, error: reviewError } = await admin
			.from('reviews')
			.select('id')
			.order('created_at', { ascending: false })
			.limit(1);
		if (reviewError) throw reviewError;
		if (!reviews || reviews.length === 0) {
			throw error(409, 'There is no review to add a page to');
		}
		const reviewId = reviews[0].id;

		const id = crypto.randomUUID();
		const path = draftPathFor(id);
		const title = titleFrom(description);

		const { error: draftError } = await admin.from('draft_pages').insert({
			id,
			review_id: reviewId,
			path,
			title,
			description,
			created_by: caller.id
		});
		if (draftError) throw draftError;

		// Only review_id and path: status, manager_notes and page_checks default
		// to 'needs-review', '' and {}, so the draft lands in the queue undecided.
		const { error: pageError } = await admin.from('pages').insert({ review_id: reviewId, path });
		if (pageError) {
			// No transaction spans two PostgREST calls. Remove the draft row so a
			// failed queue insert leaves nothing half-created; if even that fails,
			// say so in the log, since the row is then orphaned.
			const { error: cleanupError } = await admin.from('draft_pages').delete().eq('id', id);
			if (cleanupError) console.error('Orphaned draft row after pages insert failed:', id);
			throw pageError;
		}

		return json({ id, path, title, state: 'drafting' }, { status: 201 });
	} catch (err) {
		handleUnexpected(err, 'Draft create failed');
	}
}

export async function PATCH({ request }) {
	await requireUser(request);

	try {
		const payload = await readJsonObject(request);

		// Shape-checked so a malformed id is a 400, not a Postgres cast error.
		if (typeof payload.id !== 'string' || !UUID_PATTERN.test(payload.id)) {
			throw error(400, 'id must be a draft id');
		}
		if (payload.failed !== undefined && payload.failed !== true) {
			throw error(400, 'failed, when present, must be true');
		}
		if (payload.content !== undefined && !isPlainObject(payload.content)) {
			throw error(400, 'content must be an object');
		}
		// A string or a null entry here would throw when the draft is merged into
		// the page store, so it is refused at the door rather than stored.
		if (
			payload.content !== undefined &&
			(payload.content as Record<string, unknown>).sections !== undefined &&
			!(
				Array.isArray((payload.content as Record<string, unknown>).sections) &&
				((payload.content as Record<string, unknown>).sections as unknown[]).every(isPlainObject)
			)
		) {
			throw error(400, 'content.sections must be an array of objects');
		}
		if (payload.valid !== undefined && typeof payload.valid !== 'boolean') {
			throw error(400, 'valid must be a boolean');
		}
		if (
			payload.issues !== undefined &&
			!(Array.isArray(payload.issues) && payload.issues.every((i) => typeof i === 'string'))
		) {
			throw error(400, 'issues must be an array of strings');
		}
		if (payload.model !== undefined && typeof payload.model !== 'string') {
			throw error(400, 'model must be a string');
		}

		const failed = payload.failed === true;
		if (failed && payload.content !== undefined) {
			throw error(400, 'A failed draft cannot carry content');
		}
		if (!failed && payload.content === undefined) {
			throw error(400, 'content is required unless failed is true');
		}

		// Built field by field -- never the request object itself. `updated_at` is
		// set here because `draft_pages` has no trigger for it.
		const patch: Record<string, unknown> = {
			state: failed ? 'failed' : 'ready',
			updated_at: new Date().toISOString()
		};
		if (!failed) {
			patch.content = payload.content;
			if (payload.valid !== undefined) patch.valid = payload.valid;
			if (payload.issues !== undefined) patch.issues = payload.issues;
			if (payload.model !== undefined) patch.model = payload.model;
		}

		const admin = adminClient();
		const { data, error: updateError } = await admin
			.from('draft_pages')
			.update(patch)
			.eq('id', payload.id)
			.select('id');
		if (updateError) throw updateError;
		if (!data || data.length === 0) throw error(404, 'No such draft');

		return json({ ok: true });
	} catch (err) {
		handleUnexpected(err, 'Draft update failed');
	}
}
