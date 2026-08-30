export const inspectionsAnnual = {
	slug: 'sf.gov/report/healthy-housing-inspections-annual-summary',
	type: 'Report',
	title: 'Healthy Housing inspections: annual summary',
	summary: 'Inspection counts, violation types, and re-inspection outcomes for the past year.',
	audience: [
		'A journalist or researcher looking for program figures',
		'A neighborhood or tenant organization tracking conditions',
		'City staff answering a question about volume'
	],
	reading: 'Grade 8',
	editorNote:
		'PROPOSED PAGE — not in the current 29. Report is the only Karl type that supports tables and the only one carrying a publication date, which is what makes it right for a figures page and wrong for the plain-language guide it is currently also used for (see `article11Guide`, where the type IS correct because that page is built from tables too). EVERY NUMBER IN THE TABLES BELOW IS A PLACEHOLDER. None is estimated, rounded, or carried over from another document — the cells read "PLACEHOLDER" rather than holding a figure, because a page of invented statistics is the single most damaging thing this corpus could publish, and a plausible number is harder to catch than an obvious gap. The table STRUCTURE is the reviewable part: what gets counted, and cut which way. Karl generates the table of contents from Heading 2s, which is why the section headings below are the navigation. Tables work best at three columns or fewer, so none here exceeds three.',
	editorStatus: 'needs-review',
	sections: [
		{
			heading: 'About these figures',
			karl: 'Report Content → Title and text block. Placed before the tables so a reader knows what is counted before they read a count — the same ordering article11Guide uses for its disclaimer.',
			kind: 'body',
			paragraphs: [
				'This summary covers Healthy Housing and Vector Control inspections carried out under Health Code Article 11. It counts inspections, not buildings: one building can be inspected more than once in a year.'
			],
			bullets: [
				'PLACEHOLDER: the reporting period this covers.',
				'PLACEHOLDER: the date these figures were pulled.',
				'Complaints that were routed to another department are not counted here.'
			]
		},
		{
			heading: 'Inspections by outcome',
			karl: 'Report Content → Table block, three columns. Report is the only type that supports tables. Every value cell is a placeholder; the column headings are the part to review.',
			kind: 'body',
			table: [
				['Outcome', 'Inspections', 'Share'],
				['No violation found', 'PLACEHOLDER', 'PLACEHOLDER'],
				['Violation found, corrected on first re-inspection', 'PLACEHOLDER', 'PLACEHOLDER'],
				['Violation found, needed more than one re-inspection', 'PLACEHOLDER', 'PLACEHOLDER'],
				['Referred for further enforcement', 'PLACEHOLDER', 'PLACEHOLDER']
			]
		},
		{
			heading: 'Violations by condition',
			karl: 'Report Content → Table block, three columns. Cut by the CONDITION rather than by the Article 11 subsection, because the reader who wants this table thinks in conditions; the code reference is the second column so the two can be reconciled.',
			kind: 'body',
			table: [
				['Condition', 'Article 11 reference', 'Violations'],
				['Rodents', 'Sec. 581(b)', 'PLACEHOLDER'],
				['Insects, including cockroaches and bed bugs', 'Sec. 581(b)', 'PLACEHOLDER'],
				['Garbage, filth, and unsanitary waste', 'Sec. 581(b)(1)', 'PLACEHOLDER'],
				['Mold and moisture', 'Sec. 581(b)', 'PLACEHOLDER'],
				['Overgrown vegetation', 'Sec. 581(b)', 'PLACEHOLDER']
			]
		},
		{
			heading: 'Where inspections happened',
			karl: 'Report Content → Table block, three columns. A geographic cut is what most external requests ask for; keeping it to three columns respects the type’s own guidance.',
			kind: 'body',
			table: [
				['District', 'Inspections', 'Violations found'],
				['PLACEHOLDER: district', 'PLACEHOLDER', 'PLACEHOLDER']
			]
		},
		{
			heading: 'How to read these numbers',
			karl: 'Report Content → Title and text block. Every published figure invites a comparison it does not support; this section states the limits rather than leaving a reader to assume them.',
			kind: 'body',
			paragraphs: [
				'A rise in violations can mean conditions worsened, or that more people reported them. The two cannot be separated from these counts alone.'
			],
			bullets: [
				'These counts follow inspections, and inspections follow reports.',
				'A neighborhood with more reports is not necessarily a neighborhood with more problems.',
				'[Find complaints and inspection records](findRecords) for records on a specific address.',
				'[Make a public records request](publicRecords) for data this summary does not cover.'
			]
		},
		{
			heading: 'Related pages',
			karl: 'Maps to Related. Report is not linked automatically from anything, so a route in has to be placed by hand.',
			kind: 'body',
			cards: [
				{ title: 'Health Code Article 11 in plain language', target: 'article11Guide' },
				{ title: 'Look up residential health code violations', target: 'findViolations' },
				{ title: 'Learn what Healthy Housing and Vector Control can inspect', target: 'scopeInfo' }
			]
		}
	],
	partnerAgencies: [
		{
			title: 'Environmental Health',
			url: 'https://www.sf.gov/departments--department-public-health--environmental-health'
		}
	],
	seoTitle: 'Healthy Housing inspections: annual summary | SF.gov',
	metaDescription:
		'Inspection counts, violation types, and re-inspection outcomes for the past year.'
};
