export const mosquitoControl = {
	slug: 'sf.gov/mosquito-control-program',
	type: 'Information',
	title: 'Mosquito Control Program',
	summary:
		'Learn about mosquito surveillance, catch-basin treatment, and where to report standing water.',
	audience: [
		'This page is for residents and property owners or managers dealing with standing water or mosquitoes.'
	],
	reading: 'Grade 7',
	editorNote:
		'SF.gov landing page for Vector Control / Mosquito Control Program resources. Primary CTA opens SFMosquito.org. Verify phone numbers and external URLs before publication. 2026-11-25 (report regroup, Decided Nov 24, 2026): the "Report mosquitoes or standing water" task section is removed, and the page links to the new Report mosquitoes or standing water Transaction instead. That section carried the unverified 415-252-3806 program number, which goes with it; confirm the program line with HHVC if the number is wanted back.',
	sections: [
		{
			heading: 'What the program does',
			karl: 'Maps to an "Information section" → Title and text block: Title = this heading, Text = the two paragraphs below.',
			kind: 'body',
			paragraphs: [
				'The San Francisco Mosquito Control Program is part of Healthy Housing and Vector Control. The program monitors mosquito activity and treats catch basins and standing water when appropriate. It also responds to reports that may affect public health.',
				'Mosquitoes can spread diseases such as West Nile virus. Reducing standing water around homes and buildings is the most effective way to prevent breeding.'
			]
		},
		{
			heading: 'More mosquito resources',
			karl: 'FLAG — unconfirmed, no clean mapping: this section has no paragraph/rich-text content of its own, only 3 external-URL cards. It doesn\'t fit "Related" (an internal-page-only chooser, no external URLs), and unlike other external-link cards on other pages there\'s no accompanying Title and text block whose rich text these could be folded into as Link-tool External links, since this section has nothing but a heading and cards. Raise this shape with Digital Services rather than assuming either a Title and text block (with no paragraph content to justify one) or a Related-field entry (wrong link type) applies.',
			kind: 'placement',
			cards: [
				{
					title: 'San Francisco Mosquito Control Program (SFMosquito.org)',
					text: 'Find program information, surveillance updates, and West Nile virus resources.',
					url: 'https://www.sfmosquito.org/',
					karl: 'External-URL card with no clean mapping in the verified Information schema — see section-level karl note above. Do not force this into "Related" (internal pages only) or invent a link block; flag for Digital Services.'
				},
				{
					title: 'West Nile virus information (California)',
					text: 'State guidance on West Nile virus risk, dead bird reporting, and prevention.',
					url: 'https://www.westnile.ca.gov/',
					karl: 'External-URL card with no clean mapping in the verified Information schema — same gap as the sibling card above; flag for Digital Services rather than forcing a "Related" or Title and text home.'
				},
				{
					title: 'Report a dead bird to the State',
					text: 'Dead birds help track West Nile virus. Report them to the State West Nile virus program.',
					url: 'https://westnile.ca.gov/report',
					karl: 'External-URL card with no clean mapping in the verified Information schema — same gap as the siblings above. Replaces the retired City dead-bird transaction page — the State runs this reporting line (manager decision at plan review).'
				}
			]
		},
		{
			heading: 'Prevent mosquitoes on your property',
			karl: 'This card-only section (no paragraph content, just internal-page cards) maps most cleanly to the Related field: a generic unrestricted "Page" chooser, repeatable, that accepts any page type (Information, Transaction, or Campaign, matching this section\'s mixed targets). Resolved schema gap: Related has no custom title/text per item.',
			kind: 'placement',
			cards: [
				{
					title: 'Free mosquito education workshop',
					target: 'mosquitoWorkshop'
				},
				{
					title: 'Report mosquitoes or standing water',
					target: 'mosquitoReport'
				}
			]
		}
	],
	seoTitle: 'Mosquito Control Program | SF.gov',
	metaDescription:
		'San Francisco mosquito control, catch-basin treatment, and how to report standing water or mosquito activity.'
};
