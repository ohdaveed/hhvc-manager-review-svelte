# Accepted-edit overlay (corpus versioning, slice 3) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make an accepted edit re-apply to the rendered mockup on every load, so a reviewer's copy rewrite survives a page refresh instead of silently vanishing.

**Architecture:** Acceptance becomes an append-only `edit_decisions` log (accept and revoke are both rows, never an updated flag). A pure resolver folds `edits` + `edit_decisions` into a `fieldId → text` overlay, which `EditTarget.svelte` — the single component every addressable field already renders through — consults before falling back to the bundled corpus. `pageStore.pages` becomes write-once so the live base copy stays available for expiry detection and the re-confirm UI.

**Tech Stack:** SvelteKit + Svelte 5 runes, Svelte 4 writable stores (`reviewState.ts`), Supabase Postgres + RLS + realtime, Vitest 4, bun.

**Spec:** `docs/superpowers/specs/2026-08-23-mockup-version-history-design.md` (slice 3 of the "Slices" section). Read it alongside this plan — the decision numbers cited below are its decision table.

---

## Global Constraints

Copied verbatim from the spec and from the repo's own documented gotchas. Every task's requirements implicitly include this section.

- **Acceptance is append-only** (decision 8). No mutable `accepted_at` column. Accept **and** revoke are both `INSERT`s. Current state is derived as the latest row per `edit_id`.
- **`INSERT`, never `UPDATE`** (finding 11). The existing realtime subscription listens for `INSERT` on `edits`; a design signalling acceptance by updating a column would silently fail to propagate.
- **Expiry is per field** (decision 14). A single per-page hash would expire every accepted edit on a page whenever any part of it changed.
- **An expired acceptance renders the NEW base copy**, not the accepted text (decisions 7 and 15), with a re-confirm affordance showing old base, accepted text, and new base.
- **`karl` and `editorNote` are excluded** from what counts as a content change (decision 12).
- **RLS follows the per-operation shape** of `20260822030000_scope_rls_policies.sql` — read everything, write only your own, and the _absence_ of UPDATE/DELETE is the substance. Not the old blanket `FOR ALL USING (true)`.
- **Vitest project split is by file location.** `src/**/*.{test,spec}.ts` → **node** environment. `tests/**/*.test.ts` → **jsdom**. `tests/**/*.spec.ts` → node. A test in the wrong directory gets the wrong environment.
- **`bun run verify` is the local gate** (unit tests + production build). `bun run lint` is red on the current tree in both halves — do not "fix" it as a side effect of this work.
- **Branch from `origin/main`**, not from whatever is currently checked out. (The PRs #44 and #45 this line used to cite are long merged — `gh pr list --state open` was empty on 2026-08-28. The rule stands on its own: branching off a stale local HEAD is how this repo has already produced add/add conflicts.)

## Decisions this plan settles (and why)

The spec left three things underspecified. Resolving them by reading the code, not by assumption:

### D-A — the acceptance row stores `base_text`, not `base_hash`

The spec's overlay resolution step 4 says to compare "the field's hash in the current `page_versions.field_hashes`", while its Render section says "the live page takes no runtime dependency on `page_versions`". Both are satisfied by making the decision row self-contained.

Three reasons text, not hash:

1. **Decision 15 already requires the base text to be persisted.** The re-confirm affordance shows "the old base, the accepted text, and the new base". You cannot render the old base from a hash. Once the text is on the row, a separate `base_hash` is a second source of truth for the same question — and text equality ⟺ hash equality.
2. **`src/lib/corpus/hash.ts` imports `node:crypto`** and is not browser-safe. A client-side hash check would need a parallel Web Crypto implementation, and two implementations of the same digest are free to drift — the exact failure `deriveFieldKey` exists as a single definition to prevent.
3. It removes any runtime dependency on `page_versions` from the rendered page, which is what the spec's Render section asks for.

**Do not "fix" this back to a hash.** This paragraph is why.

### D-B — `pageStore.pages` becomes write-once

`pageStore.pages` is built once in the constructor from `allPages`. Today `FieldsPanel.saveAccepted()` calls `resolved.field.set(...)`, which mutates those objects in place — which is exactly why an inline rewrite appears applied and is gone on reload.

If the overlay were applied by mutating the store, four things fail, all silently: expiry detection (needs the live base to compare against `base_text`), decision 15's new-base render, the three-way re-confirm display, and revoke-restores-base.

So the pristine corpus stays pristine and the overlay is derived. **Consequence: removing that in-place mutation is a task in this plan** (Task 4), not something slice 3 can leave alone.

### D-C — `EditTarget.svelte` is the single render seam

Every addressable field — `title`, `summary`, `audience.<n>`, section headings, paragraphs, bullets, callout title/text — already renders through `EditTarget` with both `fieldId` and `value` in hand. One component reads the overlay; `Page.svelte` and `Section.svelte` need no changes.

(Note: `audience.<n>` addressing already exists at `src/lib/components/Page.svelte:27`. The spec's decision 13 lists it as slice 4 work; it landed early.)

### Not in scope, stated so nobody infers otherwise

- **Slice 2 (durable notes / `page_notes`) has NOT landed.** There is no `page_notes` migration. Slice 3 does not depend on it.
- **`corpus:materialize` is slice 5.** This plan adds the nullable `edits.materialized_in_version_id` column and honours it in the resolver from day one — retrofitting the resolver and its whole test table later costs more than a nullable column now — but nothing sets it.
- **The `comments` table** stays dead (spec finding 7).

---

## File Structure

| File                                                    | Responsibility                                                                                                                                                |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/migrations/20260825010000_edit_decisions.sql` | **Create.** `edit_decisions` table, its RLS policies, its grants, its realtime publication entry, and the nullable `edits.materialized_in_version_id` column. |
| `src/lib/corpus/overlay.ts`                             | **Create.** Pure fold of edits + decisions + a base-text lookup into `Map<fieldId, OverlayField>`. No Svelte, no Supabase.                                    |
| `src/lib/corpus/overlay.test.ts`                        | **Create.** Table-driven unit tests for the fold. Node project (under `src/**`).                                                                              |
| `src/lib/stores/reviewState.ts`                         | **Modify.** Add `decisionsStore`, `acceptEdit()`, `revokeEdit()`, the `edit_decisions` snapshot query, and the realtime `INSERT` handler.                     |
| `src/lib/stores/overlayStore.ts`                        | **Create.** The v4-writable → runes bridge: a `derived` store exposing `Map<path, Map<fieldId, OverlayField>>`.                                               |
| `src/lib/components/EditTarget.svelte`                  | **Modify.** Render overlay text when the field has one; expose `data-overlay-state` for tests.                                                                |
| `src/lib/components/workspace/FieldsPanel.svelte`       | **Modify.** Stop mutating the pristine corpus (`resolved.field.set`).                                                                                         |
| `src/lib/corpus/fieldResolver.ts`                       | **Modify.** Add `fieldIdsOf(page)` — the inverse of `resolveField`, in the same file so the field-id vocabulary keeps one definition.                         |
| `src/lib/components/workspace/ReconfirmPanel.svelte`    | **Create.** The expired-acceptance affordance: old base / accepted / new base, with re-confirm and revoke.                                                    |
| `tests/overlayRender.test.ts`                           | **Create.** jsdom component tests for `EditTarget`'s overlay rendering.                                                                                       |
| `tests/reconfirmPanel.test.ts`                          | **Create.** jsdom component tests for `ReconfirmPanel`.                                                                                                       |
| `PLAN.md`, `CLAUDE.md`                                  | **Modify.** Record the new table in the RLS matrix and tick the slice.                                                                                        |

---

## Task 1: `edit_decisions` migration

**Files:**

- Create: `supabase/migrations/20260825010000_edit_decisions.sql`
- Test: verified against a local stack (`supabase db reset`), assertions run with `psql`

**Interfaces:**

- Consumes: nothing.
- Produces: table `edit_decisions (id uuid, edit_id uuid, decision text, base_text text, decided_by uuid, decided_at timestamptz)`; column `edits.materialized_in_version_id uuid`.

**Three things here are easy to miss and fail in opposite directions:**

1. **The grant.** `20260823140000_grant_table_privileges.sql` exists because the hosted project attaches DML privileges via `ALTER DEFAULT PRIVILEGES` and a local Postgres does not. A new table with policies but no `GRANT` works hosted and fails locally with `42501 permission denied`.
2. **The publication.** Realtime does not fire for a table that is not in `supabase_realtime`. Adding a table to a publication twice is an error, so guard it the way `20260822020000` does.
3. **No UPDATE and no DELETE policy.** That absence is the substance — it is what makes the log append-only, the same shape `edits` has.

- [ ] **Step 1: Write the migration**

```sql
-- Acceptance as an append-only log (design decision 8).
--
-- The action that decides what the mockup actually says must not be the one
-- action with no history. So there is no mutable `accepted_at` flag: accept and
-- revoke are both rows, and current state is the latest row per edit_id.
--
-- It also makes acceptance an INSERT, which the existing realtime subscription
-- shape handles. An UPDATE would not (design finding 11).
--
-- `base_text` is the corpus copy the acceptance was made against, stored rather
-- than hashed. Decision 15's re-confirm UI has to render that old base, and a
-- hash cannot produce it; text equality and hash equality answer the same
-- question, so storing both would be two sources of truth. It also keeps
-- `node:crypto` out of the browser -- see D-A in the slice 3 plan.

CREATE TABLE IF NOT EXISTS edit_decisions (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	edit_id UUID REFERENCES edits(id) ON DELETE CASCADE NOT NULL,
	decision TEXT NOT NULL CHECK (decision IN ('accept', 'revoke')),
	-- NULL on a revoke: revoking does not assert anything about the base copy.
	base_text TEXT,
	decided_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
	decided_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
	corpus_version_id UUID REFERENCES corpus_versions(id) ON DELETE SET NULL
);

-- An accept must say what it was accepted against; a revoke must not pretend to.
ALTER TABLE edit_decisions
	DROP CONSTRAINT IF EXISTS edit_decisions_base_text_matches_decision;
ALTER TABLE edit_decisions
	ADD CONSTRAINT edit_decisions_base_text_matches_decision
	CHECK ((decision = 'accept' AND base_text IS NOT NULL)
	    OR (decision = 'revoke' AND base_text IS NULL));

ALTER TABLE edit_decisions ENABLE ROW LEVEL SECURITY;

-- Idempotent, matching 20260822030000: Postgres has no CREATE POLICY IF NOT
-- EXISTS, and a bare CREATE aborts the migration on re-run.
DROP POLICY IF EXISTS "edit_decisions_select" ON edit_decisions;
DROP POLICY IF EXISTS "edit_decisions_insert_own" ON edit_decisions;

CREATE POLICY "edit_decisions_select" ON edit_decisions
	FOR SELECT TO authenticated
	USING (true);

CREATE POLICY "edit_decisions_insert_own" ON edit_decisions
	FOR INSERT TO authenticated
	WITH CHECK ((select auth.uid()) = decided_by);

-- No UPDATE policy and no DELETE policy, deliberately. Their absence is what
-- makes this table a log rather than a flag, the same shape `edits` has.

-- Stated, not inherited -- see 20260823140000. A local Postgres gives
-- `authenticated` no DML by default, so policies alone leave every read failing
-- with 42501. Mirrors the policies exactly: no UPDATE, no DELETE.
GRANT SELECT, INSERT ON TABLE edit_decisions TO authenticated;

CREATE INDEX IF NOT EXISTS edit_decisions_edit_id_idx ON edit_decisions (edit_id);
CREATE INDEX IF NOT EXISTS edit_decisions_decided_by_idx ON edit_decisions (decided_by);

-- Realtime. Adding a table to a publication twice is an error, so guard it the
-- way 20260822020000 does.
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_publication_tables
		WHERE pubname = 'supabase_realtime' AND tablename = 'edit_decisions'
	) THEN
		ALTER PUBLICATION supabase_realtime ADD TABLE edit_decisions;
	END IF;
END $$;

-- Slice 5 (`corpus:materialize`) sets this. Added now, and honoured by the
-- overlay resolver from day one, because retrofitting the resolver and its
-- whole test table later costs more than a nullable column does now.
ALTER TABLE edits
	ADD COLUMN IF NOT EXISTS materialized_in_version_id UUID
	REFERENCES corpus_versions(id) ON DELETE SET NULL;
```

- [ ] **Step 2: Apply it to a clean local stack**

Run:

```bash
supabase start
supabase db reset
```

Expected: reset completes with no error, and the new migration is listed in the applied output.

- [ ] **Step 3: Assert the policy shape is what was intended**

Run:

```bash
psql "$(supabase status -o env | grep '^DB_URL=' | cut -d= -f2- | tr -d '"')" -c \
  "SELECT policyname, cmd FROM pg_policies WHERE tablename = 'edit_decisions' ORDER BY policyname;"
```

Expected: exactly two rows — `edit_decisions_insert_own | INSERT` and `edit_decisions_select | SELECT`. **If an UPDATE or DELETE row appears, the table is not append-only and the migration is wrong.**

- [ ] **Step 4: Assert the grant and the publication landed**

Run:

```bash
DB=$(supabase status -o env | grep '^DB_URL=' | cut -d= -f2- | tr -d '"')
psql "$DB" -c "SELECT privilege_type FROM information_schema.role_table_grants
  WHERE table_name='edit_decisions' AND grantee='authenticated' ORDER BY 1;"
psql "$DB" -c "SELECT tablename FROM pg_publication_tables
  WHERE pubname='supabase_realtime' AND tablename='edit_decisions';"
```

Expected: `INSERT` and `SELECT` only (no UPDATE, no DELETE), and one publication row.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260825010000_edit_decisions.sql
git commit -m "feat(db): append-only edit_decisions log, with grants and realtime"
```

---

## Task 2: the pure overlay resolver

**Files:**

- Create: `src/lib/corpus/overlay.ts`
- Test: `src/lib/corpus/overlay.test.ts` (**node** project — it is under `src/**`)

**Interfaces:**

- Consumes: nothing at runtime. Mirrors the row shapes from Task 1.
- Produces:
  - `type OverlayState = 'applied' | 'expired'`
  - `type OverlayField = { fieldId: string; state: OverlayState; text: string; acceptedText: string; acceptedBase: string; editId: string }`
  - `function resolveOverlay(baseTextOf: (fieldId: string) => string | null, edits: readonly OverlayEdit[], decisions: readonly OverlayDecision[]): Map<string, OverlayField>`

The `baseTextOf` callback rather than a page object is deliberate: it keeps this module free of the corpus's untyped `AnyPage`, makes every test a plain object lookup, and in production is satisfied by `(id) => resolveField(page, id)?.value ?? null` — so the overlay compares against exactly the display text `EditTarget` renders, for both the `string` and `{ text, unverified }` entry shapes.

**A field with no entry in the returned map renders its base copy.** That is how revoke works, and it means the map is small.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/corpus/overlay.test.ts
import { describe, it, expect } from 'vitest';
import { resolveOverlay, type OverlayEdit, type OverlayDecision } from './overlay.js';

const BASE: Record<string, string> = {
	'sections.about.paragraphs.0': 'Original copy.',
	'sections.about.paragraphs.1': 'Untouched copy.',
	title: 'Original title'
};
const baseTextOf = (id: string) => BASE[id] ?? null;

const edit = (over: Partial<OverlayEdit> = {}): OverlayEdit => ({
	id: 'e1',
	field_id: 'sections.about.paragraphs.0',
	new_content: 'Rewritten copy.',
	materialized_in_version_id: null,
	...over
});

const decision = (over: Partial<OverlayDecision> = {}): OverlayDecision => ({
	id: 'd1',
	edit_id: 'e1',
	decision: 'accept',
	base_text: 'Original copy.',
	decided_at: '2026-08-25T10:00:00Z',
	...over
});

describe('resolveOverlay', () => {
	it('substitutes the accepted text for that field and only that field', () => {
		const overlay = resolveOverlay(baseTextOf, [edit()], [decision()]);
		expect(overlay.get('sections.about.paragraphs.0')).toMatchObject({
			state: 'applied',
			text: 'Rewritten copy.'
		});
		expect(overlay.has('sections.about.paragraphs.1')).toBe(false);
		expect(overlay.has('title')).toBe(false);
	});

	it('resolves to the base copy after a revoke, keeping both rows', () => {
		const overlay = resolveOverlay(
			baseTextOf,
			[edit()],
			[
				decision(),
				decision({
					id: 'd2',
					decision: 'revoke',
					base_text: null,
					decided_at: '2026-08-25T11:00:00Z'
				})
			]
		);
		expect(overlay.has('sections.about.paragraphs.0')).toBe(false);
	});

	it('re-accepting after a revoke applies again', () => {
		const overlay = resolveOverlay(
			baseTextOf,
			[edit()],
			[
				decision(),
				decision({
					id: 'd2',
					decision: 'revoke',
					base_text: null,
					decided_at: '2026-08-25T11:00:00Z'
				}),
				decision({ id: 'd3', decided_at: '2026-08-25T12:00:00Z' })
			]
		);
		expect(overlay.get('sections.about.paragraphs.0')?.state).toBe('applied');
	});

	it('renders the NEW base when the base copy moved under the acceptance', () => {
		const overlay = resolveOverlay(
			baseTextOf,
			[edit()],
			[decision({ base_text: 'Copy as it was when accepted.' })]
		);
		expect(overlay.get('sections.about.paragraphs.0')).toEqual({
			fieldId: 'sections.about.paragraphs.0',
			state: 'expired',
			text: 'Original copy.', // the new base, NOT the accepted text
			acceptedText: 'Rewritten copy.',
			acceptedBase: 'Copy as it was when accepted.',
			editId: 'e1'
		});
	});

	it('does not expire when only the unverified flag moved', () => {
		// `resolveField().value` is the entry's text for both the plain-string and
		// the `{ text, unverified }` shapes, so flipping the flag leaves the
		// comparand identical. Encoded because it is correct but not obvious.
		const overlay = resolveOverlay(baseTextOf, [edit()], [decision()]);
		expect(overlay.get('sections.about.paragraphs.0')?.state).toBe('applied');
	});

	it('skips an edit already folded into the corpus by materialize', () => {
		const overlay = resolveOverlay(
			baseTextOf,
			[edit({ materialized_in_version_id: 'v3' })],
			[decision()]
		);
		expect(overlay.has('sections.about.paragraphs.0')).toBe(false);
	});

	it('takes the newest accepted edit when a field has several', () => {
		const overlay = resolveOverlay(
			baseTextOf,
			[edit(), edit({ id: 'e2', new_content: 'Newer rewrite.' })],
			[decision(), decision({ id: 'd2', edit_id: 'e2', decided_at: '2026-08-25T13:00:00Z' })]
		);
		expect(overlay.get('sections.about.paragraphs.0')?.text).toBe('Newer rewrite.');
	});

	it('drops a decision whose field is no longer on the page', () => {
		const overlay = resolveOverlay(
			baseTextOf,
			[edit({ field_id: 'sections.gone.paragraphs.0' })],
			[decision()]
		);
		expect(overlay.size).toBe(0);
	});

	it('drops a decision whose edit row is absent', () => {
		expect(resolveOverlay(baseTextOf, [], [decision()]).size).toBe(0);
	});

	it('breaks a decided_at tie on id, deterministically', () => {
		const overlay = resolveOverlay(
			baseTextOf,
			[edit()],
			[decision({ id: 'd1', decision: 'revoke', base_text: null }), decision({ id: 'd2' })]
		);
		expect(overlay.get('sections.about.paragraphs.0')?.state).toBe('applied');
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun run test:unit -- --run src/lib/corpus/overlay.test.ts`
Expected: FAIL — `Failed to resolve import "./overlay.js"`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/corpus/overlay.ts
/**
 * Folds `edits` and `edit_decisions` into what each field should actually
 * render.
 *
 * Acceptance is an append-only log, so "is this edit accepted?" is not a column
 * read -- it is the latest decision row for that edit. This module is the one
 * place that fold happens. Keeping it pure (no Svelte, no Supabase, no page
 * object) is what lets every behaviour the design specifies be a table test
 * rather than a component test.
 *
 * `baseTextOf` returns the CURRENT corpus copy for a field id, or null when the
 * field is no longer on the page. In production it is
 * `(id) => resolveField(page, id)?.value ?? null`, so the text compared here is
 * exactly the text `EditTarget` renders -- including the unwrapping of the
 * `{ text, unverified }` entry shape.
 */

export type OverlayEdit = {
	id: string;
	field_id: string;
	new_content: string;
	/** Set by `corpus:materialize` (slice 5). Folded into the base already. */
	materialized_in_version_id: string | null;
};

export type OverlayDecision = {
	id: string;
	edit_id: string;
	decision: 'accept' | 'revoke';
	/** The corpus copy the acceptance was made against. Null on a revoke. */
	base_text: string | null;
	decided_at: string;
};

/**
 * `applied` -- render the accepted text.
 * `expired` -- the base copy moved under the acceptance, so render the NEW base
 * and offer re-confirmation (design decisions 7 and 15).
 *
 * There is no `base` member: a field resolving to its base copy has no entry in
 * the map at all, which is also how a revoke is represented.
 */
export type OverlayState = 'applied' | 'expired';

export type OverlayField = {
	fieldId: string;
	state: OverlayState;
	/** What to render. The accepted text when applied, the new base when expired. */
	text: string;
	acceptedText: string;
	acceptedBase: string;
	editId: string;
};

/** Newest wins; ties break on id so the result never depends on row order. */
function newer(a: { decided_at: string; id: string }, b: { decided_at: string; id: string }) {
	const byTime = a.decided_at.localeCompare(b.decided_at);
	return byTime !== 0 ? byTime > 0 : a.id.localeCompare(b.id) > 0;
}

export function resolveOverlay(
	baseTextOf: (fieldId: string) => string | null,
	edits: readonly OverlayEdit[],
	decisions: readonly OverlayDecision[]
): Map<string, OverlayField> {
	// Latest decision per edit.
	const latest = new Map<string, OverlayDecision>();
	for (const d of decisions) {
		const held = latest.get(d.edit_id);
		if (!held || newer(d, held)) latest.set(d.edit_id, d);
	}

	const editById = new Map(edits.map((e) => [e.id, e]));

	// Latest ACCEPTED decision per field. Two edits can target the same field;
	// the one accepted most recently is the one that stands, which matches the
	// last-write-wins fold `HelpPanel` already applies to the append-only table.
	const winner = new Map<string, { edit: OverlayEdit; decision: OverlayDecision }>();
	for (const decision of latest.values()) {
		if (decision.decision !== 'accept' || decision.base_text === null) continue;

		const edit = editById.get(decision.edit_id);
		// A decision with no edit row, or one already folded into the corpus by
		// `corpus:materialize`, contributes nothing -- the second would otherwise
		// double-apply the rewrite on top of a base that already contains it.
		if (!edit || edit.materialized_in_version_id !== null) continue;

		const held = winner.get(edit.field_id);
		if (!held || newer(decision, held.decision)) winner.set(edit.field_id, { edit, decision });
	}

	const overlay = new Map<string, OverlayField>();
	for (const [fieldId, { edit, decision }] of winner) {
		const base = baseTextOf(fieldId);
		// The field is gone from the corpus. Treat the acceptance as stale rather
		// than inventing a field to render it into.
		if (base === null) continue;

		const acceptedBase = decision.base_text as string;
		const expired = base !== acceptedBase;

		overlay.set(fieldId, {
			fieldId,
			state: expired ? 'expired' : 'applied',
			text: expired ? base : edit.new_content,
			acceptedText: edit.new_content,
			acceptedBase,
			editId: edit.id
		});
	}

	return overlay;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun run test:unit -- --run src/lib/corpus/overlay.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/corpus/overlay.ts src/lib/corpus/overlay.test.ts
git commit -m "feat(corpus): fold edits and decisions into a render overlay"
```

---

## Task 3: decisions in `reviewState.ts`

**Files:**

- Modify: `src/lib/stores/reviewState.ts` (type block ~line 20; `loadReview` ~71–131; `initializeRealtime` ~136–192; new mutations after `saveInlineEdit` ~295)
- Test: `tests/reviewDecisions.test.ts` (**jsdom** — `tests/**/*.test.ts`)

**Interfaces:**

- Consumes: `OverlayDecision` from Task 2; the `edit_decisions` table from Task 1.
- Produces:
  - `export const decisionsStore: Writable<Decision[]>`
  - `export type Decision = OverlayDecision`
  - `export async function acceptEdit(editId: string, baseText: string): Promise<boolean>`
  - `export async function revokeEdit(editId: string): Promise<boolean>`
  - `export const corpusVersionStore: Writable<string | null>`
  - `Edit` gains `materialized_in_version_id?: string | null`

**Two shapes to match, not invent:**

1. **Optimistic-then-rollback**, exactly as `updatePageStatus` and `saveInlineEdit` do it: snapshot with `get()`, update the store, hit Supabase, `set(previous)` on error, return a boolean so the caller can tell the reviewer.
2. **`runOrBuffer`.** `initializeRealtime` buffers events arriving between subscribing and the initial snapshot landing. A handler that skips that gate looks correct and drops every decision that arrives in the hydration window.

Note the existing `edits` handler has **no** `filter:` (unlike `pages`, which filters on `review_id`). Match that for `edit_decisions` — the table has no `review_id` to filter on, and the fold ignores decisions whose edit is not in the store anyway.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/reviewDecisions.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

const insert = vi.fn();
const auth = { getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })) };

vi.mock('$lib/supabase', () => ({
	supabase: {
		auth,
		from: () => ({ insert, select: () => ({ single: async () => ({ data: null, error: null }) }) })
	},
	ensureDevSession: async () => {}
}));

const load = async () => await import('$lib/stores/reviewState');

describe('acceptEdit', () => {
	beforeEach(() => {
		vi.resetModules();
		insert.mockReset();
		insert.mockReturnValue({
			select: () => ({ single: async () => ({ data: { id: 'd1' }, error: null }) })
		});
	});

	it('writes an accept row carrying the base text it was accepted against', async () => {
		const { acceptEdit } = await load();
		await acceptEdit('e1', 'Original copy.');
		expect(insert).toHaveBeenCalledWith(
			expect.objectContaining({
				edit_id: 'e1',
				decision: 'accept',
				base_text: 'Original copy.',
				decided_by: 'user-1'
			})
		);
	});

	it('shows the decision immediately, before the insert resolves', async () => {
		const { acceptEdit, decisionsStore } = await load();
		const inFlight = acceptEdit('e1', 'Original copy.');
		expect(get(decisionsStore)).toHaveLength(1);
		await inFlight;
	});

	it('rolls the optimistic row back and reports false when the insert fails', async () => {
		insert.mockReturnValue({
			select: () => ({ single: async () => ({ data: null, error: { message: 'nope' } }) })
		});
		const { acceptEdit, decisionsStore } = await load();
		expect(await acceptEdit('e1', 'Original copy.')).toBe(false);
		expect(get(decisionsStore)).toHaveLength(0);
	});

	it('refuses to write with no session rather than failing the NOT NULL', async () => {
		auth.getUser.mockResolvedValueOnce({ data: { user: null } });
		const { acceptEdit, decisionsStore } = await load();
		expect(await acceptEdit('e1', 'Original copy.')).toBe(false);
		expect(get(decisionsStore)).toHaveLength(0);
		expect(insert).not.toHaveBeenCalled();
	});
});

describe('revokeEdit', () => {
	beforeEach(() => {
		vi.resetModules();
		insert.mockReset();
		insert.mockReturnValue({
			select: () => ({ single: async () => ({ data: { id: 'd2' }, error: null }) })
		});
		auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
	});

	it('writes a revoke row with no base text, rather than deleting the accept', async () => {
		const { revokeEdit } = await load();
		await revokeEdit('e1');
		expect(insert).toHaveBeenCalledWith(
			expect.objectContaining({ edit_id: 'e1', decision: 'revoke', base_text: null })
		);
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun run test:unit -- --run tests/reviewDecisions.test.ts`
Expected: FAIL — `acceptEdit is not a function`.

- [ ] **Step 3: Add the store, the type, and the two mutations**

Append to `src/lib/stores/reviewState.ts` (and add the import at the top):

```ts
import type { OverlayDecision } from '$lib/corpus/overlay';

/**
 * One row of the append-only acceptance log. Accept and revoke are both rows;
 * there is no flag to flip. See design decision 8.
 */
export type Decision = OverlayDecision;

export const decisionsStore = writable<Decision[]>([]);

/**
 * Accepts an edit, recording the corpus copy it was accepted against.
 *
 * `baseText` is not decoration: when the mockup is re-ported and that copy
 * moves, this is what tells the overlay the acceptance has expired, and it is
 * the "old base" the re-confirm affordance shows. The caller reads it from the
 * live corpus at the moment of acceptance -- passing the accepted text here
 * instead would make every acceptance permanently fresh.
 */
export async function acceptEdit(editId: string, baseText: string): Promise<boolean> {
	return insertDecision({ editId, decision: 'accept', baseText });
}

/** Revokes an acceptance by appending, never by deleting the accept row. */
export async function revokeEdit(editId: string): Promise<boolean> {
	return insertDecision({ editId, decision: 'revoke', baseText: null });
}

async function insertDecision(args: {
	editId: string;
	decision: 'accept' | 'revoke';
	baseText: string | null;
}): Promise<boolean> {
	const {
		data: { user }
	} = await supabase.auth.getUser();

	// `decided_by` is NOT NULL REFERENCES auth.users. Checked before the
	// optimistic write so a signed-out reviewer never sees the mockup change and
	// change back -- the failure mode saveInlineEdit was fixed for.
	if (!user) {
		console.error('Cannot record decision: no authenticated user.');
		return false;
	}

	// Unique per call, not per millisecond: two decisions recorded in the same
	// tick would otherwise share an id, and the rollback below would remove the
	// wrong one.
	const optimisticId = `temp-${crypto.randomUUID()}`;
	const optimistic: Decision = {
		id: optimisticId,
		edit_id: args.editId,
		decision: args.decision,
		base_text: args.baseText,
		decided_at: new Date().toISOString()
	};

	decisionsStore.update((rows) => [...rows, optimistic]);

	const { data, error } = await supabase
		.from('edit_decisions')
		.insert({
			edit_id: args.editId,
			decision: args.decision,
			base_text: args.baseText,
			decided_by: user.id,
			corpus_version_id: get(corpusVersionStore)
		})
		.select()
		.single();

	if (error) {
		console.error('Failed to record decision:', error);
		// Remove only this call's optimistic row.
		//
		// `updatePageStatus` and `saveInlineEdit` above roll back by restoring a
		// whole-store snapshot taken before the write, and this deliberately does
		// not copy that. `decisionsStore` is written concurrently by the realtime
		// handler and by any other accept or revoke in flight, so restoring a
		// snapshot taken earlier discards every row that landed in between --
		// silently un-applying another reviewer's accepted edit because *this*
		// request failed. Those two functions have the same flaw; fixing them is
		// not in this slice's scope, but repeating it in new code would be.
		decisionsStore.update((rows) => rows.filter((r) => r.id !== optimisticId));
		return false;
	}

	if (data) {
		decisionsStore.update((rows) => rows.map((r) => (r.id === optimisticId ? data : r)));
	}
	return true;
}
```

`corpusVersionStore` holds the id of the newest imported corpus version, so every acceptance records which version of the mockup it was made against — the provenance the design's data model asks `edit_decisions.corpus_version_id` for. Without it the column is permanently NULL and the schema states something untrue. Add it beside `decisionsStore`:

```ts
/**
 * The newest `corpus_versions` row, or null before the first `corpus:import`.
 *
 * Provenance only. Expiry is decided by comparing `base_text` against the live
 * corpus, not by comparing version ids -- a re-import that did not touch a
 * given field must not expire an acceptance on it.
 */
export const corpusVersionStore = writable<string | null>(null);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun run test:unit -- --run tests/reviewDecisions.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Load decisions in the initial snapshot**

In `loadReview`, alongside the existing `edits` query (~line 116), add — and make sure `materialized_in_version_id` comes back on the edits select:

```ts
const { data: decisionData, error: decisionsError } = await supabase
	.from('edit_decisions')
	.select('id, edit_id, decision, base_text, decided_at');

// Checked, not swallowed, and matching how the edits query above handles its
// own error. `?? []` on a failed query is not "no acceptances yet" -- it is
// an unknown acceptance history rendered as an empty one, which silently
// un-applies every accepted edit on every page and looks exactly like a
// reviewer's work having been thrown away.
if (decisionsError) {
	console.error('Failed to load decisions:', decisionsError);
} else {
	decisionsStore.set((decisionData as Decision[]) ?? []);
}

// Provenance for any decision recorded this session. A failure here is not
// fatal -- the column is nullable and expiry does not depend on it -- so it
// is logged and left null rather than blocking hydration.
const { data: versionData, error: versionError } = await supabase
	.from('corpus_versions')
	.select('id')
	.order('imported_at', { ascending: false })
	.limit(1);

if (versionError) {
	console.error('Failed to load the current corpus version:', versionError);
} else {
	corpusVersionStore.set(versionData?.[0]?.id ?? null);
}
```

Both sit **before** `channel.applyHydration()`, like the queries above them — the buffer must not be replayed until the whole snapshot is in.

- [ ] **Step 6: Subscribe to decision inserts, through `runOrBuffer`**

In `initializeRealtime`, after the existing `edits` handler:

```ts
// No `filter:`, matching the edits handler above and unlike the pages one:
// edit_decisions has no review_id to filter on. Harmless -- the overlay fold
// ignores any decision whose edit is not in the store.
//
// Through runOrBuffer, like the others. A handler that writes directly drops
// every decision arriving between subscribe and the snapshot landing, and
// does it silently.
channel.on(
	'postgres_changes',
	{ event: 'INSERT', schema: 'public', table: 'edit_decisions' },
	(payload) => {
		runOrBuffer(() =>
			decisionsStore.update((rows) => {
				if (rows.find((r) => r.id === payload.new.id)) return rows;
				return [...rows, payload.new as Decision];
			})
		);
	}
);
```

- [ ] **Step 7: Run the whole unit suite**

Run: `bun run test:unit -- --run`
Expected: PASS. Baseline before this task is 240 tests; expect 240 + the tests added in Tasks 2 and 3.

- [ ] **Step 8: Commit**

```bash
git add src/lib/stores/reviewState.ts tests/reviewDecisions.test.ts
git commit -m "feat(review): record accept and revoke as an append-only log"
```

---

## Task 4: render the overlay, and stop mutating the corpus

**Files:**

- Create: `src/lib/stores/overlayStore.ts`
- Modify: `src/lib/components/EditTarget.svelte` (the `$props()` block ~line 30 and both render branches)
- Modify: `src/lib/components/Page.svelte`, `src/lib/components/Section.svelte` (thread the overlay lookup down)
- Modify: `src/lib/stores/reviewState.ts:242-295` (`saveInlineEdit` returns the persisted row)
- Modify: `src/lib/components/workspace/FieldsPanel.svelte:262-296` (record the acceptance; remove `resolved.field.set(...)`)
- Test: `tests/overlayRender.test.ts` (**jsdom**), plus one case appended to `tests/reviewDecisions.test.ts`

**Interfaces:**

- Consumes: `resolveOverlay` (Task 2); `editsStore`, `decisionsStore`, `pagesStore`, `acceptEdit` (Task 3).
- Produces:
  - `export const overlayFor: Readable<(path: string, fieldId: string) => OverlayField | undefined>`
  - `saveInlineEdit` changes signature: `Promise<boolean>` → `Promise<Edit | null>`
  - `EditTarget` gains an `overlay?: OverlayField` prop and a `data-overlay-state` attribute

**This is where D-B lands.** `FieldsPanel.saveAccepted()` currently calls `resolved.field.set(suggestion.suggested)`, mutating `pageStore.pages` in place. That mutation must go, because the overlay needs the live base copy to compare against `base_text`. Removing it is not a regression in what the reviewer sees — the overlay renders the accepted text instead, and unlike the mutation it survives a reload.

`pageStore.pages` is now **write-once**. Do not add another writer.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/overlayRender.test.ts
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import EditTarget from '$lib/components/EditTarget.svelte';
import type { OverlayField } from '$lib/corpus/overlay';

const applied: OverlayField = {
	fieldId: 'title',
	state: 'applied',
	text: 'Accepted title',
	acceptedText: 'Accepted title',
	acceptedBase: 'Original title',
	editId: 'e1'
};

const expired: OverlayField = { ...applied, state: 'expired', text: 'New base title' };

describe('EditTarget overlay rendering', () => {
	it('renders the base copy when the field has no overlay', () => {
		render(EditTarget, { fieldId: 'title', name: 'Title', value: 'Original title' });
		expect(screen.getByText('Original title')).toBeTruthy();
	});

	it('renders the accepted copy in place of the base when applied', () => {
		render(EditTarget, {
			fieldId: 'title',
			name: 'Title',
			value: 'Original title',
			overlay: applied
		});
		expect(screen.getByText('Accepted title')).toBeTruthy();
		expect(screen.queryByText('Original title')).toBeNull();
	});

	it('renders the NEW base, not the accepted copy, when the acceptance expired', () => {
		render(EditTarget, {
			fieldId: 'title',
			name: 'Title',
			value: 'New base title',
			overlay: expired
		});
		expect(screen.getByText('New base title')).toBeTruthy();
		expect(screen.queryByText('Accepted title')).toBeNull();
	});

	it('marks the state on the element so the panel and tests can find it', () => {
		const { container } = render(EditTarget, {
			fieldId: 'title',
			name: 'Title',
			value: 'New base title',
			overlay: expired
		});
		expect(container.querySelector('[data-overlay-state="expired"]')).toBeTruthy();
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun run test:unit -- --run tests/overlayRender.test.ts`
Expected: FAIL — the accepted-copy and expired cases render `Original title` / find no `data-overlay-state`.

- [ ] **Step 3: Add the overlay prop to `EditTarget`**

In the `$props()` block, add:

```ts
/**
 * What this field should actually render, folded from the accepted edits.
 * Undefined means no accepted edit stands for it, and `value` -- the
 * corpus copy -- is what shows.
 *
 * `value` stays the base copy in both cases, deliberately. When an
 * acceptance has expired the base is what renders (design decision 15),
 * and the panel needs the base to offer re-confirmation against.
 */
overlay = undefined;
```

with the type `overlay?: OverlayField | undefined;`, and derive:

```ts
const shown = $derived(overlay?.text ?? value);
```

Then replace `{value}` with `{shown}` in **both** branches, and add `data-overlay-state={overlay?.state}` to both wrapper elements.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun run test:unit -- --run tests/overlayRender.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write the store bridge**

```ts
// src/lib/stores/overlayStore.ts
/**
 * The bridge between the two state systems.
 *
 * `editsStore`, `decisionsStore` and `pagesStore` are Svelte 4 `writable` stores;
 * `pageStore` is a runes class. Rather than reach across that boundary in a
 * component, the fold happens here on the v4 side as a `derived`, and runes
 * components read it with `$overlayFor` like any other store.
 *
 * Keyed by `pages.path`, which is the corpus page's derived id -- the same join
 * `HelpPanel` and the review layout already make (`p.path === pageData.id`).
 */
import { derived, type Readable } from 'svelte/store';
import { resolveOverlay, type OverlayField } from '$lib/corpus/overlay';
import { resolveField } from '$lib/corpus/fieldResolver';
import { pageStore } from '$lib/stores/pageData.svelte';
import { editsStore, decisionsStore, pagesStore } from '$lib/stores/reviewState';

export const overlayFor: Readable<(path: string, fieldId: string) => OverlayField | undefined> =
	derived([editsStore, decisionsStore, pagesStore], ([edits, decisions, pages]) => {
		const byPath = new Map<string, Map<string, OverlayField>>();

		for (const livePage of pages) {
			const corpusPage = pageStore.pages.find((p) => p.id === livePage.path);
			if (!corpusPage) continue;

			byPath.set(
				livePage.path,
				resolveOverlay(
					// The comparand is the text EditTarget renders, unwrapping the
					// `{ text, unverified }` entry shape exactly as the renderer does.
					(fieldId) => resolveField(corpusPage, fieldId)?.value ?? null,
					edits
						.filter((e) => e.page_id === livePage.id && e.id)
						.map((e) => ({
							id: e.id as string,
							field_id: e.field_id,
							new_content: e.new_content,
							materialized_in_version_id: e.materialized_in_version_id ?? null
						})),
					decisions
				)
			);
		}

		return (path: string, fieldId: string) => byPath.get(path)?.get(fieldId);
	});
```

- [ ] **Step 6: Pass the overlay down from the render path**

Every `EditTarget` gets an `overlay` prop looked up by the same `fieldId` it already passes. `Section.svelte` has no page in scope, so it takes a `pageId` prop.

In `src/lib/components/Page.svelte`, import the store and thread the id through:

```svelte
<script lang="ts">
	import { overlayFor } from '$lib/stores/overlayStore';
	// ... existing imports
</script>

<EditTarget
	as="h1"
	class="page-title"
	name="Title"
	fieldId="title"
	value={page.title}
	overlay={$overlayFor(page.id, 'title')}
/>

<EditTarget
	name="Summary"
	fieldId="summary"
	value={page.summary}
	overlay={$overlayFor(page.id, 'summary')}
/>

{#each page.audience as a, i (i)}
	<EditTarget
		name={`Audience [${i + 1}]`}
		fieldId={`audience.${i}`}
		value={a}
		overlay={$overlayFor(page.id, `audience.${i}`)}
	/>
{/each}

{#each page.sections as section, index (section.fieldKey ?? index)}
	<Section {section} {index} pageId={page.id} />
{/each}
```

In `src/lib/components/Section.svelte`, accept the id and use it at each of the five call sites (heading, paragraphs, bullets, callout title, callout text):

```svelte
<script lang="ts">
	import { overlayFor } from '$lib/stores/overlayStore';
	let { section, index, pageId } = $props();
</script>

<EditTarget
	as="h2"
	name={`Section [${index + 1}] Heading`}
	fieldId={`sections.${key}.heading`}
	value={section.heading}
	overlay={$overlayFor(pageId, `sections.${key}.heading`)}
/>

{#each section.paragraphs as p, i (i)}
	<EditTarget
		name={`Section [${index + 1}] Paragraph`}
		fieldId={`sections.${key}.paragraphs.${i}`}
		value={entryText(p)}
		unverified={entryUnverified(p)}
		overlay={$overlayFor(pageId, `sections.${key}.paragraphs.${i}`)}
	/>
{/each}
```

Bullets, callout title and callout text follow the same shape with their own field ids — `sections.${key}.bullets.${i}`, `sections.${key}.callout.title`, `sections.${key}.callout.text`. Keep the existing `name`, `as` and `unverified` props exactly as they are; only `overlay` is new.

- [ ] **Step 7: Make `saveInlineEdit` return the row it saved**

Accepting an edit needs the edit's id, and today `saveInlineEdit` returns only a boolean — so on its own, removing the corpus mutation in Step 8 would leave the save path with nothing to accept, no `edit_decisions` row, and a rewrite that vanishes _immediately_ as well as on reload. These two steps only make sense together.

In `src/lib/stores/reviewState.ts`, widen the return type. The boolean contract stays intact at the call sites (`null` is falsy, and the reason it returns anything at all — `saveAccepted` used to treat a resolved promise as a save — is unchanged):

```ts
/**
 * Saves an inline text edit optimistically.
 *
 * Returns the persisted row, or null if it never reached the database. It
 * returns the ROW rather than a boolean because the caller has to record an
 * acceptance against it, and an acceptance needs the edit's id -- `edits` is
 * append-only, so there is no later query that identifies "the row I just
 * wrote" unambiguously.
 */
export async function saveInlineEdit(
	pageId: string,
	fieldId: string,
	newContent: string
): Promise<Edit | null> {
```

Then change the three `return false;` statements in its body to `return null;`, the trailing `return true;` to `return data as Edit;`, and confirm the optimistic-rollback branches are otherwise untouched.

- [ ] **Step 8: Record the acceptance, and remove the corpus mutation**

In `src/lib/components/workspace/FieldsPanel.svelte`, replace the persist-then-mutate block inside `saveAccepted`'s loop:

```ts
// The base copy, read BEFORE anything is written. With the corpus now
// pristine this is the text the mockup is showing, which is exactly
// what the acceptance has to be recorded against -- passing the
// rewrite here instead would make the acceptance permanently fresh and
// it would never expire when the mockup is re-ported.
const baseText = resolved.field.value;

if (savePageId) {
	const saved = await saveInlineEdit(savePageId, fieldId, suggestion.suggested);
	if (!saved?.id) {
		failed.push(fieldId);
		continue;
	}

	// Two writes, and the edit alone is not enough: `resolveOverlay`
	// ignores an edit with no accept decision, so without this the
	// rewrite is stored and never rendered. Forgetting the suggestion
	// below is what removes the reviewer's retry path, so it must not
	// happen until both writes have landed.
	const accepted = await acceptEdit(saved.id, baseText);
	if (!accepted) {
		failed.push(fieldId);
		continue;
	}
}

// No corpus write. The overlay is what puts the rewrite on the page,
// and it needs the live base copy to compare an acceptance against;
// writing through the resolver here would destroy that base in memory.
// It is also, before the overlay existed, why a rewrite vanished on
// reload -- an in-memory mutation is not persistence.
pageStore.forgetSuggestion(fieldId);
```

and add `acceptEdit` to the existing `reviewState` import.

`resolved` is still needed — it proves the field is live and supplies `baseText` — so keep the `resolveFields` call and the `missing` branch.

**Known gap, and deliberately not closed here:** the edit and its acceptance are two round trips with no transaction, so a failure between them leaves an unaccepted edit row. That is harmless — an unaccepted edit is invisible to the overlay, exactly like the state before this slice — and the field lands in `failed`, so the reviewer keeps the suggestion and can retry. Making it atomic needs an RPC, which is worth doing when something other than this one path writes decisions.

- [ ] **Step 9: Test that a saved suggestion is actually accepted**

Add to `tests/reviewDecisions.test.ts`:

```ts
it('records an accept against the base copy, not the rewrite', async () => {
	// Guards the failure this step exists for: the edit persists, no decision is
	// written, and the overlay ignores the edit -- so the rewrite is stored and
	// never shown.
	const { saveInlineEdit, acceptEdit } = await load();
	const saved = await saveInlineEdit('p1', 'title', 'Rewritten title');
	expect(saved?.id).toBeTruthy();
	await acceptEdit(saved!.id as string, 'Original title');
	expect(insert).toHaveBeenLastCalledWith(
		expect.objectContaining({ decision: 'accept', base_text: 'Original title' })
	);
});
```

Run: `bun run test:unit -- --run tests/reviewDecisions.test.ts`
Expected: PASS.

- [ ] **Step 10: Verify no other writer mutates the pristine corpus**

Run: `grep -rn '\.field\.set(\|\.set(' src/lib/components src/lib/stores --include='*.svelte' --include='*.ts' | grep -v 'Store\.set\|\.set(previous'`
Expected: no `ResolvedField.set` callers remain outside `fieldResolver.ts` itself. If one appears, it is a second writer to a store that is now write-once — fix it here rather than leaving it.

- [ ] **Step 11: Run the full gate**

Run: `bun run verify`
Expected: two PASS lines, and a test count with no `?` in it. A `(? passed)` means a test failed — read `$TMPDIR/hhvc-verify.log`.

- [ ] **Step 12: Commit**

```bash
git add src/lib/stores/overlayStore.ts src/lib/components tests/overlayRender.test.ts
git commit -m "feat(review): re-apply accepted edits at render, keeping the corpus pristine"
```

---

## Task 5: the re-confirm affordance

**Files:**

- Create: `src/lib/components/workspace/ReconfirmPanel.svelte`
- Modify: `src/lib/components/workspace/ReviewWorkspace.svelte` (mount it)
- Modify: `src/lib/corpus/fieldResolver.ts` (add `fieldIdsOf`)
- Test: `tests/reconfirmPanel.test.ts` (**jsdom**), plus one case in `src/lib/corpus/fieldResolver.test.ts` (**node**)

**Interfaces:**

- Consumes: `overlayFor` (Task 4); `acceptEdit`, `revokeEdit` (Task 3).
- Produces:
  - a component taking `{ pageId: string; path: string }`
  - `export function fieldIdsOf(page: AnyPage | undefined | null): string[]` in `fieldResolver.ts`

Design decision 15: the reviewer sees the old base, the accepted text, and the new base, and chooses. Re-confirming is a **new accept row** carrying the new base text — not an update to the old one.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/reconfirmPanel.test.ts
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { get } from 'svelte/store';

const acceptEdit = vi.fn(async () => true);
const revokeEdit = vi.fn(async () => true);
vi.mock('$lib/stores/reviewState', async (orig) => ({
	...(await orig<Record<string, unknown>>()),
	acceptEdit,
	revokeEdit
}));

import ReconfirmPanel from '$lib/components/workspace/ReconfirmPanel.svelte';
import { editsStore, decisionsStore, pagesStore } from '$lib/stores/reviewState';

// One expired acceptance: the edit was accepted against copy that has since
// moved, so `resolveOverlay` reports `expired` and the panel has a row to show.
// `pagesStore` supplies the path→id join `overlayStore` folds on.
beforeEach(() => {
	acceptEdit.mockClear();
	revokeEdit.mockClear();
	pagesStore.set([
		{
			id: 'p1',
			review_id: 'r1',
			path: 'topic-x--about',
			status: 'needs-review',
			manager_notes: null,
			page_checks: null
		}
	]);
	editsStore.set([
		{
			id: 'e1',
			page_id: 'p1',
			field_id: 'sections.about.paragraphs.0',
			new_content: 'Rewritten copy.',
			created_at: '2026-08-25T09:00:00Z',
			materialized_in_version_id: null
		}
	]);
	decisionsStore.set([
		{
			id: 'd1',
			edit_id: 'e1',
			decision: 'accept',
			// Not what the corpus says now — which is what makes it expired.
			base_text: 'Copy as it was when accepted.',
			decided_at: '2026-08-25T10:00:00Z'
		}
	]);
});

describe('ReconfirmPanel', () => {
	it('shows all three texts for an expired acceptance', () => {
		render(ReconfirmPanel, { pageId: 'p1', path: 'topic-x--about' });
		expect(screen.getByText(/Copy as it was when accepted/)).toBeTruthy();
		expect(screen.getByText(/Rewritten copy/)).toBeTruthy();
		expect(screen.getByText(/Original copy/)).toBeTruthy();
	});

	it('re-confirming writes a NEW accept against the new base', async () => {
		render(ReconfirmPanel, { pageId: 'p1', path: 'topic-x--about' });
		await fireEvent.click(screen.getByRole('button', { name: /re-confirm/i }));
		expect(acceptEdit).toHaveBeenCalledWith('e1', 'Original copy.');
	});

	it('discarding revokes rather than deleting', async () => {
		render(ReconfirmPanel, { pageId: 'p1', path: 'topic-x--about' });
		await fireEvent.click(screen.getByRole('button', { name: /discard/i }));
		expect(revokeEdit).toHaveBeenCalledWith('e1');
	});

	it('renders nothing when no acceptance on the page has expired', () => {
		decisionsStore.set([]);
		const { container } = render(ReconfirmPanel, { pageId: 'p1', path: 'topic-x--about' });
		expect(container.textContent?.trim()).toBe('');
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun run test:unit -- --run tests/reconfirmPanel.test.ts`
Expected: FAIL — cannot resolve `ReconfirmPanel.svelte`.

- [ ] **Step 3: Write the component**

> **Before writing it:** the seed above assumes a real page. `overlayStore` folds through `resolveField` against the live corpus, so a `path` / `field_id` pair that does not exist in `src/lib/data` resolves to `null` and the overlay comes back empty — the panel renders nothing and every assertion fails for a reason that looks like a component bug. Pick an actual page id and paragraph from `src/lib/data/index.ts`, and use that paragraph's real text as the "Copy now" expectation in the test.

```svelte
<script lang="ts">
	import { overlayFor } from '$lib/stores/overlayStore';
	import { acceptEdit, revokeEdit } from '$lib/stores/reviewState';
	import type { OverlayField } from '$lib/corpus/overlay';
	import { fieldIdsOf } from '$lib/corpus/fieldResolver';
	import { pageStore } from '$lib/stores/pageData.svelte';

	/**
	 * Re-confirmation for accepted edits whose base copy moved under them.
	 *
	 * The mockup already renders the NEW base for these (design decision 15), so
	 * nothing here is blocking -- this panel exists so the change is visible
	 * rather than silent, which is the failure the whole overlay is for.
	 *
	 * Re-confirming writes a NEW accept row carrying the new base text. It does
	 * not update the old row: the log is append-only, and a re-confirmation is a
	 * decision in its own right.
	 */
	let { pageId, path }: { pageId: string; path: string } = $props();

	const corpusPage = $derived(pageStore.pages.find((p) => p.id === path));

	const expired = $derived.by(() => {
		const page = corpusPage;
		if (!page) return [] as OverlayField[];
		const lookup = $overlayFor;
		const out: OverlayField[] = [];
		for (const fieldId of fieldIdsOf(page)) {
			const field = lookup(path, fieldId);
			if (field?.state === 'expired') out.push(field);
		}
		return out;
	});

	let busy = $state<string | undefined>(undefined);

	async function reconfirm(field: OverlayField) {
		busy = field.editId;
		// `field.text` is the NEW base -- what the mockup shows now, and what this
		// acceptance is being made against.
		await acceptEdit(field.editId, field.text);
		busy = undefined;
	}

	async function discard(field: OverlayField) {
		busy = field.editId;
		await revokeEdit(field.editId);
		busy = undefined;
	}
</script>

{#if expired.length > 0}
	<section
		class="border-sfds-slate-l3 border-t px-5 py-4"
		aria-label="Edits needing re-confirmation"
	>
		<h2 class="text-sfds-black text-sm font-semibold">
			{expired.length}
			{expired.length === 1 ? 'edit needs' : 'edits need'} re-confirming
		</h2>
		<p class="text-sfds-slate-l2 mt-1 text-sm leading-[20px]">
			The mockup copy changed after these were accepted, so the page is showing the new copy.
		</p>

		{#each expired as field (field.editId)}
			<div class="border-sfds-slate-l3 mt-4 border-t pt-4">
				<p class="text-sfds-slate-l2 text-xs font-semibold uppercase">Copy when accepted</p>
				<p class="text-sm leading-[20px]">{field.acceptedBase}</p>

				<p class="text-sfds-slate-l2 mt-2 text-xs font-semibold uppercase">Your rewrite</p>
				<p class="text-sm leading-[20px]">{field.acceptedText}</p>

				<p class="text-sfds-slate-l2 mt-2 text-xs font-semibold uppercase">Copy now</p>
				<p class="text-sm leading-[20px]">{field.text}</p>

				<div class="mt-3 flex gap-2">
					<button
						type="button"
						class="btn-primary"
						disabled={busy === field.editId}
						onclick={() => reconfirm(field)}
					>
						Re-confirm my rewrite
					</button>
					<button
						type="button"
						class="btn-secondary"
						disabled={busy === field.editId}
						onclick={() => discard(field)}
					>
						Discard it
					</button>
				</div>
			</div>
		{/each}
	</section>
{/if}
```

`fieldIdsOf(page)` does not exist yet. Add it to `src/lib/corpus/fieldResolver.ts` — it is the resolver's own knowledge of which ids a page has, and putting it anywhere else makes a second definition of the field-id vocabulary:

```ts
/**
 * Every field id a page currently exposes as an edit target.
 *
 * The inverse of `resolveField`, and deliberately in the same file: these two
 * are one definition of what a field id can be, and a second copy elsewhere
 * would be free to drift from the ids `EditTarget` actually renders.
 */
export function fieldIdsOf(page: AnyPage | undefined | null): string[] {
	if (!page) return [];
	const ids: string[] = [];
	if (typeof page.title === 'string') ids.push('title');
	if (typeof page.summary === 'string') ids.push('summary');
	(page.audience ?? []).forEach((_: unknown, i: number) => ids.push(`audience.${i}`));

	for (const section of page.sections ?? []) {
		const key = section?.fieldKey;
		if (typeof key !== 'string') continue;
		if (typeof section.heading === 'string') ids.push(`sections.${key}.heading`);
		(section.paragraphs ?? []).forEach((_: unknown, i: number) =>
			ids.push(`sections.${key}.paragraphs.${i}`)
		);
		(section.bullets ?? []).forEach((_: unknown, i: number) =>
			ids.push(`sections.${key}.bullets.${i}`)
		);
		if (section.callout?.title !== undefined) ids.push(`sections.${key}.callout.title`);
		if (section.callout?.text !== undefined) ids.push(`sections.${key}.callout.text`);
	}
	return ids;
}
```

Add one test for it in `src/lib/corpus/fieldResolver.test.ts`: every id it returns must resolve — `fieldIdsOf(page).every((id) => resolveField(page, id) !== null)` over a real corpus page. That is the property that keeps the two functions from drifting.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun run test:unit -- --run tests/reconfirmPanel.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Verify it in the real app, not just jsdom**

Run: `bun run dev`, then sign in locally, accept an edit, change that paragraph in its `src/lib/data/*.ts` module, and reload.
Expected: the page shows the **new** module copy, and the re-confirm panel lists the field with all three texts. Console clean. Capture a screenshot.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/workspace/ReconfirmPanel.svelte src/lib/components/workspace/ReviewWorkspace.svelte tests/reconfirmPanel.test.ts
git commit -m "feat(review): offer re-confirmation when an accepted edit's base copy moves"
```

---

## Task 6: documentation, and the ship gate

**Files:**

- Modify: `CLAUDE.md` (the RLS policy matrix in the Supabase section)
- Modify: `PLAN.md`
- Modify: `docs/superpowers/specs/2026-08-23-mockup-version-history-design.md` (status line)

- [ ] **Step 1: Add `edit_decisions` to the RLS matrix in `CLAUDE.md`**

```markdown
| `edit_decisions` | all | own | — | — |
```

and extend the paragraph on deliberate shapes: `edit_decisions` has no UPDATE or DELETE for the same reason `edits` does not — accept and revoke are both rows, so the action that decides what the mockup says is not the one action with no history.

- [ ] **Step 2: Record the slice in `PLAN.md`** — slice 3 done, slice 2 (`page_notes`) still open and **not** a dependency of it, slices 4 and 5 unstarted.

- [ ] **Step 3: Settle the ship gate — design decision 11, "who may accept"**

**This is a blocking gate, and it is the reason this task is in the plan rather than in a chat message.** The spec says: _"Gate: decision 11 (who may accept) must be settled before this ships to anyone but you."_

What is implemented is **any authenticated reviewer may accept or revoke** — `edit_decisions_insert_own` constrains only _whose name is on the row_, not _who is allowed to decide_. That is the spec's stated interim position, and it is the right one while the tool has a single reviewer.

- [ ] Confirm with the repo owner that the hosted project still has exactly one reviewer, **or** narrow `edit_decisions_insert_own` before a second reviewer is invited.
- [ ] Note that `disable_signup=true`, so a second reviewer can only arrive by an explicit invite from the Supabase dashboard — that invite is the moment this gate binds.

Do not merge to `main` with this box unticked.

- [ ] **Step 4: Full gate, then ship**

Run: `bun run verify`
Expected: two PASS lines.

Then: push, `gh pr create`, `gh pr checks --watch`, and **ask before merging** — a merge to `main` publishes production on Netlify.

- [ ] **Step 5: Verify the live deploy**

Root returns 200, the deployed commit matches the merged SHA, console clean. A green build is not a serving deploy.

---

## Testing checklist (from the spec's Testing section)

Each item maps to a task. Ticked when its test is green, not when its code is written.

- [ ] Overlay substitutes the correct field and only that field — Task 2
- [ ] An accepted edit whose base field changed renders the **new base**, not the accepted text — Tasks 2 and 4
- [ ] Revoking after accepting leaves both rows and resolves to the base copy — Task 2
- [ ] `materialize` then re-import does not double-apply the folded edit — Task 2 (`materialized_in_version_id` skip; the script itself is slice 5)
- [ ] `field_id` derivation is unchanged by this work — existing `tests/inlineEditFieldId.test.ts` must stay green
- [ ] Decisions arriving in the hydration window are not dropped — Task 3
- [ ] Accepting a suggestion writes **both** the edit and its accept decision, against the base copy — Task 4
- [ ] A failed decision insert removes only its own optimistic row, not concurrent ones — Task 3
- [ ] A failed decision snapshot query is reported, not rendered as an empty acceptance history — Task 3
- [ ] The pristine corpus has exactly one writer — Task 4 Step 8

Not covered here, and deliberately: content hashing stability, `karl`/`editorNote` not minting a version, double `corpus:import`, `corpus.lock` vs CI, and the hosted seed's `auth.` writes are all **slice 1**, already landed and already tested.
