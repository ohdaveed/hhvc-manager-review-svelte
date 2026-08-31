import { hashText } from './hash.js';
import type { FieldMap } from './fields.js';

/** `structural id -> frozen id`. Identity for a field whose id never moved. */
export type FrozenIds = Record<string, string>;

/**
 * Resolve the id each field keeps, given the ids the last import froze.
 *
 * Edits, suggestions and comments are all keyed by field id, so an id has to
 * survive a corpus re-import or the rows filed against it orphan silently.
 * `extractFields` builds ids structurally, and 371 of the corpus's 595 ids
 * (62%) carry a positional segment -- `sections.<key>.paragraphs.0`,
 * `audience.0`. The section segment is already stable, because
 * `deriveFieldKey` slugs the heading rather than using the array index, but
 * the leaf index is not: inserting a paragraph at the top of a section shifts
 * every later paragraph's id by one and reattaches each saved edit to its
 * neighbour's text. That is worse than losing the edit, because nothing
 * surfaces as missing.
 *
 * The ledger is the previous lock's `fieldHashes` map, which is already
 * `frozen id -> sha256(text)` per page. No new file and no lock format change:
 * the data needed to re-identify a field across an import is the data the lock
 * already keeps for edit expiry.
 *
 * **Content identity outranks positional identity**, which fixes the order the
 * passes have to run in. Matching structural ids first looks natural and is
 * wrong: on an insertion every old id still exists, so a structural pass
 * claims all of them while holding their neighbours' text, and the edit saved
 * against "First" silently reattaches to the paragraph inserted above it. So:
 *
 * 1. **Same id, same text** -- unchanged and unmoved. Unambiguous, claimed
 *    first so neither later pass can steal the id.
 * 2. **Same text, new position** -- adopt the old id. This is what makes an
 *    insertion non-destructive: the shifted paragraphs are unchanged text that
 *    merely renumbered.
 * 3. **Same id, changed text** -- edited in place. Only reachable once the
 *    moves are settled, and it is the one case content matching *cannot* cover,
 *    since a rewritten paragraph hashes to nothing that existed before.
 * 4. **Genuinely new** -- mint, preferring the structural id.
 *
 * Pass 2 requires a *unique* unclaimed match. Two sections that both say "Call
 * 311" produce one hash and two candidates, and there is no evidence which is
 * which; guessing would attach a reviewer's edit to the wrong one. Minting a
 * fresh id instead loses the association, which is recoverable, rather than
 * inventing a wrong one, which is not. Iteration is in sorted id order so the
 * outcome never depends on object key order.
 */
export function freezeFieldIds(
	previousFieldHashes: Record<string, string>,
	fields: FieldMap
): FrozenIds {
	const structuralIds = Object.keys(fields).sort();
	const hashOf = new Map(structuralIds.map((id) => [id, hashText(fields[id])]));
	const frozen: FrozenIds = {};
	const claimed = new Set<string>();

	// 1 -- same id, same text.
	for (const id of structuralIds) {
		if (previousFieldHashes[id] === hashOf.get(id)) {
			frozen[id] = id;
			claimed.add(id);
		}
	}

	// Previous ids still unclaimed, grouped by the text they held.
	const unclaimedByHash = new Map<string, string[]>();
	for (const previousId of Object.keys(previousFieldHashes).sort()) {
		if (claimed.has(previousId)) continue;
		const hash = previousFieldHashes[previousId];
		const bucket = unclaimedByHash.get(hash);
		if (bucket) bucket.push(previousId);
		else unclaimedByHash.set(hash, [previousId]);
	}

	// 2 -- same text at a new position, and only one candidate holds it.
	for (const id of structuralIds) {
		if (frozen[id] !== undefined) continue;
		const bucket = unclaimedByHash.get(hashOf.get(id)!);
		if (bucket?.length !== 1) continue;
		const adopted = bucket[0];
		if (claimed.has(adopted)) continue;
		frozen[id] = adopted;
		claimed.add(adopted);
	}

	// 3 -- same id, changed text: edited in place.
	for (const id of structuralIds) {
		if (frozen[id] !== undefined) continue;
		if (!Object.hasOwn(previousFieldHashes, id) || claimed.has(id)) continue;
		frozen[id] = id;
		claimed.add(id);
	}

	// 4 -- new content. Prefer the structural id; suffix only when an earlier
	// pass already handed that id to a different field.
	for (const id of structuralIds) {
		if (frozen[id] !== undefined) continue;
		let minted = id;
		for (let n = 2; claimed.has(minted); n++) minted = `${id}~${n}`;
		frozen[id] = minted;
		claimed.add(minted);
	}

	return frozen;
}

/**
 * The page's field hashes re-keyed by frozen id -- what the next lock stores,
 * and therefore the ledger the next import reads. Keeping this beside
 * `freezeFieldIds` means the two halves of the round trip cannot drift: an id
 * frozen here is looked up by the same key next time.
 */
export function freezeFieldHashes(fields: FieldMap, frozen: FrozenIds): Record<string, string> {
	const hashes: Record<string, string> = {};
	for (const id of Object.keys(fields).sort()) {
		hashes[frozen[id] ?? id] = hashText(fields[id]);
	}
	return hashes;
}
