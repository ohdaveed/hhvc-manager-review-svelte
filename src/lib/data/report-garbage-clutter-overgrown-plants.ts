export const garbageReport = {
	slug: 'sf.gov/report-garbage-clutter-or-overgrown-plants',
	type: 'Transaction',
	title: 'Report garbage, clutter, or overgrown plants',
	summary:
		'Trash build-up, stored materials, or brush that draws pests to a home, yard, or shared area.',
	primaryAgency: 'Healthy Housing and Vector Control',
	audience: [
		'A tenant or resident affected by garbage, clutter, or overgrown plants',
		'A neighbor reporting conditions on a nearby property',
		'A friend, family member, advocate, or helper reporting for someone else'
	],
	reading: 'Grade 6',
	editorNote:
		'Report regroup (Decided, Nov 24, 2026), built 2026-11-25. New page, one of the 9 condition pages. Scope is the Decided one: garbage, excessive materials and overgrown vegetation, with links to Adult Protective Services and the Fire Marshal, phrased as offers of help rather than threats of enforcement. Both link targets were checked live on 2026-11-25: the APS page answers 200, and the fire safety page redirects to the Fire Department\'s own report form. Text is carried from "Report garbage, mold, and overgrown vegetation", which was retired once pigeons and animal waste got their own pages (2026-11-25). Shared report text lives on What happens after you report and Tenant rights.',
	whatToKnow: {
		cost: 'Free',
		thingsToKnow: [
			{
				label: 'If someone may need support',
				text: 'If an older or dependent adult is living with a lot of stored items and may need help, Adult Protective Services can offer support. [Get help from Adult Protective Services](https://www.sf.gov/recognize-and-get-help-for-elder-abuse-in-san-francisco)'
			},
			{
				label: 'If stored items block an exit',
				text: 'If stored items block an exit or could start a fire, the Fire Marshal can help make the building safe. [Report a fire safety concern](https://www.sf.gov/report-fire-life-safety-issue)'
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
						'Use 311 to report garbage, clutter, or overgrown plants to the City. If the problem is urgent, report now.',
						'Live in an SRO or residential hotel? Report the same way. One clerk takes every report and assigns SRO cases to senior inspectors.'
					],
					button: 'Report through 311',
					karl: 'what_to_do -> Section. Section title: "Start your report". Section specifics: Text block (these 2 paragraphs, the second being the one-line SRO note every report page carries, Decided) + Button link block ("Report through 311").'
				},
				{
					title: 'Describe the condition',
					text: ['Include only the details that apply:'],
					bullets: [
						'The address or location',
						'The condition: garbage, debris, clutter, stored items, or overgrown plants and brush',
						'Whether it is inside, outside, or in a shared area',
						'How long it has been happening',
						'Whether you saw rats, mice, or other pests nearby',
						'Your contact information, if you want an inspector to contact you'
					],
					callout: {
						karl: 'Callout block inside the "Describe the condition" Section specifics: single rich text field, no separate title. Text: the one confidentiality sentence (Decided: the same on every page, once per page) plus the photo note. The old page\'s "Reporter identities are only shared with the City Attorney\'s Office" line is not carried (Decided).',
						text: 'We never share your name or contact information. You do not need to send photos.',
						title: false
					},
					karl: 'what_to_do -> Section. Section title: "Describe the condition". Section specifics: Text block (intro sentence + bulleted checklist) + Callout block below.'
				}
			]
		},
		{
			heading: 'While you wait: tips to help with the problem',
			karl: 'Maps to supporting_information (Accordions). This accordion uses the mockup-only open flag so the tips are visible without a click — flag for Digital Services that the real accordion renders collapsed. Contents: one Text block (lead paragraph + IPM bullets) + a Resources-style external link (NEHA).',
			kind: 'body',
			component: 'supporting',
			open: true,
			paragraphs: [
				'It may take us a few weekdays to get back to you. In the meantime, here are a few things you can do to help with the problem.'
			],
			bullets: [
				'**Contain garbage:** Bag garbage before you toss it, and keep bin lids fully closed.',
				'**Trim plants:** Cut back overgrown plants and brush, especially where they touch buildings or fences.',
				'**Store items off the ground:** Keep stored items on shelves or pallets so pests cannot hide under them.'
			],
			cards: [
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
			karl: 'custom_section -> title_and_text. Title = this heading, Text = the Article 11 line (HHVC content standards Ch. 8.7.1). Secondary Button link block ("View Article 11") citing the municipal code per Ch. 8.7.2.',
			kind: 'body',
			bullets: [
				'San Francisco Health Code Article 11 covers this. Property owners must not let trash, filth, or overgrown plants build up. Build-up that shelters pests or creates a health hazard is a violation.'
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
					title: 'Tenant rights when reporting housing conditions',
					target: 'tenantRights'
				},
				{
					title: 'Report rats or mice',
					target: 'rodentsReport'
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
	seoTitle: 'Report garbage, clutter, or overgrown plants | SF.gov',
	metaDescription:
		'Report garbage, clutter, stored materials, or overgrown plants that draw pests to a San Francisco property.'
};
