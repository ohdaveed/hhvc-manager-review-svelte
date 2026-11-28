/**
 * Single-key shortcuts for the review workspace.
 *
 * | Key | Does                                     | Where it is handled |
 * | --- | ---------------------------------------- | ------------------- |
 * | A   | Approved                                 | `DecisionFooter`    |
 * | R   | Needs revision                           | `DecisionFooter`    |
 * | B   | Blocked                                  | `DecisionFooter`    |
 * | U   | Undecided                                | `DecisionFooter`    |
 * | ]   | Next undecided page                      | `DecisionFooter`    |
 * | \   | Open or close the page queue             | review layout       |
 *
 * A decision is the one thing this tool exists to record, so a key that makes
 * one is deliberately narrow:
 *
 * - It works only while the decision control is ON SCREEN (the panel handles
 *   it, and checks it is visible), so the reviewer always sees the control
 *   change and its "Saved" receipt. A key that recorded a decision from a tab
 *   where nothing showed it would be a way to approve a page by accident.
 * - It never fires while typing: not in a text field, a select or an editable
 *   region, and not with Ctrl, Alt or Cmd held, which belong to the browser.
 * - It can be turned off (`pageStore.shortcutsOn`). WCAG 2.1.4 requires that of
 *   any shortcut made of a single character, because speech input types
 *   characters: a dictated word would otherwise run as a string of commands.
 */
import type { ReviewStatus } from '$lib/review/statusLabels';

export const DECISION_KEYS: Readonly<Record<string, ReviewStatus>> = {
	a: 'approved',
	r: 'revise',
	b: 'blocked',
	u: 'needs-review'
};

export const NEXT_UNDECIDED_KEY = ']';
export const QUEUE_KEY = '\\';

const TYPING =
	'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"], [role="combobox"]';

/**
 * Whether a keydown is a bare key press meant for the workspace, not for
 * something the reviewer is typing into or a browser command.
 */
export function isPlainKey(event: KeyboardEvent): boolean {
	if (event.defaultPrevented || event.repeat) return false;
	if (event.ctrlKey || event.metaKey || event.altKey) return false;
	const target = event.target;
	return !(target instanceof Element && target.closest(TYPING));
}
