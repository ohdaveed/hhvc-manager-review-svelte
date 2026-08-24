// src/lib/stores/pageData.svelte.ts
import { allPages } from '$lib/data';
import { deriveFieldKey } from '$lib/corpus/fieldKey.js';
import type { Op } from '$lib/rethink/diff';
import type { RethinkResult } from '$lib/rethink/request';

type Page = {
	id: string;
	title: string;
	/** The corpus modules carry no shared declaration; see `fieldResolver.ts`. */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
	/**
	 * The routable id of the page this rewrite was produced for.
	 *
	 * Field ids are page-relative -- `title` and `summary` name a live field on
	 * every one of the 29 pages -- so an id alone cannot say which page a
	 * suggestion belongs to. Accepted suggestions deliberately survive
	 * navigation, being unsaved work, and without this they resolved against
	 * whatever page was on screen when `Save` was pressed: an edit approved for
	 * page A was written to page B and persisted under B's row.
	 */
	pageId: string;
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

export type RethinkState =
	| { state: 'idle' }
	| { state: 'loading'; pageId: string; sectionKey: string }
	| { state: 'error'; message: string }
	| {
			state: 'ready';
			pageId: string;
			sectionKey: string;
			result: RethinkResult;
			/** Explicit reviewer decisions. Absent means the op's default. */
			decisions: Record<string, boolean>;
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

	/**
	 * The section a Rethink is about.
	 *
	 * A selection KIND distinct from `selectedFieldIds`, not another entry in
	 * it: the badge numbering on the mockup belongs to the field selection and
	 * cannot mean two things at once. Choosing one clears the other.
	 */
	selectedSectionKey = $state<string | undefined>(undefined);

	rethink = $state<RethinkState>({ state: 'idle' });

	/** Pending/decided rewrites, keyed by field id. */
	suggestions = $state<Record<string, Suggestion>>({});

	/**
	 * The routable id of the page on screen, as `enterPage` last set it.
	 *
	 * The review layout stays mounted across slug navigation, so nothing was
	 * observing the page change and the selection simply carried over: clicking
	 * a title on one page left the badge sitting on the next page's title.
	 */
	activePageId = $state<string | undefined>(undefined);

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
		// Two selection kinds cannot both be live; see `selectedSectionKey`.
		this.selectedSectionKey = undefined;
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

	selectSection(sectionKey: string) {
		this.selectedFieldIds = [];
		this.suggestions = this.pruneSuggestions([]);
		this.selectedSectionKey = sectionKey;
		this.rethink = { state: 'idle' };
	}

	clearSectionSelection() {
		this.selectedSectionKey = undefined;
		this.rethink = { state: 'idle' };
	}

	/**
	 * A drop starts REJECTED and everything else starts accepted. Deletion is
	 * opted into: a proposal that removes a paragraph should need a deliberate
	 * click, not a deliberate un-click.
	 */
	isOpAccepted(op: Op): boolean {
		const explicit = this.rethink.state === 'ready' ? this.rethink.decisions[op.id] : undefined;
		if (typeof explicit === 'boolean') return explicit;
		return op.type !== 'drop';
	}

	setOpAccepted(opId: string, accepted: boolean) {
		if (this.rethink.state !== 'ready') return;
		this.rethink = {
			...this.rethink,
			decisions: { ...this.rethink.decisions, [opId]: accepted }
		};
	}

	/** Accepted ops that would actually change something. `keep` never counts. */
	acceptedOpCount(): number {
		if (this.rethink.state !== 'ready') return 0;
		return this.rethink.result.ops.filter((op) => op.type !== 'keep' && this.isOpAccepted(op))
			.length;
	}

	// ---- page identity ---------------------------------------------------

	/**
	 * Called when the route's page changes. Idempotent, so a re-render that
	 * names the same page does not throw a live selection away.
	 *
	 * Everything scoped to a selection goes with it -- the ids, the instruction,
	 * the assistant's reading of copy that is no longer on screen. Accepted
	 * suggestions stay, by the same rule `pruneSuggestions` already follows:
	 * they are unsaved work, not selection chrome, and they now carry the page
	 * they belong to so they can only be saved back to it.
	 */
	enterPage(pageId: string | undefined) {
		if (pageId === this.activePageId) return;
		this.activePageId = pageId;
		this.selectedFieldIds = [];
		this.rewriteInstruction = '';
		this.agentRec = { state: 'idle', text: '' };
		this.suggestions = this.pruneSuggestions([]);
		this.selectedSectionKey = undefined;
		this.rethink = { state: 'idle' };
	}

	/** The suggestions belonging to `pageId`, which are the only ones it may show. */
	suggestionsFor(pageId: string | undefined): [string, Suggestion][] {
		return Object.entries(this.suggestions).filter(([, s]) => s.pageId === pageId);
	}

	/** Accepted-but-unsaved edits for `pageId`. What `Save N edits` commits. */
	acceptedFor(pageId: string | undefined): number {
		return this.suggestionsFor(pageId).filter(([, s]) => s.status === 'accepted').length;
	}

	/**
	 * Accepted-but-unsaved edits parked on OTHER pages.
	 *
	 * Surfaced rather than summed into the count above: they are real work, and
	 * a reviewer who navigates away with edits approved should be told they are
	 * still there rather than watching the number silently drop to zero.
	 */
	acceptedElsewhere(pageId: string | undefined): number {
		return Object.values(this.suggestions).filter(
			(s) => s.status === 'accepted' && s.pageId !== pageId
		).length;
	}

	/** Drops one suggestion, once its edit is known to have persisted. */
	forgetSuggestion(fieldId: string) {
		const rest = { ...this.suggestions };
		delete rest[fieldId];
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
