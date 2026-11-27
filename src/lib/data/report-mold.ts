export const moldReport = {
	slug: 'sf.gov/report-mold',
	type: 'Transaction',
	title: 'Report mold',
	summary:
		'Visible growth on a wall or ceiling from humidity, condensation, or a leak in a home or building.',
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
		'Report regroup (Decided, Nov 24, 2026), built 2026-11-25. New page, one of the 9 condition pages. Scope is the Decided one: visible mold, the 10 sq ft threshold, the moisture source, and a referral to DBI for leaks. C8 (decided Nov 24, 2026): the Department of Building Inspection handles mold caused by a leak, so the leak referral names DBI. Text is carried from the mold half of "Report garbage, mold, and overgrown vegetation", which was retired once all 9 condition pages existed (2026-11-25). That page stated the 10 sq ft rule three times; here it is stated once, in Things to know. The third-party test-kit line stays flagged unverified, as it was there.',
	whatToKnow: {
		thingsToKnow: [
			{
				label: 'When we can act',
				text: 'For mold on a wall or ceiling, we can act when the affected area totals at least 10 square feet.'
			},
			{
				label: 'Mold from a leak',
				text: 'The Department of Building Inspection handles mold caused by a leak from a pipe, roof, or window. We handle mold caused by humidity or condensation.'
			}
		]
	},
	sections: [
		{
			heading: 'What to do',
			karl: 'Karl: what_to_do StreamField. Each step below = one Section block (section_title + section_specifics). The moisture source comes before the report details because it decides who handles the report.',
			kind: 'body',
			steps: [
				{
					title: 'Find the moisture source',
					text: [
						'Mold needs excess moisture to grow. Look for leaks from plumbing, roofs, or windows, and for condensation from humid indoor air.',
						'If a leak is causing the mold, report it to the Department of Building Inspection instead.'
					],
					button: 'Report a leak to DBI',
					buttonUrl: 'https://www.sf.gov/report-residential-building-concern',
					karl: 'what_to_do -> Section. Section title: "Find the moisture source". Section specifics: Text block (these 2 paragraphs) + Button link block (Internal link to the DBI residential building concern Transaction on sf.gov). The DBI referral is C8.'
				},
				{
					title: 'Tell the owner in writing',
					text: [
						'If you rent, tell the property owner or manager in writing as soon as you find the mold. Include the date, where the mold is, and where you think the moisture is coming from. Keep a copy of your message.',
						'The [Health Code](https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_health/0-0-0-1890) lists visible mold inside a building as a public health nuisance. Fixing it means fixing the moisture source too.'
					],
					karl: 'what_to_do -> Section. Section title: "Tell the owner in writing". Section specifics: one Text block. Mold-specific, so it stays here; the general landlord notice lives on Tenant rights (Decided shared-content rule). The second paragraph is the Article 11 line, folded in on 2026-11-26 from the retired "What the Health Code requires" custom section (HHVC content standards Ch. 8.7.1-8.7.2).'
				},
				{
					title: 'Gather your details',
					text: [
						'Have these details ready before you start. Only share what applies to your situation:'
					],
					bullets: [
						'The address, and the room or shared area',
						'Whether the mold is on a wall, ceiling, or somewhere else',
						'The size of the area, and whether it is spreading',
						'What you think is causing the moisture',
						'Whether you told the property owner or manager, if you rent',
						'Your contact information, if you want an inspector to contact you',
						{
							text: 'Do not rely on a third-party mold test kit when you report. Describe the visible condition and moisture source instead.',
							unverified: true,
							unverifiedReason:
								'This instruction appears on the live draft "Report mold in my home" page but is not established by the available SFDPH mold source documents. Confirm it with HHVC before publication.'
						}
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
					text: ['Use 311 to report mold caused by humidity or condensation.'],
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
					karl: 'what_to_do -> Section. Section title: "Start your report". Section specifics: Text block (this paragraph) + Button link block ("Report through 311") + Text block ("Other ways to report", the `after` lines). The one-line SRO note every report page carried was removed on 2026-11-26 (owner). The who-can-report line was dropped on 2026-11-26: What happens after you report owns it.'
				}
			]
		},
		{
			heading: 'While you wait: tips to help with the problem',
			karl: 'Maps to supporting_information (Accordions), collapsed by default as the real accordion renders. Contents: one Text block (lead paragraph + tips). Cut on 2026-11-26 (page review, as on Report rats or mice) to the tips a resident can act on now. The EPA and CDC links were dropped: Reduce moisture and mold in your home carries both.',
			kind: 'body',
			component: 'supporting',
			paragraphs: [
				'It may take us a few weekdays to get back to you. In the meantime, here are a few things you can do to help with the problem.'
			],
			bullets: [
				'**Reduce indoor moisture:** Open windows or run fans in kitchens and bathrooms to slow mold growth.'
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
					title: 'Learn what Healthy Housing and Vector Control can inspect',
					target: 'scopeInfo'
				},
				{
					title: 'Reduce moisture and mold in your home',
					target: 'reduceMoisture'
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
	seoTitle: 'Report mold | SF.gov',
	metaDescription:
		'Report mold from humidity or condensation in a San Francisco home or building, and find where to report a leak.'
};
