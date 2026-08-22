import { createClient } from '@supabase/supabase-js';
import { allPages } from '../src/lib/data/index.js';

// Load from process.env (Bun automatically loads .env and .env.local)
const supabaseUrl = process.env.SVELTE_PUBLIC_SUPABASE_URL;
// Use the service-role key so updates are not blocked by RLS
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
	console.error('Missing SVELTE_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
	auth: { persistSession: false }
});

function computeReadingLevel(text: string) {
	// Flesch-Kincaid Grade Level approximation
	const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
	const words = text.split(/\s+/).filter((w) => w.trim().length > 0);
	const syllables = words.reduce((count, word) => count + countSyllables(word), 0);

	if (sentences.length === 0 || words.length === 0) {
		return { status: 'check', message: 'Could not compute reading level (no content).' };
	}

	const avgSentenceLength = words.length / sentences.length;
	const avgSyllablesPerWord = syllables / words.length;
	// Flesch-Kincaid Grade Level formula
	const grade = 0.39 * avgSentenceLength + 11.8 * avgSyllablesPerWord - 15.59;

	if (grade <= 8) {
		return {
			status: 'pass',
			message: `Reading level is approximately Grade ${grade.toFixed(1)} (target: ≤8).`
		};
	}
	return {
		status: 'check',
		message: `Reading level is approximately Grade ${grade.toFixed(1)}, above the Grade 6–8 target.`
	};
}

function countSyllables(word: string): number {
	word = word.toLowerCase().replace(/[^a-z]/g, '');
	if (word.length === 0) return 0;
	// Count vowel groups as syllables
	const matches = word.match(/[aeiouy]+/g);
	let count = matches ? matches.length : 1;
	// Subtract silent trailing 'e'
	if (word.endsWith('e') && word.length > 2) count -= 1;
	return Math.max(1, count);
}

// URL-like pattern: detects http/https links and sf.gov relative paths
const URL_PATTERN = /https?:\/\/[^\s"'<>)]+|(?:^|\s)\/[a-z0-9/-]+/gi;
// Placeholder patterns that indicate an unresolved link
const PLACEHOLDER_PATTERN = /\[.*?\]|TODO|FIXME|placeholder|#$/i;

/**
 * Keys that are review metadata or machine values rather than copy a resident
 * reads. `karl` describes how a block maps onto Wagtail fields, `editorNote`
 * and friends record the mockup's provenance, and urls are graded by
 * `verifyLinks` instead.
 */
const METADATA_KEYS = new Set([
	'karl',
	'editorNote',
	'editorStatus',
	'unverified',
	'unverifiedReason'
]);

const NON_COPY_KEYS = new Set([
	...METADATA_KEYS,
	'slug',
	'type',
	'kind',
	'url',
	'buttonUrl',
	'target',
	'id'
]);

/**
 * Every user-visible string on a page, wherever it lives. The corpus nests copy
 * under `steps[]`, `cards[]`, `callout`, `button.label` and tagged text objects,
 * so walking generically is what keeps this honest as the shape changes -- an
 * explicit field list silently graded a fragment and passed the rest.
 */
function collectCopy(node: unknown, into: string[] = []): string[] {
	if (typeof node === 'string') {
		into.push(node);
	} else if (Array.isArray(node)) {
		for (const item of node) collectCopy(item, into);
	} else if (node && typeof node === 'object') {
		for (const [key, value] of Object.entries(node)) {
			if (NON_COPY_KEYS.has(key)) continue;
			collectCopy(value, into);
		}
	}
	return into;
}

type FoundLink = { url: string; target?: string };

/**
 * Every link destination on a page: the structured `url`/`buttonUrl` fields the
 * corpus actually uses (cards, buttons, steps), plus anything URL-shaped written
 * inline in copy.
 */
function collectLinks(node: unknown, into: FoundLink[] = []): FoundLink[] {
	if (typeof node === 'string') {
		for (const match of node.match(URL_PATTERN) ?? []) into.push({ url: match.trim() });
	} else if (Array.isArray(node)) {
		for (const item of node) collectLinks(item, into);
	} else if (node && typeof node === 'object') {
		const record = node as Record<string, unknown>;
		// Skip review metadata. editorNote quoting the same URL a button points at
		// otherwise double-counts the link and repeats its warning.
		const target = typeof record.target === 'string' ? record.target : undefined;
		for (const key of ['url', 'buttonUrl']) {
			const value = record[key];
			if (typeof value === 'string' && value.trim() !== '')
				into.push({ url: value.trim(), target });
		}
		for (const [key, value] of Object.entries(record)) {
			if (key === 'url' || key === 'buttonUrl' || key === 'target') continue;
			if (METADATA_KEYS.has(key)) continue;
			collectLinks(value, into);
		}
	}
	return into;
}

function verifyLinks(page: unknown): { status: string; message: string } {
	const links = collectLinks(page);
	if (links.length === 0) {
		return { status: 'pass', message: 'No links on this page.' };
	}

	const issues: string[] = [];
	for (const { url } of links) {
		if (PLACEHOLDER_PATTERN.test(url)) {
			issues.push(`Unresolved placeholder link: "${url.slice(0, 80)}"`);
		} else if (/^https?:\/\//.test(url) && !/^https?:\/\/(www\.)?sf\.gov/.test(url)) {
			issues.push(`External link (verify target): "${url.slice(0, 80)}"`);
		}
	}

	if (issues.length === 0) {
		return { status: 'pass', message: `${links.length} link(s) checked, all resolve to sf.gov.` };
	}
	return { status: 'check', message: `${links.length} link(s) checked. ` + issues.join('; ') };
}

async function syncChecks() {
	// Scope every write to one review. This runs with the service-role key, which
	// bypasses RLS, and `path` is not unique across reviews -- filtering on path
	// alone rewrote page_checks in completed and historical reviews too.
	// Pass a review id as the first argument, or omit it to target the newest.
	const requestedReviewId = process.argv[2];
	let reviewId = requestedReviewId;

	if (!reviewId) {
		const { data: reviews, error } = await supabase
			.from('reviews')
			.select('id')
			.order('created_at', { ascending: false })
			.limit(1);

		if (error || !reviews || reviews.length === 0) {
			console.error('Could not resolve a review to sync:', error?.message ?? 'no reviews found');
			process.exit(1);
		}
		reviewId = reviews[0].id;
		console.log(`No review id given; targeting the most recent review ${reviewId}.`);
	}

	console.log(`Starting sync for ${allPages.length} pages in review ${reviewId}...`);
	let failed = 0;

	for (const page of allPages) {
		const id = page.slug
			? page.slug.replace('sf.gov/', '').replace(/\//g, '-')
			: page.title.replace(/\s+/g, '-').toLowerCase();

		// Grade the whole page, not just title/summary/paragraphs: most of the
		// instructional copy lives under steps[], cards[] and callouts.
		const fullText = collectCopy(page).join(' ');

		const checks = {
			readingLevel: computeReadingLevel(fullText),
			linkTargets: verifyLinks(page)
		};

		const { error, count } = await supabase
			.from('pages')
			.update({ page_checks: checks })
			.eq('review_id', reviewId)
			.eq('path', id)
			.select('id', { count: 'exact', head: true });

		if (error) {
			console.error(`Failed to update checks for ${id}:`, error.message);
			failed++;
		} else if (!count || count === 0) {
			console.warn(`No row matched for path "${id}" — checks not saved.`);
			failed++;
		} else {
			console.log(`Synced checks for ${id}`);
		}
	}

	// Exit non-zero on any failure. Logging alone let CI and operators read a run
	// that wrote nothing as a successful sync.
	if (failed > 0) {
		console.error(`Sync finished with ${failed} of ${allPages.length} page(s) not written.`);
		process.exit(1);
	}
	console.log('Sync complete.');
}

syncChecks();
