/**
 * Asks before the tab closes or reloads while unsaved changes exist.
 *
 * Unsaved changes live only in memory -- typed wording and accepted
 * suggestions alike -- so a reload or a closed tab drops them with nothing
 * said. Navigating inside the review keeps them, so only leaving the app asks.
 * Browsers show their own wording; `returnValue` is set for the ones that
 * still require it rather than honouring `preventDefault` alone.
 */
export function warnBeforeLeaving(event: BeforeUnloadEvent, unsaved: number): void {
	if (unsaved <= 0) return;
	event.preventDefault();
	event.returnValue = '';
}
