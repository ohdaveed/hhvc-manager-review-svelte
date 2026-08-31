export const findViolations = {
	slug: 'sf.gov/lookup-residential-health-code-violations',
	type: 'Transaction',
	title: 'Look up residential health code violations',
	summary:
		'Search violation and inspection history for residential buildings under the SF Health Code.',
	primaryAgency: 'Healthy Housing and Vector Control',
	audience: [
		'A tenant researching prior violations at a building',
		'A property owner reviewing open or past notices of violation',
		'A housing advocate checking enforcement history for an address'
	],
	reading: 'Grade 7',
	editorNote:
		'Alias-style lookup page focused on violations language. Primary CTA uses the same verified xnet Residential Health Code Violations tool as findRecords. Consider merging with findRecords if editors prefer one combined lookup page.',
	whatToKnow: {
		cost: 'Free',
		// Reorganized into ~2 named subsections (Karl's own "no more than 2, if
		// you can" guidance) to match how real sf.gov Things to know entries
		// render — each with its own H3, not one joined bullet list. The
		// "search by address or record ID" fact that used to be a middle bullet
		// here is dropped as a duplicate: "What you can search" below already
		// states it almost verbatim.
		thingsToKnow: [
			{
				label: 'What this tool covers',
				text: 'This is the same Environmental Health lookup tool used for complaint and inspection history.'
			},
			{
				label: 'Leaving SF.gov',
				text: 'The link opens on the Department of Public Health website. You will leave SF.gov.'
			}
		]
	},
	sections: [
		{
			heading: 'What you can search',
			karl: 'Best real-schema fit: a things_to_know entry (Title = this heading, Text = the two paragraphs below). THINGS TO KNOW COUNT — OPTION (a), CHOSEN DELIBERATELY 2026-08-31: with this section the page carries 3 things_to_know entries, one past the Karl Help Center guidance of two. That is a decision, not an oversight. things_to_know has no schema maximum, so the page builds and publishes. The alternative was custom_section, which is uncapped and holds the same title_and_text block — it was built that way and reverted, because custom_section renders AFTER what_to_do while things_to_know renders BEFORE it, and this section is a scope explainer that has to reach the reader before the action, not after it. Reading order was judged worth the one-item overage. To revisit: move this to custom_section and accept it sitting below the action, or fold it into one of the two What-to-know entries.',
			kind: 'body',
			paragraphs: [
				'Search by address or record ID to see investigated complaints, inspections, and health code violations tied to a residential property.',
				'This is the same Environmental Health lookup tool used for complaint and inspection history.'
			]
		},
		{
			heading: 'Open the violation lookup',
			karl: 'what_to_do -> Section. Section title: "Open the violation lookup". Section specifics: Text block (this paragraph) + Button link block (External URL radio, target = the xnet URL).',
			kind: 'body',
			paragraphs: ['You will leave SF.gov to use the Department of Public Health records site.'],
			button: 'Search violations',
			buttonUrl: 'https://xnet.sfdph.org:8443/ords/eeop/f?p=119:1'
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
					title: 'Fix your Healthy Housing and Vector Control violation',
					target: 'noticeOfViolation',
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
	// parent-program link above already represents) — the lookup tool this
	// page links to is hosted on the Department of Public Health's own site.
	partnerAgencies: [
		{
			title: 'Department of Public Health',
			url: 'https://www.sf.gov/departments--department-public-health'
		}
	],
	seoTitle: 'Look up residential health code violations | SF.gov',
	metaDescription:
		'Search residential health code violations and inspection history for San Francisco buildings.'
};
