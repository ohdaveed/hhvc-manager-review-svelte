/**
 * Regenerates `supabase/seed.sql` and `supabase/seed.hosted.sql` from the
 * static page corpus. `seed.sql` is for the local Supabase stack only;
 * `seed.hosted.sql` targets the **production** Supabase project.
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
    updated_at,
    -- GoTrue scans these eight as Go string, not *string
    -- (internal/models/user.go), so a NULL is not "no token" but an
    -- unmarshalable row: signInWithPassword answers 500
    -- "Database error querying schema" and the auth container logs
    --
    --     Scan error on column index 3, name "confirmation_token":
    --     converting NULL to string is unsupported
    --
    -- The column defaults are NULL, so omitting them from this INSERT is
    -- what produced a seeded user nobody could sign in as. Empty string is
    -- the value GoTrue itself writes for "no token outstanding".
    confirmation_token,
    recovery_token,
    email_change_token_current,
    email_change_token_new,
    email_change,
    phone_change_token,
    phone_change,
    reauthentication_token
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
    now(),
    '', '', '', '', '', '', '', ''
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
-- The local seed (\`seed.sql\`) deliberately creates a local sign-in identity
-- with a hardcoded development-only password. Applying that file to the
-- hosted project would plant a known-password account, which is why this
-- second file exists rather than a flag on the first. \`tests/seedHosted.spec.ts\`
-- guards the difference.
--
-- Reviewers are invited from the Supabase dashboard; hosted signup is disabled
-- (\`disable_signup = true\`), so this file must not try to create users.

${reviewAndPages}`;

writeFileSync(new URL('../supabase/seed.sql', import.meta.url), localSql);
writeFileSync(new URL('../supabase/seed.hosted.sql', import.meta.url), hostedSql);
console.log(
	`Wrote supabase/seed.sql and supabase/seed.hosted.sql with ${allPages.length} page rows.`
);
