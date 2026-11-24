/**
 * The landing page's themed sections: which corpus page is listed under which
 * heading, and in what order.
 *
 * The strings in `pages` are ROUTABLE IDS, as produced by `routableId()` in
 * `$lib/corpus/pageId` -- the `pages.path` / `pageStore.pages[].id` form that
 * `/review/[slug]` matches. They are NOT module filenames:
 * `src/lib/data/hhvc-inspection-scope.ts` has the slug
 * `sf.gov/information/learn-what-hhvc-can-inspect` and so appears here as
 * `information-learn-what-hhvc-can-inspect`.
 *
 * The mapping is hand-authored because nothing in the corpus can derive it. A
 * page's `audience` is an array of prose strings, not a controlled vocabulary,
 * and its `type` is the Karl CMS template (Information, Step-by-step, Report,
 * ...), which describes how a page is built rather than what it is about. So
 * neither field can produce themes.
 *
 * Hand-authored means it can fall behind the corpus. `groups.spec.ts` is what
 * stops a new corpus module silently vanishing from the landing page: it fails,
 * naming the id, when a corpus page is in no group, in two groups, or when a
 * group names an id the corpus does not have.
 */
export const PAGE_GROUPS = [
	{
		id: 'report',
		heading: 'Report a problem',
		pages: [
			'report-rats-mice-four-legged-problems',
			'report-cockroaches-mosquitoes-insects',
			'report-garbage-filth-vegetation',
			'report-problem-sro-hotel',
			'step-by-step-report-a-pest-problem',
			'information-who-to-call-about-a-housing-problem',
			'information-what-happens-after-you-report-housing-pest-problem',
			'information-tenant-rights-and-reporting-housing-conditions'
		]
	},
	{
		id: 'inspections',
		heading: 'Inspections and violations',
		pages: [
			'information-learn-what-hhvc-can-inspect',
			'find-healthy-housing-inspector-by-neighborhood',
			'get-ready-for-a-housing-inspection',
			'get-ready-for-a-follow-up-inspection',
			'fix-healthy-housing-and-vector-control-violation',
			'step-by-step-correct-a-violation-and-close-your-case',
			'appeal-a-notice-of-violation',
			'tenant-steps-after-notice-of-violation',
			'report-health-code-article-11-plain-language'
		]
	},
	{
		id: 'records',
		heading: 'Records, fees and payments',
		pages: [
			'find-complaints-and-inspection-records',
			'lookup-residential-health-code-violations',
			'find-residential-hotel-and-shelter-records',
			'look-up-building-records',
			'make-a-public-records-request-environmental-health',
			'pay-a-healthy-housing-citation',
			'pay-your-annual-healthy-housing-fee-apartment-buildings',
			'report-healthy-housing-inspections-annual-summary'
		]
	},
	{
		id: 'prevention',
		heading: 'Pests and prevention',
		pages: [
			'rat-free-blocks',
			'integrated-pest-management-education',
			'mosquito-control-program',
			'mosquito-education-workshop',
			'step-by-step-prepare-your-unit-for-pest-treatment',
			'resource--healthy-housing-and-vermin-information'
		]
	},
	{
		id: 'owners',
		heading: 'Property owners and managers',
		pages: [
			'property-owner-responsibilities-hhvc',
			'information--article-11-compliance-for-property-owners',
			'information-integrated-pest-management-for-property-owners-and-managers'
		]
	},
	{
		id: 'about',
		heading: 'About HHVC',
		pages: [
			'departments--healthy-housing-and-vector-control',
			'departments--healthy-housing-and-vector-control--about',
			'topics--healthy-housing-conditions',
			'location-environmental-health-office',
			'resource-guides-in-other-languages'
		]
	}
] as const satisfies readonly { id: string; heading: string; pages: readonly string[] }[];
