// Node 25+ defines a global `localStorage` that, without `--localstorage-file`,
// evaluates to `undefined` -- and in the client project it hides jsdom's. Every
// test touching storage then fails before asserting anything (the `rails` and
// `present` blocks in pageData.test.ts, on Node 26). Where jsdom's storage is
// already reachable this does nothing. See
// docs/plans/2026-11-27-jsdom-storage-node26-design.md.
// Vitest's jsdom environment exposes the JSDOM instance as a global.
declare const jsdom: { window: Pick<Window, 'localStorage' | 'sessionStorage'> };

for (const name of ['localStorage', 'sessionStorage'] as const) {
	let usable = false;
	try {
		usable = typeof globalThis[name]?.clear === 'function';
	} catch {
		// A getter that throws is as unusable as one that returns undefined.
	}
	if (!usable) {
		Object.defineProperty(globalThis, name, {
			value: jsdom.window[name],
			configurable: true,
			writable: true
		});
	}
}
