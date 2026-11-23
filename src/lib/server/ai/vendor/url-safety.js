// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- vendored untyped JS; see README.md here
// @ts-nocheck
// Vendored from HHVC_manager_review_current_tool_package/js/core/utils.js (SAFE_URL_SCHEMES, urlProbe, safeUrl only) @ 4179136.
// Converted CommonJS -> ESM mechanically; keep it diffable against the source.
/**
 * Schemes that are safe to put in an `href`. Anything else — `javascript:`,
 * `data:`, `vbscript:` — executes on click, and `escapeHtml` does NOT stop it:
 * `javascript:alert(1)` contains none of the five characters it escapes, so it
 * passes through an escaped attribute completely intact.
 *
 * This matters most for AI assist. `js/mockup/page-render.js` renders generated drafts
 * through the same functions as real pages, and the page schema types `url` /
 * `buttonUrl` as bare strings, so a draft could otherwise put a `javascript:`
 * URL behind a clickable link in the preview. `formatMarkdown` already applies
 * the same rule to inline `[label](target)` links via its `^https?://` test;
 * this extends it to the structured URL fields, which had no such guard.
 */
const SAFE_URL_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:'];

/**
 * Normalize a URL the way a browser does before resolving it, so a check sees
 * what actually gets fetched rather than what was typed.
 *
 *   - Control characters are stripped: `java\tscript:alert(1)` runs, and
 *     `https:\t//host` loads from `host`.
 *   - Backslashes are equivalent to forward slashes in the authority position.
 *     `new URL('\\\\evil.example', 'https://sf.gov')` resolves to
 *     https://evil.example — so `\\\\host`, `\\/host` and `/\\host` are all
 *     protocol-relative URLs wearing a disguise, and matching only on `//`
 *     lets every one of them through.
 *
 * Shared by `safeUrl()` (the scheme guard, for navigation targets) and
 * `findExternalAssetUrls()` in build_scripts/data-checks.js (the host guard,
 * for image sources). Those two answer different questions but must agree on
 * what the browser will actually do with the string, so the normalization is
 * defined once here rather than restated in each.
 *
 * Returns a probe for TESTING only — never render it. It is lowercased and has
 * characters removed, so it is not the value the caller should emit.
 * @param {string} raw an already-trimmed URL
 * @returns {string} the lowercased, control-stripped, slash-normalized probe
 */
function urlProbe(raw) {
	return (
		String(raw ?? '')
			// Stripping control characters is the point of this function, not an
			// accident: browsers resolve `java\tscript:` as `javascript:`, so the
			// scheme guard has to test the string a browser would see.
			// oxlint-disable-next-line eslint/no-control-regex
			// eslint-disable-next-line no-control-regex -- deliberate, see above
			.replace(/[\u0000-\u0020]/g, '')
			.replace(/\\/g, '/')
			.toLowerCase()
	);
}

/**
 * Return a URL that is safe to interpolate into an `href`, or the inert `#`
 * sentinel when it is not. Accepts absolute http(s)/mailto/tel URLs and
 * any scheme-less relative value (root-relative `/forms/…`, document-relative
 * `help/foo`, bare `#top` or `?q=1`); rejects protocol-relative URLs in every
 * spelling a browser accepts — `//host`, `\\\\host`, `\\/host`, `/\\host` — which
 * look relative but leave the origin. Whitespace is trimmed from the returned
 * value, so callers comparing output against input must trim first.
 *
 * The caller must still run the result through `escapeHtml` — this guards the
 * scheme, not the attribute delimiters.
 * @param {string} value
 * @returns {string} the original URL, or '#' if its scheme is not safe
 */
function safeUrl(value) {
	const raw = String(value ?? '').trim();
	if (!raw) return '#';

	// See urlProbe() for why the raw string cannot be tested directly. The probe
	// is for the tests below only — every `return` here hands back `raw`.
	const probe = urlProbe(raw);

	if (probe.startsWith('#')) return raw;
	// Protocol-relative: "//evil.example" inherits the page scheme and leaves the
	// origin, so it is not the same thing as a root-relative path.
	if (probe.startsWith('//')) return '#';
	if (probe.startsWith('/')) return raw;

	// Deliberately hand-parsed rather than using `new URL()`: this file is
	// evaluated in the plain VM context that tests/helpers/load-scripts.js builds,
	// which has no URL constructor, and a guard that silently fails closed in one
	// of its two execution contexts is worse than no guard at all.
	const scheme = probe.match(/^([a-z][a-z0-9+.-]*):/);
	if (!scheme) return raw; // no scheme at all — a relative path
	return SAFE_URL_SCHEMES.includes(scheme[1] + ':') ? raw : '#';
}

export { SAFE_URL_SCHEMES, urlProbe, safeUrl };
