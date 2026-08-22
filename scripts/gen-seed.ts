/**
 * Regenerates `supabase/seed.sql` from the static page corpus.
 *
 *   bun run scripts/gen-seed.ts
 *
 * The seed has to contain one `pages` row per corpus page, and each row's
 * `path` has to equal the id `pageData.svelte.ts` derives at construction time
 * — that is the value `/review/[slug]` matches and the value `ReviewPanel`
 * looks the live record up by. Hand-maintaining that list would drift the
 * moment a page module is added, so it is generated from `allPages` instead.
 */
import { writeFileSync } from 'node:fs';
import { allPages } from '../src/lib/data/index.js';

/** Mirrors the derivation in `src/lib/stores/pageData.svelte.ts`. */
function derivePageId(page: { slug?: string; title: string }): string {
	return page.slug
		? page.slug.replace('sf.gov/', '').replace(/\//g, '-')
		: page.title.replace(/\s+/g, '-').toLowerCase();
}

const sqlString = (value: string) => `'${value.replace(/'/g, "''")}'`;

const pageValues = allPages.map((page) => `      (${sqlString(derivePageId(page))})`).join(',\n');

const sql = `-- GENERATED FILE — edit scripts/gen-seed.ts and rerun \`bun run seed:gen\`.
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

-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- One review, and a page row per corpus page
-- ---------------------------------------------------------------------------
INSERT INTO reviews (id, title, status)
VALUES ('22222222-2222-2222-2222-222222222222', 'HHVC mockup review', 'draft')
ON CONFLICT (id) DO NOTHING;

-- \`path\` is the id derived in pageData.svelte.ts (slug minus 'sf.gov/', slashes
-- to dashes), which is what the router and ReviewPanel both match on.
INSERT INTO pages (review_id, path)
SELECT '22222222-2222-2222-2222-222222222222', path
FROM (
    VALUES
${pageValues}
) AS corpus(path)
WHERE NOT EXISTS (
    SELECT 1 FROM pages p
    WHERE p.review_id = '22222222-2222-2222-2222-222222222222'
      AND p.path = corpus.path
);
`;

writeFileSync(new URL('../supabase/seed.sql', import.meta.url), sql);
console.log(`Wrote supabase/seed.sql with ${allPages.length} page rows.`);
