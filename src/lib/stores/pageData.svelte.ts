// src/lib/stores/pageData.svelte.ts
import { allPages } from '$lib/data';
import { deriveFieldKey } from '$lib/corpus/fieldKey.js';

type Page = {
	id: string;
	title: string;
	[key: string]: any;
};

type ActiveField = {
	/** Human-facing label shown in the ActionBar, e.g. `Section [2] Paragraph`.
	 *  Display only -- it omits the paragraph index, so several fields in one
	 *  section share it. Never use it to identify a field. */
	name: string;
	/** Stable path used as `edits.field_id`, e.g.
	 *  `sections.who-we-are.paragraphs.1`. Mirrors the element's
	 *  `data-rewrite-field`, and its `title`/`summary` values are the keys
	 *  HelpPanel folds on. */
	fieldId: string;
	content: string;
	update: (newContent: string) => void;
} | null;

/**
 * Gives a section a stable key for `edits.field_id`.
 *
 * Derived from the heading rather than the array index, so inserting or
 * reordering a section no longer renumbers the ones after it and orphans every
 * edit saved against their old positions. All 136 sections across the corpus
 * have a heading and none repeats within a page, so this is unique in practice;
 * the index fallback covers a section added later without one.
 *
 * Computed ONCE here, from the pristine module data, and never recomputed --
 * the heading is itself an edit target, so deriving the key live would mean a
 * reviewer editing a heading silently orphaned that section's other edits.
 *
 * Known limit: paragraph and bullet positions within a section are still
 * indexes, so inserting a paragraph mid-section shifts the ones after it. That
 * is a much smaller blast radius than the whole page and needs no change to the
 * 30 data modules.
 */
function withFieldKey(section: Record<string, unknown>, index: number) {
	return { ...section, fieldKey: deriveFieldKey(section, index) };
}

class PageStore {
	pages = $state<Page[]>([]);
	activeField = $state<ActiveField>(null);

	constructor() {
		// Map the legacy objects to include an 'id' (from their 'slug' or a generated one)
		this.pages = allPages.map((p) => {
			// Remove 'sf.gov/' and replace any remaining slashes with dashes so it plays nice with SvelteKit's [slug] router
			const cleanId = p.slug
				? p.slug.replace('sf.gov/', '').replace(/\//g, '-')
				: p.title.replace(/\s+/g, '-').toLowerCase();
			return {
				...p,
				id: cleanId,
				sections: (p.sections ?? []).map(withFieldKey)
			};
		});
	}

	addPage(page: Page) {
		this.pages.push(page);
	}
}

export const pageStore = new PageStore();
