# Context

The shared vocabulary of this project. A glossary and nothing else — no
implementation detail, no decisions, no plans. Those live in
`docs/superpowers/specs/`.

## The three layers

**Corpus** — the mockup pages as authored in this repo. The base text every
other layer sits on top of. Redesigned elsewhere and re-ported by hand, so it
changes in discrete jumps rather than continuously.

**Corpus version** — one recorded snapshot of the whole corpus, taken at import.
What makes "the mockup changed between v2 and v3" answerable. Only
reader-visible copy counts toward whether a version is new: annotations and
metadata travel in the snapshot but do not mint a version.

**Overlay** — the accepted edits a review has produced, applied on top of the
base copy at render time. Never folded back into the corpus except by an
explicit, deliberate act.

**Notes** — a reviewer's reasoning, anchored to the copy it is about and tagged
with the corpus version it was written against.

## Copy and its addresses

**Page** — one mockup page. Its **slug** is the SF.gov-style address it would
publish at; its **id** is the routable identifier derived from that slug. The
two are not interchangeable, and only the id addresses a page inside this tool.

**Section** — one titled part of a page. The unit a reviewer reads as a whole
and the unit a Rethink operates on.

**Block** — a single piece of copy inside a section: the heading, one paragraph,
one bullet, a callout. The smallest thing a reviewer accepts or rejects.

**Field** — a block that has an address, and so can carry an edit or a note. Not
every reader-visible string is a field; copy without an address cannot be
edited or annotated until it is given one.

**Field id** — a field's address, stable across the corpus. Edits, notes and
diffs all key on it, which is why changing one orphans everything anchored to
it.

**Section key** — the part of a field id naming its section. Derived from the
section's heading rather than its position, so reordering sections does not
renumber the fields inside them. Assigned once from the authored corpus and
never recomputed — a reviewer editing a heading must not silently orphan that
section's edits.

**Unverified copy** — corpus text with no confirmed source, carrying the reason
it is in doubt. A wording change never clears the flag: rewriting a claim is not
the same as sourcing it.

## Review

**Review** — one pass over the corpus by one or more reviewers. Holds the queue
of pages and their decisions.

**Edit** — one persisted change to one field, recorded permanently. Edits are
never modified or removed; a later edit to the same field supersedes an earlier
one. Reserved for the persisted record — not for the reviewer's act of
accepting, and not for an unsaved suggestion.

**Accepted** — a reviewer has approved a change. Acceptance is what the overlay
renders.

**Expired** — an acceptance whose underlying base copy has since changed, so the
approved text no longer answers the copy it was approved against. Expiry is per
field: unrelated copy moving elsewhere on the page must not retire it.

**Transcript** — the readable record of a page's review, written for whoever
rebuilds the page in the CMS. The deliverable this tool exists to produce.

## Rethink

**Rethink** — a request for the assistant to reconsider a whole section: its
structure, what it says, what it omits, and whether its shape suits its purpose.
Distinct from a rewrite, which changes wording within a block and leaves the
section's shape alone.

**Proposal** — what a Rethink returns: one rethought section, with the reasoning
behind it.

**Op** — one difference between the current section and the proposal, attached
to a block: keep, rewrite, add, drop, or move. Each is accepted or rejected on
its own.

**Structural op** — an add, drop or move. Named apart from a rewrite because it
changes which blocks exist and in what order, and so cannot be expressed as a
change to any single existing field.

## The CMS

**Karl** — the Wagtail-based CMS SF.gov publishes from. The mockups are drafts of
pages someone will later build there.

**Karl mapping** — a section's note describing which Karl field or content block
it becomes. A restructure Karl cannot express is not publishable, whatever its
merits as copy.
