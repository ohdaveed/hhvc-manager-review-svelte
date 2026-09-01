export const stepCorrectViolation = {
	slug: 'sf.gov/step-by-step/correct-a-violation-and-close-your-case',
	type: 'Step by step',
	title: 'Correct a violation and close your case',
	summary:
		'The steps from a Notice of Violation to a passed re-inspection, and who is responsible at each one.',
	audience: [
		'A property owner or manager who received a Notice of Violation',
		'A tenant with corrective actions listed on a notice',
		'A building operator coordinating repairs, treatment, or cleanup'
	],
	reading: 'Grade 7',
	editorNote:
		'PROPOSED PAGE — not in the current 29. This is the sequence `design/HHVC Page Ideas.dc.html` says is "scattered across four Transaction pages" today, with the reader left to assemble it. It is the page the four proposed post-inspection Transactions attach to: "Ask for more time" and "Tell us your violation is fixed" are steps here rather than sibling pages, which is how Karl documents Step by step working — an overview whose Step blocks carry a Transaction link to the detail. NO DEADLINE OR INTERVAL IS STATED. Every correction period comes from the individual notice, and the corpus has no confirmed default; steps say what governs the date instead of naming one. Party responsibility is split per step rather than pooled into one list, because this is the page an owner reads under deadline pressure and a mixed list is where someone reads past the line that was theirs.',
	editorStatus: 'needs-review',
	sections: [
		{
			heading: 'Who this information is for',
			karl: 'Maps to the Intro panel. Step by step has no things_to_know, so the audience line lives here.',
			kind: 'body',
			component: 'intro',
			paragraphs: [
				'This page is the whole arc of one case, from the notice arriving to the case closing. Each step says who is responsible for it.'
			],
			bullets: [
				'Property owners and managers named on a notice',
				'Tenants with actions listed on a notice',
				'Anyone coordinating the work on a building'
			]
		},
		{
			heading: 'What to do',
			karl: 'Maps to the repeatable Steps panel, step_type "number". Cost and Time stay blank throughout: a reinspection fee applies only in some cases and no confirmed amount exists, and every interval is set by the notice rather than by the process.',
			kind: 'body',
			steps: [
				{
					title: 'Read the notice and find your deadline',
					text: [
						'The notice lists the conditions to correct and the date they are due. That date governs everything below — this page does not set one.'
					],
					bullets: [
						'Check which actions are assigned to the owner, to the manager, and to a tenant.',
						'[Fix your Healthy Housing and Vector Control violation](noticeOfViolation)'
					],
					karl: 'Step 1. Transaction link: noticeOfViolation. Deliberately states that the deadline comes from the notice, so the page cannot go stale against a policy change.'
				},
				{
					title: 'Owners and managers: arrange the work',
					text: [
						'Work in shared areas, structural repairs, professional pest treatment, and garbage removal are the owner or manager’s to arrange.'
					],
					bullets: [
						'Use a licensed pest control operator when professional treatment is required.',
						'Do not wait on a tenant’s task before starting work you control.',
						'[Property owner responsibilities](ownerHub)',
						'[Integrated pest management for property owners and managers](ownerGuidance)'
					],
					karl: 'Step 2. Party-specific by design — the responsibilities are split across Steps 2 and 3 rather than combined in one bulleted list, so neither party has to filter the other’s work out of theirs.'
				},
				{
					title: 'Tenants: prepare the unit and allow access',
					text: [
						'Unit preparation and access are the tenant’s part. Treatment that cannot reach the unit does not close the violation.'
					],
					bullets: [
						'Follow the preparation instructions you were given before a treatment visit.',
						'Allow properly noticed access for inspection or work.',
						'[Prepare your unit for pest treatment](stepPrepUnit)',
						'[What tenants need to do after a Notice of Violation](tenantNoticeSteps)'
					],
					karl: 'Step 3. The companion half of Step 2. Links to the proposed unit-preparation Step by step, which holds the detail this step only summarises.'
				},
				{
					title: 'Ask for more time before the deadline, not after',
					text: [
						'If the work cannot be finished in time, contact the investigator named on the notice before the date passes.'
					],
					bullets: [
						'Ask early. A request made after the deadline is a different conversation.',
						'This page does not promise an extension — whether one is granted is the investigator’s call.'
					],
					karl: 'Step 4. This is where the proposed "Ask for more time to fix a violation" Transaction attaches as a Transaction link if it is built. The wording deliberately avoids promising an extension, matching noticeOfViolation, which was written not to.'
				},
				{
					title: 'Keep proof of the work',
					text: [
						'Photos, receipts, and pest treatment reports are what show the conditions were corrected.'
					],
					bullets: ['Keep records for every cited condition, not just the largest one.'],
					karl: 'Step 5. No retention period is stated: the corpus records a two-year figure elsewhere for a different obligation, and reusing it here would be an invention.'
				},
				{
					title: 'Pass the re-inspection',
					text: [
						'A follow-up inspection checks whether the cited conditions were corrected. The case closes when they have been.'
					],
					bullets: [
						'[Get ready for a follow-up inspection](inspectionPrepFollowup)',
						'One party finishing does not close the case while other cited conditions remain.'
					],
					karl: 'Step 6. Transaction link: inspectionPrepFollowup. This is where the proposed "Tell us your violation is fixed" Transaction attaches.'
				},
				{
					title: 'If it is not corrected',
					text: [
						'Further enforcement can follow an uncorrected notice. This can include a reinspection fee where one applies, a citation, or a Director’s Hearing.',
						'Follow the instructions and deadlines in any later notice you receive.'
					],
					bullets: [
						'[Question a Notice of Violation](appealNotice)',
						'[Pay a Healthy Housing citation](payCitation)'
					],
					karl: 'Step 7. Carried from noticeOfViolation’s own closing step, which took its wording from the Article 11 Interpretation Guide’s high-level workflow and intentionally omits unverified fee timing, hearing and abatement detail. The two links are proposed pages.'
				}
			]
		},
		{
			heading: 'Related pages',
			karl: 'Maps to Related. Cards publish the destination page’s own title.',
			kind: 'body',
			cards: [
				{ title: 'Health Code Article 11 in plain language', target: 'article11Guide' },
				{ title: 'Article 11 compliance for property owners', target: 'article11Compliance' },
				{ title: 'Tenant rights when reporting housing conditions', target: 'tenantRights' }
			]
		}
	],
	partnerAgencies: [
		{
			title: 'Environmental Health',
			url: 'https://www.sf.gov/departments--department-public-health--environmental-health'
		}
	],
	seoTitle: 'Correct a violation and close your case | SF.gov',
	metaDescription:
		'The steps from a Notice of Violation to a passed re-inspection, and who is responsible at each one.'
};
