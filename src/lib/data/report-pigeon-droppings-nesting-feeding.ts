export const pigeonReport = {
	slug: 'sf.gov/report-pigeon-droppings-nesting-or-feeding',
	type: 'Transaction',
	title: 'Report pigeon droppings, nesting, or feeding',
	summary: 'Roosting birds, feathers, or bird waste on a building, and people who feed them.',
	primaryAgency: 'Healthy Housing and Vector Control',
	audience: [
		'A tenant or resident affected by pigeons on their building',
		'A neighbor reporting pigeons roosting or being fed nearby',
		'A friend, family member, advocate, or helper reporting for someone else'
	],
	reading: 'Grade 6',
	editorNote:
		'Report regroup (Decided, Nov 24, 2026), built 2026-11-25. New page, one of the 9 condition pages. Decided: HHVC cites roosting, nesting, feces, feathers, and people who feed pigeons; the description names roosting and feathers so those searches land here; pigeon droppings move off the animal waste page, which links here; mites are named here too, since they often come with pigeons. The feeding case means the person reported may be a neighbor, not the owner, and the Decided rule is to say what HHVC does then. That answer is STILL OPEN, so the step holds PLACEHOLDER text until HHVC answers. The Article 11 §596 line (a manager, or whoever created the condition) comes from the Questions and answers table. The old page linked a UC IPM pigeon Pest Note; UC IPM no longer publishes one (404 on 2026-11-25), so it is not carried.',
	whatToKnow: {
		cost: 'Free',
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
					title: 'Start your report',
					text: [
						'Use 311 to report pigeon droppings, nesting, roosting, or feeding to the City.',
						'Live in an SRO or residential hotel? Report the same way. One clerk takes every report and assigns SRO cases to senior inspectors.'
					],
					button: 'Report through 311',
					karl: 'what_to_do -> Section. Section title: "Start your report". Section specifics: Text block (these 2 paragraphs, the second being the one-line SRO note every report page carries, Decided) + Button link block ("Report through 311").'
				},
				{
					title: 'Tell us what you see',
					text: ['Only share the details that apply to your situation:'],
					bullets: [
						'**What you see:** Pigeons roosting or nesting on ledges, roofs, or signs, or a build-up of droppings or feathers.',
						'**Where it is:** The address, and where on the building or property.',
						'**When it started:** How long this has been happening.',
						'**Mites:** Whether you see tiny biting mites indoors.',
						'**Your contact info:** Leave a phone number or email if you want an inspector to contact you.'
					],
					callout: {
						karl: 'Callout block inside the "Tell us what you see" Section specifics: single rich text field, no separate title. Text: the one confidentiality sentence (Decided: the same on every page, once per page) plus the photo note.',
						text: 'We never share your name or contact information. You do not need to send photos.',
						title: false
					},
					karl: 'what_to_do -> Section. Section title: "Tell us what you see". Section specifics: Text block (intro sentence + bulleted checklist) + Callout block below.'
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
			karl: 'Maps to supporting_information (Accordions). This accordion uses the mockup-only open flag so the tips are visible without a click — flag for Digital Services that the real accordion renders collapsed. Contents: one Text block (lead paragraph + tips). No external links: UC IPM no longer publishes a pigeon Pest Note.',
			kind: 'body',
			component: 'supporting',
			open: true,
			paragraphs: [
				'It may take us a few weekdays to get back to you. In the meantime, here are a few things you can do to help with the problem.'
			],
			bullets: [
				'**Do not feed pigeons:** Feeding attracts droppings, roosting, and other pests.',
				'**Clean up droppings safely:** Wet down droppings with a disinfectant and wear gloves. Never dry-sweep them.'
			]
		},
		{
			heading: 'What the Health Code requires',
			karl: 'custom_section -> title_and_text. Title = this heading, Text = the Article 11 line, from Sec. 581(b)(7) as Health Code Article 11 in plain language explains it (HHVC content standards Ch. 8.7.1). Secondary Button link block ("View Article 11") citing the municipal code per Ch. 8.7.2.',
			kind: 'body',
			bullets: [
				'San Francisco Health Code Article 11 does not allow animals, including pigeons, to nest, roost, or live on a property in ways that create a health hazard.'
			],
			button: 'View Article 11',
			buttonUrl: 'https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_health/0-0-0-1890',
			buttonStyle: 'secondary'
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
