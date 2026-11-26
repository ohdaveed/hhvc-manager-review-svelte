export const insectsReport = {
	slug: 'sf.gov/report-cockroaches-or-other-insects',
	type: 'Transaction',
	title: 'Report cockroaches or other insects',
	summary: 'Roaches, fleas, flies, wasps, or mites in a home, building, yard, or shared area.',
	primaryAgency: 'Healthy Housing and Vector Control',
	reading: 'Grade 6',
	editorNote:
		'Report regroup (Decided, Nov 24, 2026), built 2026-11-25. Replaces "Report cockroaches, mosquitoes, and other insects" in place, so its review status, notes and edits carry over: this page is one of the 9 condition pages. Bed bugs and mosquitoes moved to their own pages. Each insect is routed by how HHVC handles it (Decided): flies are cited but usually point to a garbage or animal waste problem, so they link there and get drain fly and fruit fly tips; mites usually come with rats or pigeons, so those pages name them too; for wasps HHVC confirms the nest and refers a nest on public property to Public Works, replacing the old "until it is treated" line. Fleas are added, since Article 11 §581(b)(8) names them. STILL OPEN: what HHVC does after confirming a nest on private property; the step holds PLACEHOLDER text until HHVC answers. Shared report text lives on What happens after you report and Tenant rights.',
	whatToKnow: {
		cost: 'Free',
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
					title: 'Start your report',
					text: [
						'Use 311 to report cockroaches, fleas, flies, wasps, or mites to the City. If the problem is urgent, report now. You can report a problem in your home, a shared area, or at work, or report for someone else.',
						'Bed bugs and mosquitoes have their own pages: [Report bed bugs](bedBugReport) and [Report mosquitoes or standing water](mosquitoReport).',
						'Live in an SRO or residential hotel? Report the same way. One clerk takes every report and assigns SRO cases to senior inspectors.'
					],
					button: 'Report through 311',
					karl: 'what_to_do -> Section. Section title: "Start your report". Section specifics: Text block (these 3 paragraphs: the action, the two pages that took over bed bugs and mosquitoes, and the one-line SRO note every report page carries, Decided) + Button link block ("Report through 311").'
				},
				{
					title: 'Tell us what you saw',
					text: ['Only share the details that apply to your situation:'],
					bullets: [
						'**What you saw:** Cockroaches, fleas, flies, wasps, or mites.',
						'**Where it is:** The address, and whether you saw them inside, outside, or in a shared area.',
						'**When it started:** How long this has been happening.',
						'**Other issues:** Any garbage, animal waste, rats, mice, or pigeons nearby.',
						'**Your contact info:** Leave a phone number or email if you want an inspector to contact you.'
					],
					callout: {
						karl: 'Callout block inside the "Tell us what you saw" Section specifics: single rich text field, no separate title. Text: the one confidentiality sentence (Decided: the same on every page, once per page) plus the photo note.',
						text: 'We never share your name or contact information. You do not need to send photos.',
						title: false
					},
					karl: 'what_to_do -> Section. Section title: "Tell us what you saw". Section specifics: Text block (intro sentence + bulleted checklist) + Callout block below.'
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
			karl: 'Maps to supporting_information (Accordions). This accordion uses the mockup-only open flag so the tips are visible without a click — flag for Digital Services that the real accordion renders collapsed. Contents: one Text block (lead paragraph + tips per insect) + a Resources-style external links list (UC IPM). The drain fly and fruit fly tips are the Decided education for flies.',
			kind: 'body',
			component: 'supporting',
			open: true,
			paragraphs: [
				'It may take us a few weekdays to get back to you. In the meantime, here are a few things you can do to help with the problem.'
			],
			bullets: [
				'**Cockroaches:** Clean up crumbs and grease, fix dripping faucets and leaks, and seal cracks near pipes. Use bait stations instead of sprays.',
				'**Flies:** Bag garbage tightly and keep bin lids closed so flies cannot breed in it.',
				'**Drain flies:** Scrub slow or unused drains with a brush and flush them with hot water.',
				'**Fruit flies:** Throw out overripe fruit and rinse cans and bottles before you recycle them.'
			],
			cards: [
				{
					title: 'UC IPM Pest Notes: Cockroaches',
					text: 'University of California guidance on managing cockroaches.',
					url: 'https://ipm.ucanr.edu/home-and-landscape/cockroaches/',
					karl: 'External link inside the supporting_information accordion. Third-party UC IPM reference in place of a City-maintained prevention page (manager directive: do not reinvent the wheel).'
				},
				{
					title: 'UC IPM Pest Notes: Fleas',
					text: 'University of California guidance on managing fleas.',
					url: 'https://ipm.ucanr.edu/home-and-landscape/fleas/',
					karl: 'External link inside the supporting_information accordion. Third-party UC IPM reference.'
				},
				{
					title: 'UC IPM Pest Notes: Moth or drain flies',
					text: 'University of California guidance on drain flies.',
					url: 'https://ipm.ucanr.edu/home-and-landscape/moth-or-drain-flies/',
					karl: 'External link inside the supporting_information accordion. Third-party UC IPM reference.'
				},
				{
					title: 'UC IPM Pest Notes: Yellowjackets and other social wasps',
					text: 'University of California guidance on wasps and their nests.',
					url: 'https://ipm.ucanr.edu/home-and-landscape/yellowjackets-and-other-social-wasps/',
					karl: 'External link inside the supporting_information accordion. Third-party UC IPM reference.'
				}
			]
		},
		{
			heading: 'What the Health Code requires',
			karl: 'custom_section -> title_and_text. Title = this heading, Text = the Article 11 line, from Sec. 581(b)(8) (HHVC content standards Ch. 8.7.1). The municipal code is cited per Ch. 8.7.2 as an inline link, the last bullet: custom_section has no Button link block (U1), so the "View Article 11" button it used to carry had no Karl destination.',
			kind: 'body',
			bullets: [
				'San Francisco Health Code Article 11 requires property owners to keep buildings free of insect infestations, including cockroaches, fleas, flies, and wasps.',
				'[View Health Code Article 11](https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_health/0-0-0-1890)'
			]
		},
		{
			heading: 'Related pages',
			karl: 'Maps to the related panel: repeatable field "Page *" with a "Choose a page" button. 5 cards below = 5 related "Page" entries. The last card links the community-education Information page for this condition (added 2026-11-26, appended so the earlier cards keep their `cards.N` field ids): it was reachable only from the Topic and the home page, so a reader who came to report had no route to prevention. All internal SF.gov pages — Karl Related is a page chooser and cannot hold external links.',
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
					title: 'Report bed bugs',
					target: 'bedBugReport'
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
