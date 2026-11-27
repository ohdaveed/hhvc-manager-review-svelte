export const bedBugsInfo = {
	slug: 'sf.gov/information/bed-bugs-prevent-find-and-prepare-for-treatment',
	type: 'Information',
	title: 'Bed bugs: prevent them, find them, and get ready for treatment',
	summary:
		'Learn how bed bugs spread, how to check for them, and what tenants and owners each need to do before treatment.',
	reading: 'Grade 4–6',
	editorStatus: 'needs-review',
	editorNote:
		"New community-education Information page, planned in the source register as `bedBugsInfo` (docs/source/hhvc-policy/2026-07-02-bed-bug-directors-rules-tenant-guidelines.md, \"Phase used\"). Sources: SFDPH Tenant Guidelines for Unit Preparation Prior to Bed Bug Treatment (Director's Rules sections Tenant 3.1-3.4, Owner 3.3-3.5), UC IPM Pest Notes: Bed Bugs (2013), and the owner 72-hour investigation rule in the Residential Building Owner/Operator Guidelines for Vector Control. The Director's Rules PDF URL cited in the tenant guidelines (sfdph.org/.../BedBugRegs_070112.pdf) now redirects to the DPH home page, so it is not linked here — confirm the current published location, and whether the v4 Director's Rules draft changes any duty below, before publication. UC IPM link verified 200 on 2026-11-26.",
	topicTag: 'Agency: Healthy Housing and Vector Control',
	sections: [
		{
			heading: 'Who this information is for',
			karl: 'Maps to the first "Information section" → Title and text block: Title = this heading, Text = the bulleted list. The heading is the one sf.gov/manage-covid-19-schools-childcare-and-youth-programs gives an audience list (an H3 over bullets). This was the page-level `audience` field until 2026-11-26, when that field was retired; the transcript used to supply this block itself, so what goes into Karl is unchanged.',
			kind: 'body',
			bullets: [
				'This page is for tenants, residents of SROs and shelters, and property owners and managers dealing with bed bugs.'
			]
		},
		{
			heading: 'What bed bugs are',
			karl: 'Maps to an "Information section" → Title and text block: Title = this heading, Text = the two paragraphs below.',
			kind: 'body',
			paragraphs: [
				'Bed bugs are small, flat insects that feed on blood, usually at night while people sleep. Adults are about the size of an apple seed.',
				'Bed bugs are not a sign of a dirty home. Anyone can get them. They have not been shown to spread disease, but their bites can itch, and scratching can cause skin infections.'
			]
		},
		{
			heading: 'How bed bugs get into your home',
			karl: 'Maps to a second Title and text block: Title = this heading, Text = the paragraph plus the bulleted list below.',
			kind: 'body',
			paragraphs: [
				'Bed bugs hitch a ride on things people carry. They can also move between units through walls and shared spaces.'
			],
			bullets: [
				"**Luggage and clothes** after staying in a hotel or someone else's home",
				'**Used furniture**, especially beds, mattresses, and couches',
				'**Bags, boxes, and backpacks** that sat in an infested place'
			]
		},
		{
			heading: 'Keep bed bugs out of your home',
			fieldKey: 'prevent-bed-bugs',
			karl: 'Maps to a third Title and text block: Title = this heading, Text = the bulleted list below. Encasements and interceptors are from SF Environment\'s 2024 "Pest management in your home" handout; clear plastic bags when moving from the SF Environment / Pestec, Guidelines for IPM in San Francisco Multi-Family Housing Communities (2013; local copy docs/source/hhvc-policy/2026-07-07-pestec-ipm-multifamily-housing.pdf), Appendix I. Split on 2026-11-26 from one 7-item list: SF.gov keeps a bulleted list to 3 to 5 items (A-to-Z, Bullets). Split into home (this section) and travel. The fieldKey keeps this section\'s original ids.',
			kind: 'body',
			bullets: [
				'**Check used furniture before you bring it home.** Look closely at seams, cracks, and the underside.',
				'**Do not take furniture left on the curb.** It may have been thrown out because of bed bugs.',
				'**Use mattress and box spring encasements** and climb-up interceptor cups under the bed legs.',
				'**When you move, pack clothes in clear plastic bags** so you can see if anything is hiding.'
			]
		},
		{
			heading: 'Prevent bed bugs when you travel',
			karl: 'Maps to a Title and text block: Title = this heading, Text = the bulleted list below. Split on 2026-11-26 from one 7-item list: SF.gov keeps a bulleted list to 3 to 5 items (A-to-Z, Bullets).',
			kind: 'body',
			bullets: [
				'**Check hotel beds when you travel.** Look behind the headboard and along the mattress seams.',
				'**Wash and dry clothes on the hottest setting** as soon as you get home from a trip.',
				'**Keep luggage out of the bedroom**, such as in a hall closet.'
			]
		},
		{
			heading: 'Check for bed bugs',
			image: {
				src: '/images/mockup/bed-bug-adult.webp',
				alt: 'An adult bed bug, reddish brown with a flat oval body, feeding on a person’s arm.',
				width: 1280,
				height: 853,
				credit: {
					title: 'Adult bed bug, Cimex lectularius',
					creator: 'CDC / Piotr Naskrecki',
					sourceUrl: 'https://commons.wikimedia.org/wiki/File:Adult_bed_bug,_Cimex_lectularius.jpg',
					license: 'Public domain'
				}
			},
			karl: 'Maps to a fourth Title and text block: Title = this heading, Text = the two paragraphs plus the bulleted list below. Then an Information section → Image block right after it, holding the bed bug photo: the page tells readers to find the bugs themselves, and a photo of an adult is what makes "reddish brown and flat" recognizable. Upload the 1280×853 file (Information images need 700px+ wide, shown uncropped) with the alt text as written. Source: CDC Public Health Image Library #9820, public domain — no attribution required, but add "Photo: CDC / Piotr Naskrecki" if the block offers a caption. Outlet covers as a hiding spot is an HHVC decision 2026-11-26. The 10-to-20-foot range and electronics hiding spots are from the SF Environment / Pestec, Guidelines for IPM in San Francisco Multi-Family Housing Communities (2013; local copy docs/source/hhvc-policy/2026-07-07-pestec-ipm-multifamily-housing.pdf), Appendix I (Bed Bug FAQ).',
			kind: 'body',
			paragraphs: [
				'Bites alone cannot tell you it is bed bugs. Bites from fleas, mosquitoes, and bed bugs look alike. The only way to know is to find the bugs or their signs.',
				'Most bed bugs hide in or near the bed, so check there first. Use a flashlight on the mattress seams and bed frame, then check nearby furniture and cracks along the walls.'
			],
			bullets: [
				'**Small dark spots** on sheets or the mattress. These are bed bug droppings.',
				'**Small blood spots** on sheets',
				'**Tiny pale shells** that bed bugs shed as they grow',
				'**Live bugs**, which are reddish brown and flat',
				'**Hiding spots farther away**, like couch cushions, behind outlet covers, and electronics such as clocks, radios, and TVs. Bed bugs can be 10 to 20 feet from where people sleep or sit.'
			]
		},
		{
			heading: 'If you think you have bed bugs',
			karl: 'Maps to a fifth Title and text block: Title = this heading, Text = the paragraph plus the bulleted list below. The 72-hour rule matches the wording already used on the insectsReport and rodentsReport Transaction pages. The label-before-discarding bullet matches the SFDPH tenant guidelines (treat, bag, and label as bed bug infested) and the SF Environment / Pestec, Guidelines for IPM in San Francisco Multi-Family Housing Communities (2013; local copy docs/source/hhvc-policy/2026-07-07-pestec-ipm-multifamily-housing.pdf), Appendix I.',
			kind: 'body',
			paragraphs: [
				'If you rent, tell your landlord or building manager in writing right away. Bed bugs spread quickly, so do not wait.'
			],
			bullets: [
				{
					text: '**Owners must act fast.** Your landlord must hire a licensed pest control company within 2 working days of your report. The company inspects your unit and the units next to it.',
					unverified: true,
					unverifiedReason:
						"From the SFDPH bed bug Director's Rules, Owner 2.4-2.6 (docs/source/hhvc-policy/2026-07-02-bed-bug-directors-rules-tenant-guidelines.md): within two working days of the tenant's complaint, contract a PCO to inspect the unit and adjacent units. This is the bed bug timeline, distinct from the general 72-hour owner investigation (see the v4 gap analysis, 'Three distinct timelines'). Confirm it still reads the same in the v4 Director's Rules draft before publication."
				},
				'**Do not throw furniture away yet.** Moving infested items can spread bed bugs to other units. Wait until the pest control company tells you what to do.',
				'**Label anything you throw out.** Seal it in plastic and mark it "infested with bed bugs" so no one takes it home.',
				'**Do not use bug bombs or foggers.** They do not kill bed bugs hiding in cracks, and they can push bugs into other rooms.',
				'**Report it to the City** if your landlord does not start fixing the problem within 72 hours. [Report bed bugs](bedBugReport)'
			]
		},
		{
			heading: 'What tenants need to do for treatment',
			fieldKey: 'what-tenants-need-to-do-before-treatment',
			karl: "Maps to a sixth Title and text block: Title = this heading, Text = the paragraph plus the bulleted list below. On 2026-11-26 'Let them in' and 'Make space' were removed: they apply to every treatment, and the linked treatment page says both. Paraphrases SFDPH Tenant Guidelines for Unit Preparation Prior to Bed Bug Treatment (Director's Rules Tenant 3.1-3.4). Dryer time is 45 minutes by HHVC decision 2026-11-26, following SF Environment's 2024 'Pest management in your home' handout; the 2012-era Director's Rules Tenant 3.4 states 30 minutes as the minimum. The 4-week monitoring bullet is also an HHVC decision 2026-11-26, consistent with bed bug Director's Rules Owner 6.1 (monitoring devices used for at least four weeks). The Callout below is its own Callout stream item. On 2026-11-26 the list went from 7 items to 5: the Prepare your unit link became a paragraph of its own, and the monitors bullet, which is about after treatment, joined \"Wait until you are cleared\" word for word. The heading says \"for treatment\" for that reason; the fieldKey keeps the original ids.",
			kind: 'body',
			paragraphs: [
				'Treatment only works if the unit is ready. The pest control company will give you a checklist. If it is different from the list below, follow their checklist.',
				'[What to expect when your building is treated for pests](pestTreatmentInfo)'
			],
			bullets: [
				'**Do not remove items before treatment.** Only take out bagged clothing for laundry, or items the pest control company tells you to remove.',
				'**Wash and dry all clothing and bedding.** Use hot water and the hottest dryer setting for at least 45 minutes. Then store it in new, clean, sealed plastic bags.',
				'**Wait until you are cleared.** Do not move back in until the pest control company says it is safe. Leave bed bug monitors in place for 4 weeks after the last treatment. They show whether the bed bugs are gone.'
			],
			callout: {
				karl: 'Maps to its own Callout stream item (a sibling of the Title and text item above). Single rich text field only, no separate title field — this callout has none, so no mismatch.',
				variant: 'info',
				text: 'If you cannot do these steps because of a disability or a medical need, tell your landlord as soon as you can. You can ask for help preparing your unit or doing laundry.'
			}
		},
		{
			heading: 'What owners and managers need to do',
			karl: "Maps to a seventh Title and text block: Title = this heading, Text = the paragraph plus the bulleted list below. On 2026-11-26 the advance-notice bullet was removed: it applies to every treatment and the treatment page owns it; the paragraph links there. Paraphrases Director's Rules Owner 3.3-3.5 as quoted in the SFDPH tenant guidelines. The 4-week monitoring bullet is an HHVC decision 2026-11-26, and matches bed bug Director's Rules Owner 6.1 (monitoring devices used for at least four weeks to confirm effective treatment).",
			kind: 'body',
			paragraphs: [
				'Bed bugs need more from owners than other pests. The duties for every treatment, like notice before pesticides, are on [What to expect when your building is treated for pests](pestTreatmentInfo).'
			],
			bullets: [
				'**Give tenants sealable plastic bags** for clothing before and after it is washed.',
				'**Share a list of free and low-cost help** for unit preparation and laundry.',
				{
					text: '**Arrange reasonable accommodations** for tenants with a documented disability, such as help preparing the room or a different treatment method.',
					unverified: true,
					unverifiedReason:
						'Director\'s Rules Owner 3.5 ("to the extent required by applicable City and County, State and Federal law"). Confirm the scope of this duty with HHVC and the City Attorney before publication.'
				},
				'**Keep monitoring for 4 weeks after the last treatment.** Use bed bug monitors, such as interceptor cups under the bed legs, to check that the bed bugs are gone.'
			]
		},
		{
			heading: 'Learn more about bed bugs',
			karl: "Maps to an eighth Title and text block: Title = this heading, Text = the paragraph plus the bulleted list below. Each bullet carries a Link-tool External link folded into this block's rich text — the verified Information schema has no external-URL card, so links are kept inline rather than as cards.",
			kind: 'placement',
			paragraphs: [
				'The University of California Statewide Integrated Pest Management Program (UC IPM) publishes detailed, science-based guides.'
			],
			bullets: [
				'[UC IPM: Bed bugs](https://ipm.ucanr.edu/home-and-landscape/bed-bugs/). How to identify, find, and control bed bugs.',
				'[CDC: About bed bugs](https://www.cdc.gov/bed-bugs/about/index.html). Bites, health risks, and prevention.',
				'[EPA: Bed bugs](https://www.epa.gov/bedbugs). Federal guidance on finding and treating bed bugs.',
				'[UC IPM: Hiring a pest control company](https://ipm.ucanr.edu/home-and-landscape/hiring-a-pest-control-company/). Questions to ask before you hire.',
				'[SF Environment: Pest management in your home (PDF)](https://www.sfenvironment.org/media/13819). A handout in English, Spanish, and Chinese.',
				'[UC IPM: Recursos en español](https://ipm.ucanr.edu/IPMPROJECT/recursos-espanol.html). Guías sobre plagas en español.'
			]
		},
		{
			heading: 'Related pages',
			component: 'related',
			karl: 'Maps to the Related field: a generic unrestricted page picker, repeatable.',
			kind: 'placement',
			cards: [
				{
					title: 'Report bed bugs',
					target: 'bedBugReport'
				},
				{
					title: 'What to expect when your building is treated for pests',
					target: 'pestTreatmentInfo'
				},
				{
					title: 'Tenant rights when reporting housing conditions',
					target: 'tenantRights'
				}
			]
		}
	],
	seoTitle: 'Bed bugs: prevent, find, and prepare | SF.gov',
	metaDescription:
		'How to prevent and check for bed bugs in San Francisco, and what tenants and owners must do before treatment.'
};
