import { browser } from '$app/environment';
import { supabase } from '$lib/supabase';

/**
 * Whether anyone is signed in.
 *
 * The mockups themselves are static (`$lib/data`), so a signed-out visitor can
 * still read every page — sharing one with a stakeholder who should not need an
 * account is a use we keep. What they must not get is an editable mockup whose
 * edits go nowhere: an edit is only writable as its own author, since the
 * `edits` INSERT policy checks `(select auth.uid()) = user_id`. So
 * `saveInlineEdit` rolls its optimistic entry back and returns when there is no
 * user, and before this store existed the edit silently vanished on reload with
 * no signal at all.
 */
class SessionStore {
	/** Undefined until the first check resolves, so the UI can avoid flashing a
	 *  signed-out banner at a reviewer who is in fact signed in. */
	signedIn = $state<boolean | undefined>(undefined);

	constructor() {
		// getSession touches browser storage; on the server there is no session
		// to find and no listener worth attaching.
		if (!browser) return;

		supabase.auth.getSession().then(({ data }) => {
			this.signedIn = Boolean(data.session);
		});

		supabase.auth.onAuthStateChange((_event, session) => {
			this.signedIn = Boolean(session);
		});
	}

	/** True only once we know there is no session — never during the initial
	 *  check, so the banner does not flash. */
	get knownSignedOut(): boolean {
		return this.signedIn === false;
	}
}

export const sessionStore = new SessionStore();
