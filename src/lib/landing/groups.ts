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
 * page's `type` is the Karl CMS template (Information, Step-by-step, Report,
 * ...), which describes how a page is built rather than what it is about. So
 * it cannot produce themes.
 *
 * Hand-authored means it can fall behind the corpus. `groups.spec.ts` is what
 * stops a new corpus module silently vanishing from the landing page: it fails,
 * naming the id, when a corpus page is in no group, in two groups, or when a
 * group names an id the corpus does not have.
 */
import { isDraftPath } from '$lib/corpus/draftPath';

export const PAGE_GROUPS = [
	{
		id: 'report',
		heading: 'Report a problem',
		pages: [
			'report-rats-or-mice',
			'report-animal-waste-on-property',
			'report-bed-bugs',
			'report-cockroaches-or-other-insects',
			'report-mosquitoes-or-standing-water',
			'report-pigeon-droppings-nesting-or-feeding',
			'report-sewage-leak-or-backup',
			'report-mold',
			'report-garbage-clutter-or-overgrown-plants',
			'step-by-step-report-a-pest-problem',
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
			'step-by-step-correct-a-violation-and-close-your-case',
			'question-notice-of-violation',
			'information-tenant-steps-after-notice-of-violation',
			'report-health-code-article-11-plain-language'
		]
	},
	{
		id: 'records',
		heading: 'Records, fees and payments',
		pages: [
			'find-complaints-and-inspection-records',
			'find-residential-hotel-and-shelter-records',
			'make-public-records-request-environmental-health',
			'pay-healthy-housing-citation',
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
			'information-bed-bugs-prevent-find-and-prepare-for-treatment',
			'information-keep-rats-and-mice-out-of-your-home',
			'information-get-rid-of-cockroaches-without-heavy-pesticides',
			'information-reduce-moisture-and-mold-in-your-home',
			'information-what-to-expect-when-your-building-is-treated-for-pests'
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

/** One heading's worth of pages, as the landing page and the review queue list them. */
export type PageSection = { id: string; heading: string; paths: string[] };

/**
 * Sorts `paths` under the landing page's headings, in its order: the themes of
 * `PAGE_GROUPS` (each in its authored order), then "Other pages" for a corpus
 * page no group claims, then "Proposed pages" for AI drafts, which carry no
 * theme. A path not in `paths` is left out, and every path in `paths` lands
 * somewhere -- an unclaimed page is listed rather than dropped.
 *
 * Shared by the landing page and the review queue so the two lists cannot
 * order the same pages differently. Empty sections are returned; callers
 * filter them when they render.
 */
export function groupPaths(paths: readonly string[]): PageSection[] {
	const present = new Set(paths);
	const grouped = new Set<string>(PAGE_GROUPS.flatMap((g) => g.pages as readonly string[]));
	const drafts = paths.filter(isDraftPath);
	const ungrouped = paths.filter((p) => !grouped.has(p) && !isDraftPath(p));
	return [
		...PAGE_GROUPS.map((g) => ({
			id: g.id,
			heading: g.heading,
			paths: (g.pages as readonly string[]).filter((p) => present.has(p))
		})),
		...(ungrouped.length > 0
			? [{ id: 'ungrouped', heading: 'Other pages', paths: ungrouped }]
			: []),
		...(drafts.length > 0 ? [{ id: 'drafts', heading: 'Proposed pages', paths: drafts }] : [])
	];
}
