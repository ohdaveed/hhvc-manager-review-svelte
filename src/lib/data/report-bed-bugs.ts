export const bedBugReport = {
	slug: 'sf.gov/report-bed-bugs',
	type: 'Transaction',
	title: 'Report bed bugs',
	summary:
		'Report bed bugs in your unit or building to 311, and learn what property owners must do.',
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
		'Report regroup (Decided, Nov 24, 2026), built 2026-11-25. New page, one of the 9 condition pages. Scope is the Decided one: bed bugs in a unit or building, including owner duties, unit prep and adjacent units. Text is carried from the bed bug lines of "Report cockroaches, mosquitoes, and other insects". The 2-working-day treatment rule comes from the drafts (writing audit row 132) and is still on the To confirm list, so it is flagged unverified. Unit prep links the existing Step by step rather than repeating it; that page cannot go in Related, which takes only Transaction, Information, Campaign and Topic pages. 2026-11-26 (page review): What to know now holds only the confidentiality sentence, placed before the 311 step because fear of retaliation stops people filing; Cost is left blank (optional in Karl, and the live SF.gov 311 report pages omit it); Nearby units moved into Tell the owner as its second bullet and Get your unit ready into While you wait; the UC IPM and EPA links moved to the Information page.',
	whatToKnow: {
		thingsToKnow: [
			{
				label: 'Your privacy',
				text: 'We never share your name or contact information.'
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
						'If you rent, tell the property owner or manager about the bed bugs right away. Owners must look into pest reports from tenants. You do not have to wait for the owner before you report to 311.'
					],
					bullets: [
						{
							text: 'The owner or manager must start professional treatment within 2 working days of confirming bed bugs.',
							unverified: true,
							unverifiedReason:
								'Quoted from the draft pages (writing audit row 132) and listed under To confirm in the Nov 24 decisions record. Confirm the rule and its source with HHVC before publication.'
						},
						'Bed bugs spread between units. The owner may also need to inspect or treat the units next to yours.'
					],
					karl: 'what_to_do -> Section. Section title: "Tell the owner". Section specifics: one Text block (the paragraph + the two owner-duty bullets: the treatment deadline and the adjacent units). Bed bug specific, so it stays here; the general landlord notice lives on Tenant rights.'
				},
				{
					title: 'Gather your details',
					text: [
						'Have these details ready before you start. You do not need to send photos. Only share what applies to your situation:'
					],
					bullets: [
						'**What you saw:** Bites, live bugs, shed skins, or small dark spots on bedding or furniture.',
						'**Where it is:** The address and unit number, and whether neighbors have bed bugs too.',
						'**When it started:** How long this has been happening.',
						'**The owner:** Whether you told the owner or manager, and whether treatment has started.',
						'**Your contact info:** Leave a phone number or email if you want an inspector to contact you.'
					],
					karl: 'what_to_do -> Section. Section title: "Gather your details". Section specifics: one Text block (intro, with the photo note, + bulleted checklist). No Callout: on this page the confidentiality sentence sits in What to know, above every step, so the reader sees it before reaching the 311 button.'
				},
				{
					title: 'Start your report',
					text: [
						'Use 311 to report bed bugs to the City, especially if the owner does not respond or start treatment. You can report bed bugs in your unit or a neighbor’s unit, or report for someone else.'
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
					karl: 'what_to_do -> Section. Section title: "Start your report". Section specifics: Text block (this paragraph) + Button link block ("Report through 311") + Text block ("Other ways to report", the `after` lines). The one-line SRO note every report page carried was removed on 2026-11-26 (owner).'
				}
			]
		},
		{
			heading: 'While you wait: tips to help with the problem',
			karl: 'Maps to supporting_information (Accordions). This accordion uses the mockup-only open flag so the tips are visible without a click — flag for Digital Services that the real accordion renders collapsed. Contents: one Text block (lead paragraph + 2 tips + the prep link to the Information page). Kept lean on purpose (2026-11-26): the UC IPM and EPA links live on Bed bugs: prevent them, find them, and get ready for treatment.',
			kind: 'body',
			component: 'supporting',
			open: true,
			paragraphs: [
				'It may take us a few weekdays to get back to you. In the meantime, here are a few things you can do to help with the problem.'
			],
			bullets: [
				'**Keep your furniture:** Do not throw out furniture before treatment. Moving it can spread the bugs.',
				'**Wash on high heat:** Wash and dry bedding and clothes on the hottest setting they can take.',
				'**Get your unit ready:** Treatment works only if the unit is ready. [Bed bugs: prevent them, find them, and get ready for treatment](bedBugsInfo) explains what to wash, bag, and leave in place.'
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
					title: 'Report cockroaches or other insects',
					target: 'insectsReport'
				},
				{
					title: 'Learn what Healthy Housing and Vector Control can inspect',
					target: 'scopeInfo'
				},
				{
					title: 'Bed bugs: prevent them, find them, and get ready for treatment',
					target: 'bedBugsInfo'
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
