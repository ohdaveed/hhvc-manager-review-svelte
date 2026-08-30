export const stepPestReport = {
	slug: 'sf.gov/step-by-step/report-a-pest-problem',
	type: 'Step by step',
	title: 'Report a pest problem, start to finish',
	summary: 'Follow a 311 report from filing through inspection, notice, and re-inspection.',
	audience: [
		'A tenant who has reported a pest problem and does not know what happens next',
		'A property owner or manager whose building has been reported',
		'An advocate or helper following a case for someone else'
	],
	reading: 'Grade 7',
	editorNote:
		'PROPOSED PAGE — not in the current 29. Drafted from `design/HHVC Page Ideas.dc.html`, which argues this is one of the four that change the most for a reader. Step by step is the type Karl documents for "a process that unfolds over weeks with a deadline at each stage", and it is the only type whose Step block carries a Transaction link chooser — which is what lets this page stay an overview and send the detail to the existing Transaction pages rather than restating them. Nothing here states a timeline the corpus has not already established: the 72-hour entry notice is carried from `filthReport`, and no inspection, correction or re-inspection interval is given a number, because none is confirmed. Every step that names a duration says what governs it instead. Step by step has no page-level cost and no things_to_know, so the audience sits in Intro rather than in a What-to-know entry.',
	editorStatus: 'needs-review',
	sections: [
		{
			heading: 'Who this information is for',
			karl: 'Maps to the Intro panel — Step by step has no things_to_know, so this is the free-text slot before the steps and the right home for an audience line. The live pattern is sf.gov/manage-covid-19-schools-childcare-and-youth-programs, which titles it "Who this information is for" and lists the audiences as bullets.',
			kind: 'body',
			component: 'intro',
			paragraphs: [
				'This page follows one pest report from the moment you file it to the moment the case closes. It links to the page for each stage rather than repeating it.'
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
						'Start with 311. Pick the report that matches what you have seen — the condition decides which team responds, not the building.'
					],
					bullets: [
						'[Report rats, mice, and other four-legged problems](rodentsReport)',
						'[Report cockroaches, mosquitoes, and other insects](insectsReport)',
						'[Report garbage, mold, and overgrown vegetation](filthReport)',
						'[Report a problem in an SRO or hotel](sroHotelReport)',
						'You can report a building you do not live in, and you can report on behalf of someone else.'
					],
					karl: 'Step 1. Step description: one Text block holding the paragraph and the bullets, whose rich-text Link tool carries the four reporting pages as Internal links. Transaction link: the reporting page closest to the reader — set per case, or left blank because four apply here.'
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
						'An inspector will look at the conditions you reported. Being ready shortens the visit and avoids a second one.',
						'If you rent, give 72 hours notice when you can before anyone enters a unit.'
					],
					bullets: ['[Get ready for a housing inspection after you report](inspectionPrepInitial)'],
					karl: 'Step 3. Transaction link: inspectionPrepInitial. The 72-hour line is carried verbatim from filthReport rather than restated, so the two pages cannot drift.'
				},
				{
					title: 'Read what the inspection found',
					text: [
						'After the visit you find out whether a violation was written, what it covers, and who is responsible for correcting it.'
					],
					bullets: [
						'[What happens after you report a housing or pest problem](afterReport)',
						'A notice can name an owner, a manager, a tenant, or more than one party.'
					],
					karl: 'Step 4. Transaction link: none; afterReport is an Information page.'
				},
				{
					title: 'Follow the correction work',
					text: [
						'The notice sets what has to be corrected and by when. That deadline comes from the notice, not from this page.'
					],
					bullets: [
						'[Fix your Healthy Housing and Vector Control violation](noticeOfViolation)',
						'[What tenants need to do after a Notice of Violation](tenantNoticeSteps)'
					],
					karl: 'Step 5. Transaction link: noticeOfViolation. No interval is stated here on purpose — the correction period is set per notice and the corpus has no confirmed default.'
				},
				{
					title: 'Confirm the work is done',
					text: [
						'A case closes when the cited conditions are corrected and that has been confirmed. A follow-up inspection may be needed first.'
					],
					bullets: ['[Get ready for a follow-up inspection](inspectionPrepFollowup)'],
					karl: 'Step 6. Transaction link: inspectionPrepFollowup. This step is where the proposed "Tell us your violation is fixed" Transaction would attach if it is built — the plan lists it separately and it belongs here as detail, not as a sibling page.'
				}
			]
		},
		{
			heading: 'Related pages',
			karl: 'Maps to Related. Each card publishes the destination page’s own title — nothing typed here appears.',
			kind: 'body',
			cards: [
				{ title: 'Tenant rights when reporting housing conditions', target: 'tenantRights' },
				{ title: 'Health Code Article 11 in plain language', target: 'article11Guide' },
				{ title: 'Find your Healthy Housing inspector by neighborhood', target: 'inspectorLookup' }
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
