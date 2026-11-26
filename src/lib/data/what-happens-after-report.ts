export const afterReport = {
	slug: 'sf.gov/information/what-happens-after-you-report-housing-pest-problem',
	type: 'Information',
	title: 'What happens after you report a housing or pest problem',
	summary: 'Learn how a 311 report is reviewed and when an inspector may contact you.',
	reading: 'Grade 7',
	sections: [
		{
			heading: 'Who this information is for',
			karl: 'Maps to the first "Information section" → Title and text block: Title = this heading, Text = the bulleted list. The heading is the one sf.gov/manage-covid-19-schools-childcare-and-youth-programs gives an audience list (an H3 over bullets). This was the page-level `audience` field until 2026-11-26, when that field was retired; the transcript used to supply this block itself, so what goes into Karl is unchanged.',
			kind: 'body',
			bullets: [
				'Anyone who filed a 311 report or is waiting to hear back about a pest or housing problem.'
			]
		},
		{
			heading: 'Who can report',
			karl: 'Maps to an "Information section" → Title and text block: Title = this heading, Text = the paragraph plus the bulleted list. Added 2026-11-25 under the Decided shared-content rule: text every report page used to repeat (reporting anonymously, reporting for someone else, language help, the landlord notice) lives here and on Tenant rights, and the report pages keep only what is specific to their condition.',
			kind: 'body',
			paragraphs: ['Anyone can report a housing or pest problem to 311.'],
			bullets: [
				'You can report anonymously. 311 does not require your name.',
				'You can report even if you are not the tenant. A friend, family member, advocate, or helper can report for someone else.',
				'You can ask 311 for help in your language.',
				'If you rent, tell your landlord first, unless the problem is urgent. [Tenant rights when reporting housing conditions](tenantRights) explains how long to wait.'
			]
		},
		{
			heading: 'How a report moves through the City',
			karl: 'Maps to one "Information section" → Title and text block: Title = this heading, Text = the numbered list below, entered as a numbered list in the rich text. Information has no numbered-step component, so the steps[] this section used to carry reached no Karl panel (2026-11-26). A numbered list keeps the order, which the earlier plan of one Title and text block per step lost: Karl stream blocks carry no step numbering. Each bold lead-in is the old step title, and each list item is one whole step: the DBI routing and the inspection-prep link sit inside the step they belong to, so the list numbers five steps, not seven (2026-11-26). `ordered` makes the mockup render the numbers Karl will show. FLAG: the Housing Code (2025) citation in the third item is unverified — see the Unverified pill and source-of-truth audit finding #1.',
			kind: 'body',
			ordered: true,
			bullets: [
				'**You report through 311.** 311 receives the report and sends it to the right City department when possible.',
				'**Environmental Health reviews the report.** HHVC may review the complaint if it may involve a housing or pest-related public health concern. 311 routes the complaint to Environmental Health, and HHVC assigns it to an inspector. This can take a few days. Complaints are processed on weekdays.',
				{
					text: '**Another agency may take it.** If your complaint involves structural water intrusion, HHVC routes it to the Department of Building Inspection (DBI). That includes leaking roof frames, structural plumbing leaks, and broken water heaters. DBI handles these under the San Francisco Housing Code (2025). HHVC focuses strictly on condensation, humidity, and ventilation-related moisture issues.',
					unverified: true,
					unverifiedReason:
						'The "San Francisco Housing Code (2025)" citation has zero tier-1 support (source-of-truth audit 2026-07-06, cross-cutting finding #1) — the DBI routing split looks intentional, but the statutory citation and "(2025)" edition tag trace only to tier-3 NotebookLM material. Source a real Housing Code citation or soften to "may be routed to DBI" before publication.'
				},
				'**An inspector may contact you.** If you gave contact information, an inspector may contact you to ask questions or schedule a visit.',
				'**An inspection may happen.** If you did not give contact information, an inspection may still happen without notice when areas can be accessed. This is more likely if the report describes an urgent health or safety risk. To get ready for a visit, follow [Report a pest problem, start to finish](stepPestReport).'
			]
		},
		{
			heading: 'How to follow up on your report',
			karl: 'Maps to a Title and text block: Title = this heading, Text = the paragraph plus the bulleted list below. Generic, safe steps only.',
			kind: 'body',
			paragraphs: [
				'You can check on a report you already made. It helps to keep a few details handy.'
			],
			bullets: [
				'Keep your 311 service request number if you have one.',
				'Note the date you made the report.',
				'Contact 311 to ask about the status of your request.',
				'Tell 311 if the problem gets worse or becomes urgent.'
			]
		},
		{
			heading: 'Tenant rights and retaliation',
			karl: 'Paragraphs map to a sixth Title and text block (Title = this heading, Text = the two paragraphs). Resolved schema gap: the verified Information form has no confirmed button/CTA block type (button converted to inline link) — folded into this block’s rich text (Internal link → tenantRights) — flag this gap for Digital Services rather than assuming a dedicated button block exists.',
			kind: 'body',
			paragraphs: [
				'Tenants have rights when they ask for repairs or report housing conditions to the City. We never share your name or contact information.',
				'A property owner or manager cannot retaliate because a tenant reports a housing condition to 311 or a health department.'
			],
			bullets: ['[Tenant rights and reporting](tenantRights)']
		},
		{
			heading: 'If a problem is found',
			karl: 'Maps to a Title and text block: Title = this heading, Text = the two paragraphs below. The enforcement-chain line (Article 11 Interpretation Guide v1.0) was the first item of an 8-item list until 2026-11-26; it is a sentence, so it is a paragraph now, and the deadlines and consequences that followed it are the next two sections.',
			kind: 'body',
			paragraphs: [
				'If an inspection identifies a violation, Environmental Health will issue a Notice of Violation (NOV) to the responsible parties. The NOV will outline required corrections and set a specific compliance deadline based on severity.',
				"**Complaint → Inspection → Notice of Violation → Compliance period → Follow-up inspection → Reinspection fee → Citation or Director's Hearing if unresolved.**"
			]
		},
		{
			heading: 'Deadlines to fix a violation',
			karl: 'Maps to a Title and text block: Title = this heading, Text = the paragraph plus the bulleted list below. Split on 2026-11-26 from one 8-item list: SF.gov keeps a bulleted list to 3 to 5 items (A-to-Z, Bullets). FLAG: the sewage 48-72h window, the generic 30-day correction window and the 2-working-day bed bug rule carry Unverified pills (source-of-truth audit 2026-07-06; Nov 24 decisions record) and need SME/legal confirmation before this is entered into Karl.',
			kind: 'body',
			paragraphs: [
				'These timelines represent general enforcement standards. Actual correction deadlines are established on the official Notice of Violation based on the severity of the health hazard.'
			],
			bullets: [
				{
					text: '**Sewage Backups (48 to 72 hours):** Raw sewage backups need immediate correction. The standard 30-day compliance window does not apply.',
					unverified: true,
					unverifiedReason:
						'No tier-1 doc mentions sewage backups or a 48-to-72-hour window (source-of-truth audit 2026-07-06 — High). Traces only to tier-3 chapter drafts and NotebookLM material. Confirm with HHVC/legal before publication.'
				},
				{
					text: '**All Other Violations (30 days):** Most cited conditions must be corrected within 30 days. These include overgrown vegetation, trash piles, rodent harborages, general sanitation problems, minor gaps or cracks, and mold remediation.',
					unverified: true,
					unverifiedReason:
						'No tier-1 doc establishes a generic 30-day correction window (source-of-truth audit 2026-07-06 — Medium-high); the only tier-1 "30 days" figures govern the fee late-payment deadline, a different thing. Traces to tier-3 material that itself cites SF Building Code, not Health Code Article 11. Confirm with HHVC/legal before publication.'
				},
				{
					text: '**Bed Bug Treatment:** A property owner or manager must initiate professional treatment within 2 working days of confirmation.',
					unverified: true,
					unverifiedReason:
						'Quoted from the draft pages (writing audit row 132) and listed under To confirm in the Nov 24 decisions record, as on Report bed bugs. Confirm the rule and its source with HHVC before publication.'
				},
				'**Extensions:** HHVC may offer an extension to the compliance deadline if the property owner contacts the inspector before the deadline.'
			]
		},
		{
			heading: 'If a deadline is missed',
			karl: 'Maps to a Title and text block: Title = this heading, Text = the three paragraphs below. Split on 2026-11-26 from one 8-item list: SF.gov keeps a bulleted list to 3 to 5 items (A-to-Z, Bullets). Reinspection rates ($256/hour inspector, $234/hour technician) verified against the SFDPH Environmental Health Branch Fee Schedule, "Rates effective 7/1/26-6/30/27" (docs/source/hhvc-policy/2026-07-06-dph-ehb-fee-schedule-fy26-27.md). FLAG: the Director\'s Hearing / attorneys\' fees enforcement chain carries an Unverified pill (source-of-truth audit 2026-07-06) and needs legal confirmation.',
			kind: 'body',
			paragraphs: [
				'If a property owner misses the deadline, HHVC may charge reinspection fees. These are $256/hour for inspectors and $234/hour for technicians.',
				'Invoices must be paid within 30 days. Unpaid bills get a $10 or $30 late penalty, and interest accrues at 1.5% per month.',
				{
					text: "Persistent violations can result in citations, civil liabilities, or a Director's Hearing to recover attorneys' fees and administrative abatement costs.",
					unverified: true,
					unverifiedReason:
						"No tier-1 corroboration for this enforcement mechanism — the Director's Hearing / attorneys' fees / administrative abatement chain traces only to tier-3 material (source-of-truth audit 2026-07-06 — High). Confirm with HHVC/legal before publication."
				}
			]
		},
		{
			heading: 'What to expect on timing and results',
			fieldKey: 'what-this-page-does-not-promise',
			karl: 'Maps to an eighth Title and text block: Title = this heading, Text = the bulleted list below (no paragraphs precede it here).',
			kind: 'body',
			bullets: [
				'HHVC cannot promise an exact time or date when an inspector will call you or arrive at your building.',
				'We cannot promise a specific inspection finding or guarantee that a Notice of Violation will be issued.',
				'It does not replace a notice, citation, or legal document.',
				'Complaints are not assigned instantly. 311 routing and HHVC inspector assignment can take a few days and are processed on weekdays.'
			]
		},
		{
			heading: 'Related pages',
			karl: 'Maps to the Related field: a generic unrestricted "Page" chooser, repeatable.',
			kind: 'placement',
			cards: [
				{
					title: 'Learn what Healthy Housing and Vector Control can inspect',
					target: 'scopeInfo'
				},
				{
					title: 'Tenant rights when reporting housing conditions',
					target: 'tenantRights'
				}
			]
		}
	],
	seoTitle: 'What happens after you report | SF.gov',
	metaDescription:
		'Learn what may happen after a 311 report about a housing or pest problem is sent to Environmental Health.'
};
