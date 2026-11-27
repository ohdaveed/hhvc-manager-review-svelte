export const insectsReport = {
	slug: 'sf.gov/report-cockroaches-or-other-insects',
	type: 'Transaction',
	title: 'Report cockroaches or other insects',
	summary: 'Cockroaches, fleas, flies, wasps, or mites in a home, building, yard, or shared area.',
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
		'Report regroup (Decided, Nov 24, 2026), built 2026-11-25. Replaces "Report cockroaches, mosquitoes, and other insects" in place, so its review status, notes and edits carry over: this page is one of the 9 condition pages. Bed bugs and mosquitoes moved to their own pages. Each insect is routed by how HHVC handles it (Decided): flies are cited but usually point to a garbage or animal waste problem, so they link there and get drain fly and fruit fly tips; mites usually come with rats or pigeons, so those pages name them too; for wasps HHVC confirms the nest and refers a nest on public property to Public Works, replacing the old "until it is treated" line. Fleas are added, since Article 11 §581(b)(8) names them. STILL OPEN: what HHVC does after confirming a nest on private property; the step holds PLACEHOLDER text until HHVC answers. Shared report text lives on What happens after you report and Tenant rights.',
	whatToKnow: {
		thingsToKnow: [
			{
				label: 'Flies often point to another problem',
				text: 'Flies usually breed in garbage or animal waste. If you see that too, use [Report garbage, clutter, or overgrown plants](garbageReport) or [Report animal waste on a property](animalWasteReport).'
			},
			{
				label: 'Mites',
				text: 'Mites often come with rats, mice, or pigeons. If you see those too, use [Report rats or mice](rodentsReport) or [Report pigeon droppings, nesting, or feeding](pigeonReport).'
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
						'**What you saw:** Which insect, how many, and any bites or nests.',
						'**Where it is:** The address, and whether you saw them inside, outside, or in a shared area.',
						'**When it started:** How long this has been happening.',
						'**Other issues:** Any garbage, animal waste, rats, mice, or pigeons nearby.',
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
					text: [
						'Use 311 to report cockroaches, fleas, flies, wasps, or mites to the City. The [Health Code](https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_health/0-0-0-1890) requires property owners to keep buildings free of them.',
						'Bed bugs and mosquitoes have their own pages: [Report bed bugs](bedBugReport) and [Report mosquitoes or standing water](mosquitoReport).'
					],
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
					karl: 'what_to_do -> Section. Section title: "Start your report". Section specifics: Text block (these 2 paragraphs: the action with the Article 11 requirement, folded in on 2026-11-26 from the retired "What the Health Code requires" custom section per HHVC content standards Ch. 8.7.1-8.7.2, and the two pages that took over bed bugs and mosquitoes) + Button link block ("Report through 311") + Text block ("Other ways to report", the `after` lines). The one-line SRO note every report page carried was removed on 2026-11-26 (owner).'
				},
				{
					title: 'If you see a wasp nest',
					text: [
						'Do not disturb the nest. Mark the spot and keep people and pets away.',
						'We confirm the nest. If it is on public property, we refer it to Public Works.',
						'PLACEHOLDER: what happens when the nest is on private property.'
					],
					karl: 'what_to_do -> Section. Section title: "If you see a wasp nest". Section specifics: one Text block. Replaces the old "until it is treated" tip with what HHVC does next (Decided). The private-property case is still open, so it reads PLACEHOLDER (C3).'
				}
			]
		},
		{
			heading: 'While you wait: tips to help with the problem',
			karl: "Maps to supporting_information (Accordions), collapsed by default as the real accordion renders. Contents: one Text block (lead paragraph + tips per insect). Cut on 2026-11-26 (page review, as on Report rats or mice) to the tips a resident can act on now: the sealing tip and the UC IPM links are left to Get rid of cockroaches without heavy pesticides, and the flea and wasp links, which had no other home, were dropped. The drain fly and fruit fly tips are the Decided education for flies. The fly, drain fly and fruit fly tips became one Flies bullet on 2026-11-26, so the page's main pest is not outweighed.",
			kind: 'body',
			component: 'supporting',
			paragraphs: ['It may take us a few weekdays to get back to you.'],
			bullets: [
				'**Cockroaches:** Clean up crumbs and grease, and fix dripping faucets and leaks. Use bait stations instead of sprays.',
				'**Flies:** Bag garbage tightly and keep bin lids closed so flies cannot breed in it. For drain flies, scrub slow or unused drains with a brush and flush them with hot water. For fruit flies, throw out overripe fruit and rinse cans and bottles before you recycle them.'
			]
		},
		{
			heading: 'Related pages',
			karl: 'Maps to the related panel: repeatable field "Page *" with a "Choose a page" button. 4 cards below = 4 related "Page" entries. Report bed bugs left on 2026-11-26: Start your report already links it. The last card links the community-education Information page for this condition (added 2026-11-26, appended so the earlier cards keep their `cards.N` field ids): it was reachable only from the Topic and the home page, so a reader who came to report had no route to prevention. All internal SF.gov pages — Karl Related is a page chooser and cannot hold external links.',
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
					title: 'Learn what Healthy Housing and Vector Control can inspect',
					target: 'scopeInfo'
				},
				{
					title: 'Get rid of cockroaches without heavy pesticides',
					target: 'cockroachesPrevention'
				}
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
	seoTitle: 'Report cockroaches or other insects | SF.gov',
	metaDescription:
		'Report cockroaches, fleas, flies, wasps, or mites in a San Francisco home, building, or yard.'
};
