export const afterReport = {
	slug: 'sf.gov/information/what-happens-after-you-report-housing-pest-problem',
	type: 'Information',
	title: 'What happens after you report a housing or pest problem',
	summary: 'Learn how a 311 report is reviewed and when an inspector may contact you.',
	audience: [
		'Anyone who filed a 311 report or is waiting to hear back about a pest or housing problem.'
	],
	reading: 'Grade 7',
	sections: [
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
			karl: 'Maps to one "Information section" → Title and text block: Title = this heading, Text = the bulleted sequence below, entered as a numbered list in the rich text. Information has no numbered-step component, so the steps[] this section used to carry reached no Karl panel (2026-11-26). A numbered list keeps the order, which the earlier plan of one Title and text block per step lost: Karl stream blocks carry no step numbering. Each bold lead-in is the old step title. FLAG: the Housing Code (2025) citation in the DBI bullet is unverified — see the Unverified pill and source-of-truth audit finding #1.',
			kind: 'body',
			bullets: [
				'**You report through 311.** 311 receives the report and sends it to the right City department when possible.',
				'**Environmental Health reviews the report.** HHVC may review the complaint if it may involve a housing or pest-related public health concern. 311 routes the complaint to Environmental Health, and HHVC assigns it to an inspector. This can take a few days. Complaints are processed on weekdays.',
				'**Another agency may take it.** HHVC focuses strictly on condensation, humidity, and ventilation-related moisture issues.',
				{
					text: 'If your complaint involves structural water intrusion, HHVC routes it to the Department of Building Inspection (DBI). That includes leaking roof frames, structural plumbing leaks, and broken water heaters. DBI handles these under the San Francisco Housing Code (2025).',
					unverified: true,
					unverifiedReason:
						'The "San Francisco Housing Code (2025)" citation has zero tier-1 support (source-of-truth audit 2026-07-06, cross-cutting finding #1) — the DBI routing split looks intentional, but the statutory citation and "(2025)" edition tag trace only to tier-3 NotebookLM material. Source a real Housing Code citation or soften to "may be routed to DBI" before publication.'
				},
				'**An inspector may contact you.** If you gave contact information, an inspector may contact you to ask questions or schedule a visit.',
				'**An inspection may happen.** If you did not give contact information, an inspection may still happen without notice when areas can be accessed. This is more likely if the report describes an urgent health or safety risk.',
				'[Report a pest problem, start to finish](stepPestReport)'
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
			karl: 'Maps to a seventh Title and text block: Title = this heading, Text = the paragraph plus the bulleted list below. Reinspection rate bullet ($256/hour inspector, $234/hour technician) verified against the SFDPH Environmental Health Branch Fee Schedule, "Rates effective 7/1/26-6/30/27" (docs/source/hhvc-policy/2026-07-06-dph-ehb-fee-schedule-fy26-27.md), the current fiscal year\'s certified schedule -- these are the correct current rates, not a fabricated NotebookLM figure (an earlier same-day FY25-26 export had mistakenly flagged them as unsourced before the FY26-27 schedule was obtained). Enforcement workflow updated from the Article 11 Interpretation Guide v1.0. FLAG: four bullets in this section carry Unverified pills per the 2026-07-06 source-of-truth audit — the sewage 48-72h window, the generic 30-day correction window, the "compounded monthly" interest wording, and the Director\'s Hearing / attorneys\'-fees enforcement chain all lack tier-1 support and need SME/legal confirmation before any of this section is entered into Karl.',
			kind: 'body',
			paragraphs: [
				'If an inspection identifies a violation, Environmental Health will issue a Notice of Violation (NOV) to the responsible parties. The NOV will outline required corrections and set a specific compliance deadline based on severity.'
			],
			bullets: [
				"**Complaint → Inspection → Notice of Violation → Compliance period → Follow-up inspection → Reinspection fee → Citation or Director's Hearing if unresolved.**",
				{
					text: 'Sewage Backups (48 to 72 hours): Raw sewage backups need immediate correction. The standard 30-day compliance window does not apply.',
					unverified: true,
					unverifiedReason:
						'No tier-1 doc mentions sewage backups or a 48-to-72-hour window (source-of-truth audit 2026-07-06 — High). Traces only to tier-3 chapter drafts and NotebookLM material. Confirm with HHVC/legal before publication.'
				},
				{
					text: 'All Other Violations (30 days): Most cited conditions must be corrected within 30 days. These include overgrown vegetation, trash piles, rodent harborages, general sanitation problems, minor gaps or cracks, and mold remediation.',
					unverified: true,
					unverifiedReason:
						'No tier-1 doc establishes a generic 30-day correction window (source-of-truth audit 2026-07-06 — Medium-high); the only tier-1 "30 days" figures govern the fee late-payment deadline, a different thing. Traces to tier-3 material that itself cites SF Building Code, not Health Code Article 11. Confirm with HHVC/legal before publication.'
				},
				'These timelines represent general enforcement standards. Actual correction deadlines are established on the official Notice of Violation based on the severity of the health hazard.',
				'Extensions: HHVC may offer an extension to the compliance deadline if the property owner contacts the inspector before the deadline.',
				{
					text: 'Bed Bug Treatment: A property owner or manager must initiate professional treatment within 2 working days of confirmation.',
					unverified: true,
					unverifiedReason:
						'Quoted from the draft pages (writing audit row 132) and listed under To confirm in the Nov 24 decisions record, as on Report bed bugs. Confirm the rule and its source with HHVC before publication.'
				},
				'If a property owner misses the deadline, HHVC may charge reinspection fees. These are $256/hour for inspectors and $234/hour for technicians. Invoices must be paid within 30 days. Unpaid bills get a $10 or $30 late penalty, and interest accrues at 1.5% per month.',
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
