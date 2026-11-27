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
			karl: 'Maps to an "Information section" → Title and text block: Title = this heading, Text = the three paragraphs plus the bulleted list below (cross-vector health-harm framing for owners/managers, placed first to motivate prevention). Verify disease-risk specifics with SFDPH vector program before publication. Split 2026-11-26: the two 4- and 5-sentence paragraphs passed SF.gov\'s 3-sentence limit, and the four health risks are now a list. Cut to two paragraphs on 2026-11-26 (page review): the Article 11 sentence repeated step 1.',
			kind: 'body',
			paragraphs: [
				"Pests put residents' health at risk, and the risk grows the longer they go untreated. A small rodent problem can turn into a mite outbreak, and moisture or clutter can support several pests at once.",
				'Common pests cause these health problems:'
			],
			bullets: [
				'Rodents can spread Hantavirus and Leptospirosis',
				'Cockroach allergens can trigger asthma',
				'Bed bug and mite bites cause skin irritation and stress',
				'Bird droppings can carry fungal spores that affect breathing'
			],
			callout: {
				karl: "Maps to its own Callout stream item (a sibling of the Title and text item above, not nested inside it — Information section's three block types are top-level stream siblings). Single rich text field only, no separate title field, which this mockup callout already lacks, so no mismatch here.",
				variant: 'warning',
				text: 'Children, older adults, and people with existing health conditions or weakened immune systems are most at risk from unmanaged pests.'
			}
		},
		{
			heading: 'Use IPM to prevent pests',
			fieldKey: 'primary-source-uc-ipm-guide-for-property-managers',
			component: 'resources',
			karl: 'Maps to a second Title and text block: Title = this heading, Text = the two paragraphs below. On 2026-11-26 (page review) the one-paragraph "Use IPM to prevent pests" section merged in here as the first paragraph, and the callout that described the sections below left: its one rule (follow San Francisco rules where UC IPM differs) is now the last sentence. The fieldKey keeps the ids of "Use the UC IPM guide for property managers".',
			kind: 'placement',
			paragraphs: [
				'Integrated pest management (IPM) prevents pests first. It uses inspection, maintenance, sanitation, sealing entry points, monitoring, and targeted treatment, and limits heavy pesticide use.',
				'HHVC recommends the University of California IPM program (UC IPM) guide for multi-unit housing. It has policies, checklists, monitoring forms, and resident handouts. Where it differs from the San Francisco Health Code or SFDPH Director’s Rules, follow the San Francisco rules.'
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
					text: 'Browse more UC ANR trainings, Pest Notes, and prevention publications for housing managers.',
					url: 'https://ipm.ucanr.edu/home-and-landscape/resources-for-multi-unit-housing-managers/',
					karl: 'Body external link: UC IPM multi-unit housing resources index'
				},
				{
					title: 'SF Environment: Pestec IPM guidelines for multifamily housing',
					text: 'SF-local operations manual for multi-unit buildings. Covers turnover proofing, resident toolkit gap sizes, and sample IPM plans.',
					url: 'https://sfenvironment.org/article/integrated-pest-management-ipm-guidelines-for-multifamily-housing',
					karl: 'Body external link: SF Environment Pestec multifamily IPM guidelines (supplemental)'
				}
			]
		},
		{
			heading: 'Conditions inside the building that attract pests',
			fieldKey: 'common-building-conditions-that-attract-pests',
			karl: "Maps to a Title and text block: Title = this heading, Text = the paragraph plus the bulleted list below. Frames the prevention steps that follow. Split on 2026-11-26 from one 6-item list: SF.gov keeps a bulleted list to 3 to 5 items (A-to-Z, Bullets). Split by where an owner looks: inside, then outside and in shared areas. The fieldKey keeps this section's original ids.",
			kind: 'body',
			paragraphs: [
				'Most pest problems in buildings start with a few common conditions. Fixing them early prevents infestations.'
			],
			bullets: [
				'Unsealed gaps, cracks, and utility openings that let pests enter',
				'Standing water, leaks, and damp spaces',
				'Clutter, cardboard storage, and unused materials that offer shelter'
			]
		},
		{
			heading: 'Conditions outside and in shared areas that attract pests',
			karl: 'Maps to a Title and text block: Title = this heading, Text = the bulleted list below. Split on 2026-11-26 from one 6-item list: SF.gov keeps a bulleted list to 3 to 5 items (A-to-Z, Bullets). The pet waste bullet carries the Decided cross-link line ("Pick up pet waste daily. It feeds rats.", Karl review 2026-11-24).',
			kind: 'body',
			bullets: [
				'Overflowing, uncovered, or poorly serviced garbage areas',
				'Overgrown landscaping and debris close to walls and foundations',
				'Pet waste in yards and shared areas. Pick up pet waste daily. It feeds rats. [Report animal waste on a property](animalWasteReport)'
			]
		},
		{
			heading: '1. Follow San Francisco owner responsibilities',
			karl: "Maps to a fifth Title and text block: Title = this heading, Text = the paragraph plus the bulleted list below (SFDPH Director's Rules and Regulations requirements). On 2026-11-26 the 72-hour, recordkeeping and licensed-PCO bullets were removed: Article 11 compliance for property owners owns them, and the paragraph now links there.",
			kind: 'body',
			paragraphs: [
				'The legal requirements, including the 72-hour response, recordkeeping and licensed pest control, are on [Article 11 compliance for property owners](article11Compliance). Two more practices help keep pests out:'
			],
			bullets: [
				'**Garbage management:** Provide enough rigid plastic or metal containers with tight-fitting lids. Keep the garbage area clean and serviced often enough that it never overflows.',
				'**Staff training:** Train building staff on pest recognition, sanitation, exclusion, and safe disposal of infested items.'
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
			karl: 'Maps to a seventh Title and text block: Title = this heading, Text = the paragraphs plus the bulleted list below. The two resource links were the first two bullets until 2026-11-26; they are a paragraph now, as in "2. Set policies, plans, and lease expectations", leaving a list of 5.',
			kind: 'placement',
			paragraphs: [
				'Prevent pest problems by fixing the conditions that let pests enter, hide, feed, or breed. Maintenance, landscape management, and sanitation are core parts of IPM.',
				'[UC IPM: Pest prevention](https://ipm.ucanr.edu/home-and-landscape/guide-for-property-managers/pest-prevention/) and [SF Environment: Pest Prevention by Design](https://sfenvironment.org/download/pest-prevention-by-design-guidelines)'
			],
			bullets: [
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
				'Track pest activity so you can see patterns and respond before problems spread.',
				'[UC IPM: Pest monitoring and recordkeeping](https://ipm.ucanr.edu/home-and-landscape/guide-for-property-managers/pest-monitoring-and-recordkeeping/)'
			],
			bullets: [
				'Use one system to log complaints, repairs, sanitation work, and contractor visits. You must keep a written log of vermin reports. It is not just good practice. See [Article 11 compliance for property owners](article11Compliance).',
				'Make sure your pest control company inspects fully and names the pest and how bad the infestation is.',
				"Inspect adjacent units: When an infestation is reported, the pest control company must inspect every adjacent unit. Treat them if needed (Director's Rules §VI.6).",
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
			karl: 'Maps to the Related field: a generic unrestricted "Page" chooser, repeatable. Property owner responsibilities left this list on 2026-11-26 (Karl’s Related takes only Transaction, Information, Campaign and Topic pages (Help Center › Components › Related), and this is a Resource Collection); "1. Follow San Francisco owner responsibilities" already links it in the body.',
			kind: 'placement',
			cards: [
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
