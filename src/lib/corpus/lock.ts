import { createHash } from 'node:crypto';
import { extractFields, type CorpusPage } from './fields.js';
import { hashFields } from './hash.js';

export type CorpusLock = {
	version: 1;
	corpusHash: string;
	pages: Record<string, { contentHash: string; fieldHashes: Record<string, string> }>;
};

/** Mirrors the derivation in `pageData.svelte.ts` and `scripts/gen-seed.ts`. */
export function derivePagePath(page: { slug?: unknown; title?: unknown }): string {
	if (typeof page.slug === 'string') {
		return page.slug.replace('sf.gov/', '').replace(/\//g, '-');
	}
	return typeof page.title === 'string' ? page.title.replace(/\s+/g, '-').toLowerCase() : '';
}

/**
 * One hash over a path-keyed page manifest, in sorted-path order.
 *
 * This is the single definition of the corpus digest technique -- `buildLock`
 * calls it to produce a lock file, and `scripts/check-corpus-lock.ts` calls it
 * again over a *parsed* `corpus.lock` to confirm that file's `pages` map is
 * internally consistent with its own `corpusHash` before trusting either.
 *
 * The digest is constructed with a length-prefixed path (`{path.length}:{path}`)
 * followed by the page's 64-character content hash, with no separator between them.
 * `path` is a variable-length, unconstrained string -- if it were joined to the next
 * field with an ordinary separator character, a crafted path could absorb a
 * neighbouring entry's `path + separator + hash` and collapse two structurally
 * different corpora onto the same digest. The content hash needs no separator of its
 * own because it is always exactly 64 hex chars, so the length prefix on `path` alone
 * makes the byte stream unambiguous. This is the same technique `hashFields` in
 * `hash.ts` uses for field ids, for the same reason -- do not revert either one to a
 * separator-joined string.
 */
export function hashLockPages(pages: CorpusLock['pages']): string {
	const digest = createHash('sha256');
	for (const path of Object.keys(pages).sort()) {
		digest.update(`${path.length}:${path}`, 'utf8');
		digest.update(pages[path].contentHash, 'utf8');
	}
	return digest.digest('hex');
}

/** One hash over the whole corpus, plus a per-page manifest keyed by path. */
export function buildLock(pages: CorpusPage[]): CorpusLock {
	const entries = pages
		.map((page) => {
			const { pageHash, fieldHashes } = hashFields(extractFields(page));
			return { path: derivePagePath(page), contentHash: pageHash, fieldHashes };
		})
		.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

	const byPath: CorpusLock['pages'] = {};
	for (const entry of entries) {
		byPath[entry.path] = { contentHash: entry.contentHash, fieldHashes: entry.fieldHashes };
	}

	return { version: 1, corpusHash: hashLockPages(byPath), pages: byPath };
}
