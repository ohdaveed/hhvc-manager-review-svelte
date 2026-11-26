export const reduceMoisture = {
	slug: 'sf.gov/information/reduce-moisture-and-mold-in-your-home',
	type: 'Information',
	title: 'Reduce moisture and mold in your home',
	summary:
		'Learn what causes mold, who is responsible for fixing it, and simple daily steps that keep your home dry.',
	reading: 'Grade 4–6',
	editorStatus: 'needs-review',
	editorNote:
		'New community-education Information page, planned in the source register as `reduceMoisture` (Phase 2 Information; docs/source/hhvc-policy/2026-07-02-mold-moisture-guidance.md and 2026-07-02-mold-tenants-landlords-guidance.md). The two SFDPH sources disagree slightly on the humidity target (below 55%, ideally 40-50%, versus below about 40-50%) and on furniture spacing (6 inches); this page uses "below 50%" and 6 inches — confirm with HHVC. UC ANR publishes no indoor-mold guidance (searched 2026-11-26), so the UC IPM links here cover pests that thrive in damp homes, and the general mold link is EPA. All external links verified 200 on 2026-11-26.',
	topicTag: 'Agency: Healthy Housing and Vector Control',
	sections: [
		{
			heading: 'Who this information is for',
			karl: 'Maps to the first "Information section" → Title and text block: Title = this heading, Text = the bulleted list. The heading is the one sf.gov/manage-covid-19-schools-childcare-and-youth-programs gives an audience list (an H3 over bullets). This was the page-level `audience` field until 2026-11-26, when that field was retired; the transcript used to supply this block itself, so what goes into Karl is unchanged.',
			kind: 'body',
			bullets: [
				'This page is for tenants, and the owners and managers of their buildings, who want to prevent or clean up mold.'
			]
		},
		{
			heading: 'Mold is a moisture problem',
			image: {
				src: '/images/mockup/mold-above-light-switch.webp',
				alt: 'Dark spots of mold spread across a damp wall above a light switch.',
				width: 1280,
				height: 960,
				credit: {
					title: 'Mold grows above a switch plate in this home',
					creator: 'FEMA',
					sourceUrl:
						'https://commons.wikimedia.org/wiki/File:Flooding_%5E_Severe_Storm_-_Memphis,_Tenn._,_May_28,_2011_--_Mold_grows_above_a_switch_plate_in_this_home._FEMA_mitigation_teams_are_emphatic_about_the_dangers_of_mold_and_have_precau_-_DPLA_-_ca96e17a8de030703b06da269682a80d.jpg',
					license: 'Public domain'
				}
			},
			karl: 'Maps to an "Information section" → Title and text block: Title = this heading, Text = the two paragraphs below. Then an Information section → Image block right after it, holding the mold photo: it shows what "visible mold" on a wet wall looks like, which the paragraphs describe but do not picture. Upload the 1280×960 file (Information images need 700px+ wide, shown uncropped) with the alt text as written. It is a landscape crop of a portrait FEMA photo (Memphis, 2011), cropped so it does not run a full screen tall; the switch-plate markings are incidental text, which Karl allows. Public domain (US federal work) — no attribution required.',
			kind: 'body',
			paragraphs: [
				'Tiny mold spores are in every home. They only grow into visible mold when a surface stays wet. Stop the water, and you stop the mold.',
				'Mold can trigger asthma and allergies, especially in children and people with breathing problems. Mold can start to grow in just a couple of days, so act quickly.'
			]
		},
		{
			heading: 'Where the water comes from',
			karl: 'Maps to a second Title and text block: Title = this heading, Text = the paragraph plus the bulleted list below. Responsibility split is SFDPH\'s own framing in "Mold Guidance for Tenants and Landlords".',
			kind: 'body',
			paragraphs: ['Who fixes mold usually depends on where the water comes from.'],
			bullets: [
				'**Leaks from outside**, like a leaky roof or window frame. The owner must fix these.',
				'**Plumbing leaks inside**, like a dripping pipe or water heater. The owner must fix these.',
				'**Condensation**, which is water from cooking, showers, and breathing that collects on cold walls and windows. Tenants usually manage this by keeping the air dry and moving.'
			],
			callout: {
				karl: 'Maps to its own Callout stream item (a sibling of the Title and text item above). Single rich text field only, no separate title field — this callout has none, so no mismatch.',
				variant: 'info',
				text: 'If you see a leak, tell your landlord in writing right away. You are helping protect the building and your health.'
			}
		},
		{
			heading: 'Let damp air out',
			fieldKey: 'keep-your-home-dry-every-day',
			karl: 'Maps to a third Title and text block: Title = this heading, Text = the paragraph plus the bulleted list below. Tips are condensed from SFDPH "Tips to Control Moisture and Prevent Mold". Split on 2026-11-26 from one 7-item list: SF.gov keeps a bulleted list to 3 to 5 items (A-to-Z, Bullets). Split into letting damp air out (this section) and keeping air moving. The fieldKey keeps this section\'s original ids.',
			kind: 'body',
			paragraphs: [
				'Fresh, moving air is your best tool against mold. These steps cost little or nothing.'
			],
			bullets: [
				'**Open windows for 5 to 15 minutes a day.** This lets damp air out and drier air in, even on a foggy day.',
				'**Run the fan when you cook or shower.** Leave it on for 15 to 20 minutes after. To test a fan, see if it holds up a square of toilet paper. If a fan or vent is broken, tell your landlord.',
				'**Put lids on pots** when you cook.',
				'**Dry laundry in a dryer**, not on racks indoors.'
			]
		},
		{
			heading: 'Keep air moving along walls and in closets',
			karl: 'Maps to a Title and text block: Title = this heading, Text = the bulleted list below. Split on 2026-11-26 from one 7-item list: SF.gov keeps a bulleted list to 3 to 5 items (A-to-Z, Bullets).',
			kind: 'body',
			bullets: [
				'**Move furniture at least 6 inches away from outside walls** so air can flow behind it.',
				'**Wipe water off windows and sills** when you see it.',
				'**Do not overstuff closets**, and leave closet doors a little open.'
			]
		},
		{
			heading: 'Check your humidity',
			karl: 'Maps to a fourth Title and text block: Title = this heading, Text = the two paragraphs below.',
			kind: 'body',
			paragraphs: [
				'A small gauge called a hygrometer measures how damp the air is. You can buy one for about $15 to $25.',
				'Try to keep humidity below 50%. If it stays higher, open windows more often or use a dehumidifier.'
			]
		},
		{
			heading: 'Clean small areas of mold',
			karl: 'Maps to a fifth Title and text block: Title = this heading, Text = the paragraph plus the bulleted list below.',
			kind: 'body',
			paragraphs: ['You can clean small spots of mold yourself.'],
			bullets: [
				'**Use soap and water.** We do not recommend bleach.',
				'**Wash moldy clothes and fabrics** in warm water and dry them completely.',
				'**Fix the cause**, or the mold will come back.'
			]
		},
		{
			heading: 'When to report mold to the City',
			karl: 'Maps to a sixth Title and text block: Title = this heading, Text = the paragraph plus the bulleted list below. Report route is moldReport, the dedicated mold report page.',
			kind: 'body',
			paragraphs: [
				'Tell your landlord first, in writing. If your landlord does not fix a leak or a mold problem, you can report it.'
			],
			bullets: [
				{
					text: '**The City can act** when mold covers at least 10 square feet of walls or ceilings. The owner must then clean it and paint with mold-resistant paint.',
					unverified: true,
					unverifiedReason:
						'The 10 sq ft action threshold is from internal SFDPH program guidance (2026-07-02-mold-moisture-guidance.md), not a cited Health Code section. Confirm HHVC wants this number published.'
				},
				'**The City cannot help** with mold on personal items like furniture or clothing.',
				'[Report mold](moldReport)',
				'[Health Code Article 11 in plain language](article11Guide)'
			]
		},
		{
			heading: 'Learn more',
			karl: "Maps to a seventh Title and text block: Title = this heading, Text = the paragraph plus the bulleted list below. Each bullet carries a Link-tool External link folded into this block's rich text — the verified Information schema has no external-URL card. UC ANR has no indoor-mold guide, so the mold link is EPA; the two UC IPM links cover damp-home pests.",
			kind: 'placement',
			paragraphs: [
				'Damp homes also attract pests that need water to survive. These guides explain how to spot and prevent them.'
			],
			bullets: [
				'[CDC: Mold](https://www.cdc.gov/mold-health/about/index.html). How mold affects health.',
				'[EPA: A brief guide to mold, moisture, and your home](https://www.epa.gov/mold/brief-guide-mold-moisture-and-your-home)',
				'[UC IPM: Cockroaches](https://ipm.ucanr.edu/home-and-landscape/cockroaches/). Leaks and damp areas give cockroaches water.',
				'[UC IPM: Moth or drain flies](https://ipm.ucanr.edu/home-and-landscape/moth-or-drain-flies/). Small flies that breed in wet, slimy drains.'
			]
		},
		{
			heading: 'Related pages',
			component: 'related',
			karl: 'Maps to the Related field: a generic unrestricted page picker, repeatable.',
			kind: 'placement',
			cards: [
				{
					title: 'Report mold',
					target: 'moldReport'
				},
				{
					title: 'Tenant rights when reporting housing conditions',
					target: 'tenantRights'
				}
			]
		}
	],
	seoTitle: 'Reduce moisture and mold at home | SF.gov',
	metaDescription:
		'What causes mold, who fixes it, and daily steps San Francisco tenants can take to keep their home dry.'
};
