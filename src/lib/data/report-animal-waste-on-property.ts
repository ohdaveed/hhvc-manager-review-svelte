export const animalWasteReport = {
	slug: 'sf.gov/report-animal-waste-on-property',
	type: 'Transaction',
	title: 'Report animal waste on a property',
	summary: 'Dog poop, cat waste, or raccoon droppings in a yard, building, or shared area.',
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
		"Report regroup (Decided, Nov 24, 2026), built 2026-11-25. New page, one of the 9 condition pages, and one of HHVC's largest complaint areas, so it is listed high in the Topic and Agency report groups (Decided). The description is the Decided search-words example. Private property only, said at the top (Decided): HHVC does not respond to dog waste on sidewalks or streets. Raccoon droppings are cited here because of the roundworm egg risk (Decided): the page says to report them rather than clean them, links the CDC raccoon roundworm guidance, and gives no cleanup steps. Pigeon droppings moved to their own page, which this one links. TO CONFIRM: which 311 service takes dog waste on public property (likely Public Works street cleaning), so that line is flagged unverified; and whether HHVC cites the owner in every raccoon latrine case (§596 also allows a manager or whoever created the condition), so the page does not say who is cited.",
	whatToKnow: {
		thingsToKnow: [
			{
				label: 'Private property only',
				text: 'We respond to animal waste on private property, such as yards, buildings, and shared areas. We do not respond to dog waste on sidewalks or streets.'
			},
			{
				label: 'Raccoon droppings',
				text: 'Do not clean up raccoon droppings yourself. They can carry roundworm eggs that make people very sick. Report them instead. [CDC: Preventing raccoon roundworm](https://www.cdc.gov/baylisascaris/prevention/index.html)'
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
						'**What you saw:** The kind of waste, and how much has built up.',
						'**Where it is:** The address, and where on the property, such as a yard, stairwell, roof, or shared area.',
						'**When it started:** How long it has been building up.',
						'**Other issues:** Whether it smells or draws flies, rats, or mice.',
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
						'Use 311 to report animal waste on private property. The [Health Code](https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_health/0-0-0-1890) requires property owners to keep animal waste from building up. Build-up that shelters pests or creates a health hazard is a violation.',
						{
							text: 'For dog waste on a sidewalk or street, ask 311 for street cleaning instead.',
							unverified: true,
							unverifiedReason:
								'Decided: send public-property reports to the right 311 service, and confirm the agency, likely Public Works street cleaning. Confirm the 311 service name before publication.'
						},
						'Pigeon droppings have their own page: [Report pigeon droppings, nesting, or feeding](pigeonReport).'
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
					karl: 'what_to_do -> Section. Section title: "Start your report". Section specifics: Text block (these 3 paragraphs: the action, the public-property routing, and the pigeon page) + Button link block ("Report through 311") + Text block ("Other ways to report", the `after` lines). The one-line SRO note every report page carried was removed on 2026-11-26 (owner). The Article 11 line was folded in on 2026-11-26 from the retired "What the Health Code requires" custom section (HHVC content standards Ch. 8.7.1-8.7.2), and the who-can-report line was dropped: What happens after you report owns it.'
				}
			]
		},
		{
			heading: 'While you wait: tips to help with the problem',
			karl: 'Maps to supporting_information (Accordions), collapsed by default as the real accordion renders. Contents: one Text block (lead paragraph + tips). Cut on 2026-11-26 (page review, as on Report rats or mice) to the tips a resident can act on now. The pet waste tip is the Decided cross-link line. No raccoon cleanup steps (Decided). The CDC raccoon roundworm link moved inline into the Raccoon droppings item in What to know, beside the warning it backs.',
			kind: 'body',
			component: 'supporting',
			paragraphs: ['It may take us a few weekdays to get back to you.'],
			bullets: [
				'**Pick up pet waste daily:** It feeds rats.',
				'**Bag it:** Put pet waste in a bag, then in a bin with a tight lid.'
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
					title: 'Report pigeon droppings, nesting, or feeding',
					target: 'pigeonReport'
				},
				{
					title: 'Report rats or mice',
					target: 'rodentsReport'
				},
				{
					title: 'Tenant rights when reporting housing conditions',
					target: 'tenantRights'
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
	seoTitle: 'Report animal waste on a property | SF.gov',
	metaDescription:
		'Report dog poop, cat waste, or raccoon droppings in a San Francisco yard, building, or shared area.'
};
