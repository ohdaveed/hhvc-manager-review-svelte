export const whoToCall = {
	slug: 'sf.gov/information/who-to-call-about-a-housing-problem',
	type: 'Information',
	title: 'Who to call about a housing problem',
	summary:
		'Healthy Housing, Building Inspection, the Rent Board, or 311 — find the right office first.',
	audience: [
		'A tenant with a problem who does not know which office handles it',
		'Someone who has already been routed to the wrong department',
		'An advocate or helper directing someone to the right place'
	],
	reading: 'Grade 6',
	editorNote:
		'PROPOSED PAGE — not in the current 29, and the routing page `design/HHVC Page Ideas.dc.html` names alongside the three Step by step proposals as changing the most for a reader. The gap it fills is specific: a resident with a cold apartment and a rat does not know those are two different departments, and no page tells them. It is deliberately organised by the CONDITION the reader can see rather than by the department that owns it, because the reader knows the former and not the latter. Everything outside HHVC scope routes out rather than being answered here — `scopeInfo` already carries the same boundary and the two must be kept in step. Information has no things_to_know and no intro panel, so the audience line has nowhere to sit on this type; it is left in `audience` and the transcript reports it as a gap, which is the honest state rather than a silent drop.',
	editorStatus: 'needs-review',
	sections: [
		{
			heading: 'Start with what you can see',
			karl: 'Maps to an Information section → Title and text block. The opening paragraph plus the routing bullets fold into one rich text field; the internal links ride in its Link tool.',
			kind: 'body',
			paragraphs: [
				'San Francisco splits housing problems across several offices. You do not need to know which one — you need to name the condition, and the condition decides.'
			],
			bullets: [
				'Pests, rodents, mold, garbage, or an unsanitary building: Healthy Housing and Vector Control.',
				'No heat, no hot water, broken plumbing, bad wiring, or a structural repair: the Department of Building Inspection.',
				'A rent increase, an eviction notice, or a dispute about your lease: the Rent Board.',
				'Not sure, or more than one of these: start with 311.'
			]
		},
		{
			heading: 'What Healthy Housing handles',
			karl: 'Maps to an Information section → Title and text block, whose Link tool carries the four reporting Transactions as Internal links.',
			kind: 'body',
			paragraphs: [
				'This team inspects conditions that affect health in and around housing, under Health Code Article 11.'
			],
			bullets: [
				'[Report rats, mice, and other four-legged problems](rodentsReport)',
				'[Report cockroaches, mosquitoes, and other insects](insectsReport)',
				'[Report garbage, mold, and overgrown vegetation](filthReport)',
				'[Report a problem in an SRO or hotel](sroHotelReport)',
				'[Learn what Healthy Housing and Vector Control can inspect](scopeInfo)'
			]
		},
		{
			heading: 'What another office handles',
			karl: 'Maps to an Information section → Title and text block. External destinations are named in words rather than linked to specific pages: this page should not go stale when another department reorganises its own site, and the corpus has no confirmed deep links for these.',
			kind: 'body',
			paragraphs: [
				'These are real housing problems, and they are not this team’s to inspect. Going straight to the right office is faster than being routed.'
			],
			bullets: [
				'Heat, hot water, plumbing, electrical, and structural repairs: the Department of Building Inspection.',
				'Rent increases, evictions, and lease disputes: the Rent Board.',
				'Lead paint, asbestos, water service, and noise: Citywide services, not this team.',
				'A fire hazard or a blocked exit: the Fire Department.'
			]
		},
		{
			heading: 'When more than one office is involved',
			karl: 'Maps to an Information section → Title and text block. This section exists because the single-condition routing above is the common case and not the hard one — a building with both a rodent problem and no heat is the case people actually get stuck on.',
			kind: 'body',
			paragraphs: [
				'A building can have problems belonging to two offices at once. Report each one to the office that handles it rather than waiting for one report to cover both.'
			],
			bullets: [
				'Reporting to one office does not open a case with another.',
				'A Healthy Housing inspection covers the conditions in Article 11, not everything wrong with a building.',
				'[What happens after you report a housing or pest problem](afterReport)'
			]
		},
		{
			heading: 'If you are worried about retaliation',
			karl: 'Maps to an Information section → Title and text block, linking to the existing tenant rights page rather than restating protections. No legal right is stated here that tenantRights does not already carry.',
			kind: 'body',
			paragraphs: [
				'You can report a condition in a building you rent. Reports can be made without giving your name.'
			],
			bullets: ['[Tenant rights when reporting housing conditions](tenantRights)']
		},
		{
			heading: 'Related pages',
			karl: 'Maps to Related. Each card publishes the destination page’s own title.',
			kind: 'body',
			cards: [
				{ title: 'Report a pest problem, start to finish', target: 'stepPestReport' },
				{ title: 'Health Code Article 11 in plain language', target: 'article11Guide' },
				{ title: 'Healthy housing and pest resources', target: 'verminResources' }
			]
		}
	],
	partnerAgencies: [
		{
			title: '311 Customer Service Center',
			url: 'https://www.sf.gov/departments--311-customer-service-center'
		},
		{
			title: 'Environmental Health',
			url: 'https://www.sf.gov/departments--department-public-health--environmental-health'
		}
	],
	seoTitle: 'Who to call about a housing problem | SF.gov',
	metaDescription:
		'Healthy Housing, Building Inspection, the Rent Board, or 311 — find the right office first.'
};
