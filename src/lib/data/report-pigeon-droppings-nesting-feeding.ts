export const pigeonReport = {
	slug: 'sf.gov/report-pigeon-droppings-nesting-or-feeding',
	type: 'Transaction',
	title: 'Report pigeon droppings, nesting, or feeding',
	summary: 'Roosting birds, feathers, or bird waste on a building, and people who feed them.',
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
		'Report regroup (Decided, Nov 24, 2026), built 2026-11-25. New page, one of the 9 condition pages. Decided: HHVC cites roosting, nesting, feces, feathers, and people who feed pigeons; the description names roosting and feathers so those searches land here; pigeon droppings move off the animal waste page, which links here; mites are named here too, since they often come with pigeons. The feeding case means the person reported may be a neighbor, not the owner, and the Decided rule is to say what HHVC does then. That answer is STILL OPEN, so the step holds PLACEHOLDER text until HHVC answers. The Article 11 §596 line (a manager, or whoever created the condition) comes from the Questions and answers table. The old page linked a UC IPM pigeon Pest Note; UC IPM no longer publishes one (404 on 2026-11-25), so it is not carried.',
	whatToKnow: {
		thingsToKnow: [
			{
				label: 'Who we contact',
				text: 'We contact the property owner. Health Code Article 11 also lets us act against a manager, or whoever created the problem.'
			},
			{
				label: 'Bird mites',
				text: 'Tiny biting mites often come with nesting pigeons. Report them here too.'
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
						'**What you see:** Pigeons roosting or nesting on ledges, roofs, or signs, or a build-up of droppings or feathers.',
						'**Where it is:** The address, and where on the building or property.',
						'**When it started:** How long this has been happening.',
						'**Mites:** Whether you see tiny biting mites indoors.',
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
						'Use 311 to report pigeon droppings, nesting, roosting, or feeding to the City. The [Health Code](https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_health/0-0-0-1890) does not allow pigeons to nest or roost on a property in ways that create a health hazard.'
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
					karl: 'what_to_do -> Section. Section title: "Start your report". Section specifics: Text block (this paragraph) + Button link block ("Report through 311") + Text block ("Other ways to report", the `after` lines). The one-line SRO note every report page carried was removed on 2026-11-26 (owner). The Article 11 line was folded in on 2026-11-26 from the retired "What the Health Code requires" custom section (HHVC content standards Ch. 8.7.1-8.7.2), and the who-can-report line was dropped: What happens after you report owns it.'
				},
				{
					title: 'If someone is feeding pigeons',
					text: [
						'Tell us where and when the feeding happens. The person feeding them may be a neighbor, not the property owner.',
						'PLACEHOLDER: what HHVC does when the person feeding pigeons is not the property owner.'
					],
					karl: 'what_to_do -> Section. Section title: "If someone is feeding pigeons". Section specifics: one Text block. Decided: say what HHVC does in the feeding case. The answer is still open, so it reads PLACEHOLDER (C3).'
				}
			]
		},
		{
			heading: 'While you wait: tips to help with the problem',
			karl: 'Maps to supporting_information (Accordions), collapsed by default as the real accordion renders. Contents: one Text block (lead paragraph + tips). Cut on 2026-11-26 (page review, as on Report rats or mice) to the tips a resident can act on now. No external links: UC IPM no longer publishes a pigeon Pest Note.',
			kind: 'body',
			component: 'supporting',
			paragraphs: ['It may take us a few weekdays to get back to you.'],
			bullets: [
				'**Do not feed pigeons:** Feeding attracts droppings, roosting, and other pests.',
				'**Clean up droppings safely:** Wet down droppings with a disinfectant and wear gloves. Never dry-sweep them.'
			]
		},
		{
			heading: 'Related pages',
			karl: 'Maps to the related panel: repeatable field "Page *" with a "Choose a page" button. 4 cards below = 4 related "Page" entries. All internal SF.gov pages — Karl Related is a page chooser and cannot hold external links.',
			kind: 'placement',
			cards: [
				{
					title: 'What happens after you report a housing or pest problem',
					target: 'afterReport'
				},
				{
					title: 'Report animal waste on a property',
					target: 'animalWasteReport'
				},
				{
					title: 'Tenant rights when reporting housing conditions',
					target: 'tenantRights'
				},
				{
					title: 'Learn what Healthy Housing and Vector Control can inspect',
					target: 'scopeInfo'
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
	seoTitle: 'Report pigeon droppings, nesting, or feeding | SF.gov',
	metaDescription:
		'Report pigeons roosting or nesting, droppings or feathers, or people feeding pigeons at a San Francisco property.'
};
