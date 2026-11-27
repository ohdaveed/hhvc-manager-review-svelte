export const stepPestReport = {
	slug: 'sf.gov/step-by-step/report-a-pest-problem',
	type: 'Step by step',
	title: 'Report a pest problem, start to finish',
	summary: 'Follow a 311 report from filing through inspection, notice, and re-inspection.',
	reading: 'Grade 7',
	proposed: true,
	editorNote:
		'PROPOSED PAGE — not in the current 29. Drafted from `design/HHVC Page Ideas.dc.html`, which argues this is one of the four that change the most for a reader. Step by step is the type Karl documents for "a process that unfolds over weeks with a deadline at each stage", and it is the only type whose Step block carries a Transaction link chooser — which is what lets this page stay an overview and send the detail to the existing Transaction pages rather than restating them. Nothing here states a timeline the corpus has not already established: the 72-hour landlord wait is linked to Tenant rights rather than restated, and no inspection, correction or re-inspection interval is given a number, because none is confirmed. Every step that names a duration says what governs it instead. Step by step has no page-level cost and no things_to_know, so the audience sits in Intro rather than in a What-to-know entry.',
	editorStatus: 'needs-review',
	sections: [
		{
			heading: 'Who this information is for',
			karl: 'Maps to the Intro panel — Step by step has no things_to_know, so this is the free-text slot before the steps and the right home for an audience line. The live pattern is sf.gov/manage-covid-19-schools-childcare-and-youth-programs, which titles it "Who this information is for" and lists the audiences as bullets.',
			kind: 'body',
			component: 'intro',
			paragraphs: [
				'Follow one pest report from the day you file it until the case closes. Each stage links to its own page for the details.'
			],
			bullets: [
				'Tenants and residents who have reported a problem',
				'Property owners and managers responding to a report',
				'Advocates, family members, and helpers following a case'
			]
		},
		{
			heading: 'What to do',
			karl: 'Maps to the repeatable Steps panel. Each step below is one Step block with step_type "number", a Title, and a rich-text Step description. Optional, Cost and Time stay blank — none has a confirmed case-independent value. The Transaction link on each step is the field that makes this an overview rather than a duplicate: it points at the page that already holds the detail.',
			kind: 'body',
			steps: [
				{
					title: 'Report the problem to 311',
					text: [
						'Start with 311. Pick the report that matches what you have seen. The condition decides which team responds, not the building.'
					],
					bullets: [
						'[Report rats or mice](rodentsReport)',
						'[Report animal waste on a property](animalWasteReport)',
						'[Report bed bugs](bedBugReport)',
						'[Report cockroaches or other insects](insectsReport)',
						'[Report mosquitoes or standing water](mosquitoReport)',
						'[Report pigeon droppings, nesting, or feeding](pigeonReport)',
						'[Report a sewage leak or backup](sewageReport)',
						'[Report mold](moldReport)',
						'[Report garbage, clutter, or overgrown plants](garbageReport)',
						'You can report a building you do not live in, and you can report on behalf of someone else.',
						'If you rent, tell your landlord first, unless the problem is urgent. [Tenant rights when reporting housing conditions](tenantRights) explains how long to wait.'
					],
					karl: 'Step 1. Step description: one Text block holding the paragraph and the bullets, whose rich-text Link tool carries the nine condition report pages as Internal links (report regroup, 2026-11-25). Transaction link: the reporting page closest to the reader — set per case, or left blank because nine apply here.'
				},
				{
					title: 'Check what Healthy Housing can inspect',
					text: [
						'Not every housing problem belongs to this team. Checking first is faster than being routed twice.'
					],
					bullets: [
						'[Learn what Healthy Housing and Vector Control can inspect](scopeInfo)',
						'Heat, water service, wiring, and structural repairs belong to other departments.'
					],
					karl: 'Step 2. Optional: checked — a reader who already knows the scope can skip it. Transaction link: none; scopeInfo is an Information page, and the Transaction link chooser takes Transaction pages only.'
				},
				{
					title: 'Get ready for the inspection',
					text: [
						'An inspector will look at the conditions you reported. Being ready shortens the visit and avoids a second one.'
					],
					bullets: [
						{
							text: 'Clear a path to the area you reported so an inspector can see the condition.',
							unverified: true,
							unverifiedReason:
								'What specifically an inspector needs access to has no tier-1 source. Confirm with HHVC before publication.'
						},
						'If you gave contact information, an inspector may contact you to ask questions or schedule a visit.',
						{
							text: 'Have photos of the condition ready, dated if possible.',
							unverified: true,
							unverifiedReason:
								'Whether photos help an inspection, and any specific format HHVC prefers, has no tier-1 source. Confirm with HHVC before publication.'
						},
						{
							text: 'Keep any messages with a property owner or manager about the problem.',
							unverified: true,
							unverifiedReason:
								'Whether HHVC uses prior tenant-to-owner communication during an inspection has no tier-1 source. Confirm with HHVC before publication.'
						},
						{
							text: 'An inspector may look at the condition you reported and nearby areas that could be related.',
							unverified: true,
							unverifiedReason:
								'The scope of what an inspector checks beyond the reported condition has no tier-1 source. Confirm with HHVC before publication.'
						},
						'If you did not give contact information, an inspection may still happen without notice.',
						'[Find your Healthy Housing inspector by neighborhood](inspectorLookup)'
					],
					karl: 'Step 3. Transaction link: none. Get ready for a housing inspection after you report folded into this step (C1, decided Nov 24, 2026) and is removed; its checklist is the bullets, each unverified line still flagged. Until 2026-11-25 this step also said "If you rent, give 72 hours notice when you can before anyone enters a unit." That misread the old garbage page\'s landlord rule (tell the owner first and allow 72 hours before reporting) as an entry-notice rule, so it is removed; the landlord pointer now sits in step 1, linking Tenant rights.'
				},
				{
					title: 'Read what the inspection found',
					text: [
						'After the visit you find out whether a violation was written. You also learn what it covers and who must correct it.'
					],
					bullets: [
						'[What happens after you report a housing or pest problem](afterReport)',
						'A notice can name an owner, a manager, a tenant, or more than one party.',
						'[Health Code Article 11 in plain language](article11Guide)'
					],
					karl: 'Step 4. Transaction link: none; afterReport is an Information page.'
				},
				{
					title: 'Follow the correction work',
					text: ['The notice sets what must be corrected and by when.'],
					bullets: [
						'[Correct a violation and close your case](stepCorrectViolation)',
						'[What tenants need to do after a Notice of Violation](tenantNoticeSteps)'
					],
					karl: 'Step 5. Transaction link: none. noticeOfViolation merged into the Correct a violation Step by step (C1), which the first bullet links; the Transaction link chooser takes Transaction pages only. No interval is stated here on purpose — the correction period is set per notice and the corpus has no confirmed default.'
				},
				{
					title: 'Confirm the work is done',
					text: [
						'A case closes when the cited conditions are corrected and that has been confirmed. A follow-up inspection may be needed first.'
					],
					bullets: [
						'Steps 5 and 6 of [Correct a violation and close your case](stepCorrectViolation) cover proof of the work and the re-inspection.'
					],
					karl: 'Step 6. Transaction link: none. Get ready for a follow-up inspection folded into Steps 5 and 6 of the Correct a violation Step by step (C1) and is removed. This step is where the proposed "Tell us your violation is fixed" Transaction would attach if it is built — the plan lists it separately and it belongs here as detail, not as a sibling page.'
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
	seoTitle: 'Report a pest problem, start to finish | SF.gov',
	metaDescription:
		'Follow a 311 pest report through inspection, notice, and re-inspection, with the page for each stage.'
};
