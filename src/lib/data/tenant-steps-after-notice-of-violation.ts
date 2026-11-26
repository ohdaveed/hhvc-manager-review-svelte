export const tenantNoticeSteps = {
	slug: 'sf.gov/information/tenant-steps-after-notice-of-violation',
	type: 'Information',
	title: 'What tenants need to do after a Notice of Violation',
	summary: 'Learn your part when corrective actions are listed for your unit or building.',
	primaryAgency: 'Healthy Housing and Vector Control',
	reading: 'Grade 6',
	editorStatus: 'placeholder',
	editorNote:
		'New page expanding the tenant half of noticeOfViolation\'s shared "Make a plan to correct the conditions" step into dedicated depth, per docs/superpowers/specs/2026-08-11-hhvc-page-gap-additions-design.md. Reuses noticeOfViolation\'s already-verified statements (the notice does not change tenant habitability rights; contact the investigator named on the notice) rather than restating unsourced enforcement-timeline figures, which stay on afterReport. Unit-prep and access-notice specifics below are unconfirmed and flagged unverified. RETYPED 2026-11-25 from Transaction to Information (C1, decided Nov 24, 2026): it explains a tenant\'s part rather than offering an action with the City. Information has no Cost or Things to know, so "Free" is dropped, the retaliation line moves into "Know your rights during this process", and "Your Notice of Violation lists which actions apply to your unit" is already the first bullet below. Information has no steps container (U3), so the three steps become one bulleted Information section.',
	sections: [
		{
			heading: 'Who this information is for',
			karl: 'Maps to the first "Information section" → Title and text block: Title = this heading, Text = the bulleted list. The heading is the one sf.gov/manage-covid-19-schools-childcare-and-youth-programs gives an audience list (an H3 over bullets). This was the page-level `audience` field until 2026-11-26, when that field was retired; the transcript used to supply this block itself, so what goes into Karl is unchanged.',
			kind: 'body',
			bullets: [
				'A tenant with corrective actions listed on a Notice of Violation',
				'A tenant representative helping someone understand their next steps'
			]
		},
		{
			heading: 'Prepare your unit',
			karl: 'Maps to an Information section -> Title and text block: Title = this heading, Text = the bulleted list below. Before 2026-11-25 these were three what_to_do Sections on a Transaction; Information has no steps container (U3), so each step is now a bullet.',
			kind: 'body',
			bullets: [
				'Read your Notice of Violation to see which corrective actions are listed for your unit or a shared area.',
				{
					text: 'Clear the area that needs treatment or repair so the work can be completed.',
					unverified: true,
					unverifiedReason:
						'What "ready" specifically requires (e.g. removing furniture, bagging belongings) has no tier-1 source. Confirm with HHVC before publication.'
				},
				{
					text: 'Follow any preparation instructions from your property owner, manager, or HHVC.',
					unverified: true,
					unverifiedReason:
						'No tier-1 source confirms who is responsible for issuing unit-prep instructions in every case. Confirm with HHVC before publication.'
				},
				{
					text: 'Allow properly noticed access to your unit for scheduled treatment, repair work, or a follow-up inspection.',
					unverified: true,
					unverifiedReason:
						'The specific notice period a property owner must give a tenant before entry has no tier-1 source in this design pass. Confirm with HHVC before publication.'
				}
			]
		},
		{
			heading: 'Know your rights during this process',
			karl: "Maps to an Information section -> Title and text block. Reuses noticeOfViolation's already-verified habitability statement rather than restating it as new unverified content. The retaliation line came from the Transaction's Things to know, which Information does not have.",
			kind: 'body',
			paragraphs: [
				'A Notice of Violation does not change your right to safe and habitable housing.',
				'A property owner or manager cannot retaliate against you for reporting a condition.'
			],
			bullets: ['[Tenant rights when reporting housing conditions](tenantRights)']
		},
		{
			heading: 'If nothing happens by the deadline',
			karl: "Maps to an Information section -> Title and text block. Links forward to afterReport's enforcement chain instead of restating its unverified fee/hearing figures, per the design spec's explicit link-forward instruction.",
			kind: 'body',
			paragraphs: [
				'Contact the investigator named on your notice if the property owner or manager has not started the corrective work.'
			],
			bullets: [
				'[What happens after you report a housing or pest problem](afterReport)',
				'[Correct a violation and close your case](stepCorrectViolation)'
			]
		},
		{
			heading: 'Related pages',
			karl: 'Maps to the Related field: a generic unrestricted "Page" chooser, repeatable. The Fix your violation card went with that page (merged into the Step by step under C1); Karl\'s Related cannot hold a Step by step, so it is linked from the section above instead.',
			kind: 'placement',
			cards: [
				{
					title: 'Tenant rights when reporting housing conditions',
					target: 'tenantRights'
				},
				{
					title: 'What happens after you report a housing or pest problem',
					target: 'afterReport'
				}
			]
		}
	],
	seoTitle: 'What tenants need to do after a Notice of Violation | SF.gov',
	metaDescription:
		'Learn what to do as a tenant after a Healthy Housing and Vector Control Notice of Violation.'
};
