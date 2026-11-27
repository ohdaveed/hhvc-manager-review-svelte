export const article11Compliance = {
	slug: 'sf.gov/information--article-11-compliance-for-property-owners',
	type: 'Information',
	title: 'Article 11 compliance for property owners',
	summary:
		'See what landlords and managers must do under the Health Code, plus the yearly fee and who to call.',
	reading: 'Grade 7',
	editorNote:
		'Information page modeled on the SF.gov minimum wage ordinance pattern (sf.gov/information--minimum-wage-ordinance): a short compliance-first front door, not a replacement for the deep-dive `article11Guide` Report page it links out to. Every fact here (fee tiers, 72-hour window, 2-year records, PCO licensing, pesticide notice, training) is pulled from `article11Guide` and `payFee`, not re-derived — see each section\'s karl note for which source page to cross-check. The one exception is the vermin-log requirement, which no other mockup page carries: it comes straight from the Director\'s Rules excerpt at `docs/source/hhvc-policy/2026-07-08-residential-building-owner-operator-guidelines-vector-control.md` (item 2), the same sentence the 72-hour window is quoted from. Worth adding to `article11Guide`\'s owner-responsibility table as well, so this page keeps summarizing rather than becoming the sole source for it. One open question carried from the design spec, not blocking: whether Karl\'s Information content type has a distinct checklist/callout-with-list block, or whether the bulleted list used below (see "What Article 11 requires" section) is the closest real-schema fit. (A second question, the `cost` panel radio-option gap, no longer applies here: U23 moved the fee out of `whatToKnow` into the "Fees and full requirements" section, since Information has no `cost` panel. It stays open on `payFee`.)',
	editorStatus: 'needs-review',
	topicTag: 'Agency: Healthy Housing and Vector Control',
	sections: [
		{
			heading: 'Who this information is for',
			karl: 'Maps to the first "Information section" → Title and text block: Title = this heading, Text = the bulleted list. The heading is the one sf.gov/manage-covid-19-schools-childcare-and-youth-programs gives an audience list (an H3 over bullets). This was the page-level `audience` field until 2026-11-26, when that field was retired; the transcript used to supply this block itself, so what goes into Karl is unchanged.',
			kind: 'body',
			bullets: [
				'This page is for property owners and managers responsible for Article 11 compliance.'
			]
		},
		{
			heading: 'What Article 11 requires',
			karl: 'Maps to an "Information section" → Title and text block: Title = this heading, Text = the paragraph below. Until 2026-11-26 it also carried a six-item "Quick compliance checklist"; five of the six items repeated "What you must do" further down this page, so the list was removed and its one unique item, the annual fee, moved into "Keep records and stay in compliance".',
			kind: 'body',
			paragraphs: [
				'San Francisco Health Code Article 11 requires property owners and managers to keep buildings free of public health nuisances. These include pests, garbage, mold, and rodent problems.'
			]
		},
		{
			heading: 'If you get a report or notice',
			karl: 'Maps to a second Title and text block: Title = this heading, Text = the two paragraphs plus the two-item linked bullet list below. 72-hour figure and NOV description verified against `article11Guide` and `respond-to-notice-of-violation.js` (`noticeOfViolation`).',
			kind: 'body',
			paragraphs: [
				'When a tenant reports a pest or housing health problem, owners and managers must start investigating within 72 hours.',
				'If Environmental Health finds a violation, they issue a notice of violation (NOV). It lists what you must correct and the deadline to do it.'
			],
			bullets: [
				'[Correct a violation and close your case](stepCorrectViolation)',
				'[What happens after you report](afterReport)'
			]
		},
		{
			heading: 'Respond to pest reports',
			// Pinned: the key is the ORIGINAL slug, from before two rewordings
			// ("What you're required to do", then "What you must do", then this
			// split), so edits and comments saved against it keep resolving.
			fieldKey: 'what-you-re-required-to-do',
			karl: "Maps to a third Title and text block: Title = this heading, Text = the intro paragraph plus the bulleted list below. Condensed from the owner-responsibility and PCO-requirement content in `article11Guide` (Director's Rules §V.2 and related citations) — not a full restatement; links out to the complete table. The vermin-log bullet and the 72-hour bullet above it are the two halves of ONE Director's Rules sentence (Residential Building Owner/Operator Guidelines for Vector Control, item 2) — the pest list is quoted from it verbatim, so do not trim it to a shorter set. It is deliberately separate from the 2-year records bullet that follows: that one is retention of complaints/inspections/treatments for DPH, this one is a running log handed to the PCO. Flag for Digital Services: the log-template link points at the live SF.gov resource page rather than a mockup page key, because no equivalent page exists in this set. Split on 2026-11-26 into this section (reports, treatment, notice) and \"Keep records and stay in compliance\", from one 7-item list: SF.gov keeps a bulleted list to 3 to 5 items. The fieldKey keeps this section's original ids.",
			kind: 'body',
			paragraphs: [
				"These requirements come from Article 11 and the San Francisco Department of Public Health (SFDPH) Director's Rules and Regulations."
			],
			bullets: [
				'Investigate tenant pest reports within 72 hours of receiving them.',
				"Keep a written log of every report or sign of vermin: rodents, fleas, flies, bedbugs, spiders, cockroaches, wasps, and mosquitoes. Give the log to your pest control operator. You can use the City's [complaint forms and log template](https://www.sf.gov/resource/2024/healthy-housing-and-pest-information).",
				'Hire only licensed pest control operators (PCOs) to apply pesticides or trap rats. Never use unlicensed staff or over-the-counter treatments for significant infestations.',
				'Give tenants written notice before pesticide application, including the product name, date, and safety information.'
			]
		},
		{
			heading: 'Keep records and stay in compliance',
			karl: 'Maps to a Title and text block: Title = this heading, Text = the bulleted list below. Split from "Respond to pest reports" on 2026-11-26 (SF.gov keeps a bulleted list to 3 to 5 items). The fee bullet came from the checklist removed from "What Article 11 requires" the same day.',
			kind: 'body',
			bullets: [
				'Keep records of complaints, inspections, and pest control services for at least 2 years. Make them available to the Department of Public Health on request.',
				'Pay your annual Healthy Housing fee if your building has 3 or more rental units.',
				'Complete pest-management training if the Director requires it after repeat violations.',
				'[See the full owner-responsibility table](article11Guide)'
			]
		},
		{
			heading: 'Fees and full requirements',
			karl: "Maps to a fourth Title and text block: Title = this heading, Text = the paragraph plus the three linked bullets below (the third, to Property owner responsibilities, was a Related card until 2026-11-26: Karl’s Related cannot take a Resource Collection). This content was the page's `whatToKnow` (cost + two Things to know) until U23 was resolved 2026-11-21: Information has no `cost` and no `things_to_know` — those sit only under Transaction's \"What to know before you start\" grouping — so it moved here, where Information can carry it. Fee figures match `payFee`'s `cost` and tier list; `payFee` stays the source of truth for amounts and is also in Related.",
			kind: 'body',
			paragraphs: [
				'Buildings with 3 or more rental units pay an annual Healthy Housing fee. Current certified rates range from $103 to $808 or more, depending on unit count.'
			],
			bullets: [
				'[See the full fee schedule for exact tier amounts and reinspection rates](payFee)',
				'[See the full Article 11 guide for the complete section-by-section mapping](article11Guide)',
				'[See all property owner responsibilities](ownerHub)'
			]
		},
		{
			heading: 'Legal authority',
			karl: 'Maps to a fifth Title and text block: Title = this heading, Text = the intro paragraph plus the bulleted list below, mirroring the citation pattern and municode URL already used in `health-code-article-11.js`\'s "Enforcement" section and Spotlight button.',
			kind: 'body',
			paragraphs: ['Article 11 defines these requirements and how HHVC enforces them.'],
			bullets: [
				'**Sec. 581:** Defines the public health nuisances covered by this article, including pest, garbage, mold, and rodent conditions.',
				'**Sec. 596:** Sets the complaint, inspection, and Notice of Violation (NOV) process.',
				'**Sec. 600:** Authorizes criminal, civil, and administrative penalties of up to $1,000 per violation per day.',
				'[View Health Code Article 11 on municode](https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_health/0-0-0-1890)',
				'[See the full section-by-section mapping](article11Guide)'
			]
		},
		{
			heading: 'Contact Healthy Housing and Vector Control',
			karl: 'Maps to an "Information section" → Title and text block: Title = this heading, Text = the two lines below. Information has no Contact us panel (Transaction has get_help, Campaign and Agency have contact; Information has neither), so the phone and email the mockup used to show in a contact box move into the body (2026-11-26). The box\'s third line, the team name, is this heading.',
			kind: 'body',
			paragraphs: [
				'Call or text 311.',
				'Call Healthy Housing and Vector Control at 415-252-3800, or email healthyhousing@sf.gov.'
			]
		},
		{
			heading: 'Resources',
			component: 'related',
			karl: 'Maps to the Related field: a generic unrestricted "Page" chooser, repeatable.',
			kind: 'placement',
			cards: [
				{
					title: 'Integrated pest management for property owners and managers',
					target: 'ownerGuidance'
				},
				{
					title: 'Learn what Healthy Housing and Vector Control can inspect',
					target: 'scopeInfo'
				},
				{
					title: 'Pay your annual Healthy Housing fee for apartment buildings',
					target: 'payFee'
				}
			]
		}
	],
	seoTitle: 'Article 11 compliance for property owners | SF.gov',
	metaDescription:
		'What property owners and managers must do to comply with Health Code Article 11, including fees, response times, and required actions.'
};
