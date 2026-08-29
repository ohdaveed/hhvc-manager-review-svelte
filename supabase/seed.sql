-- GENERATED FILE — edit scripts/gen-seed.ts and rerun `bun run seed:gen`.
--
-- Local development seed. Runs automatically on `supabase db reset` against the
-- LOCAL stack only; it is never applied to the hosted project.
--
-- Why this exists: the app had no way to reach its own data. The Supabase client
-- carries the anon key, every RLS policy is `FOR ALL TO authenticated`, and the
-- root route skips the magic link, so `loadReview()` returned nothing and the
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

-- ---------------------------------------------------------------------------
-- One review, and a page row per corpus page
-- ---------------------------------------------------------------------------
INSERT INTO reviews (id, title, status)
VALUES ('22222222-2222-2222-2222-222222222222', 'HHVC mockup review', 'draft')
ON CONFLICT (id) DO NOTHING;

-- `path` is the id derived in pageData.svelte.ts (slug minus 'sf.gov/', slashes
-- to dashes), which is what the router and ReviewPanel both match on.
INSERT INTO pages (review_id, path)
SELECT '22222222-2222-2222-2222-222222222222', path
FROM (
    VALUES
      ('report-garbage-filth-vegetation'),
      ('step-by-step--get-ready-for-a-follow-up-inspection'),
      ('look-up-building-records'),
      ('step-by-step--fix-healthy-housing-and-vector-control-violation'),
      ('find-healthy-housing-inspector-by-neighborhood'),
      ('step-by-step--get-ready-for-a-housing-inspection'),
      ('report-health-code-article-11-plain-language'),
      ('report-problem-sro-hotel'),
      ('departments--healthy-housing-and-vector-control--about'),
      ('information-what-happens-after-you-report-housing-pest-problem'),
      ('property-owner-responsibilities-hhvc'),
      ('make-a-public-records-request-environmental-health'),
      ('find-residential-hotel-and-shelter-records'),
      ('resource--healthy-housing-and-vermin-information'),
      ('departments--healthy-housing-and-vector-control'),
      ('report-rats-mice-four-legged-problems'),
      ('step-by-step--tenant-steps-after-notice-of-violation'),
      ('report-cockroaches-mosquitoes-insects'),
      ('information-tenant-rights-and-reporting-housing-conditions'),
      ('lookup-residential-health-code-violations'),
      ('find-complaints-and-inspection-records'),
      ('mosquito-education-workshop'),
      ('topics--healthy-housing-conditions'),
      ('information--article-11-compliance-for-property-owners'),
      ('mosquito-control-program'),
      ('information-integrated-pest-management-for-property-owners-and-managers'),
      ('pay-your-annual-healthy-housing-fee-apartment-buildings'),
      ('integrated-pest-management-education'),
      ('information-learn-what-hhvc-can-inspect')
) AS corpus(path)
WHERE NOT EXISTS (
    SELECT 1 FROM pages p
    WHERE p.review_id = '22222222-2222-2222-2222-222222222222'
      AND p.path = corpus.path
);
