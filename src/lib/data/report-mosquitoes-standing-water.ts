export const mosquitoReport = {
	slug: 'sf.gov/report-mosquitoes-or-standing-water',
	type: 'Transaction',
	title: 'Report mosquitoes or standing water',
	summary:
		'Biting insects or breeding water in a yard, building, public space, or nearby catch basin.',
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
		'Report regroup (Decided, Nov 24, 2026), built 2026-11-25. New page, one of the 9 condition pages: HHVC finds water sources and treats them, so mosquitoes get their own Transaction. The dead-bird West Nile referral moves here from the insects page, and Mosquito Control Program now links here instead of holding its own report section. Things to know follows the Decided order: item 1 is what HHVC checks, item 2 is access. The old insects page was rebuilt as "Report cockroaches or other insects" without its mosquito content (2026-11-25). Decided: move this page up in the Topic and Agency lists during mosquito season. Shared report text lives on What happens after you report and Tenant rights.',
	whatToKnow: {
		thingsToKnow: [
			{
				label: 'What we check',
				text: 'We look for water sources on private property, if the owner or resident lets us in, and in public spaces. We also check public catch basins near your report for mosquito larvae.'
			},
			{
				label: 'An inspector may ask to come in',
				text: 'To find the water source, an inspector may need to enter a yard or property. Include a phone number or email so we can arrange access.'
			}
		]
	},
	sections: [
		{
			heading: 'What to do',
			karl: 'Karl: what_to_do StreamField. Each step below = one Section block (section_title + section_specifics). The 311 action comes first; the dead-bird referral is the last step because it goes to the State, not 311.',
			kind: 'body',
			steps: [
				{
					title: 'Gather your details',
					text: [
						'Have these details ready before you start. Only share what applies to your situation:'
					],
					bullets: [
						'**What you saw:** Biting mosquitoes, or small wriggling larvae in water.',
						'**Where the water is:** Buckets, planters, saucers, clogged gutters, fountains, pools, or a street catch basin.',
						'**The address:** Where the water is, and whether it is on private property or in a public space.',
						'**Access:** Who can let an inspector into the yard or property, if you know.',
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
						'Use 311 to report mosquitoes or standing water to the City. If the problem is urgent, report now. You can report mosquitoes where you live or standing water you see nearby, or report for someone else.',
						'Live in an SRO or residential hotel? Report the same way. One clerk takes every report and assigns SRO cases to senior inspectors.'
					],
					button: 'Report through 311',
					after: [
						'**Other ways to report**',
						'**Call 311 to make a report**',
						'415-701-2311 if you are outside of San Francisco',
						'Hearing or speaking impaired; please call TDD/TTY 711',
						'**Use our Mobile App**',
						'Download our mobile app to report a problem and track your request! Available on Android or iOS.',
						'[Learn more about the SF311 mobile app](https://www.sf.gov/sf311-mobile-app)'
					],
					karl: 'what_to_do -> Section. Section title: "Start your report". Section specifics: Text block (these 2 paragraphs, the second being the one-line SRO note every report page carries, Decided) + Button link block ("Report through 311").'
				},
				{
					title: 'See a dead bird? Report it to the State',
					text: [
						'Dead birds help track West Nile virus. The State West Nile virus program collects these reports, not 311.'
					],
					button: 'Report a dead bird',
					buttonUrl: 'https://westnile.ca.gov/report',
					karl: 'what_to_do -> Section. Section title: "See a dead bird? Report it to the State". Section specifics: Text block + Button link block (External URL radio, the State WNV reporting site). Moved here from the insects page (Decided).'
				}
			]
		},
		{
			heading: 'While you wait: tips to help with the problem',
			karl: 'Maps to supporting_information (Accordions). This accordion uses the mockup-only open flag so the tips are visible without a click — flag for Digital Services that the real accordion renders collapsed. Contents: one Text block (lead paragraph + tips) + a Resources-style external links list (UC IPM, CDC, State West Nile virus program).',
			kind: 'body',
			component: 'supporting',
			open: true,
			paragraphs: [
				'It may take us a few weekdays to get back to you. In the meantime, here are a few things you can do to help with the problem.'
			],
			bullets: [
				'**Dump standing water:** Empty buckets, planters, saucers, and toys at least once a week.',
				'**Clear gutters:** Clogged gutters hold water where mosquitoes breed.',
				'**Fix screens:** Repair holes in window and door screens.'
			],
			cards: [
				{
					title: 'UC IPM Pest Notes: Mosquitoes',
					text: 'University of California guidance on reducing mosquitoes around the home.',
					url: 'https://ipm.ucanr.edu/home-and-landscape/mosquitoes/',
					karl: 'External link inside the supporting_information accordion. Third-party UC IPM reference.'
				},
				{
					title: 'CDC: Preventing mosquito bites',
					text: 'Federal guidance on avoiding mosquito bites and mosquito-borne illness.',
					url: 'https://www.cdc.gov/mosquitoes/prevention/index.html',
					karl: 'External link inside the supporting_information accordion. Third-party CDC reference.'
				}
			]
		},
		{
			heading: 'What the Health Code requires',
			karl: 'custom_section -> title_and_text. Title = this heading, Text = the Article 11 line (HHVC content standards Ch. 8.7.1). The municipal code is cited per Ch. 8.7.2 as an inline link, the last bullet: custom_section has no Button link block (U1), so the "View Article 11" button it used to carry had no Karl destination.',
			kind: 'body',
			bullets: [
				'San Francisco Health Code Article 11 requires property owners to remove places where mosquitoes breed.',
				'[View Health Code Article 11](https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_health/0-0-0-1890)'
			]
		},
		{
			heading: 'Related pages',
			karl: 'Maps to the related panel: repeatable field "Page *" with a "Choose a page" button. 4 cards below = 4 related "Page" entries. All internal SF.gov pages — Karl Related is a page chooser and cannot hold external links.',
			kind: 'placement',
			cards: [
				{
					title: 'Mosquito Control Program',
					target: 'mosquitoControl'
				},
				{
					title: 'What happens after you report a housing or pest problem',
					target: 'afterReport'
				},
				{
					title: 'Free mosquito education workshop',
					target: 'mosquitoWorkshop'
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
	seoTitle: 'Report mosquitoes or standing water | SF.gov',
	metaDescription:
		'Report biting mosquitoes or standing water where they breed in San Francisco, and report dead birds to the State.'
};
