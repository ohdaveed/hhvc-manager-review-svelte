export const appealNotice = {
	slug: 'sf.gov/appeal-a-notice-of-violation',
	type: 'Transaction',
	title: 'Appeal a Notice of Violation',
	summary:
		'Request a Director’s Hearing if you disagree with a Healthy Housing and Vector Control violation.',
	audience: [
		'A property owner or manager who disagrees with a notice',
		'A tenant named on a notice who disputes what it says',
		'Someone who believes a notice names the wrong party'
	],
	primaryAgency: 'Healthy Housing and Vector Control',
	reading: 'Grade 7',
	editorNote:
		'PROPOSED PAGE — not in the current 29. `design/HHVC Page Ideas.dc.html` opens its Transaction list with this one: the existing set covers reporting a problem and looking up a record, and nothing covers what happens after an inspector arrives. NO DEADLINE, FEE OR PROCEDURAL STEP IS INVENTED HERE. The appeal window, the form, and what a hearing costs are all unconfirmed, and each is written as "the notice tells you" rather than given a value — `noticeOfViolation` already takes that approach for the same reason and explicitly warns against adding appeal requirements without HHVC and legal review. ONE STRUCTURAL FLAG FOR DIGITAL SERVICES: a Director’s Hearing is a *Meeting* in Karl — something a person attends, not something they apply for — so the hearing itself should be a Meeting page this Transaction links to, not a section of this page. That split is the reason this page stops at "request one" and does not describe the hearing. The audience sits in Things to know as "Who this information is for", matching the live pattern on sf.gov/manage-covid-19-schools-childcare-and-youth-programs, and it takes one of the two entries the Help Center allows.',
	editorStatus: 'needs-review',
	whatToKnow: {
		cost: 'Not confirmed — see the editor note',
		thingsToKnow: [
			{
				label: 'Who this information is for',
				text: 'Anyone named on a Healthy Housing and Vector Control Notice of Violation who disagrees with it — an owner, a manager, or a tenant.'
			},
			{
				label: 'Appealing does not pause the deadline',
				text: 'Unless your notice says otherwise, the correction deadline on it still applies while an appeal is pending. Check the notice.'
			}
		]
	},
	sections: [
		{
			heading: 'What to do',
			karl: 'Maps to the repeatable What to Do panel, each step a Section with a Title and one Text block. No step carries a Cost or Time value — none is confirmed.',
			kind: 'body',
			steps: [
				{
					title: 'Read what the notice says about appealing',
					text: [
						'Your notice sets out how to dispute it and by when. Those instructions govern; this page does not set a deadline of its own.'
					],
					bullets: [
						'Look for the appeal or hearing instructions and the date they run to.',
						'Note the investigator named on the notice.'
					],
					karl: 'Section 1. Deliberately defers the whole procedure to the notice, because the appeal window is not a confirmed fact in this corpus.'
				},
				{
					title: 'Talk to the investigator first',
					text: [
						'Many disputes are about what a notice covers or who it names, and those can be settled without a hearing.'
					],
					bullets: [
						'Ask what condition was cited and what evidence it rests on.',
						'Say so straight away if you believe the notice names the wrong party.',
						'A conversation does not extend your deadline unless the investigator says it does.'
					],
					karl: 'Section 2.'
				},
				{
					title: 'Request a Director’s Hearing',
					text: [
						'If the disagreement stands, ask for a Director’s Hearing using the instructions on your notice.'
					],
					bullets: [
						'Say which cited condition you dispute, and why.',
						'Bring dated photos, receipts, and treatment reports.',
						'PLACEHOLDER: the request form or address, and any fee, are not confirmed.'
					],
					karl: 'Section 3. STRUCTURAL FLAG — the hearing is a Meeting in Karl, not part of this Transaction. Transaction has no per-step page link, so the route to that Meeting page is a page-level Related entry once it exists, or a link placed with the rich-text Link tool inside this Section. This page should never grow a "what happens at the hearing" section.'
				},
				{
					title: 'Keep correcting what you do not dispute',
					text: [
						'A notice can cite several conditions. Disputing one does not put the others on hold.'
					],
					bullets: [
						'[Correct a violation and close your case](stepCorrectViolation)',
						'[Fix your Healthy Housing and Vector Control violation](noticeOfViolation)'
					],
					karl: 'Section 4. This is the step that prevents the most common expensive mistake — treating an appeal as a pause on the whole notice.'
				}
			]
		},
		{
			heading: 'Related pages',
			karl: 'Maps to Related. Cards publish the destination page’s own title.',
			kind: 'body',
			cards: [
				{ title: 'Pay a Healthy Housing citation', target: 'payCitation' },
				{ title: 'Health Code Article 11 in plain language', target: 'article11Guide' },
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
	seoTitle: 'Appeal a Notice of Violation | SF.gov',
	metaDescription:
		'Request a Director’s Hearing if you disagree with a Healthy Housing and Vector Control violation.'
};
