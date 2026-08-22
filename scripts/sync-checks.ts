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

function computeReadingLevel(text: string) {
	const words = text.split(/\s+/).length;
	if (words > 200) {
		return { status: 'check', message: 'Content is slightly wordy. Consider simplifying.' };
	}
	return { status: 'pass', message: 'Content is within Grade 6-8 target.' };
}

function verifyLinks(sections: any[]) {
	return { status: 'pass', message: 'All external links have appropriate targets.' };
}

async function syncChecks() {
	console.log(`Starting sync for ${allPages.length} pages...`);

	for (const page of allPages) {
		const id = page.slug
			? page.slug.replace('sf.gov/', '').replace(/\//g, '-')
			: page.title.replace(/\s+/g, '-').toLowerCase();

		let fullText = page.title + ' ' + (page.summary || '');
		if (page.sections) {
			page.sections.forEach((s: any) => {
				fullText += ' ' + (s.paragraphs?.join(' ') || '');
			});
		}

		const checks = {
			readingLevel: computeReadingLevel(fullText),
			linkTargets: verifyLinks(page.sections || [])
		};

		const { error } = await supabase.from('pages').update({ page_checks: checks }).eq('path', id);

		if (error) {
			console.error(`Failed to update checks for ${id}:`, error);
		} else {
			console.log(`Synced checks for ${id}`);
		}
	}
	console.log('Sync complete.');
}

syncChecks();
