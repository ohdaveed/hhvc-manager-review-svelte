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

function verifyLinks(sections: { paragraphs?: string[]; bullets?: string[] }[]): {
	status: string;
	message: string;
} {
	const issues: string[] = [];

	for (const section of sections) {
		const texts: string[] = [...(section.paragraphs ?? []), ...(section.bullets ?? [])];

		for (const text of texts) {
			const urls = text.match(URL_PATTERN) ?? [];
			for (const url of urls) {
				const trimmed = url.trim();
				if (PLACEHOLDER_PATTERN.test(trimmed)) {
					issues.push(`Unresolved placeholder link: "${trimmed}"`);
				} else if (/^https?:\/\//.test(trimmed) && !trimmed.startsWith('https://sf.gov')) {
					// External links are noted for review
					issues.push(`External link (verify target): "${trimmed.slice(0, 80)}"`);
				}
			}
		}
	}

	if (issues.length === 0) {
		return { status: 'pass', message: 'No unresolved or external link issues detected.' };
	}
	return { status: 'check', message: issues.join('; ') };
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

	for (const page of allPages) {
		const id = page.slug
			? page.slug.replace('sf.gov/', '').replace(/\//g, '-')
			: page.title.replace(/\s+/g, '-').toLowerCase();

		let fullText = page.title + ' ' + (page.summary || '');
		if (page.sections) {
			page.sections.forEach((s: { paragraphs?: string[] }) => {
				fullText += ' ' + (s.paragraphs?.join(' ') || '');
			});
		}

		const checks = {
			readingLevel: computeReadingLevel(fullText),
			linkTargets: verifyLinks(page.sections || [])
		};

		const { error, count } = await supabase
			.from('pages')
			.update({ page_checks: checks })
			.eq('review_id', reviewId)
			.eq('path', id)
			.select('id', { count: 'exact', head: true });

		if (error) {
			console.error(`Failed to update checks for ${id}:`, error);
		} else if (!count || count === 0) {
			console.warn(`No row matched for path "${id}" — checks not saved.`);
		} else {
			console.log(`Synced checks for ${id}`);
		}
	}
	console.log('Sync complete.');
}

syncChecks();
