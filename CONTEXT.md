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

**Base copy** — what a field says before any edit: the corpus text for a page in
the corpus, the drafted text for a draft page. Drafting a page again changes its
base copy just as a re-port changes the corpus.

**Overlay** — the accepted edits a review has produced, applied on top of the
base copy at render time. Never folded back into the corpus except by an
explicit, deliberate act.

**Notes** — a reviewer's reasoning, anchored to the copy it is about and tagged
with the corpus version it was written against.

## Copy and its addresses

**Page** — one mockup page. Its **slug** is the SF.gov-style address it would
publish at; its **id** is the routable identifier derived from that slug. The
two are not interchangeable, and only the id addresses a page inside this tool.

**Draft page** — a page a reviewer described and the assistant wrote, which is
not in the corpus. Reviewed like any other page, under a banner saying where it
came from.
_Avoid_: draft (unqualified), proposed page

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
accepting, not for a suggestion, and not for an unsaved change.

**Unsaved change** — new wording for one field, shown on the mockup but not yet
saved: either typed by the reviewer or taken from a suggestion they accepted.
Saving it records an edit. Cancelling it restores what the field said before,
and a suggestion it came from goes back to waiting rather than being rejected.
It survives moving to another field or page; leaving the tool while any exist
asks first.
_Avoid_: draft (reserved for draft pages), parked draft, manual draft

**Suggestion** — one AI rewrite of one field, waiting for a reviewer to accept or
reject it. Accepting it makes it an unsaved change; nothing is recorded until
that is saved. Distinct from a proposal, which covers a whole section.
_Avoid_: dismiss (the act is rejecting)

**Accepted** — a reviewer has taken a change: accepted a suggestion or an op, or
typed their own wording. Accepting is the reviewer's act and is not yet a record:
accepted wording is an unsaved change until it is saved as an edit. A saved edit
is final — there is no edit awaiting someone else's approval. Saved acceptances
are what the overlay renders.

**Expired** — a saved acceptance whose underlying base copy has since changed, so
the approved text no longer answers the copy it was approved against. Expiry is
per field: unrelated copy moving elsewhere on the page must not retire it. An
expired acceptance stays visible on the mockup, marked as expired — neither
hidden nor passed off as current. The accepted text is what shows; the base copy
it no longer answers is one step away. Expiry is judged against the base copy
as it is now, so copy that changes and then changes back un-expires the
acceptance. It is resolved only by a new edit: re-confirming the same text,
rewriting it, or keeping the base copy — each an unsaved change until saved.

**Orphaned** — a saved edit whose field no longer exists, because the field was
removed or its id changed. Kept, not shown on the mockup, and listed in the
transcript. Distinct from expired: there is no current copy to re-confirm
against.

**Transcript** — the readable record of a page's review, written for whoever
rebuilds the page in the CMS. The deliverable this tool exists to produce. Expired and
orphaned edits appear in it, flagged, rather than being left out.

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
merits as copy. Commentary written by a person, as opposed to a placement.

**Karl panel** — one slot on a Karl content type's editing form, such as _What
to do_ or _Contact us_, in the order the form presents it. Interface copy for a
manager may say "Karl field"; nothing else does, because **Field** already means
an addressed piece of our copy.
_Avoid_: Karl field (outside interface copy), Wagtail field

**Placement** — the Karl panel a field lands in, computed from the panel
inventory for the page's content type. Where a placement and a Karl mapping
disagree, the placement is what the tool reports.
_Avoid_: karlField, mapping (for the computed answer)

**Placed** — copy with a placement that breaks none of Karl's rules for that
panel.

**Needs a fix** — copy with a placement that breaks one of Karl's rules for that
panel, such as a length limit, or that still holds placeholder text.

**Unplaced** — copy that no Karl panel on its page's content type accepts, so it
will not carry over to Karl as written. The most serious of the four statuses.
_Avoid_: orphan (reserved for edits whose field id no longer resolves)

**Unconfirmed** — copy whose placement or rule rests on something Karl's own
documentation leaves unsettled or contradicts.
_Avoid_: unknown, gray

**Karl outline** — the view of a mockup page that marks each section with its
placement and status. Shown on top of the rendered page, not instead of it.
_Avoid_: overlay (reserved for accepted edits), Karl tags
