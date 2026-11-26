// src/lib/stores/pageData.svelte.ts
import { allPages } from '$lib/data';
import { deriveFieldKey } from '$lib/corpus/fieldKey.js';
import { routableId } from '$lib/corpus/pageId';
import { resolveField } from '$lib/corpus/fieldResolver';
import type { DraftPage } from './draftPages';
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

/**
 * A field the reviewer is typing into directly, from the Fields panel.
 *
 * The mockup already shows `value` -- every keystroke goes through the field's
 * setter so the preview is live -- but nothing is persisted until Save.
 * `original` is what the field said before typing started: what Cancel puts
 * back, and how a save that changes nothing is recognised and skipped.
 */
export type UnsavedChange = {
	pageId: string;
	fieldId: string;
	original: string;
	value: string;
};

/** Field ids are page-relative, so an unsaved change is named by both. */
export function changeKey(pageId: string, fieldId: string): string {
	return `${pageId}\u0000${fieldId}`;
}

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
const PREVIEW_WIDTH_KEY = 'hhvc:previewWidth';
const KARL_OUTLINE_KEY = 'hhvc:karlOutline';

/**
 * The widths the mockup can be previewed at, in CSS pixels.
 *
 * `null` is "fit the pane", the behaviour that existed before. The other
 * three are chosen to land one clear step inside each of sf.gov's reflow
 * bands (desktop above 900, tablet 560-900, phone below 560) rather than on
 * a boundary, so the label a preset carries stays true if a threshold moves
 * slightly.
 */
export const PREVIEW_WIDTHS = {
	fit: null,
	desktop: 1024,
	tablet: 768,
	phone: 390
} as const;

export type PreviewWidth = keyof typeof PREVIEW_WIDTHS;

/**
 * The sf.gov layout band a given frame width falls in. Shown beside the
 * measured width so the reviewer can see WHICH rendering is on screen, which
 * is the thing that was missing: the number alone does not say that 716px is
 * the tablet layout.
 */
export function previewBand(width: number): 'Desktop' | 'Tablet' | 'Phone' {
	if (width > 900) return 'Desktop';
	if (width > 560) return 'Tablet';
	return 'Phone';
}

/** The width "Fit" lays the page out at whenever the pane is narrower. */
export const FIT_LAYOUT_WIDTH = PREVIEW_WIDTHS.desktop;
/** Below this scale the desktop layout is too small to read. */
const FIT_MIN_SCALE = 0.5;

/**
 * The frame "Fit" lays out for a pane `paneWidth` px wide: the width the page
 * is laid out at, and how far it is zoomed to fit. `null` means no fixed frame
 * -- the frame takes the pane's width.
 *
 * The frame is a size container, so letting it shrink to the pane reflows
 * sf.gov into its tablet layout. On a 1440px display with both rails open the
 * pane is ~683px, and reviewers were approving the tablet rendering without
 * knowing it. Instead, Fit keeps the layout at 1024px and zooms it down.
 *
 * Below `FIT_MIN_SCALE` that zoom is unreadable, so the phone layout is shown
 * instead. A pane narrower than a real phone (278px on a 375px window) lays
 * out at `PREVIEW_WIDTHS.phone` and zooms down too: reflowing at 278px showed a
 * page no phone renders, and clipped the sf.gov header's language picker.
 * Between 390px and half-desktop the pane is itself a phone width, so it
 * reflows. Unmeasured (0) and desktop-wide panes need no frame.
 */
export function fitFrame(paneWidth: number): { width: number; scale: number } | null {
	if (paneWidth <= 0 || paneWidth >= FIT_LAYOUT_WIDTH) return null;
	const desktop = paneWidth / FIT_LAYOUT_WIDTH;
	if (desktop >= FIT_MIN_SCALE) return { width: FIT_LAYOUT_WIDTH, scale: desktop };
	const phone = PREVIEW_WIDTHS.phone;
	return paneWidth < phone ? { width: phone, scale: paneWidth / phone } : null;
}
const COPIED_KEY = 'hhvc:walkthroughCopied';

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

/**
 * The one mapping from a corpus-shaped page object to a store page.
 *
 * Shared by the constructor and `mergeDraftPages`. A second, parallel mapping
 * is the defect `withFieldKey` warns about: field keys must be computed once,
 * from the pristine data, by one rule, or saved edits orphan.
 */
export function toStorePage(page: object): Page {
	const p = page as { sections?: Record<string, unknown>[] };
	return {
		...(page as Page),
		// `routableId` rather than the expression inlined here before: an
		// internal markdown link resolves a `pagesByKey` key to the route its
		// page renders at, and two copies of this rule would drift into a link
		// that 404s with nothing to report it.
		id: routableId(page),
		sections: (p.sections ?? []).map(withFieldKey)
	};
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
	 * Unsaved manual edits, keyed by `changeKey(pageId, fieldId)`. See `UnsavedChange`.
	 *
	 * Keyed by page as well as field because field ids are page-relative
	 * (`title` names a field on every page), and an unsaved change outlives navigation.
	 */
	unsavedChanges = $state<Record<string, UnsavedChange>>({});

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
		this.pages = allPages.map(toStorePage);
	}

	/**
	 * Merges ready AI drafts into the page list.
	 *
	 * A draft's store id is its `pages.path` (`draft:<uuid>`), not the routable
	 * id `toStorePage` derives from the page's slug (or title if it has none), so it matches the queue row.
	 * Re-merging replaces in place. Drafts still drafting or failed have no
	 * content to show and are skipped.
	 */
	mergeDraftPages(drafts: DraftPage[]): void {
		for (const draft of drafts) {
			if (draft.state !== 'ready' || !draft.content) continue;
			// One malformed row (a non-array `sections`, a null entry) must not cost
			// the rest of the merge, nor reject `loadReview`. Skipped and named.
			try {
				const page = { ...toStorePage(draft.content), id: draft.path };
				const at = this.pages.findIndex((p) => p.id === draft.path);
				if (at === -1) this.pages.push(page);
				else this.pages[at] = page;
			} catch (err) {
				console.error(`Skipped malformed draft ${draft.path}:`, err);
			}
		}
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

	/** Whether any field of one item is selected, e.g. `sections.k.cards.2.`
	 *  for a card's title, text and url. Link URLs show only while true. */
	hasSelectionUnder(prefix: string): boolean {
		return this.selectedFieldIds.some((id) => id.startsWith(prefix));
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
			this.dropNoOpChanges([fieldId]);
			return;
		}

		if (this.isSelected(fieldId)) {
			const next = this.selectedFieldIds.filter((id) => id !== fieldId);
			this.selectedFieldIds = next;
			this.suggestions = this.pruneSuggestions(next);
			this.dropNoOpChanges(next);
		} else {
			this.selectedFieldIds = [...this.selectedFieldIds, fieldId];
		}
	}

	clearSelection() {
		this.selectedFieldIds = [];
		this.suggestions = this.pruneSuggestions([]);
		this.dropNoOpChanges([]);
		this.rewriteInstruction = '';
	}

	selectSection(sectionKey: string) {
		this.selectedFieldIds = [];
		this.suggestions = this.pruneSuggestions([]);
		this.dropNoOpChanges([]);

		// Only reset the rethink when the selection actually MOVES. Re-clicking
		// the section already selected used to drop it back to `idle`, which
		// re-enabled the submit button while the first request was still in
		// flight -- and `RethinkPanel`'s abort effect depends on the section
		// key, which had not changed, so nothing aborted. Two metered calls,
		// last response wins, despite a one-in-flight guarantee.
		//
		// The same guard protects a `ready` proposal: a stray second click on
		// the section a reviewer is already working through no longer discards
		// the ops and every accept/reject decision made against them.
		if (sectionKey !== this.selectedSectionKey) {
			this.rethink = { state: 'idle' };
		}

		this.selectedSectionKey = sectionKey;
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
		this.dropNoOpChanges([]);
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

	/**
	 * Accepting a suggestion makes it an unsaved change: its wording goes onto
	 * the mockup now, and Save records it like anything typed. Refused over
	 * typing the reviewer has not saved, which it would otherwise replace unseen.
	 */
	acceptSuggestion(fieldId: string) {
		const s = this.suggestions[fieldId];
		if (!s || s.status !== 'pending') return;
		if (this.hasUnsavedChange(s.pageId, fieldId)) return;
		if (!this.setChange(s.pageId, fieldId, s.suggested)) return;
		this.suggestions = { ...this.suggestions, [fieldId]: { ...s, status: 'accepted' } };
	}

	/** An accepted suggestion goes back to waiting when its change ends unsaved. */
	private unaccept(pageId: string, fieldId: string) {
		const s = this.suggestions[fieldId];
		if (s?.pageId !== pageId || s.status !== 'accepted') return;
		this.suggestions = { ...this.suggestions, [fieldId]: { ...s, status: 'pending' } };
	}

	/** Unsaved changes on every page: what the toolbar pill counts. */
	unsavedChangeCount(): number {
		return Object.values(this.unsavedChanges).filter((c) => c.value !== c.original).length;
	}

	/** Drops one suggestion, once its edit is known to have persisted. */
	forgetSuggestion(fieldId: string) {
		const rest = { ...this.suggestions };
		delete rest[fieldId];
		this.suggestions = rest;
	}

	// ---- unsaved changes ---------------------------------------------------
	// The mockup shows an unsaved change as it is typed. Typing is work, so an unsaved change is
	// never thrown away by a selection change or navigation: only Cancel puts
	// the original copy back, and only Save or Cancel ends an unsaved change. An unsaved change that
	// changes nothing is dropped as soon as the selection moves off it.

	/** The field as it is on the page now, resolved fresh -- never captured. */
	private resolveOn(pageId: string, fieldId: string) {
		return resolveField(
			this.pages.find((p) => p.id === pageId),
			fieldId
		);
	}

	getChange(pageId: string | undefined, fieldId: string): UnsavedChange | undefined {
		return pageId === undefined ? undefined : this.unsavedChanges[changeKey(pageId, fieldId)];
	}

	/**
	 * Sets the unsaved change for one field and shows it on the mockup. The first call
	 * records what the field said, which is what `cancelChange` restores.
	 * Returns false when the field no longer resolves, and writes nothing.
	 */
	setChange(pageId: string, fieldId: string, value: string): boolean {
		const field = this.resolveOn(pageId, fieldId);
		if (!field) return false;
		const original = this.getChange(pageId, fieldId)?.original ?? field.value;
		field.set(value);
		this.unsavedChanges = {
			...this.unsavedChanges,
			[changeKey(pageId, fieldId)]: { pageId, fieldId, original, value }
		};
		return true;
	}

	/** Whether the field has typing that has not been saved. */
	hasUnsavedChange(pageId: string | undefined, fieldId: string): boolean {
		const change = this.getChange(pageId, fieldId);
		return Boolean(change && change.value !== change.original);
	}

	/** unsaved changes on `pageId`, in the order they were started. */
	unsavedChangesOn(pageId: string | undefined): UnsavedChange[] {
		return Object.values(this.unsavedChanges).filter(
			(d) => d.pageId === pageId && d.value !== d.original
		);
	}

	/** unsaved changes parked on OTHER pages -- said, not hidden. */
	unsavedChangesElsewhere(pageId: string | undefined): number {
		return Object.values(this.unsavedChanges).filter(
			(d) => d.pageId !== pageId && d.value !== d.original
		).length;
	}

	/**
	 * Puts the original copy back on the mockup and drops the unsaved change. A
	 * suggestion it came from goes back to waiting, not dismissed: Cancel undoes
	 * the last step, and dismissing is its own act.
	 */
	cancelChange(pageId: string, fieldId: string) {
		const change = this.getChange(pageId, fieldId);
		if (!change) return;
		this.resolveOn(pageId, fieldId)?.set(change.original);
		this.forgetChange(pageId, fieldId);
		this.unaccept(pageId, fieldId);
	}

	/** Drops an unsaved change whose value is now the saved one. Leaves the mockup as is. */
	forgetChange(pageId: string, fieldId: string) {
		const key = changeKey(pageId, fieldId);
		if (!(key in this.unsavedChanges)) return;
		const rest = { ...this.unsavedChanges };
		delete rest[key];
		this.unsavedChanges = rest;
	}

	/**
	 * Drops unsaved changes that change nothing, except those for `keep` on the page on
	 * screen. Their value is already the original, so the mockup needs nothing.
	 */
	private dropNoOpChanges(keep: string[]) {
		const next: Record<string, UnsavedChange> = {};
		for (const [key, d] of Object.entries(this.unsavedChanges)) {
			const kept = d.pageId === this.activePageId && keep.includes(d.fieldId);
			if (d.value !== d.original || kept) next[key] = d;
			else this.unaccept(d.pageId, d.fieldId);
		}
		this.unsavedChanges = next;
	}

	/**
	 * Keeps the suggestions for `keep`, plus every `accepted` one anywhere.
	 *
	 * An accepted suggestion is an unsaved change, not a piece of selection
	 * chrome: it is what the toolbar pill counts and what `Save N changes`
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

	// ---- narrow-viewport sheets ------------------------------------------

	/**
	 * Which rail is open as an overlay sheet, below the 1024px breakpoint.
	 *
	 * Below that width both rails are taken out of the grid -- a 280px queue
	 * and a 380px panel cannot be afforded, and leaving their tracks in place
	 * squeezed the mockup frame to 2px at a 390px viewport. That part was
	 * right. What was wrong was the claim that came with it, that the rails'
	 * own toggles meant the controls were not lost: those toggles are
	 * rendered INSIDE the rails, so `display: none` took them too.
	 *
	 * MEASURED at 390px before this: 19 controls disappeared -- every queue
	 * row, all the panel tabs, the whole decision control, Export, Site map,
	 * and both rail toggles -- with nothing on screen to bring any of them
	 * back. The tool was silently read-only on a tablet or a phone.
	 *
	 * Session state, not persisted: an overlay that was still open on the
	 * next visit would be in the way, not helpful.
	 */
	mobileSheet = $state<'none' | 'queue' | 'panel'>('none');

	openSheet(which: 'queue' | 'panel') {
		this.mobileSheet = which;
	}

	closeSheet() {
		this.mobileSheet = 'none';
	}

	// ---- preview width ---------------------------------------------------

	/**
	 * Which width the mockup is rendered at.
	 *
	 * `fit` is the old and still default behaviour: the frame takes the pane.
	 * The problem with having only that is that the pane is never the width
	 * the page is being approved for. MEASURED, with both rails open: a
	 * 1280px viewport gives a 556px frame, 1440px gives 716px, 1600px gives
	 * 876px. sf.gov's own reflow thresholds -- the ones the body and footer
	 * already query -- are 900px and 560px, so a reviewer on a 1440 display
	 * was approving the TABLET rendering and one on a 1280 the PHONE
	 * rendering, with nothing on screen saying so. The desktop rendering
	 * first appears above a ~1650px viewport.
	 *
	 * The three presets sit one clear step inside each band rather than on
	 * its edge, so a small change to either does not silently reclassify a
	 * preset.
	 */
	previewWidth = $state<PreviewWidth>('fit');

	setPreviewWidth(width: PreviewWidth) {
		this.previewWidth = width;
		try {
			localStorage.setItem(PREVIEW_WIDTH_KEY, width);
		} catch {
			// As with the rails: a chrome preference, not worth failing over.
		}
	}

	/** Same reason as `loadRailState`: called from the layout, never on import. */
	loadPreviewWidth() {
		try {
			const raw = localStorage.getItem(PREVIEW_WIDTH_KEY);
			if (raw && raw in PREVIEW_WIDTHS) this.previewWidth = raw as PreviewWidth;
		} catch {
			// As above.
		}
	}

	/**
	 * Whether the Karl outline is drawn over the mockup.
	 *
	 * Off on a first visit, so the default view needs no Karl knowledge. Once a
	 * reviewer turns it on it stays on across pages and visits (decision 17):
	 * someone checking Karl fit works down the queue, and re-enabling it on
	 * every page is friction. Persisted like `previewWidth`, for the same reason.
	 */
	karlOutline = $state(false);

	setKarlOutline(on: boolean) {
		this.karlOutline = on;
		try {
			localStorage.setItem(KARL_OUTLINE_KEY, on ? '1' : '0');
		} catch {
			// As with the rails: a chrome preference, not worth failing over.
		}
	}

	/** Same reason as `loadRailState`: called from the layout, never on import. */
	loadKarlOutline() {
		try {
			this.karlOutline = localStorage.getItem(KARL_OUTLINE_KEY) === '1';
		} catch {
			// As above.
		}
	}

	// ---- walkthrough and site map ----------------------------------------

	/**
	 * Which of the centre column's three views is showing.
	 *
	 * Ephemeral on purpose. Entering the walkthrough auto-collapses both rails,
	 * and leaving restores them -- that is a view mode, not a preference, so it
	 * should not survive a reload and strand someone in a drawer.
	 */
	mode = $state<'review' | 'walkthrough' | 'sitemap' | 'blueprint'>('review');

	/** Index into the current page's step list. Per page, per session. */
	stepIndex = $state(0);

	/**
	 * Copied step ids, keyed by page id.
	 *
	 * Per user and per device, in `localStorage`, which is a DECISION rather than
	 * a default: `pages` is shared across reviewers over realtime, so storing
	 * this there would make one person's progress everyone's, and two people
	 * rebuilding the same page in Karl is plausible. Keeping it local also means
	 * no migration, and on this repo a migration reaches production the moment
	 * the PR merges.
	 */
	copiedSteps = $state<Record<string, string[]>>({});

	/** Rail state captured on entering the walkthrough, restored on exit. */
	#railsBeforeWalkthrough: { queue: boolean; panel: boolean } | null = null;

	/** Same reason as `loadRailState`: called from the layout, never on import. */
	loadCopiedSteps() {
		try {
			const raw = localStorage.getItem(COPIED_KEY);
			if (!raw) return;
			const parsed = JSON.parse(raw);
			if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
				const out: Record<string, string[]> = {};
				for (const [pageId, ids] of Object.entries(parsed)) {
					if (Array.isArray(ids)) out[pageId] = ids.filter((id) => typeof id === 'string');
				}
				this.copiedSteps = out;
			}
		} catch {
			// Private mode, disabled storage, or a hand-edited value. Progress is a
			// convenience; losing it must not cost the page load.
		}
	}

	isCopied(pageId: string, stepId: string): boolean {
		return (this.copiedSteps[pageId] ?? []).includes(stepId);
	}

	markCopied(pageId: string, stepId: string) {
		if (this.isCopied(pageId, stepId)) return;
		this.copiedSteps = {
			...this.copiedSteps,
			[pageId]: [...(this.copiedSteps[pageId] ?? []), stepId]
		};
		try {
			localStorage.setItem(COPIED_KEY, JSON.stringify(this.copiedSteps));
		} catch {
			// As above.
		}
	}

	enterWalkthrough() {
		this.#railsBeforeWalkthrough = { ...this.railCollapsed };
		this.railCollapsed = { queue: true, panel: true };
		this.stepIndex = 0;
		this.mode = 'walkthrough';
	}

	exitWalkthrough() {
		if (this.#railsBeforeWalkthrough) {
			this.railCollapsed = this.#railsBeforeWalkthrough;
			this.#railsBeforeWalkthrough = null;
		}
		this.mode = 'review';
	}

	showSitemap() {
		this.mode = 'sitemap';
	}

	/** The page redrawn as its Karl form. A view, like the site map: not persisted. */
	showBlueprint() {
		this.mode = 'blueprint';
	}

	showReview() {
		this.mode = 'review';
	}
}

export const pageStore = new PageStore();
