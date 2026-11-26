/**
 * SHA-256 of a field's text, hex-encoded, for the browser.
 *
 * `hashText` in `./hash` is the hash `page_versions.field_hashes` and
 * `corpus.lock` are built with, but it imports `node:crypto`, which a browser
 * bundle cannot load. This is the same digest through WebCrypto. The two must
 * agree byte for byte -- an edit's base hash is compared against hashes the
 * Node side produced -- and `hashBrowser.test.ts` pins them together over every
 * field in the corpus.
 */
export async function hashTextBrowser(text: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
	return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
