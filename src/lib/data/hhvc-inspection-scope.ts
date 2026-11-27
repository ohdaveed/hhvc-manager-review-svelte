export const scopeInfo = {
	slug: 'sf.gov/information/learn-what-hhvc-can-inspect',
	type: 'Information',
	title: 'Learn what Healthy Housing and Vector Control can inspect',
	summary:
		'See which conditions Environmental Health checks in apartments, residential hotels, and shelters.',
	reading: 'Grade 7',
	seoTitle: 'Learn what HHVC can inspect | SF.gov',
	metaDescription: 'Check whether HHVC may review a pest, vector, or housing health condition.',
	sections: [
		{
			heading: 'Who this information is for',
			karl: 'Maps to the first "Information section" → Title and text block: Title = this heading, Text = the bulleted list. The heading is the one sf.gov/manage-covid-19-schools-childcare-and-youth-programs gives an audience list (an H3 over bullets). This was the page-level `audience` field until 2026-11-26, when that field was retired; the transcript used to supply this block itself, so what goes into Karl is unchanged.',
			kind: 'body',
			bullets: [
				'This page is for anyone deciding whether to report a pest or housing health problem to HHVC.',
				'It is also for anyone who has been sent to the wrong department and needs to find the right one.'
			]
		},
		{
			heading: 'Start with what you can see',
			karl: 'Maps to an Information section → Title and text block. The opening paragraph plus the routing bullets fold into one rich text field. Moved here on 2026-11-26 from the retired "Who to call about a housing problem" page, which carried the same boundary as this page and had begun to drift from it. Organised by the condition the reader can see rather than by the department that owns it, because the reader knows the former and not the latter.',
			kind: 'body',
			paragraphs: [
				'San Francisco splits housing problems across several offices. You do not need to know which one. Name the condition, and the condition decides.'
			],
			bullets: [
				'Pests, rodents, mold, garbage, or an unsanitary building: Healthy Housing and Vector Control.',
				'No heat, no hot water, broken plumbing, bad wiring, or a structural repair: the Department of Building Inspection.',
				'A rent increase, an eviction notice, or a dispute about your lease: the Rent Board.',
				'Not sure, or more than one of these: start with 311.'
			]
		},
		{
			heading: 'Have this ready when you report',
			karl: 'Maps to a second Title and text block: Title = this heading, Text = the paragraph plus three bullets. Adapted from the live Citywide "Report a health nuisance or hazards" service so HHVC reporters know what 311 needs without leaving this triage page.',
			kind: 'body',
			paragraphs: [
				'You can make an HHVC report through 311. Having these details ready helps 311 send it to the right program.'
			],
			bullets: [
				'The address and type of property, such as an apartment, single room occupancy (SRO) hotel, business, or shared area',
				'What you saw, where it is, and how long it has been happening',
				'Your contact information if you want an inspector to contact you with questions'
			]
		},
		{
			heading: 'Pests HHVC can inspect',
			fieldKey: 'how-to-choose-the-right-page',
			karl: 'Maps to a Title and text block: Title = this heading, Text = the bulleted list below. On 2026-11-26 the "Indoor pests" and "Outdoor pests and birds" lists merged with "Choose where to report a pest problem", which named the same conditions a second time: each condition now carries its own report link. Details the old lists held stay in the bold label (flies that breed in garbage, ground wasp nests, mites from rodents or birds). The fieldKey keeps the ids of the link list this replaced.',
			kind: 'body',
			bullets: [
				'**Rats or mice:** [Report rats or mice](rodentsReport)',
				'**Bed bugs:** [Report bed bugs](bedBugReport)',
				'**Cockroaches, fleas, flies breeding in garbage, ground wasp nests, or mites from rodents or birds:** [Report cockroaches or other insects](insectsReport)',
				'**Mosquitoes or standing water:** [Report mosquitoes or standing water](mosquitoReport)',
				'**Pigeon droppings, nesting, roosting, or feeding:** [Report pigeon droppings, nesting, or feeding](pigeonReport)'
			]
		},
		{
			heading: 'Sanitation and moisture problems HHVC can inspect',
			karl: 'Maps to a Title and text block: Title = this heading, Text = the bulleted list below. Merged on 2026-11-26 with "Choose where to report a sanitation or moisture problem", which named the same four conditions a second time. The 10 square feet threshold for mold stays in its label. Poison oak on private property was added on 2026-11-26 from HHVC: owners must remove it when it is reported.',
			kind: 'body',
			bullets: [
				'**Garbage, clutter, or overgrown plants that attract pests, or poison oak on private property:** [Report garbage, clutter, or overgrown plants](garbageReport)',
				'**Dog or cat waste, or raccoon droppings, on private property:** [Report animal waste on a property](animalWasteReport)',
				'**Mold from humidity or condensation, about 10 square feet or more:** [Report mold](moldReport)',
				'**Sewage from a drain, toilet, cleanout, or pipe:** [Report a sewage leak or backup](sewageReport)'
			]
		},
		{
			heading: 'Other conditions HHVC can inspect',
			karl: 'Maps to a Title and text block: Title = this heading, Text = the bulleted list below. Plain-language pass on 2026-11-26: "harborage" became where pests nest or hide, and the Article 2, Section 92 rodent line left because "Rats or mice" above already covers droppings, gnaw marks and rodent access.',
			kind: 'body',
			bullets: [
				'Shared kitchens, bathrooms, and garbage areas in single room occupancy (SRO) hotels',
				'Places where pests nest or hide, such as burrows, nesting materials, or wildlife dens, when they create a health hazard',
				'Other conditions the Director of Health decides are a threat to public health or safety'
			]
		},
		{
			heading: 'Other places to report or learn more',
			karl: "Maps to a Title and text block: Title = this heading, Text = the bulleted list below. The last bullet links the Agency page, which Karl's Related cannot hold (moved here 2026-11-26).",
			kind: 'body',
			bullets: [
				'**Dead birds:** [Report a dead bird to the State West Nile virus program](https://westnile.ca.gov/report)',
				'**Health Code Article 11:** [Read Article 11 in plain language](article11Guide)',
				'**Every report in one place:** [Healthy Housing and Vector Control](pestsTopic)'
			]
		},
		{
			heading: 'If your problem is not listed',
			karl: 'Maps to a Title and text block: Title = this heading, Text = the bulleted list below. The Citywide health-nuisance route is an inline external link rather than an HHVC report page so this mockup does not claim responsibility for services other programs own. The Rent Board and start-with-311 bullets were removed on 2026-11-26: "Start with what you can see" already says both.',
			kind: 'body',
			bullets: [
				{
					text: 'Some housing problems are handled by other City programs. For example, structural water intrusion, leaks, and major heating or utility failures go to the [Department of Building Inspection (DBI)](#). DBI handles these under the San Francisco Housing Code (2025).',
					unverified: true,
					unverifiedReason:
						'The "San Francisco Housing Code (2025)" citation has zero tier-1 support (source-of-truth audit 2026-07-06, cross-cutting finding #1) — the DBI routing split looks intentional, but the statutory citation and "(2025)" edition tag trace only to tier-3 NotebookLM material. Source a real Housing Code citation or soften to "may be routed to DBI" before publication.'
				},
				'A fire hazard or a blocked exit goes to the Fire Department.',
				'For lead, pesticides, water quality, food sanitation, or business hygiene, use the [Citywide health nuisance and hazards reporting service](https://www.sf.gov/report-health-nuisance-or-hazards).',
				'If you are not sure whether HHVC can review your problem, it is still okay to report it. HHVC will look at it and decide whether it is a housing or pest health concern it handles.'
			]
		},
		{
			heading: 'When more than one office is involved',
			karl: 'Maps to an Information section → Title and text block, whose Link tool carries the after-you-report page as an Internal link. Moved here on 2026-11-26 from the retired "Who to call about a housing problem" page: a building with both a rodent problem and no heat is the case people actually get stuck on.',
			kind: 'body',
			paragraphs: [
				'A building can have problems belonging to two offices at once. Report each one to the office that handles it rather than waiting for one report to cover both.'
			],
			bullets: [
				'Reporting to one office does not open a case with another.',
				'An HHVC inspection covers the conditions in Article 11, not everything wrong with a building.',
				'[What happens after you report a housing or pest problem](afterReport)'
			]
		},
		{
			heading: 'Related pages',
			karl: 'Maps to the Related field: a generic unrestricted "Page" chooser, repeatable. The Healthy Housing and Vector Control card is now the last bullet of "Other places to report or learn more" (2026-11-26): Karl’s Related takes only Transaction, Information, Campaign and Topic pages (Help Center › Components › Related), and this is an Agency page.',
			kind: 'placement',
			cards: [
				{
					title: 'What happens after you report a housing or pest problem',
					target: 'afterReport'
				},
				{
					title: 'Tenant rights when reporting housing conditions',
					target: 'tenantRights'
				}
			]
		}
	]
};
