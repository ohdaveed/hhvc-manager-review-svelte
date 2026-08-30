export const ratFreeBlocks = {
	slug: 'sf.gov/rat-free-blocks',
	type: 'Campaign',
	title: 'Rat-free blocks',
	summary: 'A neighborhood push to cut rat sightings through coordinated cleanup and prevention.',
	audience: [
		'A resident who wants their block to act together',
		'A neighborhood or merchant association organizing a cleanup',
		'A property owner or manager on a block with a rodent problem'
	],
	reading: 'Grade 6',
	editorNote:
		'PROPOSED PAGE — not in the current 29. `design/HHVC Page Ideas.dc.html` makes a pointed observation: both existing Campaigns offer a free workshop, "which makes the type read as a booking page". Campaign is meant for a message-led push, and this page uses it that way — there is no form and no session to request. The IPM framing is deliberate and matches the enforcement model: rats leave when food, water, harborage and entry go, so the asks below are root-cause actions a block can verify on itself rather than a request to report more. NO SIGHTING STATISTICS, TARGET, OR DATE RANGE APPEARS. A campaign normally carries a number and a season; none is confirmed here, and inventing a "40% fewer sightings" figure would be exactly the fabricated statistic the content standard forbids. Campaign has no things_to_know and no intro panel, so the audience stays in `audience` and is reported as a gap.',
	editorStatus: 'needs-review',
	sections: [
		{
			heading: 'Take away what rats live on',
			karl: 'Maps to Spotlight 1: Spotlight title = this heading, Spotlight description = the paragraph. Spotlight requires an image of at least 1080x350 with no mockup equivalent — flag for Digital Services.',
			kind: 'body',
			component: 'spotlight',
			paragraphs: [
				'Rats do not respond to one clean yard. They respond to a block that removes food, water, and shelter at the same time.'
			],
			button: 'Report rats and mice',
			buttonTarget: 'rodentsReport'
		},
		{
			heading: 'What a block can do together',
			karl: 'Maps to Top facts: Facts title = this heading, and each entry below is one Fact item (Fact title = the short label, Fact text = the detail). Organised by IPM root cause rather than by symptom, so each item is something a neighbour can check on their own property.',
			kind: 'body',
			component: 'top-facts',
			facts: [
				{
					label: 'Food',
					text: 'Close bins fully. Keep pet food and bird seed indoors. Pick fruit up off the ground.'
				},
				{
					label: 'Water',
					text: 'Fix outdoor leaks and drips. Empty anything holding standing water after rain.'
				},
				{
					label: 'Harborage',
					text: 'Clear dense ground cover, woodpiles, and clutter along fences and foundations.'
				},
				{
					label: 'Entry',
					text: 'Seal gaps around pipes, vents, and doors. A rat fits through a gap the size of a quarter.'
				}
			]
		},
		{
			heading: 'Start with your own block',
			karl: 'Maps to Additional content → Title and text block. The bullets fold into the same rich text field; the Link tool carries the internal links.',
			kind: 'body',
			paragraphs: [
				'A coordinated week does more than a year of single properties acting alone. Neighbours do not need permission from the City to organise one.'
			],
			bullets: [
				'Agree a week when everyone clears clutter and checks their bins.',
				'Walk the block together afterwards and look for the gaps that remain.',
				'Report what is left — especially anything on a property no one is maintaining.',
				'[Report rats, mice, and other four-legged problems](rodentsReport)',
				'[Report garbage, mold, and overgrown vegetation](filthReport)'
			]
		},
		{
			heading: 'For owners and managers',
			karl: 'Maps to Spotlight 2. Spotlight 1 and Spotlight 2 are two separate fields, not one repeatable field — this is the second and last; a third would need a different block.',
			kind: 'body',
			component: 'spotlight',
			paragraphs: [
				'Rodent conditions on a property you own or manage are yours to correct under Article 11, whether or not anyone has reported them.'
			],
			button: 'See owner responsibilities',
			buttonTarget: 'ownerHub'
		},
		{
			heading: 'About this campaign',
			karl: 'Maps to About the campaign. PLACEHOLDER — this campaign has no confirmed start date, area, or partner list. A Campaign page normally carries all three.',
			kind: 'body',
			paragraphs: [
				'PLACEHOLDER: which neighborhoods, over what period, and with which partners. None is confirmed.'
			]
		},
		{
			heading: 'Related pages',
			karl: 'Maps to Related links. Campaign is not linked automatically from anything, so every route into this page has to be placed by hand — on the Agency page, a Topic, or an Information page.',
			kind: 'body',
			cards: [
				{
					title: 'Integrated pest management for property owners and managers',
					target: 'ownerGuidance'
				},
				{ title: 'Free IPM education workshop', target: 'ipmEducation' },
				{ title: 'Healthy housing and pest resources', target: 'verminResources' }
			]
		}
	],
	partnerAgencies: [
		{
			title: 'Environmental Health',
			url: 'https://www.sf.gov/departments--department-public-health--environmental-health'
		},
		{
			title: '311 Customer Service Center',
			url: 'https://www.sf.gov/departments--311-customer-service-center'
		}
	],
	seoTitle: 'Rat-free blocks | SF.gov',
	metaDescription:
		'A neighborhood push to cut rat sightings through coordinated cleanup and prevention.'
};
