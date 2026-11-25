import type { Page } from '@playwright/test';
import { expect } from './fixtures';

/**
 * Put the app in its SIGNED-IN state for e2e, with no Supabase anywhere.
 *
 * ## Why this exists
 *
 * The axe gate could only ever see signed-out pages, and that is not a
 * cosmetic gap: the queue, the decision controls, the checks list and the
 * fields panel only render with review data, so none of them were ever in a
 * scanned page. It cost us a real defect -- `--color-sfds-slate-l2` was
 * 4.08:1 on the selected queue row and 4.33:1 on the canvas, both below WCAG
 * AA, while `no WCAG 2.1 AA violations` reported green for months, because the
 * rows carrying that text never rendered in the run.
 *
 * ## Why stubbing rather than a real session
 *
 * Two independent reasons, either of which rules out signing in for real:
 *
 * 1. e2e runs `npm run build && npm run preview`, a PRODUCTION build, and
 *    `ensureDevSession()` is behind `import.meta.env.DEV` -- dead code that
 *    Rollup drops. The seeded demo user cannot be reached from the artifact
 *    under test, by design, and `verify.sh` greps the bundle to keep it that
 *    way.
 * 2. CI has no Supabase at all. `pr.yml` sets
 *    `SVELTE_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co`, and
 *    CLAUDE.md is explicit that a job needing a real project would need
 *    secrets that no job has today.
 *
 * So the boundary we stub is the HTTP one: PostgREST responses and the session
 * in browser storage. That is the same seam the app already treats as external,
 * it behaves identically in CI and locally, and it needs no credentials. What
 * it deliberately does NOT test is RLS -- the policies live in the database and
 * `supabase/migrations` is where they are asserted. This fixture is about what
 * the signed-in UI RENDERS, which is what axe needs.
 */

/** Far enough out that supabase-js never tries to refresh it mid-run. */
const EXPIRES_AT = 4102444800; // 2100-01-01

const USER = {
	id: '00000000-0000-4000-8000-00000000beef',
	aud: 'authenticated',
	role: 'authenticated',
	email: 'e2e@hhvc.test',
	app_metadata: { provider: 'email' },
	user_metadata: {},
	created_at: '2026-01-01T00:00:00Z'
};

const SESSION = JSON.stringify({
	access_token: 'e2e-stub-access-token',
	token_type: 'bearer',
	expires_in: 2_000_000_000,
	expires_at: EXPIRES_AT,
	refresh_token: 'e2e-stub-refresh-token',
	user: USER
});

const REVIEW_ID = '00000000-0000-4000-8000-000000000001';

/**
 * Queue rows, keyed to REAL routable ids from `$lib/data`.
 *
 * `ReviewQueue` resolves each row's title and type through the corpus by
 * `path`, so an invented path renders a row with no title -- which would scan
 * clean while showing nothing. The four statuses are all present on purpose:
 * each renders its own group heading, dot and tint, and the tinted selected
 * row is the surface the contrast defect was hiding on.
 */
const PAGE_ROWS = [
	{ path: 'report-garbage-filth-vegetation', status: 'needs-review' },
	{ path: 'step-by-step-correct-a-violation-and-close-your-case', status: 'approved' },
	{ path: 'property-owner-responsibilities-hhvc', status: 'revise' },
	{ path: 'find-complaints-and-inspection-records', status: 'blocked' },
	{ path: 'find-healthy-housing-inspector-by-neighborhood', status: 'needs-review' },
	{ path: 'step-by-step-report-a-pest-problem', status: 'approved' }
].map((row, i) => ({
	id: `00000000-0000-4000-8000-00000000010${i}`,
	review_id: REVIEW_ID,
	path: row.path,
	status: row.status,
	manager_notes: row.status === 'revise' ? 'Tighten the opening paragraph.' : null,
	// Only on the first row: the Checks tab renders `page_checks` entries, and
	// one row carrying them is enough to put that list in a scanned page.
	page_checks:
		i === 0
			? {
					readability: { status: 'pass', message: 'Grade 6.1, within guidance.' },
					altText: { status: 'fail', message: '2 images have no alt text.' }
				}
			: null
}));

/** One edit on the first page, so the queue's "N edited fields" line renders. */
const EDIT_ROWS = [
	{
		id: '00000000-0000-4000-8000-000000000201',
		page_id: PAGE_ROWS[0].id,
		field_id: 'title',
		new_content: 'Report garbage, mold, and overgrown vegetation',
		created_at: '2026-01-01T00:00:00Z'
	}
];

/**
 * AI-drafted pages. A draft is two rows: a `pages` row in the queue
 * (`path: draft:<id>`) and a `draft_pages` row carrying the state, which is what
 * the banner and the landing page's "All pages" list read.
 *
 * One of each state the banner renders differently, because a banner that only
 * ever scanned its `ready` form would leave the failure and stale copy -- the
 * parts with their own colours -- outside the axe gate, which is the blind spot
 * this file exists to close.
 *
 * `STALE` is stale by construction rather than by waiting: its `updated_at` is
 * older than `DRAFT_STALE_MS` (90s), the same pure function of the clock the app
 * evaluates. `DRAFTING` is fresh, stamped at module load.
 */
const DRAFT_IDS = {
	ready: '9f1c2f0e-0000-4000-8000-000000000001',
	drafting: '9f1c2f0e-0000-4000-8000-000000000002',
	stale: '9f1c2f0e-0000-4000-8000-000000000003',
	failed: '9f1c2f0e-0000-4000-8000-000000000004'
} as const;

const FOREIGN_DRAFT_ID = '9f1c2f0e-0000-4000-8000-0000000000ff';

const DRAFT_BASE = {
	review_id: REVIEW_ID,
	created_by: USER.id,
	valid: null,
	issues: null,
	model: null,
	content: null,
	created_at: '2026-01-01T00:00:00Z'
};

/**
 * A function, not a constant: the fresh `drafting` row is stamped when it is
 * SERVED, so it is `DRAFT_STALE_MS` from stale at the moment each test loads it
 * rather than at module load, which a slow worker could outrun.
 */
const draftRowsNow = () => [
	{
		...DRAFT_BASE,
		id: DRAFT_IDS.ready,
		path: `draft:${DRAFT_IDS.ready}`,
		title: 'Report a noisy construction site',
		description: 'How to report construction noise outside permitted hours.',
		state: 'ready',
		valid: true,
		model: 'gemini-stub',
		updated_at: '2026-01-01T00:00:00Z',
		content: {
			slug: 'sf.gov/draft-report-a-noisy-construction-site',
			type: 'Transaction',
			title: 'Report a noisy construction site',
			summary: 'Tell us about construction noise outside permitted hours.',
			audience: ['A resident bothered by construction noise'],
			sections: [
				{
					heading: 'Before you report',
					karl: 'Body copy.',
					kind: 'body',
					paragraphs: ['Check the permitted hours for your neighborhood first.'],
					bullets: ['The address of the site', 'The time the noise started']
				}
			]
		}
	},
	{
		...DRAFT_BASE,
		id: DRAFT_IDS.drafting,
		path: `draft:${DRAFT_IDS.drafting}`,
		title: 'Report a leaking roof',
		description: 'A page about reporting a leaking roof to the landlord.',
		state: 'drafting',
		updated_at: new Date().toISOString()
	},
	{
		...DRAFT_BASE,
		id: DRAFT_IDS.stale,
		path: `draft:${DRAFT_IDS.stale}`,
		title: 'Report a broken heater',
		description: 'A page about reporting a broken heater.',
		state: 'drafting',
		updated_at: '2026-01-01T00:00:00Z'
	},
	{
		...DRAFT_BASE,
		id: DRAFT_IDS.failed,
		path: `draft:${DRAFT_IDS.failed}`,
		title: 'Report a pest problem',
		description: 'A page about reporting pests.',
		state: 'failed',
		updated_at: '2026-01-01T00:00:00Z'
	},
	{
		// Another review's draft: PostgREST would never return it for the
		// `review_id=eq.` filter the store sends, so the stub must not either.
		// If the store dropped that filter it would surface in the list.
		...DRAFT_BASE,
		id: FOREIGN_DRAFT_ID,
		review_id: '00000000-0000-4000-8000-0000000000ff',
		path: `draft:${FOREIGN_DRAFT_ID}`,
		title: 'A draft from another review',
		description: 'Belongs to a different review.',
		state: 'failed',
		updated_at: '2026-01-01T00:00:00Z'
	}
];

const DRAFT_PAGE_ROWS = draftRowsNow()
	.filter((draft) => draft.id !== FOREIGN_DRAFT_ID)
	.map((draft, i) => ({
		id: `00000000-0000-4000-8000-00000000030${i}`,
		review_id: REVIEW_ID,
		path: draft.path,
		status: 'needs-review',
		manager_notes: null,
		page_checks: null
	}));

export type SignedInOptions = {
	/** Add the four draft states to the queue and `draft_pages`. */
	drafts?: boolean;
	/** Put the draft rows BEFORE the corpus rows, so the first undecided page is a draft. */
	draftsFirst?: boolean;
	/**
	 * Put the decided rows ahead of the first undecided one, so "the first row"
	 * and "the first undecided row" are different rows. Without it the first
	 * fixture row is both, and a `reviewProgress` that ignored status would pass.
	 */
	decidedFirst?: boolean;
};

const json = (body: unknown) => ({
	status: 200,
	contentType: 'application/json',
	headers: { 'content-range': '0-0/*' },
	body: JSON.stringify(body)
});

/**
 * Sign the page in and serve its review data from fixtures.
 *
 * Call BEFORE `page.goto`. Returns once the queue has actually rendered rows:
 * a stub that quietly fails would leave every signed-in assertion scanning the
 * signed-out page, which is the exact failure this helper exists to end, so it
 * is turned into a loud one here.
 */
export async function signedIn(page: Page, options: SignedInOptions = {}): Promise<void> {
	const withDrafts = options.drafts === true || options.draftsFirst === true;
	const decided = options.decidedFirst ? PAGE_ROWS.filter((r) => r.status !== 'needs-review') : [];
	const body = PAGE_ROWS.filter((r) => !decided.includes(r));
	const pageRows = options.draftsFirst
		? [...decided, ...DRAFT_PAGE_ROWS, ...body]
		: [...decided, ...body, ...(withDrafts ? DRAFT_PAGE_ROWS : [])];

	// The storage key is `sb-<project-ref>-auth-token`, and the ref comes from
	// whatever SVELTE_PUBLIC_SUPABASE_URL the bundle was built with -- a
	// placeholder in CI, possibly a real project on a developer's machine. So
	// match the key by PATTERN rather than hardcoding a ref that would silently
	// miss locally and leave the run scanning signed-out pages.
	await page.addInitScript(
		([pattern, session]) => {
			const read = Storage.prototype.getItem;
			Storage.prototype.getItem = function (key: string) {
				return new RegExp(pattern).test(key) ? session : read.call(this, key);
			};
		},
		['^sb-.*-auth-token$', SESSION] as const
	);

	// ONE handler that dispatches on the path, rather than a route per table.
	// Playwright matches routes in REVERSE registration order, so a catch-all
	// registered after the specific ones shadows them -- which it did, and the
	// app read an empty `reviews` set and logged "No review found" exactly as it
	// does signed out. Dispatching inside a single handler cannot be ordered
	// wrongly.
	await page.route('**/rest/v1/**', (route) => {
		const path = new URL(route.request().url()).pathname;
		if (path.endsWith('/reviews')) return route.fulfill(json([{ id: REVIEW_ID }]));
		if (path.endsWith('/pages')) return route.fulfill(json(pageRows));
		if (path.endsWith('/draft_pages')) {
			// Model the two PostgREST behaviours the store's correctness depends on:
			// the `review_id=eq.` filter and `select=` column projection. A stub that
			// served every column of every row would pass a store that dropped
			// `updated_at` from its select (staleness silently never fires) or the
			// review filter.
			const params = new URL(route.request().url()).searchParams;
			const review = params.get('review_id');
			const select = params.get('select') ?? '*';
			const columns = select === '*' ? undefined : select.split(',').map((c) => c.trim());
			const rows = withDrafts
				? draftRowsNow()
						.filter((row) => (review?.startsWith('eq.') ? row.review_id === review.slice(3) : true))
						.map((row) =>
							columns
								? Object.fromEntries(Object.entries(row).filter(([key]) => columns.includes(key)))
								: row
						)
				: [];
			return route.fulfill(json(rows));
		}
		if (path.endsWith('/latest_edits')) return route.fulfill(json(EDIT_ROWS));
		// Anything else PostgREST would serve: an empty set, never a network error.
		return route.fulfill(json([]));
	});
	// Auth endpoints are never needed with a non-expiring stored session, but a
	// stray call must not reach the network either.
	await page.route('**/auth/v1/**', (route) => route.fulfill(json({ user: USER })));

	// Realtime only starts once `loadReview` gets past its first query -- which,
	// signed out, it never did. Stubbed rather than left to fail: an unreachable
	// socket logs a console error, and `tests/fixtures.ts` fails the test on one.
	await page.routeWebSocket('**/realtime/v1/**', () => {
		// Accept and stay silent. The app subscribes and receives nothing, which
		// is a legitimate quiet channel.
	});
}

/** The signed-in review route, loaded and proven populated. */
export async function gotoSignedIn(
	page: Page,
	path: string,
	options: SignedInOptions = {}
): Promise<void> {
	await signedIn(page, options);
	await page.goto(path);
	await page.waitForLoadState('networkidle');

	// The guard. Without rows the panels render their empty states and an axe
	// pass over them would be the blind spot wearing a new name.
	const withDrafts = options.drafts === true || options.draftsFirst === true;
	const total = PAGE_ROWS.length + (withDrafts ? DRAFT_PAGE_ROWS.length : 0);
	if (path === '/') {
		// The landing page has no queue. Its proof of a populated, signed-in
		// render is the progress line, whose total is the number of review rows.
		await expect(page.getByText(new RegExp(`^\\d+ of ${total} decided$`))).toBeVisible();
		return;
	}
	await expect(page.locator('nav[aria-label="Review queue"] a')).toHaveCount(total);
	await expect(page.getByText('Viewing signed out.')).toHaveCount(0);
}

export { DRAFT_IDS, DRAFT_PAGE_ROWS, PAGE_ROWS, REVIEW_ID };
