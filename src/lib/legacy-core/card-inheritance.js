// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- untyped legacy port; waived so the staged-file hook can commit edits here (ratchet 3 -> 2)
// @ts-nocheck
/* Shared card-inheritance classifier: the single place that decides how a
   section's cards reach the published page — whether Karl renders the
   DESTINATION page's title and description, its title alone, or the card's own
   authored words.

   An ES module with no imports and no DOM dependency. Two callers, by import:

   - `karl-transcript.js`, which tells the editor rebuilding the page which
     card words to type and which Karl fills in from the destination page.
   - `$lib/karl/sitemap.ts`, whose Sitemap view says which card text will not
     appear on SF.gov.

   One classifier for both is the point: two copies of these regexes would let
   the transcript and the sitemap disagree about what inherits, invisibly until
   a reviewer approved copy that cannot ship.

   The mockup renderer does NOT consult it. In the vanilla app this was ported
   from, the renderer read it too and drew inherited cards as Karl would; no
   Svelte component does, so the mockup shows card text Karl will drop and only
   the Sitemap view says so. Whether the mockup should mark that text is a
   design question, not a missing import. */

/**
 * Karl blocks that render the destination's Title AND its Description. An
 * Agency Services/Resources subsection entry is only "add an SF.gov page or
 * External link", so both fields come from the page it points at.
 *
 * Checked third, so a section naming an authored block or a Related panel wins.
 */
const INHERITS = /services subsection|resources subsection|page.{0,3} chooser/i;

/**
 * Karl blocks that render the destination's Title and a link — and NOTHING
 * else. Two components live here, verified separately on 2026-08-08. Full
 * write-up in
 * `docs/source/hhvc-policy/2026-08-08-karl-card-inheritance-verification.md`.
 *
 * The **Related panel**: checked at DOM level against the live Transaction page
 * sf.gov/pay-your-annual-healthy-housing-fee-apartment-buildings, whose Related
 * entries each hold link text and no other text node.
 *
 * A **Resource Collection's Resource section**: checked across three live
 * sf.ResourceCollection pages. The decisive one is
 * sf.gov/vacancy-notice-local-agency-formation-commission, whose entry for
 * `bos-boards-commissions-and-task-forces-application-instruction` rendered
 * that page's Title and nothing else — while the destination demonstrably has
 * a Description. So the blank is Karl declining to render one, not a
 * destination with none to give. That control matters: two sibling pages
 * looked like evidence and were not, one holding only PDFs (whose in-entry
 * "Published <date>" is Document metadata) and one whose single internal link
 * could not be told apart from an inline body link.
 *
 * Resource section sat in INHERITS first, on the reasoning that it resembles a
 * Resources subsection and that keeping card text was the conservative
 * default. Conservative is not the same as correct: it left 19 cards of
 * unrenderable copy in the mockup and dressed them up as decisions a reviewer
 * would spend judgement on.
 *
 * This is a SEPARATE bucket from INHERITS rather than a member of it, because
 * the correct assertion is the opposite one: a Related card's text must be
 * EMPTY. Lumping the two together asked whether the card text equalled the
 * destination summary, which reported 49 correctly-blank cards as findings —
 * and would have had someone "fix" them by pasting in copy that cannot render.
 *
 * Note the editor help center contradicts itself here: the Transaction
 * content-type page claims the right-side bar shows "title and description".
 * The live page disproves it. Do not re-widen this from the docs alone.
 *
 * Checked BEFORE INHERITS: the Related karl notes also contain the phrase
 * 'a generic unrestricted "Page" chooser', which INHERITS would otherwise claim.
 */
const TITLE_ONLY = /related field|related panel|related_links|resource section/i;

/**
 * Karl blocks that hold authored card content. A table row or a rich-text
 * block writes its own words, so a difference from the destination page is
 * expected and correct. Checked first.
 */
const AUTHORED = /table block|title and text/i;

/**
 * A negation that ends within three words of the text after it. Karl notes
 * describe a block by denying it as often as by naming it ("Transaction has no
 * per-step page chooser", "there's no accompanying Title and text block"), and
 * a bare regex read both as naming the block. Bounded to three words with no
 * punctuation between, so a clause that denies one block and then names
 * another ("has no Contact us panel, so this maps to a Title and text block")
 * still matches the second.
 */
const NEGATED =
	/\b(?:no|not|never|without|rather than|instead of)\s+(?:[\w’'"-]+\s+){0,3}$|n[’']t\s+(?:[\w’'"-]+\s+){0,3}$/i;

/** True when `re` names a block somewhere in `karl` without denying it. */
function names(re, karl) {
	const all = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
	for (const m of karl.matchAll(all)) {
		if (!NEGATED.test(karl.slice(0, m.index))) return true;
	}
	return false;
}

/**
 * Decide how a section's cards reach the page.
 *
 * @param {{karl?: string}} section
 * @returns {'authored'|'title-only'|'inherits'|'unknown'}
 */
function classifySection(section) {
	const karl = section.karl || '';
	if (names(AUTHORED, karl)) return 'authored';
	if (names(TITLE_ONLY, karl)) return 'title-only';
	if (names(INHERITS, karl)) return 'inherits';
	return 'unknown';
}

export { classifySection, AUTHORED, INHERITS, TITLE_ONLY };
