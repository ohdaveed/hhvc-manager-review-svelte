import { createClient } from '@supabase/supabase-js';
import { allPages } from '../src/lib/data/index.js';

// Load from process.env (Bun automatically loads .env and .env.local)
const supabaseUrl = process.env.SVELTE_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SVELTE_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
	console.error('Missing Supabase credentials in .env.local');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Word count, reported as word count. This previously claimed to measure reading
 * level and returned "within Grade 6-8 target" for anything under 200 words
 * without looking at sentence length, syllables, or any other readability input,
 * so reviewers were shown a grade claim nothing had computed. Renamed rather
 * than guessed at; a real readability score is still open work.
 */
function measureContentLength(text: string) {
	const words = text.trim().split(/\s+/).filter(Boolean).length;
	if (words > 200) {
		return { status: 'check', message: `${words} words — long enough to be worth trimming.` };
	}
	return { status: 'pass', message: `${words} words.` };
}

/** The link-bearing shape section data actually uses. */
type PageButton = { url?: string; target?: string; label?: string };
type PageSection = { paragraphs?: string[]; button?: PageButton; buttons?: PageButton[] };

/**
 * Inspects the link-bearing fields the page data actually has (section buttons
 * carry `url` and `target`) instead of returning a constant pass.
 */
function verifyLinks(sections: PageSection[]) {
	const buttons = sections
		.flatMap((s) => [s?.button, ...(s?.buttons ?? [])])
		.filter((b): b is PageButton => !!b && typeof b === 'object');

	if (buttons.length === 0) {
		return { status: 'pass', message: 'No links on this page.' };
	}

	const broken = buttons.filter((b) => {
		const url = typeof b.url === 'string' ? b.url.trim() : '';
		return url === '' || url === '#' || /^(TBD|TODO|placeholder)/i.test(url);
	});

	if (broken.length > 0) {
		return {
			status: 'check',
			message: `${broken.length} of ${buttons.length} links have no real target.`
		};
	}

	const external = buttons.filter((b) => /^https?:\/\//i.test(b.url ?? ''));
	const missingTarget = external.filter((b) => !b.target);
	if (missingTarget.length > 0) {
		return {
			status: 'check',
			message: `${missingTarget.length} external link(s) declare no target.`
		};
	}

	return { status: 'pass', message: `${buttons.length} link(s) resolve.` };
}

async function syncChecks() {
	console.log(`Starting sync for ${allPages.length} pages...`);
	let failed = 0;

	for (const page of allPages) {
		const id = page.slug
			? page.slug.replace('sf.gov/', '').replace(/\//g, '-')
			: page.title.replace(/\s+/g, '-').toLowerCase();

		let fullText = page.title + ' ' + (page.summary || '');
		if (page.sections) {
			page.sections.forEach((s: PageSection) => {
				fullText += ' ' + (s.paragraphs?.join(' ') || '');
			});
		}

		const checks = {
			contentLength: measureContentLength(fullText),
			linkTargets: verifyLinks(page.sections || [])
		};

		// `.select()` so the matched rows come back. Without it a write that matched
		// nothing returns no error, and this printed "Synced" for every page. The
		// pages RLS policy is `FOR ALL TO authenticated`, and this script runs with
		// the anon key and no session, so under the committed schema every update
		// matches zero rows — silently, until now.
		const { data, error } = await supabase
			.from('pages')
			.update({ page_checks: checks })
			.eq('path', id)
			.select('id');

		if (error) {
			console.error(`Failed to update checks for ${id}:`, error.message);
			failed++;
		} else if (!data || data.length === 0) {
			console.error(
				`No row matched path "${id}" — nothing written. ` +
					'Check the row exists and that these credentials pass RLS.'
			);
			failed++;
		} else {
			console.log(`Synced checks for ${id}`);
		}
	}
	if (failed > 0) {
		console.error(`Sync finished with ${failed} of ${allPages.length} pages not written.`);
		process.exit(1);
	}
	console.log('Sync complete.');
}

syncChecks();
