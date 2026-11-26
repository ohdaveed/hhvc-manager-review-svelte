export const rodentsReport = {
	slug: 'sf.gov/report-rats-or-mice',
	type: 'Transaction',
	title: 'Report rats or mice',
	summary:
		'Droppings, burrows, gnaw marks, or rodent mites in a home, building, yard, or shared area.',
	primaryAgency: 'Healthy Housing and Vector Control',
	reading: 'Grade 6',
	editorNote:
		'Report regroup (Decided, Nov 24, 2026), built 2026-11-25. Replaces "Report rats, mice, and other four-legged problems" in place, so its review status, notes and edits carry over: this page is one of the 9 condition pages. Scope is the Decided one: rats and mice, their droppings and burrows, and the mites that come with them. Live raccoons are named only to say the owner hires a private wildlife company. Raccoon droppings belong to the animal waste page, which is not built yet. Bats are left out on purpose (owner, Nov 25, 2026): the old page covered them, but bat reports are rare. Shared report text (reporting anonymously, the landlord notice, reporting for someone else, language help) now lives on What happens after you report and Tenant rights, per the Decided shared-content rule. The "While you wait" section is the Supporting information block requested by the manager.',
	whatToKnow: {
		cost: 'Free',
		thingsToKnow: [
			{
				label: 'Raccoons and other wildlife',
				text: 'We do not remove live animals. The property owner hires a private wildlife company to remove live raccoons.'
			},
			{
				label: 'If you rent',
				text: 'Tell your landlord first, unless the problem is urgent. [Tenant rights when reporting housing conditions](tenantRights) explains how long to wait.'
			}
		]
	},
	sections: [
		{
			heading: 'What to do',
			karl: 'Karl: what_to_do StreamField. Each step below = one Section block (section_title + section_specifics). The 311 action comes first.',
			kind: 'body',
			steps: [
				{
					title: 'Start your report',
					text: [
						'Use 311 to report rats or mice to the City. If the problem is urgent, report now. You can report a problem in your home, a shared area, or at work, or report for someone else.',
						'Live in an SRO or residential hotel? Report the same way. One clerk takes every report and assigns SRO cases to senior inspectors.'
					],
					button: 'Report through 311',
					karl: 'what_to_do -> Section. Section title: "Start your report". Section specifics: Text block (these 2 paragraphs, the second being the one-line SRO note every report page carries, Decided) + Button link block ("Report through 311").'
				},
				{
					title: 'Tell us what you saw',
					text: ['Only share the details that apply to your situation:'],
					bullets: [
						'**What you saw:** Rats or mice, droppings, burrows, gnaw marks, or bites from tiny mites. Mites often come with rats and mice.',
						'**Where it is:** The address, and whether you saw it inside, outside, or in a shared area.',
						'**When it started:** How long this has been happening.',
						'**Other issues:** Any garbage, clutter, pet waste, holes, or overgrown plants nearby.',
						'**Your contact info:** Leave a phone number or email if you want an inspector to contact you.'
					],
					callout: {
						karl: 'Callout block inside the "Tell us what you saw" Section specifics: single rich text field, no separate title. Text: the one confidentiality sentence (Decided: the same on every page, once per page) plus the photo note.',
						text: 'We never share your name or contact information. You do not need to send photos.',
						title: false
					},
					karl: 'what_to_do -> Section. Section title: "Tell us what you saw". Section specifics: Text block (intro sentence + bulleted checklist) + Callout block below.'
				}
			]
		},
		{
			heading: 'While you wait: tips to help with the problem',
			karl: 'Maps to supporting_information (Accordions). This accordion uses the mockup-only open flag so the tips are visible without a click — flag for Digital Services that the real accordion renders collapsed. Contents: one Text block (lead paragraph + IPM bullets) + a Resources-style external links list (UC IPM, CDC, NEHA). The pet waste tip is the Decided cross-link line ("Pick up pet waste daily. It feeds rats."), linked to the animal waste page. It was its own sixth bullet until 2026-11-26, when it joined "Cut off food" word for word: SF.gov keeps a bulleted list to 3 to 5 items.',
			kind: 'body',
			component: 'supporting',
			open: true,
			paragraphs: [
				'It may take us a few weekdays to get back to you. In the meantime, here are a few things you can do to help with the problem.'
			],
			bullets: [
				'**Close off entry points:** Seal any gap bigger than 1/4 inch. Use rodent-proof materials like hardware cloth, copper mesh, or sheet metal.',
				'**Cut off food:** Store food and garbage in bins with tight-fitting lids. Do not leave pet food out overnight. Pick up pet waste daily. It feeds rats. [Report animal waste on a property](animalWasteReport)',
				'**Remove hiding places:** Clear clutter and trim overgrown plants where rats and mice hide or nest.',
				'**Trap safely:** Use snap traps indoors. Do not use poisons — they can harm children, pets, and wildlife.',
				'**Clean up safely:** Wet down droppings with a disinfectant and wear gloves. Never dry-sweep or vacuum droppings.'
			],
			cards: [
				{
					title: 'UC IPM Pest Notes: Rats',
					text: 'University of California guidance on identifying and managing rats.',
					url: 'https://ipm.ucanr.edu/home-and-landscape/rats/pest-notes/',
					karl: 'External link inside the supporting_information accordion. Third-party UC IPM reference in place of a City-maintained prevention page (manager directive: do not reinvent the wheel).'
				},
				{
					title: 'UC IPM Pest Notes: House mouse',
					text: 'University of California guidance on managing house mice.',
					url: 'https://ipm.ucanr.edu/home-and-landscape/house-mouse/',
					karl: 'External link inside the supporting_information accordion. Third-party UC IPM reference.'
				},
				{
					title: 'CDC: Preventing rodent infestations',
					text: 'Federal guidance on keeping rodents out of your home.',
					url: 'https://www.cdc.gov/rodents/prevention/index.html',
					karl: 'External link inside the supporting_information accordion. Third-party CDC reference.'
				},
				{
					title: 'NEHA: Vector control resources',
					text: 'National Environmental Health Association vector control resources.',
					url: 'https://www.neha.org/vector-control',
					karl: 'External link inside the supporting_information accordion. Third-party NEHA reference.'
				}
			]
		},
		{
			heading: 'What the Health Code requires',
			karl: 'custom_section -> title_and_text. Title = this heading, Text = the Article 11 line (HHVC content standards Ch. 8.7.1). The municipal code is cited per Ch. 8.7.2 as an inline link, the last bullet: custom_section has no Button link block (U1), so the "View Article 11" button it used to carry had no Karl destination.',
			kind: 'body',
			bullets: [
				'San Francisco Health Code Article 11 requires property owners to keep buildings clean, watertight, and completely free of rodent infestations.',
				'[View Health Code Article 11](https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_health/0-0-0-1890)'
			]
		},
		{
			heading: 'Related pages',
			karl: 'Maps to the related panel: repeatable field "Page *" with a "Choose a page" button. 6 cards below = 6 related "Page" entries. The last card links the community-education Information page for this condition (added 2026-11-26, appended so the earlier cards keep their `cards.N` field ids): it was reachable only from the Topic and the home page, so a reader who came to report had no route to prevention. All internal SF.gov pages — Karl Related is a page chooser and cannot hold external links.',
			kind: 'placement',
			cards: [
				{
					title: 'What happens after you report a housing or pest problem',
					target: 'afterReport'
				},
				{
					title: 'Tenant rights when reporting housing conditions',
					target: 'tenantRights'
				},
				{
					title: 'Report garbage, clutter, or overgrown plants',
					target: 'garbageReport'
				},
				{
					title: 'Learn what Healthy Housing and Vector Control can inspect',
					target: 'scopeInfo'
				},
				{
					title: 'Rat-free blocks',
					target: 'ratFreeBlocks'
				},
				{
					title: 'Keep rats and mice out of your home',
					target: 'rodentsPrevention'
				}
			]
		}
	],
	// Karl's Partner agencies field (distinct from Primary Agency, which the
	// parent-program link above already represents) — the two departments this
	// report actually routes through, matching the pattern confirmed live on
	// sf.gov/report-health-nuisance-or-hazards.
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
	seoTitle: 'Report rats or mice | SF.gov',
	metaDescription:
		'Report rats, mice, droppings, burrows, or rodent mites in a San Francisco home, building, or yard.'
};
