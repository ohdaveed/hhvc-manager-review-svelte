export const rodentsReport = {
	slug: 'sf.gov/report-rats-or-mice',
	type: 'Transaction',
	title: 'Report rats or mice',
	summary:
		'Droppings, burrows, gnaw marks, or rodent mites in a home, building, yard, or shared area.',
	primaryAgency: 'Healthy Housing and Vector Control',
	// Karl's Contact us block (get_help -> Phone number), in the order and wording
	// live SF.gov 311 report pages use (2026-11-26 page review). In the step text
	// it would push the 311 step past the three-sentence paragraph limit.
	contact: {
		phone: [
			'311',
			'415-701-2311 if you are outside of San Francisco',
			'TDD/TTY 711 if you are deaf, hard of hearing, or have a speech disability'
		]
	},
	reading: 'Grade 6',
	editorNote:
		'Report regroup (Decided, Nov 24, 2026), built 2026-11-25. Replaces "Report rats, mice, and other four-legged problems" in place, so its review status, notes and edits carry over: this page is one of the 9 condition pages. Scope is the Decided one: rats and mice, their droppings and burrows, and the mites that come with them. Live raccoons are named only in a one-line scope note in What to know (we inspect for rats and mice, not live wildlife). Raccoon droppings belong to the animal waste page, which is not built yet. Bats are left out on purpose (owner, Nov 25, 2026): the old page covered them, but bat reports are rare. Shared report text (reporting anonymously, the landlord notice, reporting for someone else, language help) now lives on What happens after you report and Tenant rights, per the Decided shared-content rule. The "While you wait" section is the Supporting information block requested by the manager. Restructured 2026-11-26 from a reading-flow review: What to know now leads with If you rent and holds who can report and when to report now (Karl allows 2 Things to know items), the standalone Health Code section folded into that item, and While you wait is collapsed and cut to immediate tips.',
	whatToKnow: {
		thingsToKnow: [
			{
				label: 'If you rent',
				text: 'The [Health Code](https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_health/0-0-0-1890) requires property owners to keep buildings free of rats and mice. Tell your landlord first, unless the problem is urgent. [Tenant rights when reporting housing conditions](tenantRights) explains how long to wait.'
			},
			{
				label: 'What you can report',
				text: 'You can report a problem in your home, a shared area, or at work, or report for someone else. We inspect for rats and mice, not live wildlife like raccoons.'
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
					title: 'Gather your details',
					text: [
						'Have these details ready before you start. Only share what applies to your situation:'
					],
					bullets: [
						'**What you saw:** Rats, mice, droppings, burrows, gnaw marks, or mite bites.',
						'**Where it is:** The address, and whether you saw it inside, outside, or in a shared area.',
						'**When it started:** How long this has been happening.',
						'**Other issues:** Any garbage, clutter, pet waste, holes, or overgrown plants nearby.',
						'**Your contact info:** Leave a phone number or email if you want an inspector to contact you.'
					],
					callout: {
						karl: 'Callout block inside the "Gather your details" Section specifics: single rich text field, no separate title. Text: the one confidentiality sentence (Decided: the same on every page, once per page) plus the photo note.',
						text: 'We never share your name or contact information. You do not need to send photos.',
						title: false
					},
					karl: 'what_to_do -> Section. Section title: "Gather your details". Section specifics: Text block (intro sentence + bulleted checklist) + Callout block below.'
				},
				{
					title: 'Start your report',
					text: ['Use 311 to report rats or mice to the City.'],
					button: 'Report through 311',
					after: [
						'**Other ways to report**',
						'**Call 311 to make a report**',
						'415-701-2311 if you are outside of San Francisco',
						'TDD/TTY 711 if you are deaf, hard of hearing, or have a speech disability',
						'**Use our Mobile App**',
						'Download our mobile app to report a problem and track your request. Available on Android or iOS.',
						'[Learn more about the SF311 mobile app](https://www.sf.gov/sf311-mobile-app)'
					],
					karl: 'what_to_do -> Section. Section title: "Start your report". Section specifics: Text block (this paragraph) + Button link block ("Report through 311") + Text block ("Other ways to report", the `after` lines). The one-line SRO note every report page carried was removed on 2026-11-26 (owner). Who can report and when to report now moved to What to know on 2026-11-26 (page review), so eligibility and timing are read before the details are gathered.'
				}
			]
		},
		{
			heading: 'While you wait: tips to help with the problem',
			karl: 'Maps to supporting_information (Accordions), collapsed by default as the real accordion renders. Contents: one Text block (lead paragraph + bullets). Cut on 2026-11-26 (page review) to the tips a resident can act on right away, so the accordion does not turn a report page into a prevention guide: "Close off entry points and hiding places" and the four external links (UC IPM Rats, UC IPM House mouse, CDC, NEHA) were removed, because Keep rats and mice out of your home, linked from Related pages, already covers sealing and hiding places and carries its own UC IPM and CDC links. The pet waste tip is the Decided cross-link line ("Pick up pet waste daily. It feeds rats."), linked to the animal waste page.',
			kind: 'body',
			component: 'supporting',
			paragraphs: ['It may take us a few weekdays to get back to you.'],
			bullets: [
				'**Cut off food:** Store food and garbage in bins with tight-fitting lids. Do not leave pet food out overnight.',
				'**Pick up pet waste daily:** It feeds rats. [Report animal waste on a property](animalWasteReport)',
				'**Trap safely:** Use snap traps indoors. Do not use poisons. They can harm children, pets, and wildlife.',
				'**Clean up safely:** Wet down droppings with a disinfectant and wear gloves. Never dry-sweep or vacuum droppings.'
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
