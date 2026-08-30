export const stepPrepUnit = {
	slug: 'sf.gov/step-by-step/prepare-your-unit-for-pest-treatment',
	type: 'Step by step',
	title: 'Prepare your unit for pest treatment',
	summary: 'What to move, wash, and bag before an exterminator treats for bed bugs or cockroaches.',
	audience: [
		'A tenant whose unit is scheduled for pest treatment',
		'A property owner or manager telling tenants how to prepare',
		'A helper preparing a unit for someone who cannot'
	],
	reading: 'Grade 6',
	editorNote:
		'PROPOSED PAGE — not in the current 29. `design/HHVC Page Ideas.dc.html` lists it among the three Step by step proposals; it is the one tenants are told to do with no page to send them to. THE PREPARATION LIST HERE IS GENERIC AND MUST BE REPLACED. A pest control operator issues unit-specific instructions and those govern — this page says so in the first step rather than competing with them. Nothing here names a treatment interval, a number of visits, or a re-entry time: those vary by product and are set by the operator, not by HHVC, and the corpus confirms none of them. The page is written at Grade 6 because it is read under time pressure, often the night before a visit.',
	editorStatus: 'needs-review',
	sections: [
		{
			heading: 'Who this information is for',
			karl: 'Maps to the Intro panel — the audience line’s home on a Step by step page, which has no things_to_know.',
			kind: 'body',
			component: 'intro',
			paragraphs: [
				'Treatment works better when the unit is ready. A visit that cannot reach the walls, floors, or furniture may have to be repeated.'
			],
			bullets: [
				'Tenants with a treatment visit scheduled',
				'Owners and managers giving tenants instructions',
				'Anyone helping prepare a unit'
			]
		},
		{
			heading: 'What to do',
			karl: 'Maps to the repeatable Steps panel, step_type "number". Time stays blank on every step: how long preparation takes depends on the unit, and no measured figure exists.',
			kind: 'body',
			steps: [
				{
					title: 'Read the instructions you were given',
					text: [
						'Your pest control operator sends instructions for your unit and the product being used. Those instructions come first — where they differ from this page, follow them.'
					],
					bullets: [
						'Ask your owner or manager for the instructions if you did not get them.',
						'Ask what the product is if anyone in the home is pregnant, has asthma, or is under two.'
					],
					karl: 'Step 1. Placed first on purpose: it establishes that this page is a general checklist and the operator’s notice is the authority, which is what keeps the page from contradicting a real treatment plan.'
				},
				{
					title: 'Wash and bag fabric',
					text: [
						'Bed bugs and cockroaches travel in fabric. Washing and sealing is the part that most often gets missed.'
					],
					bullets: [
						'Wash bedding, curtains, and clothing on the hottest setting the fabric allows, then dry them fully.',
						'Seal everything you have washed in bags and keep it sealed until treatment is finished.',
						'Do not move sealed bags to another unit — that is how an infestation spreads to a neighbour.'
					],
					karl: 'Step 2. No temperature in degrees and no dryer time: both are product- and fabric-specific, and neither is confirmed anywhere in the corpus.'
				},
				{
					title: 'Clear access to walls, floors, and furniture',
					text: ['Treatment reaches the edges of a room. Anything against a wall has to move.'],
					bullets: [
						'Pull furniture away from the walls.',
						'Empty the bottom of closets and clear the floor.',
						'Take everything off the floor of the room being treated.',
						'Vacuum floors and edges, then seal and bin the vacuum bag straight away.'
					],
					karl: 'Step 3. One Text block; the bullets fold into its rich text rather than becoming their own block.'
				},
				{
					title: 'Protect food, dishes, and medicine',
					text: ['Anything that goes in a mouth needs to be sealed or out of the room.'],
					bullets: [
						'Seal food, or move it out of the rooms being treated.',
						'Put dishes, utensils, and food preparation surfaces away or cover them.',
						'Move medicine, baby bottles, and pet bowls out.'
					],
					karl: 'Step 4.'
				},
				{
					title: 'Plan for people and pets',
					text: [
						'Ask your operator how long everyone needs to stay out and what has to happen before you go back in.'
					],
					bullets: [
						'Arrange somewhere for pets, including fish tanks and birds, which need special handling.',
						'Tell your operator about anyone in the home who is pregnant, elderly, or has a breathing condition.'
					],
					karl: 'Step 5. Deliberately does NOT state a re-entry time. Re-entry depends on the product applied and is set by the operator; naming a number here would be an invented safety instruction.'
				},
				{
					title: 'After the visit',
					text: [
						'Do not clean the treated surfaces until your operator says it is safe — cleaning too early removes the treatment.'
					],
					bullets: [
						'Keep washed items sealed until you are told otherwise.',
						'Report what you still see. A second visit is normal for some pests.',
						'[Report cockroaches, mosquitoes, and other insects](insectsReport)'
					],
					karl: 'Step 6. Transaction link: insectsReport. "A second visit is normal for some pests" is stated without a count, since the number varies by pest and product.'
				}
			]
		},
		{
			heading: 'Related pages',
			karl: 'Maps to Related. Cards publish the destination page’s own title.',
			kind: 'body',
			cards: [
				{ title: 'Correct a violation and close your case', target: 'stepCorrectViolation' },
				{ title: 'Tenant rights when reporting housing conditions', target: 'tenantRights' },
				{
					title: 'Integrated pest management for property owners and managers',
					target: 'ownerGuidance'
				}
			]
		}
	],
	partnerAgencies: [
		{
			title: 'Environmental Health',
			url: 'https://www.sf.gov/departments--department-public-health--environmental-health'
		}
	],
	seoTitle: 'Prepare your unit for pest treatment | SF.gov',
	metaDescription:
		'What to move, wash, and bag before an exterminator treats a unit for bed bugs or cockroaches.'
};
