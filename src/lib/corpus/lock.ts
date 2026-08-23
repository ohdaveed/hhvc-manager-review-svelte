import { createHash } from 'node:crypto';
import { extractFields, type CorpusPage } from './fields.js';
import { hashFields, hashFieldMap } from './hash.js';

export type CorpusLock = {
	version: 1;
	corpusHash: string;
	pages: Record<string, { contentHash: string; fieldHashes: Record<string, string> }>;
};

const HEX64 = /^[0-9a-f]{64}$/;

/**
 * True when every value of a parsed `fieldHashes` map is a 64-character hex
 * digest. `hashFieldMap` length-prefixes field *ids* but not their hashed
 * values, so its injectivity depends on every value already being exactly 64
 * hex characters -- guaranteed when the map is built fresh via `hashFields`,
 * but not for one parsed back out of a hand-edited (or badly merged)
 * `corpus.lock`. A map with a shorter or differently-shaped value can be
 * crafted to collide with a structurally different map under `hashFieldMap`.
 * Used by `scripts/check-corpus-lock.ts`'s shape guard to reject that before
 * `hashLockPages` ever runs over untrusted values.
 */
export function isValidFieldHashMap(fieldHashes: unknown): fieldHashes is Record<string, string> {
	return (
		fieldHashes !== null &&
		typeof fieldHashes === 'object' &&
		!Array.isArray(fieldHashes) &&
		Object.values(fieldHashes).every((value) => typeof value === 'string' && HEX64.test(value))
	);
}

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
 * Each page entry contributes three unambiguous pieces to the running digest:
 * a length-prefixed path (`{path.length}:{path}`), the page's 64-character
 * content hash, and a 64-character digest of that page's *entire*
 * `fieldHashes` map (via `hashFieldMap`, shared with `hashFields` in
 * `hash.ts`). `path` is a variable-length, unconstrained string -- if it were
 * joined to the next field with an ordinary separator character, a crafted
 * path could absorb a neighbouring entry's `path + separator + hash` and
 * collapse two structurally different corpora onto the same digest. Folding
 * `fieldHashes` in as a fixed-length sub-digest, rather than appending its
 * variable number of id/hash pairs directly into this stream, matters for the
 * same reason: a variable-count list has no boundary marker, so two pages'
 * worth of entries could be repartitioned into a different-but-colliding
 * split. Because both the content hash and the fields sub-digest are always
 * exactly 64 hex chars, the length prefix on `path` alone makes the whole
 * byte stream unambiguous -- no separator, and no count, needed anywhere.
 *
 * `fieldHashes` is covered here, not left out: without it, only `path` and
 * `contentHash` were protected, and a lockfile could have its `fieldHashes`
 * map hollowed out (e.g. to `{}`) while `contentHash` and `corpusHash` stayed
 * untouched and `corpus:check` still passed. `contentHash` alone did not
 * imply anything about the separately-stored `fieldHashes` map, because the
 * checker never recomputed one from the other -- it only ever compared the
 * file's own claimed values against each other and against a freshly built
 * corpus. Folding `fieldHashes` into this digest makes tampering it, without
 * also correctly recomputing the enclosing `corpusHash` from the real corpus,
 * detectable the same way tampering `path` or `contentHash` already was.
 */
export function hashLockPages(pages: CorpusLock['pages']): string {
	const digest = createHash('sha256');
	for (const path of Object.keys(pages).sort()) {
		const entry = pages[path];
		digest.update(`${path.length}:${path}`, 'utf8');
		digest.update(entry.contentHash, 'utf8');
		digest.update(hashFieldMap(entry.fieldHashes), 'utf8');
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
