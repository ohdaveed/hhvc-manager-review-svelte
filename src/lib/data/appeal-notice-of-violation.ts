export const appealNotice = {
	slug: 'sf.gov/appeal-a-notice-of-violation',
	type: 'Transaction',
	title: 'Question a Notice of Violation',
	summary: 'Talk to the investigator named on your notice if you disagree with what it says.',
	audience: [
		'A property owner or manager who disagrees with a notice',
		'A tenant named on a notice who disputes what it says',
		'Someone who believes a notice names the wrong party'
	],
	primaryAgency: 'Healthy Housing and Vector Control',
	reading: 'Grade 7',
	editorNote:
		'PROPOSED PAGE — not in the current 29. REWRITTEN 2026-08-31 AFTER A CORRECTION FROM HHVC: there is no appeal process for a Notice of Violation. Questions and disagreements go to the investigator named on the notice. The earlier draft had readers requesting a Director’s Hearing and described an appeal window and a hearing cost; none of that exists. It was invented, and writing each unknown as "the notice tells you" disguised the invention rather than containing it — deferring the details of a right does not establish the right. Everything downstream of that premise is gone: the hearing step, the "appealing does not pause the deadline" entry, and the Karl structural flag about modelling a hearing as a Meeting. WHETHER THIS PAGE SHOULD EXIST AT ALL IS STILL OPEN — what remains is a short page telling a reader to call the person named on their notice, which `noticeOfViolation` already says in its own contact step, so this may be a duplicate rather than a gap. The slug still reads `appeal-a-notice-of-violation` and should change if the page survives; that means updating both seed files, `corpus.lock`, the sitemap test, and the production `pages` row added by `20260830210000`. The phrase "the investigator named on your notice" is carried verbatim from `noticeOfViolation` so the two cannot drift — note HHVC said "inspector" when correcting this and the corpus uses both words, so the term is worth settling.',
	editorStatus: 'needs-review',
	whatToKnow: {
		cost: 'No fee is charged for asking about a notice.',
		thingsToKnow: [
			{
				label: 'Who this information is for',
				text: 'Anyone named on a Healthy Housing and Vector Control Notice of Violation who disagrees with it — an owner, a manager, or a tenant.'
			},
			{
				label: 'Questions do not extend your deadline',
				text: 'The correction deadline on your notice still applies while you are asking about it, unless the investigator tells you otherwise.'
			}
		]
	},
	sections: [
		{
			heading: 'What to do',
			karl: 'Maps to the repeatable What to Do panel, each step a Section with a Section title and one Text block in Section specifics. Transaction carries no per-step cost, time or optional flag.',
			kind: 'body',
			steps: [
				{
					title: 'Find the investigator named on your notice',
					text: [
						'Your notice names the person who issued it. They are who to talk to about what it says.'
					],
					bullets: [
						'Note the investigator’s name and contact details.',
						'Note the correction deadline, which keeps running while you ask.'
					],
					karl: 'Section 1.'
				},
				{
					title: 'Tell them what you disagree with',
					text: [
						'Most disagreements are about what a notice covers or who it names, and the investigator can settle both.'
					],
					bullets: [
						'Ask what condition was cited and what evidence it rests on.',
						'Say so straight away if you believe the notice names the wrong party.',
						'Bring dated photos, receipts, and treatment reports if you have them.'
					],
					karl: 'Section 2. This is the whole page. HHVC confirmed on 2026-08-31 that there is no appeal or hearing route to describe after this step.'
				},
				{
					title: 'Keep correcting what you do not dispute',
					text: [
						'A notice can cite several conditions. Questioning one does not put the others on hold.'
					],
					bullets: [
						'[Correct a violation and close your case](stepCorrectViolation)',
						'[Fix your Healthy Housing and Vector Control violation](noticeOfViolation)'
					],
					karl: 'Section 3. This is the step that prevents the most common expensive mistake — treating a disagreement as a pause on the whole notice.'
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
	seoTitle: 'Question a Notice of Violation | SF.gov',
	metaDescription:
		'Talk to the investigator named on your notice if you disagree with a Healthy Housing and Vector Control violation.'
};
