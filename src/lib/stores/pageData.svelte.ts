// src/lib/stores/pageData.svelte.ts
import { allPages } from '$lib/data';
import { deriveFieldKey } from '$lib/corpus/fieldKey.js';

type Page = {
	id: string;
	title: string;
	[key: string]: any;
};

/**
 * One AI rewrite awaiting a decision, keyed by the field it belongs to.
 *
 * `original` is captured when the rewrite is requested, so the diff still shows
 * what the copy said even after the reviewer accepts it and the page changes
 * underneath.
 */
export type Suggestion = {
	/** Routable page identity; prevents a field id being reused on another page. */
	pageId?: string;
	original: string;
	suggested: string;
	status: 'pending' | 'accepted' | 'rejected' | 'error';
	/** Present only on `error`; shown on the card rather than in an alert. */
	message?: string;
};

export type AgentRec = {
	state: 'idle' | 'loading' | 'done' | 'error';
	text: string;
};

const RAIL_KEY = 'hhvc:railCollapsed';

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

	/**
	 * The selected edit targets, in the order they were picked.
	 *
	 * Replaces the old single `activeField`. The index of an id here plus one is
	 * the number on its badge on the mockup and on its suggestion card, which is
	 * what ties the two together for the reviewer — so this is ordered, not a Set.
	 *
	 * Ids only. Values and setters come from `$lib/corpus/fieldResolver` on
	 * demand, because a captured value goes stale the moment an edit lands and a
	 * captured setter can close over a detached object after a re-render.
	 */
	selectedFieldIds = $state<string[]>([]);

	/** Pending/decided rewrites, keyed by field id. */
	suggestions = $state<Record<string, Suggestion>>({});

	/** The free-text batch instruction, applied to every selected field. */
	rewriteInstruction = $state('');

	agentRec = $state<AgentRec>({ state: 'idle', text: '' });

	/** Per-user, per-device chrome. Not review data, so it never leaves the browser. */
	railCollapsed = $state<{ queue: boolean; panel: boolean }>({ queue: false, panel: false });

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

	// ---- selection -------------------------------------------------------
	// Single selection is `selectedFieldIds.length === 1`, deliberately, rather
	// than a second code path beside a multi-select one. Two paths here is how
	// the badge number and the suggestion card drift apart.

	isSelected(fieldId: string): boolean {
		return this.selectedFieldIds.includes(fieldId);
	}

	/** 1-based position, or 0 when not selected. This is the badge number. */
	badgeNumber(fieldId: string): number {
		return this.selectedFieldIds.indexOf(fieldId) + 1;
	}

	/**
	 * Plain click replaces the selection; shift-click adds, or removes if the
	 * field was already in it. A plain click never deselects -- clearing is
	 * `clearSelection`, which the panel header exposes, so that clicking again on
	 * the field a reviewer is already working on does not throw the tab away.
	 *
	 * Replacing drops the *undecided* suggestions with it: they are keyed by
	 * field id and a pending card for a field no longer on screen has no badge
	 * to point at.
	 */
	select(fieldId: string, additive = false) {
		if (!additive) {
			this.selectedFieldIds = [fieldId];
			this.suggestions = this.pruneSuggestions([fieldId]);
			return;
		}

		if (this.isSelected(fieldId)) {
			const next = this.selectedFieldIds.filter((id) => id !== fieldId);
			this.selectedFieldIds = next;
			this.suggestions = this.pruneSuggestions(next);
		} else {
			this.selectedFieldIds = [...this.selectedFieldIds, fieldId];
		}
	}

	clearSelection() {
		this.selectedFieldIds = [];
		this.suggestions = this.pruneSuggestions([]);
		this.rewriteInstruction = '';
	}

	/** Drops every suggestion this field's edit was saved from. */
	forgetSuggestion(fieldId: string) {
		const { [fieldId]: _gone, ...rest } = this.suggestions;
		this.suggestions = rest;
	}

	/**
	 * Keeps the suggestions for `keep`, plus every `accepted` one anywhere.
	 *
	 * An accepted suggestion is an unsaved edit, not a piece of selection
	 * chrome: it is what the toolbar pill counts and what `Save N edits`
	 * commits. Dropping it on the next click would retract work the reviewer
	 * had already approved, silently and with no undo. Pending, rejected and
	 * errored cards carry no such commitment, so they go.
	 */
	private pruneSuggestions(keep: string[]): Record<string, Suggestion> {
		const next: Record<string, Suggestion> = {};
		for (const [id, s] of Object.entries(this.suggestions)) {
			if (s.status === 'accepted' || keep.includes(id)) next[id] = s;
		}
		return next;
	}

	// ---- rail collapse ---------------------------------------------------

	/**
	 * Reads the persisted rail state. Called from the layout's `onMount` rather
	 * than the constructor: this module is imported during SSR, where
	 * `localStorage` does not exist, and a store that throws on import takes the
	 * whole route with it.
	 */
	loadRailState() {
		try {
			const raw = localStorage.getItem(RAIL_KEY);
			if (!raw) return;
			const parsed = JSON.parse(raw);
			this.railCollapsed = {
				queue: parsed?.queue === true,
				panel: parsed?.panel === true
			};
		} catch {
			// Private mode, disabled storage, or a value someone hand-edited.
			// Chrome preferences are not worth failing a page load over.
		}
	}

	toggleRail(which: 'queue' | 'panel') {
		this.railCollapsed = { ...this.railCollapsed, [which]: !this.railCollapsed[which] };
		try {
			localStorage.setItem(RAIL_KEY, JSON.stringify(this.railCollapsed));
		} catch {
			// As above: the toggle still works for this session.
		}
	}
}

export const pageStore = new PageStore();
