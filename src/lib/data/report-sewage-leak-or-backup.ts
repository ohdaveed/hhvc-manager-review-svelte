export const sewageReport = {
	slug: 'sf.gov/report-sewage-leak-or-backup',
	type: 'Transaction',
	title: 'Report a sewage leak or backup',
	summary:
		'Raw waste from a drain, toilet, cleanout, or pipe, inside a building or in a yard or shared area.',
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
		"Report regroup (Decided, Nov 24, 2026), built 2026-11-25. New page, one of the 9 condition pages. Content is the Decided \"Sewage page\" record: sewage from a drain, toilet, cleanout or pipe, inside or outside a building, including yards and shared areas; HHVC responds within 48 hours of the complaint, so the page says to report right away; the owner hires a plumber and HHVC confirms the sewage is removed and the area sanitized; a leaking pipe with no sewage goes to DBI. The 48-to-72-hour correction window on What happens after you report is the owner's deadline, not HHVC's response time. STILL OPEN, and not on this page: sewage at the property line (the building's sewer line vs. the public sewer, likely SFPUC). No Article 11 line: the plain-language guide in this mockup cites no sewage section, so none is quoted rather than guessing one.",
	whatToKnow: {
		thingsToKnow: [
			{
				label: 'How fast we respond',
				text: 'We respond within 48 hours of getting your report. Report sewage right away; you do not need to wait for your landlord.'
			},
			{
				label: 'A leak with no sewage',
				text: 'A leaking pipe with no sewage goes to the Department of Building Inspection. [Report a building concern to DBI](https://www.sf.gov/report-residential-building-concern)'
			}
		]
	},
	sections: [
		{
			heading: 'What to do',
			karl: 'Karl: what_to_do StreamField. Each step below = one Section block (section_title + section_specifics). The 311 action comes first and says "right away" (Decided: HHVC responds within 48 hours).',
			kind: 'body',
			steps: [
				{
					title: 'Report it right away',
					text: [
						'Use 311 to report sewage as soon as you see it. Stay away from it, and keep children and pets away. You can report sewage in your home, a yard, or a shared area, or report for someone else.',
						'Live in an SRO or residential hotel? Report the same way. Senior inspectors handle SRO cases.'
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
					karl: 'what_to_do -> Section. Section title: "Report it right away". Section specifics: Text block (these 2 paragraphs, the second being the one-line SRO note every report page carries, Decided) + Button link block ("Report through 311").'
				},
				{
					title: 'Tell us where it is',
					text: ['Only share the details that apply to your situation:'],
					bullets: [
						'**Where it comes from:** A drain, toilet, cleanout, or pipe.',
						'**Where it is:** The address, and whether it is inside, in a yard, or in a shared area.',
						'**When it started:** How long it has been happening, and whether it is still flowing.',
						'**Your contact info:** Leave a phone number or email if you want an inspector to contact you.'
					],
					callout: {
						karl: 'Callout block inside the "Tell us where it is" Section specifics: single rich text field, no separate title. Text: the one confidentiality sentence (Decided: the same on every page, once per page) plus the photo note.',
						text: 'We never share your name or contact information. You do not need to send photos.',
						title: false
					},
					karl: 'what_to_do -> Section. Section title: "Tell us where it is". Section specifics: Text block (intro sentence + bulleted checklist) + Callout block below.'
				},
				{
					title: 'What happens next',
					text: [
						'The property owner must hire a plumber to fix the problem. We check that the sewage is removed and the area is cleaned and sanitized.'
					],
					karl: 'what_to_do -> Section. Section title: "What happens next". Section specifics: one Text block. The Decided owner-plumber and HHVC-confirms line.'
				}
			]
		},
		{
			heading: 'While you wait: tips to stay safe',
			karl: "Maps to supporting_information (Accordions). This accordion uses the mockup-only open flag so the tips are visible without a click — flag for Digital Services that the real accordion renders collapsed. Contents: one Text block (safety tips). Shorter than the other report pages' lead, because sewage is handled within 48 hours.",
			kind: 'body',
			component: 'supporting',
			open: true,
			bullets: [
				'**Stop using it:** Do not use the sink, toilet, or drain that is backing up.',
				'**Wash up:** Wash your hands well if you touch anything the sewage reached.'
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
	seoTitle: 'Report a sewage leak or backup | SF.gov',
	metaDescription:
		'Report sewage from a drain, toilet, cleanout, or pipe at a San Francisco home or building. We respond within 48 hours.'
};
