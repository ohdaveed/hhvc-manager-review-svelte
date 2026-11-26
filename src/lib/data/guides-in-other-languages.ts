export const languageGuides = {
	slug: 'sf.gov/resource/guides-in-other-languages',
	type: 'Resource Collection',
	title: 'Guides in other languages',
	summary: 'Get pest, mold, and tenant rights guides in a language besides English.',
	reading: 'Grade 6',
	editorNote:
		'PROPOSED PAGE — not in the current 29. `design/HHVC Page Ideas.dc.html` observes that the three existing Resource Collections are organised by AUDIENCE, and proposes three organised by ARTIFACT — the downloads a person is sent to find after a phone call, which is the other way people arrive. THE LANGUAGE LIST IS ONE OF THE FOUR FLAGGED PLACEHOLDERS. The source plan names Spanish, Chinese, Filipino, Russian and Vietnamese; that list is carried below as a PROPOSAL and is not confirmed, so the summary deliberately says "languages other than English" rather than naming five. Which guides exist in which languages has to be checked before this page saves — publishing a language that has no document is worse than omitting it, because a reader travels to a dead end. The audience list was removed (2026-11-26): the introductory text already speaks to the reader, and Resource Collection has no things_to_know or intro panel to hold it.',
	editorStatus: 'needs-review',
	sections: [
		{
			heading: 'Find a guide in your language',
			fieldKey: 'about-these-guides',
			karl: 'Maps to Introductory text. Kept short — Resource Collection puts its weight in the Body, and a long preamble pushes the documents below the fold.',
			kind: 'body',
			paragraphs: [
				'These are the Healthy Housing guides that exist in languages other than English. If the guide you need is not here, call 311 and ask for an interpreter.'
			]
		},
		{
			heading: 'Pest and mold guides',
			karl: 'Maps to the Body panel → Documents block. Each card becomes an uploaded document carrying its own title and text (the document title, description and publish date), so the card copy is authored here, not inherited; Karl renders those as a styled list. PLACEHOLDER ENTRIES — no document is attached and no language is confirmed.',
			kind: 'body',
			cards: [
				{
					title: 'PLACEHOLDER: preventing rats and mice in the home',
					text: 'Languages not confirmed.'
				},
				{
					title: 'PLACEHOLDER: bed bug preparation instructions',
					text: 'Languages not confirmed.'
				},
				{
					title: 'PLACEHOLDER: mold and moisture in rental housing',
					text: 'Languages not confirmed.'
				}
			]
		},
		{
			heading: 'Tenant rights guides',
			karl: 'Maps to the Body panel → Documents block, grouped under its own subheader. As above, each card is a document with its own title and text. Documents and links can be grouped under subheaders, which is what keeps the two families apart on one page.',
			kind: 'body',
			cards: [
				{
					title: 'PLACEHOLDER: what to do when you report a housing condition',
					text: 'Languages not confirmed.'
				},
				{
					title: 'PLACEHOLDER: what a Notice of Violation means for a tenant',
					text: 'Languages not confirmed.'
				}
			]
		},
		{
			heading: 'Getting help in your language',
			karl: 'Maps to the Body panel → Resources block. This is a links group rather than a documents group, which is the distinction the Body chooser draws.',
			kind: 'body',
			paragraphs: [
				'You do not need a written guide to get help. Interpretation is available when you call, and for an inspection.'
			],
			bullets: [
				'Call 311 and say which language you need.',
				'Ask for an interpreter before an inspection, not on the day.',
				'[Tenant rights when reporting housing conditions](tenantRights)'
			]
		},
		{
			heading: 'Related pages',
			karl: 'Maps to the Custom section or to Related, depending on how Digital Services renders a card group here. Cards publish the destination page’s own title.',
			kind: 'body',
			cards: [
				{ title: 'Healthy housing conditions', target: 'healthyHousingTopic' },
				{ title: 'Who to call about a housing problem', target: 'whoToCall' },
				{ title: 'Report a pest problem, start to finish', target: 'stepPestReport' }
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
	seoTitle: 'Guides in other languages | SF.gov',
	metaDescription: 'Get pest, mold, and tenant rights guides in a language besides English.'
};
