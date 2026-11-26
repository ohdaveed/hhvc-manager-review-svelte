export const bedBugReport = {
	slug: 'sf.gov/report-bed-bugs',
	type: 'Transaction',
	title: 'Report bed bugs',
	summary:
		'Bites, small brown insects, or dark spots on bedding in a unit or building, and what the owner must do.',
	primaryAgency: 'Healthy Housing and Vector Control',
	reading: 'Grade 6',
	editorNote:
		'Report regroup (Decided, Nov 24, 2026), built 2026-11-25. New page, one of the 9 condition pages. Scope is the Decided one: bed bugs in a unit or building, including owner duties, unit prep and adjacent units. Text is carried from the bed bug lines of "Report cockroaches, mosquitoes, and other insects". The 2-working-day treatment rule comes from the drafts (writing audit row 132) and is still on the To confirm list, so it is flagged unverified. Unit prep links the existing Step by step rather than repeating it; that page cannot go in Related, which takes only Transaction, Information, Campaign and Topic pages.',
	whatToKnow: {
		cost: 'Free',
		thingsToKnow: [
			{
				label: 'Nearby units',
				text: 'Bed bugs spread between units. The owner may need to inspect or treat the units next to yours too.'
			},
			{
				label: 'Get your unit ready',
				text: 'Treatment works only if the unit is ready. [Prepare your unit for pest treatment](stepPrepUnit) explains what to move, wash, and bag.'
			}
		]
	},
	sections: [
		{
			heading: 'What to do',
			karl: 'Karl: what_to_do StreamField. Each step below = one Section block (section_title + section_specifics). Telling the owner comes first because the owner has to start treatment.',
			kind: 'body',
			steps: [
				{
					title: 'Tell the owner',
					text: [
						'If you rent, tell the property owner or manager about the bed bugs right away. Owners must look into pest reports from tenants.'
					],
					bullets: [
						{
							text: 'The owner or manager must start professional treatment within 2 working days of confirming bed bugs.',
							unverified: true,
							unverifiedReason:
								'Quoted from the draft pages (writing audit row 132) and listed under To confirm in the Nov 24 decisions record. Confirm the rule and its source with HHVC before publication.'
						}
					],
					karl: 'what_to_do -> Section. Section title: "Tell the owner". Section specifics: one Text block (the paragraph + the owner-duty bullet). Bed bug specific, so it stays here; the general landlord notice lives on Tenant rights.'
				},
				{
					title: 'Start your report',
					text: [
						'Use 311 to report bed bugs to the City, especially if the owner does not respond or start treatment. You can report bed bugs in your unit or a neighbor’s unit, or report for someone else.',
						'Live in an SRO or residential hotel? Report the same way. One clerk takes every report and assigns SRO cases to senior inspectors.'
					],
					button: 'Report through 311',
					karl: 'what_to_do -> Section. Section title: "Start your report". Section specifics: Text block (these 2 paragraphs, the second being the one-line SRO note every report page carries, Decided) + Button link block ("Report through 311").'
				},
				{
					title: 'Tell us what you saw',
					text: ['Only share the details that apply to your situation:'],
					bullets: [
						'**What you saw:** Bites, live bugs, shed skins, or small dark spots on bedding or furniture.',
						'**Where it is:** The address and unit number, and whether neighbors have bed bugs too.',
						'**When it started:** How long this has been happening.',
						'**The owner:** Whether you told the owner or manager, and whether treatment has started.',
						'**Your contact info:** Leave a phone number or email if you want an inspector to contact you.'
					],
					callout: {
						karl: 'Callout block inside the "Tell us what you saw" Section specifics: single rich text field, no separate title. Text: the one confidentiality sentence (Decided: the same on every page, once per page) plus the photo note.',
						text: 'We never share your name or contact information. You do not need to send photos.',
						title: false
					},
					karl: 'what_to_do -> Section. Section title: "Tell us what you saw". Section specifics: Text block (intro sentence + bulleted checklist) + Callout block below.'
				}
			]
		},
		{
			heading: 'While you wait: tips to help with the problem',
			karl: 'Maps to supporting_information (Accordions). This accordion uses the mockup-only open flag so the tips are visible without a click — flag for Digital Services that the real accordion renders collapsed. Contents: one Text block (lead paragraph + tips) + a Resources-style external links list (UC IPM, EPA).',
			kind: 'body',
			component: 'supporting',
			open: true,
			paragraphs: [
				'It may take us a few weekdays to get back to you. In the meantime, here are a few things you can do to help with the problem.'
			],
			bullets: [
				'**Keep your furniture:** Do not throw out furniture before treatment. Moving it can spread the bugs.',
				'**Wash on high heat:** Wash and dry bedding and clothes on the hottest setting they can take.'
			],
			cards: [
				{
					title: 'UC IPM Pest Notes: Bed bugs',
					text: 'University of California guidance on identifying and treating bed bugs.',
					url: 'https://ipm.ucanr.edu/home-and-landscape/bed-bugs/',
					karl: 'External link inside the supporting_information accordion. Third-party UC IPM reference.'
				},
				{
					title: 'EPA: Bed bugs',
					text: 'Federal guidance on finding and treating bed bugs.',
					url: 'https://www.epa.gov/bedbugs',
					karl: 'External link inside the supporting_information accordion. Third-party EPA reference.'
				}
			]
		},
		{
			heading: 'What the Health Code requires',
			karl: 'custom_section -> title_and_text. Title = this heading, Text = the Article 11 line, from Sec. 581(b)(8) (HHVC content standards Ch. 8.7.1). The municipal code is cited per Ch. 8.7.2 as an inline link, the last bullet: custom_section has no Button link block (U1), so the "View Article 11" button it used to carry had no Karl destination.',
			kind: 'body',
			bullets: [
				'San Francisco Health Code Article 11 requires property owners to keep buildings free of insect infestations, including bed bugs.',
				'[View Health Code Article 11](https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_health/0-0-0-1890)'
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
					title: 'Tenant rights when reporting housing conditions',
					target: 'tenantRights'
				},
				{
					title: 'Report cockroaches or other insects',
					target: 'insectsReport'
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
	seoTitle: 'Report bed bugs | SF.gov',
	metaDescription:
		'Report bed bugs in a San Francisco apartment or building, and learn what the property owner must do.'
};
