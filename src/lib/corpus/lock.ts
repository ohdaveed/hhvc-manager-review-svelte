import { createHash } from 'node:crypto';
import { extractCopy, extractFields, type CorpusPage } from './fields.js';
import { freezeFieldIds, freezeFieldHashes } from './freeze.js';
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

/**
 * One hash over the whole corpus, plus a per-page manifest keyed by path.
 *
 * `contentHash` and `fieldHashes` are deliberately derived from two different
 * extractions (decision 17): `contentHash` from `extractCopy` (all
 * reader-visible copy, so any copy change mints a new corpus version) and
 * `fieldHashes` from `extractFields` (only addressable edit targets, so it
 * can drive edit expiry without expiring on copy it does not cover). Both
 * reuse `hashFields`'s length-prefixed digest unchanged -- `CopyMap` and
 * `FieldMap` are the same `Record<string, string>` shape, so no new digest
 * construction is needed, only a different map fed into the existing one.
 *
 * `previous` is the last committed lock, used only as the id ledger: a field
 * whose copy is unchanged keeps the id it was frozen under, so inserting a
 * paragraph renumbers nothing and the edits saved against the paragraphs below
 * it stay attached. See `freeze.ts` for why content identity has to outrank
 * position. Omitting it treats every field as new, which is right for a first
 * import and for any caller with no trustworthy prior file.
 *
 * Passing a lock in does not let that file vouch for the corpus. `contentHash`
 * comes from `extractCopy(page)` and never consults the ledger, so a page whose
 * copy moved mints a new content hash whatever the ledger claims; the ledger
 * only influences which *ids* the fields are filed under. A tampered ledger
 * therefore shifts `corpusHash` and makes the check fail loudly, rather than
 * pass falsely.
 */
export function buildLock(pages: CorpusPage[], previous?: CorpusLock): CorpusLock {
	const entries = pages
		.map((page) => {
			const path = derivePagePath(page);
			const { pageHash: contentHash } = hashFields(extractCopy(page));
			const fields = extractFields(page);
			const frozen = freezeFieldIds(previous?.pages[path]?.fieldHashes ?? {}, fields);
			return { path, contentHash, fieldHashes: freezeFieldHashes(fields, frozen) };
		})
		.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

	const byPath: CorpusLock['pages'] = {};
	for (const entry of entries) {
		byPath[entry.path] = { contentHash: entry.contentHash, fieldHashes: entry.fieldHashes };
	}

	return { version: 1, corpusHash: hashLockPages(byPath), pages: byPath };
}

/**
 * Why a parsed `corpus.lock` cannot be used for the corpus in the tree.
 *
 * - `version` -- not a v1 file. Checked before shape, because a later format
 *   is free to change what `pages` looks like.
 * - `malformed` -- `pages` is missing, or an entry's hashes are not 64-hex.
 * - `inconsistent` -- the file's own `pages` do not hash to its `corpusHash`:
 *   corruption (a hand-resolved merge), not drift.
 * - `stale` -- a well-formed file for a different corpus: someone changed
 *   `src/lib/data` without running `bun run corpus:lock`.
 */
export type CorpusLockProblem =
	| { kind: 'version'; version: unknown }
	| { kind: 'malformed' }
	| { kind: 'inconsistent'; recomputedHash: string }
	| { kind: 'stale'; expected: CorpusLock; added: string[]; removed: string[]; changed: string[] };

export type CorpusLockVerdict =
	{ ok: true; lock: CorpusLock } | ({ ok: false } & CorpusLockProblem);

/**
 * Decide whether a parsed `corpus.lock` describes `pages`, and if it does,
 * return the lock to record.
 *
 * This is the one definition of "the committed lock is current", shared by
 * `scripts/check-corpus-lock.ts` (CI) and `scripts/corpus-import.ts` (the
 * database). The two used to disagree. The import called `buildLock(allPages)`
 * with no ledger, so every field was treated as new: it minted different field
 * ids from the ones `corpus.lock` froze, and so a different `corpusHash`, for
 * an identical corpus. `corpus_versions.corpus_hash` could never equal the
 * committed lock's hash, and the import's idempotency lookup keyed on a hash
 * no other tool computed. Measured 2026-11-26 on `main` at a7d93f0: lock
 * `a91786fcd1b4…`, ledger-less `buildLock(allPages)` `bc89dbc708bf…`.
 *
 * The checks run in the order `corpus:check` always used: version, then shape,
 * then internal consistency, and only then is the file trusted as the id
 * ledger. Built any earlier, a corrupt file would be feeding the comparison
 * meant to catch it. The ledger only chooses ids: every hash value is
 * recomputed from the copy, so a ledger whose values disagree with the tree
 * lands in `stale`. What it cannot catch is a ledger whose ids were exchanged
 * between two fields -- `freezeFieldIds` adopts ids by content, so that is a
 * self-consistent assignment indistinguishable from real history.
 *
 * On `ok` the returned lock is the committed file itself, not the rebuilt one.
 * They hash identically, and `hashLockPages` covers every path, content hash
 * and field-hash map, so they are the same manifest -- but returning the file
 * makes "what the import records is what git holds" true by construction
 * rather than by that argument.
 */
export function verifyCorpusLock(committed: unknown, pages: CorpusPage[]): CorpusLockVerdict {
	const file = committed as Partial<CorpusLock> | null;

	if (file === null || typeof file !== 'object' || file.version !== 1) {
		return { ok: false, kind: 'version', version: file?.version };
	}

	const entries = file.pages;
	if (
		entries === null ||
		entries === undefined ||
		typeof entries !== 'object' ||
		Array.isArray(entries) ||
		Object.values(entries).some(
			(entry) =>
				entry === null ||
				typeof entry !== 'object' ||
				typeof entry.contentHash !== 'string' ||
				!HEX64.test(entry.contentHash) ||
				!isValidFieldHashMap(entry.fieldHashes)
		)
	) {
		return { ok: false, kind: 'malformed' };
	}

	const lock = file as CorpusLock;
	const recomputedHash = hashLockPages(lock.pages);
	if (recomputedHash !== lock.corpusHash) {
		return { ok: false, kind: 'inconsistent', recomputedHash };
	}

	const expected = buildLock(pages, lock);
	if (expected.corpusHash === lock.corpusHash) {
		return { ok: true, lock };
	}

	const expectedPaths = new Set(Object.keys(expected.pages));
	const actualPaths = new Set(Object.keys(lock.pages));
	return {
		ok: false,
		kind: 'stale',
		expected,
		added: [...expectedPaths].filter((p) => !actualPaths.has(p)),
		removed: [...actualPaths].filter((p) => !expectedPaths.has(p)),
		changed: [...expectedPaths].filter(
			(p) => actualPaths.has(p) && lock.pages[p].contentHash !== expected.pages[p].contentHash
		)
	};
}
