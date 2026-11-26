-- GENERATED FILE — edit scripts/gen-seed.ts and rerun `bun run seed:gen`.
--
-- HOSTED seed. Safe to apply to the hosted Supabase project: it writes only
-- `reviews` and `pages`, and creates no identity.
--
-- The local seed (`seed.sql`) deliberately creates a local sign-in identity
-- with a hardcoded development-only password. Applying that file to the
-- hosted project would plant a known-password account, which is why this
-- second file exists rather than a flag on the first. `tests/seedHosted.spec.ts`
-- guards the difference.
--
-- Reviewers are invited from the Supabase dashboard; hosted signup is disabled
-- (`disable_signup = true`), so this file must not try to create users.

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
      ('report-garbage-clutter-or-overgrown-plants'),
      ('find-healthy-housing-inspector-by-neighborhood'),
      ('report-health-code-article-11-plain-language'),
      ('departments--healthy-housing-and-vector-control--about'),
      ('information-what-happens-after-you-report-housing-pest-problem'),
      ('property-owner-responsibilities-hhvc'),
      ('make-public-records-request-environmental-health'),
      ('find-residential-hotel-and-shelter-records'),
      ('departments--healthy-housing-and-vector-control'),
      ('report-rats-or-mice'),
      ('report-mosquitoes-or-standing-water'),
      ('report-mold'),
      ('report-bed-bugs'),
      ('report-pigeon-droppings-nesting-or-feeding'),
      ('report-sewage-leak-or-backup'),
      ('report-animal-waste-on-property'),
      ('information-tenant-steps-after-notice-of-violation'),
      ('report-cockroaches-or-other-insects'),
      ('information-tenant-rights-and-reporting-housing-conditions'),
      ('find-complaints-and-inspection-records'),
      ('mosquito-education-workshop'),
      ('topics--healthy-housing-conditions'),
      ('information--article-11-compliance-for-property-owners'),
      ('mosquito-control-program'),
      ('information-integrated-pest-management-for-property-owners-and-managers'),
      ('pay-your-annual-healthy-housing-fee-apartment-buildings'),
      ('integrated-pest-management-education'),
      ('information-learn-what-hhvc-can-inspect'),
      ('step-by-step-report-a-pest-problem'),
      ('step-by-step-correct-a-violation-and-close-your-case'),
      ('location-environmental-health-office'),
      ('question-notice-of-violation'),
      ('pay-healthy-housing-citation'),
      ('resource-guides-in-other-languages'),
      ('rat-free-blocks'),
      ('report-healthy-housing-inspections-annual-summary'),
      ('information-bed-bugs-prevent-find-and-prepare-for-treatment'),
      ('information-reduce-moisture-and-mold-in-your-home'),
      ('information-keep-rats-and-mice-out-of-your-home'),
      ('information-get-rid-of-cockroaches-without-heavy-pesticides'),
      ('information-what-to-expect-when-your-building-is-treated-for-pests')
) AS corpus(path)
WHERE NOT EXISTS (
    SELECT 1 FROM pages p
    WHERE p.review_id = '22222222-2222-2222-2222-222222222222'
      AND p.path = corpus.path
);
