export const payCitation = {
	slug: 'sf.gov/pay-a-healthy-housing-citation',
	type: 'Transaction',
	title: 'Pay a Healthy Housing citation',
	summary:
		'Pay a penalty issued after an uncorrected Notice of Violation or a missed re-inspection.',
	audience: [
		'A property owner or manager who received a citation',
		'A billing or accounts contact paying on an owner’s behalf',
		'Someone who received a citation and believes it is wrong'
	],
	primaryAgency: 'Healthy Housing and Vector Control',
	reading: 'Grade 7',
	editorNote:
		'PROPOSED PAGE — not in the current 29. THE CITATION AMOUNT IS ONE OF THE FOUR FACTS `design/HHVC Page Ideas.dc.html` FLAGS AS A PLACEHOLDER, and it is not supplied here. No dollar figure, no penalty schedule, no late interest and no payment deadline appears on this page, because none of them is confirmed anywhere in the corpus, and a plausible-looking number on a payment page is the worst possible invention — a reader would act on it. Every one is written as "your citation says". This is distinct from `payFee`, which is the ANNUAL Healthy Housing fee owed by buildings with three or more rental units; a citation is a penalty after enforcement, and the two are separated so neither reads as the other. The audience takes one of the two Things to know entries, matching the live pattern on sf.gov/manage-covid-19-schools-childcare-and-youth-programs.',
	editorStatus: 'needs-review',
	whatToKnow: {
		cost: 'PLACEHOLDER — the citation amount is set on the citation and is not confirmed for this page',
		thingsToKnow: [
			{
				label: 'Who this information is for',
				text: 'A property owner, manager, or billing contact who has received a Healthy Housing and Vector Control citation.'
			},
			{
				label: 'Paying is not the same as fixing',
				text: 'A citation is a penalty. Paying it does not correct the cited condition or close the violation — the work still has to be done.'
			}
		]
	},
	sections: [
		{
			heading: 'What to do',
			karl: 'Maps to the repeatable What to Do panel. Cost is left blank on every step: the amount is per citation and is not a case-independent value.',
			kind: 'body',
			steps: [
				{
					title: 'Read your citation',
					text: [
						'The citation names the amount, the date it is due, and how to pay. Those are the figures that apply — this page does not repeat them.'
					],
					bullets: [
						'Check which cited condition the penalty relates to.',
						'Check the case or notice number; you will need it to pay.'
					],
					karl: 'Section 1.'
				},
				{
					title: 'Pay by the date on the citation',
					text: ['Use the payment method your citation gives.'],
					bullets: [
						'PLACEHOLDER: the payment channels — online, by mail, in person — are not confirmed.',
						'Quote the case or notice number so the payment reaches the right case.',
						'[Environmental Health office](ehOffice)'
					],
					karl: 'Section 2. Transaction link: none until a confirmed payment destination exists. The Location page is linked for the in-person and postal route rather than an address being restated here.'
				},
				{
					title: 'Correct the condition as well',
					text: [
						'The violation stays open until the cited conditions are corrected and confirmed, whether or not the citation is paid.'
					],
					bullets: [
						'[Correct a violation and close your case](stepCorrectViolation)',
						'[Get ready for a follow-up inspection](inspectionPrepFollowup)'
					],
					karl: 'Section 3. The point the whole page exists to make, so it is a step rather than a footnote.'
				},
				{
					title: 'If you think the citation is wrong',
					text: [
						'Dispute it using the instructions on the citation. Do not simply withhold payment.'
					],
					bullets: [
						'[Appeal a Notice of Violation](appealNotice)',
						'Contact the investigator named on your notice before the due date.'
					],
					karl: 'Section 4. No appeal window is stated — the same reason as appealNotice, where the deadline is deferred to the document.'
				}
			]
		},
		{
			heading: 'Related pages',
			karl: 'Maps to Related. Cards publish the destination page’s own title. payFee is included specifically so a reader who has landed here about their annual fee can leave for the right page.',
			kind: 'body',
			cards: [
				{
					title: 'Pay your annual Healthy Housing fee for apartment buildings',
					target: 'payFee'
				},
				{ title: 'Appeal a Notice of Violation', target: 'appealNotice' },
				{ title: 'Article 11 compliance for property owners', target: 'article11Compliance' }
			]
		}
	],
	partnerAgencies: [
		{
			title: 'Environmental Health',
			url: 'https://www.sf.gov/departments--department-public-health--environmental-health'
		}
	],
	seoTitle: 'Pay a Healthy Housing citation | SF.gov',
	metaDescription:
		'Pay a penalty issued after an uncorrected Notice of Violation or a missed re-inspection.'
};
