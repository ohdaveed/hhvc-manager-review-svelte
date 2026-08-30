export const ehOffice = {
	slug: 'sf.gov/location/environmental-health-office',
	type: 'Location',
	title: 'Environmental Health office',
	summary: 'Visit, mail, or call the Healthy Housing and Vector Control team.',
	audience: [
		'Someone sending a document that cannot be filed online',
		'Someone who wants to speak to staff in person',
		'A property owner or manager delivering proof of correction'
	],
	reading: 'Grade 6',
	editorNote:
		'PROPOSED PAGE — not in the current 29, and the ninth Karl type, which the corpus has never used. `design/HHVC Page Ideas.dc.html` argues a team that sends people mail and takes walk-ins needs one, and it is the most straightforwardly missing page in the set. THE ADDRESS AND HOURS BELOW ARE PLACEHOLDERS AND MUST BE CONFIRMED BEFORE THIS PAGE SAVES — the source plan flags the office address as one of its four unverified facts. The phone numbers and email are NOT placeholders: 311, 415-252-3805 and ehb@sfdph.org are carried from `article11Compliance`, which already publishes them. Location was captured at panel level only, so its block internals are unknown; the karl notes below say which panel a section maps to and stop there rather than naming a block type the field map never recorded. Required markers were never measured on this type, so nothing here is marked required.',
	editorStatus: 'needs-review',
	contact: {
		phone: ['311 (call or text)', '415-252-3805'],
		email: ['ehb@sfdph.org'],
		other: ['Environmental Health — Healthy Housing and Vector Control']
	},
	sections: [
		{
			heading: 'Who this information is for',
			karl: 'Maps to the Intro panel. Location has no things_to_know, so this is where an audience line goes — the same shape as the Step by step pages.',
			kind: 'body',
			component: 'intro',
			paragraphs: [
				'Most Healthy Housing services do not need a visit. Report a problem through 311, and look up records online. Come here when something has to be handed over or posted.'
			],
			bullets: [
				'Sending a document that cannot be filed online',
				'Delivering proof that a violation was corrected',
				'Speaking to staff in person'
			]
		},
		{
			heading: 'Before you come in',
			karl: 'Maps to the Body panel. Placed above the address on purpose: the fastest outcome for most readers is not visiting, and a page that leads with an address invites a trip that a phone call would have saved.',
			kind: 'body',
			paragraphs: [
				'Reporting a problem, checking a record, and paying a fee are all quicker without a visit.'
			],
			bullets: [
				'[Report garbage, mold, and overgrown vegetation](filthReport)',
				'[Find complaints and inspection records](findRecords)',
				'[Pay your annual Healthy Housing fee for apartment buildings](payFee)',
				'Call 311 if you are not sure whether your problem needs a visit at all.'
			]
		},
		{
			heading: 'Address and hours',
			karl: 'Maps to the Body panel. In Karl this content belongs with the page’s address fields; Location was captured at panel level, so the exact block is not recorded and this note does not guess one.',
			kind: 'body',
			paragraphs: [
				'PLACEHOLDER — the street address, floor, and public counter hours are not confirmed and must be supplied before this page is published. Do not publish the page with this paragraph in it.'
			],
			bullets: [
				'PLACEHOLDER: street address and floor',
				'PLACEHOLDER: public counter hours, and whether an appointment is needed',
				'PLACEHOLDER: mailing address, if it differs from the street address',
				'PLACEHOLDER: accessible entrance and nearest transit'
			]
		},
		{
			heading: 'What you can do here',
			karl: 'Maps to the Services panel. Location has its own services field, like Agency — the field map calls that out specifically, which is why this is a Services section rather than more Body copy.',
			kind: 'body',
			component: 'services',
			cards: [
				{ title: 'Make a public records request', target: 'publicRecords' },
				{ title: 'Pay your annual Healthy Housing fee for apartment buildings', target: 'payFee' },
				{
					title: 'Find your Healthy Housing inspector by neighborhood',
					target: 'inspectorLookup'
				}
			]
		},
		{
			heading: 'Related pages',
			karl: 'Maps to Related locations if the destination is another Location page, and to the general related field otherwise. Both are panel-level capture only.',
			kind: 'body',
			cards: [
				{ title: 'Healthy Housing and Vector Control', target: 'aboutHhvcTeam' },
				{ title: 'Learn what Healthy Housing and Vector Control can inspect', target: 'scopeInfo' }
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
	seoTitle: 'Environmental Health office | SF.gov',
	metaDescription: 'Visit, mail, or call the Healthy Housing and Vector Control team.'
};
