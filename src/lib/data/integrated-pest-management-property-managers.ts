export const ownerGuidance = {
	slug: 'sf.gov/information/integrated-pest-management-for-property-owners-and-managers',
	type: 'Information',
	title: 'Integrated pest management for property owners and managers',
	summary: 'Use prevention, monitoring, and resident outreach tools for your building.',
	reading: 'Grade 7',
	editorNote:
		'Information page for property owners and managers. UC ANR IPM guide is the primary external source — verify link stability and whether HHVC wants additional SFDPH Director’s Rules citations before publication.',
	topicTag: 'Agency: Healthy Housing and Vector Control',
	sections: [
		{
			heading: 'Who this information is for',
			karl: 'Maps to the first "Information section" → Title and text block: Title = this heading, Text = the bulleted list. The heading is the one sf.gov/manage-covid-19-schools-childcare-and-youth-programs gives an audience list (an H3 over bullets). This was the page-level `audience` field until 2026-11-26, when that field was retired; the transcript used to supply this block itself, so what goes into Karl is unchanged.',
			kind: 'body',
			bullets: [
				'This page is for property owners, managers, and maintenance staff looking for pest prevention best practices.'
			]
		},
		{
			heading: 'Protect residents’ health',
			fieldKey: 'why-it-matters',
			karl: 'Maps to an "Information section" → Title and text block: Title = this heading, Text = the two paragraphs below (cross-vector health-harm framing for owners/managers, placed first to motivate prevention). Verify disease-risk specifics with SFDPH vector program before publication.',
			kind: 'body',
			paragraphs: [
				"Unmanaged pests do not just damage a building — they put residents' health at risk. Rodents can spread Hantavirus and Leptospirosis. Cockroach allergens can trigger asthma. Bed bug and mite bites cause skin irritation and stress. Bird droppings can carry fungal spores that affect breathing.",
				"These risks compound the longer they go unaddressed. A small rodent problem can turn into a mite outbreak. Untreated moisture or clutter can support several pests at once. Prevention protects both residents' health and the owner's ability to meet Article 11 requirements."
			],
			callout: {
				karl: "Maps to its own Callout stream item (a sibling of the Title and text item above, not nested inside it — Information section's three block types are top-level stream siblings). Single rich text field only, no separate title field, which this mockup callout already lacks, so no mismatch here.",
				variant: 'warning',
				text: 'Children, older adults, and people with existing health conditions or weakened immune systems are most at risk from unmanaged pests.'
			}
		},
		{
			heading: 'Use IPM to prevent pests',
			karl: 'Maps to a second Title and text block: Title = this heading, Text = the two paragraphs plus the bulleted list below (bullets render as a bulleted list inside the same rich text field).',
			kind: 'body',
			paragraphs: [
				'Property owners, managers, and building operators must keep buildings free of vermin under San Francisco health and housing rules.',
				'Integrated Pest Management (IPM) is a prevention-first approach. It uses inspection, maintenance, sanitation, exclusion, monitoring, and targeted treatment to reduce pests and limit heavy pesticide use. This sits under Article 11 of the San Francisco Health Code.'
			],
			bullets: [
				'Prevent pests before infestations spread',
				'Fix building conditions that attract or shelter pests',
				'Use records and monitoring to find repeated problems',
				'Share clear instructions with residents and staff'
			]
		},
		{
			heading: 'Use the UC IPM guide for property managers',
			fieldKey: 'primary-source-uc-ipm-guide-for-property-managers',
			component: 'resources',
			karl: 'Maps to a third Title and text block: Title = this heading, Text = the two paragraphs below.',
			kind: 'placement',
			paragraphs: [
				'The University of California Statewide IPM Program (UC IPM) publishes the main reference guide used on this page. Use it for policies, checklists, monitoring forms, and resident handouts.',
				'HHVC recommends UC IPM as a practical source for property owners and managers operating multi-unit housing in San Francisco.'
			],
			cards: [
				{
					title: 'UC IPM: Guide for property managers',
					text: 'Start here for the full UC ANR guide to integrated pest management in multi-unit housing. It covers policies, prevention, monitoring, and resident outreach.',
					url: 'https://ipm.ucanr.edu/home-and-landscape/guide-for-property-managers/',
					karl: 'This card links to an external URL, not an internal page — it does not fit the verified "Related" field (an unrestricted but internal-only Page chooser; no external-URL support observed). No block type in the verified Information schema holds a card-style external link with its own title/description. Best option: fold this in as a Link-tool External link within this block\'s own Title and text rich text — flag for Digital Services rather than assuming a dedicated field.'
				},
				{
					title: 'UC IPM: More multi-unit housing resources',
					text: 'Browse additional UC ANR trainings, Pest Notes, and prevention publications for housing managers.',
					url: 'https://ipm.ucanr.edu/home-and-landscape/resources-for-multi-unit-housing-managers/',
					karl: 'Body external link: UC IPM multi-unit housing resources index'
				},
				{
					title: 'SF Environment: Pestec IPM guidelines for multifamily housing',
					text: 'SF-local operations manual for multi-unit buildings — turnover proofing, resident toolkit gap sizes, and sample IPM plans.',
					url: 'https://sfenvironment.org/article/integrated-pest-management-ipm-guidelines-for-multifamily-housing',
					karl: 'Body external link: SF Environment Pestec multifamily IPM guidelines (supplemental)'
				}
			],
			callout: {
				karl: 'Maps to its own Callout stream item (a second Callout sibling, alongside the "Why it matters" Callout above — not nested inside any Title and text block). Single rich text field, no title field; this callout has none, so no mismatch.',
				text: 'Sections below summarize HHVC expectations and point to specific UC IPM chapters. When details differ, follow San Francisco Health Code requirements and SFDPH Director’s Rules.'
			}
		},
		{
			heading: 'Common building conditions that attract pests',
			karl: 'Maps to a fourth Title and text block: Title = this heading, Text = the paragraph plus the bulleted list below. Frames the prevention steps that follow.',
			kind: 'body',
			paragraphs: [
				'Most pest problems in buildings start with a few common conditions. Fixing them early prevents infestations.'
			],
			bullets: [
				'Unsealed gaps, cracks, and utility openings that let pests enter',
				'Overflowing, uncovered, or poorly serviced garbage areas',
				'Standing water, leaks, and damp spaces',
				'Clutter, cardboard storage, and unused materials that offer shelter',
				'Overgrown landscaping and debris close to walls and foundations',
				'Pet waste in yards and shared areas. Pick up pet waste daily. It feeds rats. [Report animal waste on a property](animalWasteReport)'
			]
		},
		{
			heading: '1. Follow San Francisco owner responsibilities',
			karl: "Maps to a fifth Title and text block: Title = this heading, Text = the paragraph plus the bulleted list below (SFDPH Director's Rules and Regulations requirements).",
			kind: 'body',
			paragraphs: [
				"San Francisco Department of Public Health (SFDPH) Director's Rules and Regulations set legal requirements for owners and managers. These apply to rental property and cover preventing and controlling rodents and other vectors."
			],
			bullets: [
				"Investigate reports: Investigate any tenant reports of pest activity within 72 hours (Director's Rules §V.2).",
				'Recordkeeping: Keep accurate records of pest complaints, inspections, and pest control services for at least 2 years. Make these records available to DPH on request.',
				'Hire licensed professionals: Hire only licensed Pest Control Operators (PCOs) to apply pesticides or conduct rat trapping.',
				'Garbage management: Provide enough rigid plastic or metal containers with tight-fitting lids. Ensure the garbage area is clean and serviced regularly to prevent overflow.',
				'Staff training: Train building staff on pest recognition, sanitation, exclusion, and safe disposal of infested items.'
			],
			cards: [
				{
					title: 'Property owner responsibilities',
					text: 'See fees, violation response, and other Article 11 obligations on SF.gov.',
					target: 'ownerHub',
					karl: 'This card links to an internal page inline, mid-body — not in the final Related section. Two options for Digital Services: fold it in as an internal Link-tool link within this block\'s own Title and text rich text (preserves its inline placement), or move it to the page-level "Related" field (an unrestricted page chooser) — but Related has no custom title/text per item, so this card\'s description would have no home there either way.'
				}
			]
		},
		{
			heading: '2. Set policies, plans, and lease expectations',
			karl: 'Maps to a sixth Title and text block: Title = this heading, Text = the paragraph plus the bulleted list below.',
			kind: 'placement',
			paragraphs: [
				'Put pest prevention expectations in building policies, written plans, staff procedures, and lease materials. Clear expectations help residents, managers, maintenance staff, and pest control contractors respond consistently.',
				'[UC IPM: Policies, plans, and templates](https://ipm.ucanr.edu/home-and-landscape/guide-for-property-managers/policies-plans-and-templates/)'
			],
			bullets: [
				'Set a clear way for residents to report pest activity',
				'Explain how residents should prepare for inspections or treatment',
				'Define staff roles for sanitation, repairs, monitoring, and follow-up',
				'Keep pest prevention language consistent across leases, notices, and house rules'
			]
		},
		{
			heading: '3. Prevent pests and seal entry points',
			karl: 'Maps to a seventh Title and text block: Title = this heading, Text = the paragraph plus the bulleted list below.',
			kind: 'placement',
			paragraphs: [
				'Prevent pest problems by fixing the conditions that let pests enter, hide, feed, or breed. Maintenance, landscape management, and sanitation are core parts of IPM.'
			],
			bullets: [
				'[UC IPM: Pest prevention](https://ipm.ucanr.edu/home-and-landscape/guide-for-property-managers/pest-prevention/)',
				'[SF Environment: Pest Prevention by Design](https://sfenvironment.org/download/pest-prevention-by-design-guidelines)',
				'Seal gaps larger than 1/4 inch around doors, windows, pipes, vents, and utility openings with rodent-proof materials. Examples include hardware cloth, copper mesh, sheet metal, concrete, mortar, or steel wool backed by sealant.',
				"Keep tree and shrub branches at least 6 feet from walls or roofs. This stops rodents climbing onto structures (Pest Prevention by Design). Director's Rules require at least 3 feet for enforcement inspections.",
				'Keep a 24-inch clear space along fences and exterior walls to reduce rodent movement and allow visibility.',
				'Apply gravel around foundations to prevent burrowing. Store wood piles, lumber, and other materials at least 6 inches off the ground. Keep them 6 inches from any wall or fence, so rub marks and runways stay visible during an inspection.',
				'Build pest-proofing into repair, remodeling, and construction work.'
			]
		},
		{
			heading: '4. Track pest activity and coordinate treatments',
			karl: 'Maps to an eighth Title and text block: Title = this heading, Text = the paragraph plus the bulleted list below.',
			kind: 'placement',
			paragraphs: [
				'Track pest activity so you can see patterns and respond before problems spread. Coordinated pest control services are required to handle infestations effectively.',
				'[UC IPM: Pest monitoring and recordkeeping](https://ipm.ucanr.edu/home-and-landscape/guide-for-property-managers/pest-monitoring-and-recordkeeping/)'
			],
			bullets: [
				'Use one system to log complaints, repairs, sanitation work, and contractor visits. A written log of vermin reports is required, not just good practice. See [Article 11 compliance for property owners](article11Compliance).',
				'Ensure the PCO conducts a complete inspection and identifies the type and level of infestation.',
				"Inspect adjacent units: When an infestation is reported, the PCO must inspect every adjacent unit. Treat them if needed (Director's Rules §VI.6).",
				'Use least-toxic methods: Prioritize non-chemical methods (vacuuming, heat, steam, freezing) and gel baits over chemical sprays.',
				'Review records regularly to find repeated or building-wide problems.'
			]
		},
		{
			heading: '5. Share clear instructions and support residents',
			karl: 'Maps to a ninth Title and text block: Title = this heading, Text = the paragraph plus the bulleted list below.',
			kind: 'placement',
			paragraphs: [
				'Tenant cooperation is important, but pest prevention cannot depend on tenants alone. Give residents clear instructions, advance notification, and help those who need it.',
				'[UC IPM: Outreach to residents](https://ipm.ucanr.edu/home-and-landscape/guide-for-property-managers/outreach-to-residents/)'
			],
			bullets: [
				'Explain how residents should report pest activity in writing.',
				'Give proper written notice before pesticide treatments, following state laws.',
				'Help tenants who cannot safely prepare their unit for treatment because of a disability or medical need. Contact support services for them.',
				'Use translated materials to share simple food storage, garbage, and clutter prevention steps.'
			]
		},
		{
			heading: 'Contact Healthy Housing and Vector Control',
			karl: 'Maps to an "Information section" → Title and text block: Title = this heading, Text = the two lines below. Information has no Contact us panel (Transaction has get_help, Campaign and Agency have contact; Information has neither), so the phone and email the mockup used to show in a contact box move into the body (2026-11-26). The box\'s third line, the team name, is this heading.',
			kind: 'body',
			paragraphs: [
				'Call or text 311.',
				'Call Healthy Housing and Vector Control at 415-252-3800, or email healthyhousing@sf.gov.'
			]
		},
		{
			heading: 'Related pages',
			component: 'related',
			karl: 'Maps to the Related field: a generic unrestricted "Page" chooser, repeatable.',
			kind: 'placement',
			cards: [
				{
					title: 'Property owner responsibilities',
					target: 'ownerHub'
				},

				{
					title: 'Report rats or mice',
					target: 'rodentsReport'
				},
				{
					title: 'Learn what Healthy Housing and Vector Control can inspect',
					target: 'scopeInfo'
				}
			]
		}
	],
	seoTitle: 'IPM for property owners and managers | SF.gov',
	metaDescription:
		'IPM for SF property owners and managers. UC ANR templates for prevention, monitoring, and resident outreach.'
};
