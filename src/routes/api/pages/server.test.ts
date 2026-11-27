import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
const inserts: { table: string; row: Record<string, unknown> }[] = [];
const deletes: { table: string; col: string; id: unknown }[] = [];
const orders: { table: string; col: string; opts: unknown }[] = [];
const updates: { table: string; patch: Record<string, unknown>; col: string; id: unknown }[] = [];

let reviewRows: { id: string }[] = [];
let failInsertOn: string | null = null;
let updateRows: { id: string }[] = [];

function from(table: string) {
	return {
		select: () => ({
			order: (col: string, opts: unknown) => {
				orders.push({ table, col, opts });
				return { limit: async () => ({ data: reviewRows, error: null }) };
			}
		}),
		insert: async (row: Record<string, unknown>) => {
			if (table === failInsertOn) return { error: new Error('db down at 10.0.0.5') };
			inserts.push({ table, row });
			return { error: null };
		},
		delete: () => ({
			eq: async (col: string, id: unknown) => {
				deletes.push({ table, col, id });
				return { error: null };
			}
		}),
		update: (patch: Record<string, unknown>) => ({
			eq: (col: string, id: unknown) => ({
				select: async () => {
					updates.push({ table, patch, col, id });
					return { data: updateRows, error: null };
				}
			})
		})
	};
}

const createClient = vi.fn(() => ({ auth: { getUser }, from }));
vi.mock('@supabase/supabase-js', () => ({ createClient }));

const privateEnv: Record<string, string | undefined> = { SUPABASE_SERVICE_ROLE_KEY: 'k' };
vi.mock('$env/dynamic/private', () => ({ env: privateEnv }));

const { POST, PATCH } = await import('./+server');

const AUTHED = { Authorization: 'Bearer good-token' };
const DRAFT_ID = '3f2b8c1e-5a47-4d0e-9a6b-0c1d2e3f4a5b';

function event(method: 'POST' | 'PATCH', body: unknown, headers: Record<string, string> = AUTHED) {
	const request = new Request('https://example.test/api/pages', {
		method,
		headers: { 'Content-Type': 'application/json', ...headers },
		body: typeof body === 'string' ? body : JSON.stringify(body)
	});
	return { request, url: new URL(request.url) } as never;
}

beforeEach(() => {
	createClient.mockClear();
	getUser.mockReset();
	getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
	inserts.length = 0;
	deletes.length = 0;
	updates.length = 0;
	orders.length = 0;
	reviewRows = [{ id: 'review-1' }];
	failInsertOn = null;
	updateRows = [{ id: DRAFT_ID }];
	privateEnv.SUPABASE_SERVICE_ROLE_KEY = 'k';
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('POST /api/pages', () => {
	it('rejects an unauthenticated caller before building a service-role client', async () => {
		getUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad' } });
		await expect(POST(event('POST', { description: 'x' }))).rejects.toMatchObject({ status: 401 });
		expect(createClient).toHaveBeenCalledTimes(1);
		expect(inserts).toHaveLength(0);
	});

	it('refuses a whitespace-only description without writing anything', async () => {
		await expect(POST(event('POST', { description: '   \n ' }))).rejects.toMatchObject({
			status: 400
		});
		expect(createClient).toHaveBeenCalledTimes(1);
		expect(inserts).toHaveLength(0);
	});

	it('refuses a description over the cap, naming the field', async () => {
		await expect(POST(event('POST', { description: 'x'.repeat(2001) }))).rejects.toMatchObject({
			status: 400,
			body: { message: expect.stringMatching(/description/) }
		});
		expect(inserts).toHaveLength(0);
	});

	it('does not truncate: a description of exactly the cap is accepted', async () => {
		const res = await POST(event('POST', { description: 'x'.repeat(2000) }));
		expect(res.status).toBe(201);
		expect(inserts[0].row.description).toHaveLength(2000);
	});

	it('caps the body before parsing it', async () => {
		await expect(POST(event('POST', 'x'.repeat(65 * 1024)))).rejects.toMatchObject({
			status: 413
		});
	});

	it('names the missing service-role variable', async () => {
		privateEnv.SUPABASE_SERVICE_ROLE_KEY = undefined;
		await expect(POST(event('POST', { description: 'a page' }))).rejects.toMatchObject({
			status: 500,
			body: { message: expect.stringMatching(/SUPABASE_SERVICE_ROLE_KEY/) }
		});
	});

	it('writes the draft row and the pages row with the same path', async () => {
		const res = await POST(
			event('POST', { description: 'How a tenant appeals a notice of violation' })
		);
		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toMatchObject({ path: `draft:${body.id}`, state: 'drafting' });

		const draft = inserts.find((i) => i.table === 'draft_pages')!.row;
		const page = inserts.find((i) => i.table === 'pages')!.row;
		expect(draft).toMatchObject({
			id: body.id,
			path: `draft:${body.id}`,
			review_id: 'review-1',
			created_by: 'u1'
		});
		// Status is left to the column default ('needs-review'), not set here.
		expect(page).toEqual({ review_id: 'review-1', path: `draft:${body.id}` });
	});

	it('titles the row from the reviewer own words, truncated at a word', async () => {
		const description = 'alpha bravo charlie '.repeat(10).trim();
		const res = await POST(event('POST', { description }));
		const { title } = await res.json();
		expect(title.length).toBeLessThanOrEqual(80);
		expect(title.endsWith('…')).toBe(true);
		const words = new Set(['alpha', 'bravo', 'charlie']);
		for (const w of title.slice(0, -1).split(' ')) expect(words.has(w)).toBe(true);
	});

	it('titles the row from the first paragraph, not the choices written after it', async () => {
		const description =
			'Report a dead animal\n\nKarl template: Transaction.\nSection of the HHVC site: Report a problem.';
		const res = await POST(event('POST', { description }));
		const { title } = await res.json();
		expect(title).toBe('Report a dead animal');
	});

	it('joins the newest review: looks it up ordered by created_at descending', async () => {
		await POST(event('POST', { description: 'a page' }));
		expect(orders).toEqual([{ table: 'reviews', col: 'created_at', opts: { ascending: false } }]);
	});

	it('fails with a clear status when there is no review', async () => {
		reviewRows = [];
		await expect(POST(event('POST', { description: 'a page' }))).rejects.toMatchObject({
			status: 409
		});
		expect(inserts).toHaveLength(0);
	});

	it('removes the draft row when the pages insert fails, without leaking the cause', async () => {
		failInsertOn = 'pages';
		vi.spyOn(console, 'error').mockImplementation(() => {});
		await expect(POST(event('POST', { description: 'a page' }))).rejects.toMatchObject({
			status: 500,
			body: { message: expect.not.stringMatching(/10\.0\.0\.5/) }
		});
		const draft = inserts.find((i) => i.table === 'draft_pages')!.row;
		expect(deletes).toEqual([{ table: 'draft_pages', col: 'id', id: draft.id }]);
	});
});

describe('PATCH /api/pages', () => {
	it('rejects an unauthenticated caller', async () => {
		await expect(PATCH(event('PATCH', { id: DRAFT_ID, failed: true }, {}))).rejects.toMatchObject({
			status: 401
		});
		expect(createClient).not.toHaveBeenCalled();
	});

	it('marks a draft failed without storing content', async () => {
		const res = await PATCH(event('PATCH', { id: DRAFT_ID, failed: true }));
		expect(await res.json()).toEqual({ ok: true });
		expect(updates).toHaveLength(1);
		expect(updates[0]).toMatchObject({ table: 'draft_pages', col: 'id', id: DRAFT_ID });
		expect(updates[0].patch.state).toBe('failed');
		expect(typeof updates[0].patch.updated_at).toBe('string');
		expect(updates[0].patch).not.toHaveProperty('content');
	});

	it('stores content and marks the draft ready', async () => {
		const content = { sections: [] };
		await PATCH(
			event('PATCH', { id: DRAFT_ID, content, valid: false, issues: ['too long'], model: 'm' })
		);
		expect(updates[0].patch).toMatchObject({
			state: 'ready',
			content,
			valid: false,
			issues: ['too long'],
			model: 'm'
		});
	});

	it('does not pass unknown fields through to the update', async () => {
		await PATCH(event('PATCH', { id: DRAFT_ID, content: {}, review_id: 'other', path: 'x' }));
		expect(updates[0].patch).not.toHaveProperty('review_id');
		expect(updates[0].patch).not.toHaveProperty('path');
	});

	it.each([
		['non-uuid id', { id: 'nope', failed: true }],
		['failed: false', { id: DRAFT_ID, failed: false }],
		['array content', { id: DRAFT_ID, content: [] }],
		['non-boolean valid', { id: DRAFT_ID, content: {}, valid: 'yes' }],
		['non-string issues', { id: DRAFT_ID, content: {}, issues: [1] }],
		['failed with content', { id: DRAFT_ID, failed: true, content: {} }],
		['neither content nor failed', { id: DRAFT_ID }]
	])('rejects %s with 400', async (_name, body) => {
		await expect(PATCH(event('PATCH', body))).rejects.toMatchObject({ status: 400 });
		expect(updates).toHaveLength(0);
	});

	it('answers 404 for an unknown draft id', async () => {
		updateRows = [];
		await expect(PATCH(event('PATCH', { id: DRAFT_ID, failed: true }))).rejects.toMatchObject({
			status: 404
		});
	});
});
