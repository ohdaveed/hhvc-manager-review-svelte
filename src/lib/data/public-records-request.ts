export const publicRecords = {
	slug: 'sf.gov/make-a-public-records-request-environmental-health',
	type: 'Transaction',
	title: 'Make a public records request',
	summary:
		'Request Environmental Health inspection, complaint, or enforcement records that are not in the online lookups.',
	primaryAgency: 'Healthy Housing and Vector Control',
	audience: [
		'A tenant or advocate requesting formal copies of inspection records',
		'A property owner requesting records for a building they manage',
		'A journalist or researcher requesting public records'
	],
	reading: 'Grade 7',
	editorNote:
		'SF.gov landing page for the citywide public records service (NextRequest). Primary CTA is external. Verify whether HHVC needs a program-specific intro or routes entirely to the citywide portal.',
	whatToKnow: {
		cost: 'Free',
		// Reorganized into named subsections (Karl's own "no more than 2, if you
		// can" guidance) to match how real sf.gov Things to know entries render
		// — each with its own H3, not one joined bullet list.
		thingsToKnow: [
			{
				label: 'Check the lookup tools first',
				text: 'Many complaint and inspection records are already available through the online lookup tools — check there first.'
			},
			{
				label: 'Leaving SF.gov',
				text: 'Requests are handled through the citywide San Francisco NextRequest portal. You will leave SF.gov.'
			}
		]
	},
	sections: [
		{
			heading: 'Submit your request',
			karl: 'what_to_do -> Section. Section title: "Submit your request". Section specifics: Text block (this paragraph) + Button link block (External URL radio, target = the NextRequest URL).',
			kind: 'body',
			paragraphs: [
				'Public records requests are handled through the citywide San Francisco NextRequest portal. You will leave SF.gov.'
			],
			button: 'Request records',
			buttonUrl: 'https://sanfrancisco.nextrequest.com/requests/new'
		},
		{
			heading: 'Before you request records',
			karl: "custom_section -> title_and_text. Title = this heading, Text = the copy below. MOVED OUT OF things_to_know 2026-08-31, option (b): with this section the page claimed 3 things_to_know entries against the Help Center's two-item guidance, and the panel already holds the 2 What-to-know entries. custom_section is the same title_and_text block, repeatable with no recorded cap, so every word is kept and nothing is cut. PLACEMENT CONSEQUENCE, for the editor to judge: custom_section renders AFTER what_to_do and supporting_information, so this section now sits below them rather than above — things_to_know would have placed it above what_to_do. If that reading order matters more than the guidance, revert to option (a) and let the panel run to 3. PRIOR MAPPING, kept for the record: Best real-schema fit: a things_to_know entry (Title = this heading, Text = the two paragraphs plus the bulleted list below).",
			kind: 'body',
			paragraphs: [
				'Many complaint and inspection records are already available through the online lookup tools.',
				'Use a formal public records request when you need certified copies, a broader record set, or records not available in the public lookup tools.'
			],
			bullets: [
				'Property address or complaint number',
				'Date range for the records you need',
				'A clear description of the records you are requesting'
			]
		},
		{
			heading: 'Related pages',
			karl: 'Maps to the related panel: repeatable field "Page *" with a "Choose a page" button. Resolved schema gap: related has no custom title/text per item.',
			kind: 'placement',
			cards: [
				{
					title: 'Find complaints and inspection records',
					target: 'findRecords',
					karl: 'related panel entry — page chooser only; this description text is not supported in the real schema (see section-level karl note above).'
				},
				{
					title: 'Look up building records',
					target: 'recordsHub',
					karl: 'related panel entry — page chooser only; this description text is not supported in the real schema (see section-level karl note above).'
				}
			]
		}
	],
	// Karl's Partner agencies field (distinct from Primary Agency, which the
	// parent-program link above already represents) — Environmental Health
	// holds the records this request would retrieve, even though the request
	// itself routes through the citywide NextRequest portal.
	partnerAgencies: [
		{
			title: 'Environmental Health',
			url: 'https://www.sf.gov/departments--department-public-health--environmental-health'
		}
	],
	seoTitle: 'Make a public records request | SF.gov',
	metaDescription:
		'Request Environmental Health public records through the citywide San Francisco public records portal.'
};
