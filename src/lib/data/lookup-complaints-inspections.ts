export const findRecords = {
	slug: 'sf.gov/find-complaints-and-inspection-records',
	type: 'Transaction',
	title: 'Find complaints and inspection records',
	summary:
		'Search investigated complaints, inspections, and health code violations for a San Francisco address.',
	primaryAgency: 'Healthy Housing and Vector Control',
	audience: [
		'A tenant checking whether a building has prior complaints or inspections',
		'A property owner or manager reviewing violation history',
		'A neighbor or advocate researching a building address'
	],
	reading: 'Grade 7',
	editorNote:
		'SF.gov landing page for an external lookup tool. Primary CTA opens xnet.sfdph.org (Residential Health Code Violations). Verify the external URL before publication. MERGED 2026-11-25 (C1, decided Nov 24, 2026): Look up residential health code violations was a second landing page for the same xnet tool, and is removed. Its audience (tenants, owners and advocates checking violation history) is already covered here, and the description now names violations so those searches still land on this page.',
	whatToKnow: {
		cost: 'Free',
		// Reorganized into ~2 named subsections (Karl's own "no more than 2, if
		// you can" guidance) to match how real sf.gov Things to know entries
		// render — each with its own H3, not one joined bullet list. The
		// "five years of activity" fact that used to be a first bullet here is
		// dropped as a duplicate: "What you can look up" below already states it
		// almost verbatim.
		thingsToKnow: [
			{
				label: 'Complaint privacy',
				text: 'Complaint records are public. We never share the name or contact information of the person who reported.'
			},
			{
				label: 'Leaving SF.gov',
				text: 'The link opens on the Department of Public Health website. You will leave SF.gov.'
			}
		]
	},
	sections: [
		{
			heading: 'What you can look up',
			karl: 'Best real-schema fit: a things_to_know entry (Title = this heading, Text = the two paragraphs plus the bulleted list below). THINGS TO KNOW COUNT — OPTION (a), CHOSEN DELIBERATELY 2026-08-31: with this section the page carries 3 things_to_know entries, one past the Karl Help Center guidance of two. That is a decision, not an oversight. things_to_know has no schema maximum, so the page builds and publishes. The alternative was custom_section, which is uncapped and holds the same title_and_text block — it was built that way and reverted, because custom_section renders AFTER what_to_do while things_to_know renders BEFORE it, and this section is a scope explainer that has to reach the reader before the action, not after it. Reading order was judged worth the one-item overage. To revisit: move this to custom_section and accept it sitting below the action, or fold it into one of the two What-to-know entries.',
			kind: 'body',
			paragraphs: [
				'Use the Environmental Health lookup tool to search investigated complaints and inspections. Search by street address, complaint ID, or location ID.',
				'The tool shows about five years of investigated complaint and inspection activity for residential health code enforcement.'
			],
			bullets: [
				'Street address searches',
				'Complaint ID or location ID searches',
				'Past inspections and violation history',
				'Complaint status for investigated cases'
			]
		},
		{
			heading: 'What to do',
			fieldKey: 'open-the-lookup-tool',
			karl: 'what_to_do, headed "What to do" as Karl shows it (C2, decided Nov 24, 2026). One Section: Section title "Open the lookup tool"; Section specifics: Text block (the paragraph) + Button link block (External URL radio, target = the xnet URL).',
			kind: 'body',
			steps: [
				{
					title: 'Open the lookup tool',
					text: [
						'The search tool opens on the Department of Public Health external records site. You will leave SF.gov.'
					],
					button: 'Open lookup tool',
					buttonUrl: 'https://xnet.sfdph.org:8443/ords/eeop/f?p=119:1'
				}
			]
		},
		{
			heading: 'If you need to report a new problem',
			karl: 'Maps to the same repeatable `related` field as the "Related pages" section below — Transaction\'s related panel has no observed max and no sub-heading/grouping support, so in real Karl these 3 cards and the 2 below would become one flat list without this section break. Digital Services should decide ordering if the two-heading grouping matters editorially.',
			kind: 'placement',
			cards: [
				{
					title: 'Healthy Housing and Vector Control',
					target: 'pestsTopic',
					karl: 'related panel entry — page chooser only; this description text is not supported in the real schema (see section-level karl note above).'
				},
				{
					title: 'Report rats, mice, and other four-legged problems',
					target: 'rodentsReport',
					karl: 'related panel entry — page chooser only; this description text is not supported in the real schema (see section-level karl note above).'
				},
				{
					title: 'What happens after you report a housing or pest problem',
					target: 'afterReport',
					karl: 'related panel entry — page chooser only; this description text is not supported in the real schema (see section-level karl note above).'
				}
			]
		},
		{
			heading: 'Related pages',
			karl: 'Maps to the related panel: repeatable field "Page *" with a "Choose a page" button. Resolved schema gap: related has no custom title/text per item.',
			kind: 'placement',
			cards: [
				{
					title: 'Healthy housing conditions',
					target: 'healthyHousingTopic',
					karl: 'related panel entry — page chooser only; this description text is not supported in the real schema (see section-level karl note above).'
				},
				{
					title: 'Find residential hotel and shelter records',
					target: 'findHotelRecords',
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
	seoTitle: 'Find complaints and inspection records | SF.gov',
	metaDescription:
		'Search investigated complaints, inspections, and health code violations for a San Francisco address.'
};
