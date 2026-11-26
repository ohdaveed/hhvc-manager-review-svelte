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
					button: 'Report a building concern to DBI',
					buttonUrl: 'https://www.sf.gov/report-residential-building-concern',
					karl: 'what_to_do -> Section. Section title: "Find the moisture source". Section specifics: Text block (these 2 paragraphs) + Button link block (Internal link to the DBI residential building concern Transaction on sf.gov). The DBI referral is C8.'
				},
				{
					title: 'Tell the owner in writing',
					text: [
						'If you rent, tell the property owner or manager in writing as soon as you find the mold. Include the date, where the mold is, and where you think the moisture is coming from. Keep a copy of your message.'
					],
					karl: 'what_to_do -> Section. Section title: "Tell the owner in writing". Section specifics: one Text block. Mold-specific, so it stays here; the general landlord notice lives on Tenant rights (Decided shared-content rule).'
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
					text: [
						'Use 311 to report mold caused by humidity or condensation. You can report mold in your home or in a shared area, or report for someone else.',
						'Live in an SRO or residential hotel? Report the same way. One clerk takes every report and assigns SRO cases to senior inspectors.'
					],
					button: 'Report through 311',
					karl: 'what_to_do -> Section. Section title: "Start your report". Section specifics: Text block (these 2 paragraphs, the second being the one-line SRO note every report page carries, Decided) + Button link block ("Report through 311").'
				}
			]
		},
		{
			heading: 'While you wait: tips to help with the problem',
			karl: 'Maps to supporting_information (Accordions). This accordion uses the mockup-only open flag so the tips are visible without a click — flag for Digital Services that the real accordion renders collapsed. Contents: one Text block (lead paragraph + tip) + a Resources-style external links list (EPA, CDC).',
			kind: 'body',
			component: 'supporting',
			open: true,
			paragraphs: [
				'It may take us a few weekdays to get back to you. In the meantime, here are a few things you can do to help with the problem.'
			],
			bullets: [
				'**Reduce indoor moisture:** Open windows or run fans in kitchens and bathrooms to slow mold growth.'
			],
			cards: [
				{
					title: 'EPA: Mold cleanup in your home',
					text: 'Federal guidance on cleaning up mold and controlling moisture.',
					url: 'https://www.epa.gov/mold',
					karl: 'External link inside the supporting_information accordion. Third-party EPA reference.'
				},
				{
					title: 'CDC: Mold and your health',
					text: 'Federal guidance on health effects of mold and how to reduce exposure.',
					url: 'https://www.cdc.gov/mold-health-issues/about/index.html',
					karl: 'External link inside the supporting_information accordion. Third-party CDC reference.'
				}
			]
		},
		{
			heading: 'What the Health Code requires',
			karl: 'custom_section -> title_and_text. Title = this heading, Text = the Article 11 line, from Sec. 581(b)(6) as Health Code Article 11 in plain language quotes it (HHVC content standards Ch. 8.7.1). The municipal code is cited per Ch. 8.7.2 as an inline link, the last bullet: custom_section has no Button link block (U1), so the "View Article 11" button it used to carry had no Karl destination.',
			kind: 'body',
			bullets: [
				'San Francisco Health Code Article 11 lists visible mold or mildew inside a building as a public health nuisance. Fixing it means fixing the moisture source too.',
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
