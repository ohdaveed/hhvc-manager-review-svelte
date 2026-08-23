# Corpus Versioning Foundation (Slice 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seed the hosted Supabase project with real review scaffolding, and record a hashed snapshot of the mockup corpus on every import so later slices can diff versions and expire stale accepted edits.

**Architecture:** A generator emits two seed files from `allPages` — the existing local one (which creates a dev password user) and a new hosted-safe one that writes only `reviews` and `pages`. A shared field-extraction module turns each page into a `field_id → text` map using the same id shapes the UI already advertises, which is then hashed per field and per page. `corpus:import` writes one `corpus_versions` row plus a `page_versions` row per page, and regenerates a committed `corpus.lock` so CI can detect an un-imported corpus with no database access.

**Tech Stack:** Bun, TypeScript, Vitest, Supabase (PostgREST + `@supabase/supabase-js` with a service-role key), Postgres 15, SvelteKit 2.

**Spec:** `docs/superpowers/specs/2026-08-23-mockup-version-history-design.md`

## Global Constraints

- Package manager is **bun**. Use `bun run <script>`, never `npm run`.
- **There is no `svelte.config.js`.** SvelteKit config lives in `vite.config.ts`.
- Public env vars use the **`SVELTE_PUBLIC_`** prefix, not `PUBLIC_`.
- Vitest project split is decided by file **location**: `src/**/*.{test,spec}.{js,ts}` and `tests/**/*.spec.ts` run in the **server** project (node); `tests/**/*.test.ts` runs in the **client** project (jsdom). New node-side tests in this plan go in `tests/*.spec.ts` or `src/**/*.test.ts`.
- **Never apply `supabase/seed.sql` to the hosted project.** It inserts an `auth.users` row with the hardcoded password `dev-local-only`.
- The Supabase CLI is **not installed**. Hosted DDL and data writes go through the Management API `POST /v1/projects/{ref}/database/query` or through `@supabase/supabase-js` with `SUPABASE_SERVICE_ROLE_KEY`.
- Hosted project ref: **`kiynekyzqxneepjipqhg`**.
- `SUPABASE_SERVICE_ROLE_KEY` and `SVELTE_PUBLIC_SUPABASE_URL` come from `.env.local`, which Bun loads automatically — the pattern `scripts/sync-checks.ts` already uses.
- Existing `field_id` shapes are **authoritative and must not change**: `title`, `summary`, `audience.<i>`, `sections.<key>.heading`, `sections.<key>.paragraphs.<i>`, `sections.<key>.bullets.<i>`, `sections.<key>.callout.title`, `sections.<key>.callout.text`.
- `bun run lint` is red on the current tree for pre-existing reasons. Do not reformat unrelated files.
- `bun run check` has a pre-existing error baseline (~55). Compare against it; do not expect zero.
- Run `bun run verify` before claiming a task is done.

## File Structure

| File                                                     | Responsibility                                                                                 |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `src/lib/corpus/fieldKey.ts`                             | **new** — single definition of the section field-key derivation (heading slug, index fallback) |
| `src/lib/stores/pageData.svelte.ts`                      | **modify** — import `deriveFieldKey` instead of defining it inline                             |
| `src/lib/corpus/fields.ts`                               | **new** — `extractFields(page)` → `field_id → text` map for reader-visible copy only           |
| `src/lib/corpus/fields.test.ts`                          | **new** — asserts exact id shapes and that annotations are excluded                            |
| `src/lib/corpus/hash.ts`                                 | **new** — `hashText`, `hashFields`; stable under key insertion order                           |
| `src/lib/corpus/hash.test.ts`                            | **new** — stability and sensitivity tests                                                      |
| `scripts/gen-seed.ts`                                    | **modify** — emit both `seed.sql` and `seed.hosted.sql`                                        |
| `supabase/seed.hosted.sql`                               | **new, generated** — review + pages only, no `auth.*`                                          |
| `tests/seedHosted.spec.ts`                               | **new** — guards that the hosted seed contains no auth writes                                  |
| `supabase/migrations/20260823060000_corpus_versions.sql` | **new** — `corpus_versions`, `page_versions`, RLS                                              |
| `scripts/corpus-import.ts`                               | **new** — writes a version, regenerates the lockfile                                           |
| `scripts/corpus-lock.ts`                                 | **new** — builds the lock object from `allPages` (shared by import and check)                  |
| `corpus.lock`                                            | **new, generated** — committed hash manifest                                                   |
| `scripts/check-corpus-lock.ts`                           | **new** — offline CI check                                                                     |
| `.gitattributes`                                         | **new** — marks `corpus.lock` as regenerate-not-merge                                          |
| `.github/workflows/pr.yml`                               | **modify** — run the lock check                                                                |
| `package.json`                                           | **modify** — `corpus:import`, `corpus:lock`, `corpus:check` scripts                            |

---

### Task 1: Single-source the section field key

Extracting fields for hashing must produce **exactly** the ids the UI advertises. Today the derivation lives inside `pageData.svelte.ts` as a private function; copying it into a second module is precisely the drift CLAUDE.md warns about. Extract it once and have both callers import it.

**Files:**

- Create: `src/lib/corpus/fieldKey.ts`
- Modify: `src/lib/stores/pageData.svelte.ts` (replace the inline `withFieldKey` body)
- Test: `src/lib/corpus/fieldKey.test.ts`

**Interfaces:**

- Consumes: nothing
- Produces: `deriveFieldKey(section: { heading?: unknown }, index: number): string`

- [ ] **Step 1: Write the failing test**

Create `src/lib/corpus/fieldKey.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { deriveFieldKey } from './fieldKey.js';

describe('deriveFieldKey', () => {
	it('slugifies the heading', () => {
		expect(deriveFieldKey({ heading: 'How to report' }, 0)).toBe('how-to-report');
	});

	it('strips punctuation and collapses runs', () => {
		expect(deriveFieldKey({ heading: 'What happens next?' }, 0)).toBe('what-happens-next');
		expect(deriveFieldKey({ heading: '  Article 11 -- compliance  ' }, 0)).toBe(
			'article-11-compliance'
		);
	});

	it('falls back to the index when there is no usable heading', () => {
		expect(deriveFieldKey({}, 3)).toBe('section-3');
		expect(deriveFieldKey({ heading: '???' }, 2)).toBe('section-2');
	});

	it('ignores a non-string heading', () => {
		expect(deriveFieldKey({ heading: 42 }, 1)).toBe('section-1');
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- --run src/lib/corpus/fieldKey.test.ts`
Expected: FAIL — cannot resolve `./fieldKey.js`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/corpus/fieldKey.ts`:

```ts
/**
 * Single definition of a section's stable field key.
 *
 * Derived from the heading rather than the array index, so inserting or
 * reordering a section does not renumber the ones after it and orphan every
 * edit saved against their old positions. Imported by both
 * `pageData.svelte.ts` (which stamps `fieldKey` onto the pristine corpus) and
 * `corpus/fields.ts` (which hashes it). Two copies would be free to drift, and
 * a drifted key silently files edits under an id nothing reads.
 */
export function deriveFieldKey(section: { heading?: unknown }, index: number): string {
	const heading = typeof section.heading === 'string' ? section.heading : '';
	const slug = heading
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

	return slug || `section-${index}`;
}
```

- [ ] **Step 4: Point `pageData.svelte.ts` at it**

In `src/lib/stores/pageData.svelte.ts`, add the import at the top of the import block:

```ts
import { deriveFieldKey } from '$lib/corpus/fieldKey.js';
```

Then replace the body of `withFieldKey` so the derivation is no longer duplicated, keeping the surrounding doc comment intact:

```ts
function withFieldKey(section: Record<string, unknown>, index: number) {
	return { ...section, fieldKey: deriveFieldKey(section, index) };
}
```

- [ ] **Step 5: Run the new test and the existing field-id guard**

Run: `bun run test:unit -- --run src/lib/corpus/fieldKey.test.ts tests/inlineEditFieldId.test.ts`
Expected: PASS for both. `tests/inlineEditFieldId.test.ts` is the regression gate — it renders real components and asserts the ids match `data-rewrite-field`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/corpus/fieldKey.ts src/lib/corpus/fieldKey.test.ts src/lib/stores/pageData.svelte.ts
git commit -m "refactor(corpus): single-source the section field key derivation"
```

---

### Task 2: Extract reader-visible fields

**Files:**

- Create: `src/lib/corpus/fields.ts`
- Test: `src/lib/corpus/fields.test.ts`

**Interfaces:**

- Consumes: `deriveFieldKey` from Task 1
- Produces: `type FieldMap = Record<string, string>` and `extractFields(page: CorpusPage): FieldMap`

Reader-visible copy only (spec decision 12): `title`, `summary`, `audience[]`, section headings, paragraphs, bullets, callout title and text. **Excluded:** `karl`, `editorNote`, `editorStatus`, `slug`, `type`, `reading` — these are snapshotted in `page_versions.content` but must not affect the hash, or fixing a typo in an editor note would mint a corpus version.

- [ ] **Step 1: Write the failing test**

Create `src/lib/corpus/fields.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { extractFields } from './fields.js';

const page = {
	slug: 'sf.gov/topic-x--about',
	type: 'About us',
	title: 'About vector control',
	summary: 'What the program does.',
	audience: ['Residents', 'Property owners'],
	reading: 'Grade 6',
	editorStatus: 'placeholder',
	editorNote: 'An annotation that must not be hashed.',
	sections: [
		{
			heading: 'How to report',
			karl: 'Maps to an Information block.',
			paragraphs: ['First paragraph.', 'Second paragraph.'],
			bullets: ['First bullet.']
		},
		{
			heading: 'What happens next',
			paragraphs: ['Only paragraph.'],
			callout: { title: 'Note', text: 'Callout body.' }
		}
	]
};

describe('extractFields', () => {
	it('produces the exact id shapes the UI advertises', () => {
		expect(Object.keys(extractFields(page)).sort()).toEqual(
			[
				'audience.0',
				'audience.1',
				'sections.how-to-report.bullets.0',
				'sections.how-to-report.heading',
				'sections.how-to-report.paragraphs.0',
				'sections.how-to-report.paragraphs.1',
				'sections.what-happens-next.callout.text',
				'sections.what-happens-next.callout.title',
				'sections.what-happens-next.heading',
				'sections.what-happens-next.paragraphs.0',
				'summary',
				'title'
			].sort()
		);
	});

	it('maps ids to their text', () => {
		const fields = extractFields(page);
		expect(fields['title']).toBe('About vector control');
		expect(fields['audience.1']).toBe('Property owners');
		expect(fields['sections.how-to-report.paragraphs.1']).toBe('Second paragraph.');
		expect(fields['sections.what-happens-next.callout.text']).toBe('Callout body.');
	});

	it('excludes annotations and metadata', () => {
		const keys = Object.keys(extractFields(page));
		expect(keys).not.toContain('editorNote');
		expect(keys).not.toContain('karl');
		expect(keys).not.toContain('type');
		expect(keys).not.toContain('reading');
		expect(keys).not.toContain('slug');
	});

	it('omits absent optional collections rather than emitting empty ids', () => {
		const bare = { title: 'T', sections: [{ heading: 'H' }] };
		expect(Object.keys(extractFields(bare)).sort()).toEqual(['sections.h.heading', 'title']);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- --run src/lib/corpus/fields.test.ts`
Expected: FAIL — cannot resolve `./fields.js`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/corpus/fields.ts`:

```ts
import { deriveFieldKey } from './fieldKey.js';

export type FieldMap = Record<string, string>;

type Callout = { title?: unknown; text?: unknown };
type Section = {
	heading?: unknown;
	paragraphs?: unknown;
	bullets?: unknown;
	callout?: Callout;
};
export type CorpusPage = {
	title?: unknown;
	summary?: unknown;
	audience?: unknown;
	sections?: unknown;
};

const str = (value: unknown): string | null => (typeof value === 'string' ? value : null);
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/**
 * Reader-visible copy only, keyed by the same ids the edit targets advertise as
 * `data-rewrite-field`. Annotations (`karl`, `editorNote`, `editorStatus`) and
 * metadata (`slug`, `type`, `reading`) are deliberately absent: they travel in
 * `page_versions.content` but must not feed the hash, or editing a note would
 * mint a corpus version and show up as a copy change.
 */
export function extractFields(page: CorpusPage): FieldMap {
	const fields: FieldMap = {};

	const title = str(page.title);
	if (title !== null) fields['title'] = title;

	const summary = str(page.summary);
	if (summary !== null) fields['summary'] = summary;

	list(page.audience).forEach((entry, i) => {
		const text = str(entry);
		if (text !== null) fields[`audience.${i}`] = text;
	});

	list(page.sections).forEach((raw, index) => {
		const section = (raw ?? {}) as Section;
		const key = deriveFieldKey(section, index);

		const heading = str(section.heading);
		if (heading !== null) fields[`sections.${key}.heading`] = heading;

		list(section.paragraphs).forEach((entry, i) => {
			const text = str(entry);
			if (text !== null) fields[`sections.${key}.paragraphs.${i}`] = text;
		});

		list(section.bullets).forEach((entry, i) => {
			const text = str(entry);
			if (text !== null) fields[`sections.${key}.bullets.${i}`] = text;
		});

		const calloutTitle = str(section.callout?.title);
		if (calloutTitle !== null) fields[`sections.${key}.callout.title`] = calloutTitle;

		const calloutText = str(section.callout?.text);
		if (calloutText !== null) fields[`sections.${key}.callout.text`] = calloutText;
	});

	return fields;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test:unit -- --run src/lib/corpus/fields.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/corpus/fields.ts src/lib/corpus/fields.test.ts
git commit -m "feat(corpus): extract reader-visible fields keyed by field_id"
```

---

### Task 3: Stable hashing

**Files:**

- Create: `src/lib/corpus/hash.ts`
- Test: `src/lib/corpus/hash.test.ts`

**Interfaces:**

- Consumes: `FieldMap` from Task 2
- Produces: `hashText(text: string): string`, `hashFields(fields: FieldMap): { pageHash: string; fieldHashes: Record<string, string> }`

Hashing the sorted `field_id → text` map rather than the raw module object is what makes the hash stable under key reordering — a plain `JSON.stringify` of the module would change if you moved `summary` above `title`, and every import would look like a change.

- [ ] **Step 1: Write the failing test**

Create `src/lib/corpus/hash.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { hashText, hashFields } from './hash.js';

describe('hashText', () => {
	it('is a stable hex sha256', () => {
		expect(hashText('hello')).toBe(hashText('hello'));
		expect(hashText('hello')).toMatch(/^[0-9a-f]{64}$/);
	});

	it('is sensitive to content', () => {
		expect(hashText('hello')).not.toBe(hashText('hello '));
	});
});

describe('hashFields', () => {
	it('is stable under key insertion order', () => {
		const a = hashFields({ title: 'T', summary: 'S', 'audience.0': 'A' });
		const b = hashFields({ 'audience.0': 'A', title: 'T', summary: 'S' });
		expect(a.pageHash).toBe(b.pageHash);
		expect(a.fieldHashes).toEqual(b.fieldHashes);
	});

	it('changes when any field changes', () => {
		const before = hashFields({ title: 'T', summary: 'S' });
		const after = hashFields({ title: 'T', summary: 'S!' });
		expect(after.pageHash).not.toBe(before.pageHash);
		expect(after.fieldHashes['title']).toBe(before.fieldHashes['title']);
		expect(after.fieldHashes['summary']).not.toBe(before.fieldHashes['summary']);
	});

	it('changes when a field is added or removed', () => {
		const base = hashFields({ title: 'T' });
		expect(hashFields({ title: 'T', summary: 'S' }).pageHash).not.toBe(base.pageHash);
		expect(hashFields({}).pageHash).not.toBe(base.pageHash);
	});

	it('gives every field its own hash', () => {
		const { fieldHashes } = hashFields({ title: 'same', summary: 'same' });
		expect(fieldHashes['title']).toBe(hashText('same'));
		expect(fieldHashes['summary']).toBe(hashText('same'));
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- --run src/lib/corpus/hash.test.ts`
Expected: FAIL — cannot resolve `./hash.js`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/corpus/hash.ts`:

```ts
import { createHash } from 'node:crypto';
import type { FieldMap } from './fields.js';

export function hashText(text: string): string {
	return createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Per-field hashes plus one page hash.
 *
 * The page hash is taken over the field ids and their hashes in sorted order,
 * so it does not move when the module's keys are reordered -- otherwise every
 * import would look like a content change. Field ids are included in the
 * digest, so renaming a field changes the page hash even when the text does
 * not.
 *
 * Per-field hashes are what let a later slice expire only the accepted edits
 * whose own copy moved. A single page hash would expire every accepted edit on
 * the page whenever any part of it changed.
 */
export function hashFields(fields: FieldMap): {
	pageHash: string;
	fieldHashes: Record<string, string>;
} {
	const fieldHashes: Record<string, string> = {};
	for (const id of Object.keys(fields).sort()) {
		fieldHashes[id] = hashText(fields[id]);
	}

	const digest = createHash('sha256');
	for (const id of Object.keys(fieldHashes)) {
		digest.update(id, 'utf8').update('�', 'utf8');
		digest.update(fieldHashes[id], 'utf8').update('�', 'utf8');
	}

	return { pageHash: digest.digest('hex'), fieldHashes };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test:unit -- --run src/lib/corpus/hash.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/corpus/hash.ts src/lib/corpus/hash.test.ts
git commit -m "feat(corpus): stable per-field and per-page hashing"
```

---

### Task 4: Hosted-safe seed file

**Files:**

- Modify: `scripts/gen-seed.ts`
- Create: `supabase/seed.hosted.sql` (generated output — commit it)
- Test: `tests/seedHosted.spec.ts`

**Interfaces:**

- Consumes: nothing from earlier tasks
- Produces: `supabase/seed.hosted.sql`, containing only `reviews` and `pages` inserts

`tests/seedHosted.spec.ts` uses the `.spec.ts` extension deliberately: the client project includes only `tests/**/*.test.ts`, so a `.spec.ts` under `tests/` runs in the **server** (node) project, which is what a test that reads files from disk needs.

- [ ] **Step 1: Write the failing test**

Create `tests/seedHosted.spec.ts`:

```ts
/**
 * The hosted seed must never carry the local seed's auth rows. `seed.sql`
 * creates an auth.users row whose password is the literal string
 * `dev-local-only`; applying that to the hosted project would plant a
 * known-password account. This is the guard for that failure.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { allPages } from '../src/lib/data/index.js';

const hosted = readFileSync(new URL('../supabase/seed.hosted.sql', import.meta.url), 'utf8');

describe('supabase/seed.hosted.sql', () => {
	it('contains no auth schema writes', () => {
		expect(hosted).not.toMatch(/auth\./);
		expect(hosted).not.toMatch(/dev-local-only/);
		expect(hosted).not.toMatch(/encrypted_password/);
	});

	it('inserts exactly one review', () => {
		expect(hosted.match(/INSERT INTO reviews/g)).toHaveLength(1);
	});

	it('inserts one page row per corpus page', () => {
		expect(hosted.match(/INSERT INTO pages/g)).toHaveLength(1);
		const values = hosted.slice(hosted.indexOf('AS corpus(path)') - 4000);
		for (const page of allPages) {
			const id = page.slug
				? page.slug.replace('sf.gov/', '').replace(/\//g, '-')
				: page.title.replace(/\s+/g, '-').toLowerCase();
			expect(values).toContain(`('${id}')`);
		}
	});

	it('is idempotent', () => {
		expect(hosted).toContain('ON CONFLICT (id) DO NOTHING');
		expect(hosted).toContain('WHERE NOT EXISTS');
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- --run tests/seedHosted.spec.ts`
Expected: FAIL — `ENOENT`, `supabase/seed.hosted.sql` does not exist.

- [ ] **Step 3: Restructure the generator**

In `scripts/gen-seed.ts`, keep `derivePageId`, `sqlString` and `pageValues` exactly as they are. Extract the shared review-and-pages block into a constant and emit two files. Replace everything from `const sql = ...` (line 26) to the end of the file with:

```ts
const REVIEW_ID = '22222222-2222-2222-2222-222222222222';

const reviewAndPages = `-- ---------------------------------------------------------------------------
-- One review, and a page row per corpus page
-- ---------------------------------------------------------------------------
INSERT INTO reviews (id, title, status)
VALUES ('${REVIEW_ID}', 'HHVC mockup review', 'draft')
ON CONFLICT (id) DO NOTHING;

-- \`path\` is the id derived in pageData.svelte.ts (slug minus 'sf.gov/', slashes
-- to dashes), which is what the router and ReviewPanel both match on.
INSERT INTO pages (review_id, path)
SELECT '${REVIEW_ID}', path
FROM (
    VALUES
${pageValues}
) AS corpus(path)
WHERE NOT EXISTS (
    SELECT 1 FROM pages p
    WHERE p.review_id = '${REVIEW_ID}'
      AND p.path = corpus.path
);
`;

const localAuth = `-- ---------------------------------------------------------------------------
-- Default development user
-- ---------------------------------------------------------------------------
-- GoTrue needs more than a users row: without a matching auth.identities row
-- and a non-null email_confirmed_at, signInWithPassword fails with a generic
-- "invalid credentials" that says nothing about what is missing.
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'arrizon.david@gmail.com',
    crypt('dev-local-only', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '{"sub":"11111111-1111-1111-1111-111111111111","email":"arrizon.david@gmail.com","email_verified":true,"phone_verified":false}',
    'email',
    now(),
    now(),
    now()
)
ON CONFLICT (provider, provider_id) DO NOTHING;
`;

const localSql = `-- GENERATED FILE — edit scripts/gen-seed.ts and rerun \`bun run seed:gen\`.
--
-- Local development seed. Runs automatically on \`supabase db reset\` against the
-- LOCAL stack only; it is never applied to the hosted project.
--
-- Why this exists: the app had no way to reach its own data. The Supabase client
-- carries the anon key, every RLS policy is \`FOR ALL TO authenticated\`, and the
-- root route skips the magic link, so \`loadReview()\` returned nothing and the
-- queue, decisions, notes and checks were all inert. This seeds an identity to
-- sign in as, plus a review and its pages, so the local loop works end to end.
--
-- The password below is not a secret. It exists only inside a local Postgres
-- that never leaves this machine, and the auto-login path that uses it is
-- compiled out of production builds. Never reuse it against the hosted project.

${localAuth}
${reviewAndPages}`;

const hostedSql = `-- GENERATED FILE — edit scripts/gen-seed.ts and rerun \`bun run seed:gen\`.
--
-- HOSTED seed. Safe to apply to the hosted Supabase project: it writes only
-- \`reviews\` and \`pages\`, and creates no identity.
--
-- The local seed (\`seed.sql\`) deliberately creates an auth.users row with the
-- password \`dev-local-only\`. Applying that file to the hosted project would
-- plant a known-password account, which is why this second file exists rather
-- than a flag on the first. \`tests/seedHosted.spec.ts\` guards the difference.
--
-- Reviewers are invited from the Supabase dashboard; hosted signup is disabled
-- (\`disable_signup = true\`), so this file must not try to create users.

${reviewAndPages}`;

writeFileSync(new URL('../supabase/seed.sql', import.meta.url), localSql);
writeFileSync(new URL('../supabase/seed.hosted.sql', import.meta.url), hostedSql);
console.log(
	`Wrote supabase/seed.sql and supabase/seed.hosted.sql with ${allPages.length} page rows.`
);
```

- [ ] **Step 4: Regenerate and verify both files**

Run: `bun run seed:gen`
Expected: `Wrote supabase/seed.sql and supabase/seed.hosted.sql with 29 page rows.`

Then confirm the local file is unchanged apart from whitespace:

Run: `git diff --stat supabase/seed.sql`
Expected: either no change, or whitespace-only. If content changed, the extraction altered the local seed — fix before continuing.

- [ ] **Step 5: Run test to verify it passes**

Run: `bun run test:unit -- --run tests/seedHosted.spec.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add scripts/gen-seed.ts supabase/seed.sql supabase/seed.hosted.sql tests/seedHosted.spec.ts
git commit -m "feat(seed): generate a hosted-safe seed with no auth writes"
```

---

### Task 5: Migration for corpus_versions and page_versions

**Files:**

- Create: `supabase/migrations/20260823060000_corpus_versions.sql`

**Interfaces:**

- Consumes: nothing
- Produces: tables `corpus_versions` and `page_versions` as described in the spec's Data model section

RLS follows the per-operation shape from `20260822030000_scope_rls_policies.sql`, not the old blanket `FOR ALL USING (true)`. These tables are written only by `corpus:import` using the service-role key, which bypasses RLS — so authenticated clients get SELECT and nothing else.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260823060000_corpus_versions.sql`:

```sql
-- Corpus version snapshots.
--
-- The mockups are redesigned in a separate app and re-ported by hand into
-- src/lib/data. Before this, a renamed or dropped slug orphaned its `pages`
-- row -- which still held a reviewer's status, notes and checks -- pointing at
-- a path the app no longer rendered. Nothing errored; the work just stopped
-- being reachable. These tables make each re-port a recorded version so the
-- change is legible instead of silent.
--
-- Written only by `bun run corpus:import`, which uses the service-role key and
-- therefore bypasses RLS. Authenticated clients read; they never write.

CREATE TABLE IF NOT EXISTS corpus_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    git_sha text,
    imported_at timestamptz NOT NULL DEFAULT now(),
    note text,
    page_count integer NOT NULL,
    corpus_hash text NOT NULL UNIQUE
);

COMMENT ON COLUMN corpus_versions.corpus_hash IS
    'Hash over every page hash, sorted by path. UNIQUE is what makes corpus:import idempotent: re-running against an unchanged corpus conflicts instead of minting a duplicate version.';

CREATE TABLE IF NOT EXISTS page_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    corpus_version_id uuid NOT NULL REFERENCES corpus_versions (id) ON DELETE CASCADE,
    path text NOT NULL,
    content jsonb NOT NULL,
    content_hash text NOT NULL,
    field_hashes jsonb NOT NULL,
    UNIQUE (corpus_version_id, path)
);

COMMENT ON COLUMN page_versions.content IS
    'Full page snapshot including karl/editorNote/editorStatus. Those travel here so they are never lost, but they are excluded from content_hash.';
COMMENT ON COLUMN page_versions.content_hash IS
    'Reader-visible copy only. Editing an editorNote must not mint a version.';
COMMENT ON COLUMN page_versions.field_hashes IS
    'field_id -> sha256 of that field text. A later slice expires an accepted edit when its own field hash moves; a single per-page hash would expire every accepted edit on the page whenever any part of it changed.';

CREATE INDEX IF NOT EXISTS page_versions_path_idx ON page_versions (path);

ALTER TABLE corpus_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_versions ENABLE ROW LEVEL SECURITY;

-- Idempotent, matching the style of 20260822030000: Postgres has no
-- CREATE POLICY IF NOT EXISTS, and a bare CREATE aborts the migration on re-run.
DROP POLICY IF EXISTS "corpus_versions_select" ON corpus_versions;
DROP POLICY IF EXISTS "page_versions_select" ON page_versions;

CREATE POLICY "corpus_versions_select" ON corpus_versions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "page_versions_select" ON page_versions
    FOR SELECT TO authenticated USING (true);
```

- [ ] **Step 2: Verify the SQL parses without applying it**

Run:

```bash
bun run test:unit -- --run 2>/dev/null; \
grep -c "CREATE TABLE IF NOT EXISTS" supabase/migrations/20260823060000_corpus_versions.sql
```

Expected: `2`. (The migration is applied to the hosted project in Task 8; local application needs the Supabase CLI, which is not installed.)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260823060000_corpus_versions.sql
git commit -m "feat(db): add corpus_versions and page_versions with per-field hashes"
```

---

### Task 6: The corpus lock object

**Files:**

- Create: `scripts/corpus-lock.ts`
- Test: `src/lib/corpus/lock.test.ts`
- Create: `src/lib/corpus/lock.ts`

The buildable object lives in `src/lib/corpus/lock.ts` so both the import script and the CI checker import one definition; `scripts/corpus-lock.ts` is the thin CLI that writes it.

**Interfaces:**

- Consumes: `extractFields` (Task 2), `hashFields` (Task 3)
- Produces: `buildLock(pages: CorpusPage[]): CorpusLock` where

```ts
type CorpusLock = {
	version: 1;
	corpusHash: string;
	pages: Record<string, { contentHash: string; fieldHashes: Record<string, string> }>;
};
```

- [ ] **Step 1: Write the failing test**

Create `src/lib/corpus/lock.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildLock, derivePagePath } from './lock.js';

const pages = [
	{ slug: 'sf.gov/topic-b--about', title: 'B', sections: [{ heading: 'H', paragraphs: ['p'] }] },
	{ slug: 'sf.gov/topic-a', title: 'A', sections: [] }
];

describe('derivePagePath', () => {
	it('strips the sf.gov prefix and dashes slashes', () => {
		expect(derivePagePath({ slug: 'sf.gov/topic-x--about', title: 'X' })).toBe('topic-x--about');
		expect(derivePagePath({ slug: 'sf.gov/a/b', title: 'X' })).toBe('a-b');
	});

	it('falls back to a slugified title', () => {
		expect(derivePagePath({ title: 'Two Words' })).toBe('two-words');
	});
});

describe('buildLock', () => {
	it('keys pages by path and sorts them', () => {
		expect(Object.keys(buildLock(pages).pages)).toEqual(['topic-a', 'topic-b--about']);
	});

	it('is stable across input order', () => {
		expect(buildLock(pages).corpusHash).toBe(buildLock([...pages].reverse()).corpusHash);
	});

	it('changes when any page copy changes', () => {
		const changed = structuredClone(pages);
		changed[0].sections[0].paragraphs[0] = 'p!';
		expect(buildLock(changed).corpusHash).not.toBe(buildLock(pages).corpusHash);
	});

	it('does not change when only an annotation changes', () => {
		const annotated = structuredClone(pages) as Record<string, unknown>[];
		annotated[0].editorNote = 'a note that must not count';
		expect(buildLock(annotated).corpusHash).toBe(buildLock(pages).corpusHash);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- --run src/lib/corpus/lock.test.ts`
Expected: FAIL — cannot resolve `./lock.js`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/corpus/lock.ts`:

```ts
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

export function buildLock(pages: CorpusPage[]): CorpusLock {
	const entries = pages
		.map((page) => {
			const { pageHash, fieldHashes } = hashFields(extractFields(page));
			return { path: derivePagePath(page), contentHash: pageHash, fieldHashes };
		})
		.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

	const digest = createHash('sha256');
	const byPath: CorpusLock['pages'] = {};
	for (const entry of entries) {
		byPath[entry.path] = { contentHash: entry.contentHash, fieldHashes: entry.fieldHashes };
		digest.update(entry.path, 'utf8').update('�', 'utf8');
		digest.update(entry.contentHash, 'utf8').update('�', 'utf8');
	}

	return { version: 1, corpusHash: digest.digest('hex'), pages: byPath };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test:unit -- --run src/lib/corpus/lock.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Write the CLI and generate the lockfile**

Create `scripts/corpus-lock.ts`:

```ts
/**
 * Writes `corpus.lock` from the static corpus.
 *
 *   bun run corpus:lock
 *
 * The lockfile exists because CI has no Supabase credentials -- `pr.yml` sets
 * placeholder values so fork PRs keep building. A check that asked the database
 * "is this corpus imported?" could not run there. Comparing the built corpus to
 * a committed manifest needs no network at all, and it makes a corpus change
 * visible in the diff.
 */
import { writeFileSync } from 'node:fs';
import { allPages } from '../src/lib/data/index.js';
import { buildLock } from '../src/lib/corpus/lock.js';

const lock = buildLock(allPages);
writeFileSync(new URL('../corpus.lock', import.meta.url), JSON.stringify(lock, null, 2) + '\n');
console.log(
	`Wrote corpus.lock — ${Object.keys(lock.pages).length} pages, ${lock.corpusHash.slice(0, 12)}.`
);
```

Add to `package.json` scripts, after `seed:gen`:

```json
"corpus:lock": "bun run scripts/corpus-lock.ts",
```

Run: `bun run corpus:lock`
Expected: `Wrote corpus.lock — 29 pages, <12 hex chars>.`

- [ ] **Step 6: Commit**

```bash
git add src/lib/corpus/lock.ts src/lib/corpus/lock.test.ts scripts/corpus-lock.ts corpus.lock package.json
git commit -m "feat(corpus): build a committed corpus.lock hash manifest"
```

---

### Task 7: Offline CI check and merge policy

**Files:**

- Create: `scripts/check-corpus-lock.ts`
- Create: `.gitattributes`
- Modify: `.github/workflows/pr.yml`
- Modify: `package.json`

**Interfaces:**

- Consumes: `buildLock` (Task 6)
- Produces: `bun run corpus:check`, exit 0 when the lockfile matches the corpus, exit 1 with a diff summary when it does not

- [ ] **Step 1: Write the checker**

Create `scripts/check-corpus-lock.ts`:

```ts
/**
 * Fails when `corpus.lock` does not match the corpus in the tree.
 *
 *   bun run corpus:check
 *
 * Runs in CI with no database access. A mismatch means someone changed
 * src/lib/data without running `bun run corpus:lock`, which would leave the
 * hosted version history missing the change.
 */
import { readFileSync } from 'node:fs';
import { allPages } from '../src/lib/data/index.js';
import { buildLock, type CorpusLock } from '../src/lib/corpus/lock.js';

const expected = buildLock(allPages);

let actual: CorpusLock;
try {
	actual = JSON.parse(readFileSync(new URL('../corpus.lock', import.meta.url), 'utf8'));
} catch {
	console.error('corpus.lock is missing or unreadable. Run: bun run corpus:lock');
	process.exit(1);
}

if (actual.corpusHash === expected.corpusHash) {
	console.log(`corpus.lock matches — ${Object.keys(expected.pages).length} pages.`);
	process.exit(0);
}

const expectedPaths = new Set(Object.keys(expected.pages));
const actualPaths = new Set(Object.keys(actual.pages ?? {}));

const added = [...expectedPaths].filter((p) => !actualPaths.has(p));
const removed = [...actualPaths].filter((p) => !expectedPaths.has(p));
const changed = [...expectedPaths].filter(
	(p) => actualPaths.has(p) && actual.pages[p].contentHash !== expected.pages[p].contentHash
);

console.error('corpus.lock is out of date. Run: bun run corpus:lock');
if (added.length) console.error(`  added:   ${added.join(', ')}`);
if (removed.length) console.error(`  removed: ${removed.join(', ')}`);
if (changed.length) console.error(`  changed: ${changed.join(', ')}`);
process.exit(1);
```

Add to `package.json` scripts, after `corpus:lock`:

```json
"corpus:check": "bun run scripts/check-corpus-lock.ts",
```

- [ ] **Step 2: Verify the checker passes, then catches a change**

Run: `bun run corpus:check`
Expected: `corpus.lock matches — 29 pages.`, exit 0.

Now prove it fails when it should:

```bash
cp corpus.lock /tmp/corpus.lock.bak
python3 - <<'PY'
import json
d = json.load(open('corpus.lock'))
first = sorted(d['pages'])[0]
d['pages'][first]['contentHash'] = '0' * 64
d['corpusHash'] = '0' * 64
json.dump(d, open('corpus.lock', 'w'), indent=2)
PY
bun run corpus:check; echo "exit=$?"
cp /tmp/corpus.lock.bak corpus.lock
```

Expected: `corpus.lock is out of date.` with a `changed:` line naming the page, and `exit=1`. The restore leaves the tree clean — confirm with `git diff --stat corpus.lock`, which must be empty.

- [ ] **Step 3: Declare the merge policy**

Create `.gitattributes`:

```
# corpus.lock is generated. A hand-merged hash manifest can agree with neither
# side of the merge, so conflicts are resolved by regenerating:
#
#     bun run corpus:lock
#
# `binary` stops git from attempting a line-wise textual merge and producing a
# file that looks plausible and hashes to nothing.
corpus.lock binary
```

- [ ] **Step 4: Wire it into CI**

In `.github/workflows/pr.yml`, inside the `test & build` job, add a step immediately before the unit-test step:

```yaml
- name: Check corpus lock
  run: bun run corpus:check
```

This needs no secrets, which is the whole point — `pr.yml` has only placeholder Supabase values so fork PRs keep building.

- [ ] **Step 5: Verify the full gate still passes**

Run: `bun run verify`
Expected: PASS on both unit tests and build. If a line reads `(? passed)`, a test failed — read `$TMPDIR/hhvc-verify.log`.

- [ ] **Step 6: Commit**

```bash
git add scripts/check-corpus-lock.ts .gitattributes .github/workflows/pr.yml package.json
git commit -m "ci(corpus): fail the build when corpus.lock is stale"
```

---

### Task 8: The import script

**Files:**

- Create: `scripts/corpus-import.ts`
- Modify: `package.json`

**Interfaces:**

- Consumes: `buildLock` (Task 6), the tables from Task 5
- Produces: `bun run corpus:import`, which writes one `corpus_versions` row and one `page_versions` row per page, or reports that the corpus is unchanged

- [ ] **Step 1: Write the script**

Create `scripts/corpus-import.ts`:

```ts
/**
 * Records the current corpus as a version in the hosted database.
 *
 *   bun run corpus:import
 *
 * Run this after re-porting mockups from the vanilla app. It is idempotent:
 * corpus_versions.corpus_hash is UNIQUE, so re-running against an unchanged
 * corpus reports "unchanged" rather than minting a duplicate version.
 *
 * Uses the service-role key, which bypasses RLS -- the same pattern as
 * scripts/sync-checks.ts. Bun loads .env.local automatically.
 */
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'node:child_process';
import { allPages } from '../src/lib/data/index.js';
import { buildLock, derivePagePath } from '../src/lib/corpus/lock.js';

const supabaseUrl = process.env.SVELTE_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
	console.error('Missing SVELTE_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

const lock = buildLock(allPages);

const { data: existing, error: lookupError } = await supabase
	.from('corpus_versions')
	.select('id, imported_at')
	.eq('corpus_hash', lock.corpusHash)
	.maybeSingle();

if (lookupError) {
	console.error('Could not query corpus_versions:', lookupError.message);
	process.exit(1);
}

if (existing) {
	console.log(`Corpus unchanged — already imported at ${existing.imported_at}. Nothing to do.`);
	process.exit(0);
}

let gitSha: string | null = null;
try {
	gitSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
} catch {
	gitSha = null;
}

const { data: version, error: versionError } = await supabase
	.from('corpus_versions')
	.insert({
		git_sha: gitSha,
		page_count: allPages.length,
		corpus_hash: lock.corpusHash,
		note: process.env.CORPUS_NOTE ?? null
	})
	.select('id')
	.single();

if (versionError || !version) {
	console.error('Could not insert corpus_versions:', versionError?.message);
	process.exit(1);
}

const rows = allPages.map((page) => {
	const path = derivePagePath(page);
	const entry = lock.pages[path];
	return {
		corpus_version_id: version.id,
		path,
		content: page,
		content_hash: entry.contentHash,
		field_hashes: entry.fieldHashes
	};
});

const { error: pagesError } = await supabase.from('page_versions').insert(rows);

if (pagesError) {
	console.error('Could not insert page_versions:', pagesError.message);
	console.error(`corpus_versions row ${version.id} was created; delete it before retrying.`);
	process.exit(1);
}

console.log(
	`Imported corpus version ${version.id} — ${rows.length} pages, hash ${lock.corpusHash.slice(0, 12)}, git ${gitSha?.slice(0, 12) ?? 'unknown'}.`
);
```

Add to `package.json` scripts, after `corpus:check`:

```json
"corpus:import": "bun run scripts/corpus-import.ts",
```

- [ ] **Step 2: Commit before running anything against the hosted project**

```bash
git add scripts/corpus-import.ts package.json
git commit -m "feat(corpus): import the corpus as a hashed version snapshot"
```

- [ ] **Step 3: Confirm the service-role key is present**

Run: `grep -c SUPABASE_SERVICE_ROLE_KEY .env.local`
Expected: `1`. If `0`, stop — the key must be added from 1Password before continuing. Do not print its value.

---

### Task 9: Apply to the hosted project

**This task writes to production.** Get explicit confirmation before each step. Nothing here is a local change; there is no code to commit except the PLAN.md update at the end.

**Files:**

- Modify: `PLAN.md` (tick F5, record what was applied)

- [ ] **Step 1: Apply the migration**

The Supabase CLI is not installed, so apply the DDL through the Management API. Read the PAT from 1Password at use time and never print it:

```bash
TOK=$(op item get 4m2bhv2xsnaeorliyxml2xeqc4 --fields credential --reveal)
SQL=$(python3 -c "import json,sys;print(json.dumps(open('supabase/migrations/20260823060000_corpus_versions.sql').read()))")
printf 'header = "Authorization: Bearer %s"\nheader = "Content-Type: application/json"\nurl = "https://api.supabase.com/v1/projects/kiynekyzqxneepjipqhg/database/query"\ndata = "{\\"query\\": %s}"\nsilent\n' "$TOK" "$SQL" | curl --config -
```

Expected: `[]` or a success payload, not an error object.

- [ ] **Step 2: Verify the tables exist**

Run the same request shape with:

```sql
select table_name from information_schema.tables where table_schema='public' order by 1
```

Expected: the list now includes `corpus_versions` and `page_versions` alongside `comments`, `documents`, `edits`, `pages`, `reviews`.

- [ ] **Step 3: Apply the hosted seed**

Same request shape, with the contents of `supabase/seed.hosted.sql` as the query.

Expected: success. Then verify:

```sql
select (select count(*) from reviews) as reviews, (select count(*) from pages) as pages
```

Expected: `[{"reviews":1,"pages":29}]`.

- [ ] **Step 4: Import the first corpus version**

Run: `bun run corpus:import`
Expected: `Imported corpus version <uuid> — 29 pages, hash <12 hex>, git <12 hex>.`

- [ ] **Step 5: Prove idempotency against the real database**

Run: `bun run corpus:import`
Expected: `Corpus unchanged — already imported at <timestamp>. Nothing to do.`

Then confirm exactly one version exists:

```sql
select count(*) as versions, (select count(*) from page_versions) as page_versions from corpus_versions
```

Expected: `[{"versions":1,"page_versions":29}]`.

- [ ] **Step 6: Verify the deployed app now loads a review**

Sign in at `https://hhvc-manager-review.netlify.app` with a magic link and confirm the queue renders 29 pages and the console no longer logs `No review found: null`. A signed-out visitor still sees nothing — that is correct, and the signed-out empty state is explicitly out of scope for this slice.

- [ ] **Step 7: Update PLAN.md and commit**

Tick F5, recording the review id, the page count, and the corpus version hash. Then:

```bash
git add PLAN.md
git commit -m "docs(plan): close F5 — hosted project seeded and first corpus version imported"
```

---

## Self-Review

**Spec coverage.** Slice 1 of the spec lists: hosted-safe seed (Task 4, applied Task 9), `corpus_versions` / `page_versions` with `field_hashes` (Task 5), `corpus:import` (Task 8), `corpus.lock` and its CI check (Tasks 6–7). All covered. Decisions 12 (annotations excluded from the hash) and 14 (`field_hashes` map) are implemented in Tasks 2, 3 and 5; decision 16 (service-role key) in Task 8.

**Decision 13 needs no work.** The spec called for making `audience.<n>` addressable. It already is — `Page.svelte:41` renders `fieldId={`audience.${i}`}`. Task 2 hashes it; nothing needs building. The spec should be amended to say so.

**Deferred to later slices, deliberately:** `edit_decisions`, `page_notes`, `materialized_in_version_id`, overlay resolution, expiry UI and the diff UI. Slice 1 records versions; nothing consumes them yet. That is the intended shape — it delivers F5 and lays the foundation without half-building slice 3.

**Type consistency.** `CorpusPage` and `FieldMap` are defined in `fields.ts` (Task 2) and imported by `hash.ts` (Task 3) and `lock.ts` (Task 6). `buildLock` and `derivePagePath` are defined in `lock.ts` and consumed by `scripts/corpus-lock.ts`, `scripts/check-corpus-lock.ts` and `scripts/corpus-import.ts` under those exact names. `deriveFieldKey` is defined in Task 1 and consumed in Task 2.

**One risk worth naming.** Task 8 inserts `corpus_versions` and then `page_versions` in two statements without a transaction, because PostgREST has no cross-request transaction. A failure between them leaves an orphan version row, which the script reports with its id so it can be deleted. Making this atomic needs a Postgres function; that is worth doing if imports ever run unattended, and is not worth it while a human runs the command and reads the output.
