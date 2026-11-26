import { browser } from '$app/environment';
import type { Session } from '@supabase/supabase-js';
import { ensureDevSession, supabase } from '$lib/supabase';

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

	/** The signed-in user's address, for the workspace's "signed in as" line.
	 *  Null whenever `signedIn` is not true. Never logged. */
	email = $state<string | null>(null);

	/** The signed-in user's id, to tell the reviewer's own edits from others'.
	 *  Null whenever `signedIn` is not true. */
	userId = $state<string | null>(null);

	constructor() {
		// getSession touches browser storage; on the server there is no session
		// to find and no listener worth attaching.
		if (!browser) return;

		// In dev, sign in as the seeded demo user before the first check, so every
		// route starts signed in. A no-op in production builds.
		ensureDevSession()
			.then(() => supabase.auth.getSession())
			.then(({ data }) => this.#apply(data.session));

		supabase.auth.onAuthStateChange((_event, session) => this.#apply(session));
	}

	#apply(session: Session | null) {
		this.signedIn = Boolean(session);
		this.email = session?.user.email ?? null;
		this.userId = session?.user.id ?? null;
	}

	/** True only once we know there is no session — never during the initial
	 *  check, so the banner does not flash. */
	get knownSignedOut(): boolean {
		return this.signedIn === false;
	}
}

export const sessionStore = new SessionStore();
