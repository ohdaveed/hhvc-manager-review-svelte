/**
 * What HHVC has confirmed, and what it has not.
 *
 * The AI guardrails say "ground every factual claim in the source material you
 * are given", but until this file the model was given no HHVC facts at all, so
 * the only safe move it had was to leave things out. Two lists fix that:
 *
 * - `VERIFIED_FACTS` — claims confirmed against an official source (what the
 *   corpus's audit notes call tier-1: the Health Code, the posted fee schedule,
 *   an SFDPH page or document). The model may state these.
 * - `OPEN_QUESTIONS` — every corpus field flagged `unverified`, grouped by the
 *   question that would settle it. The model is told not to state these.
 *
 * To answer a question: add a `VerifiedFact` with its source, fix the copy,
 * clear the field's `unverified` flag, and delete the question.
 * `registry.test.ts` fails until the question and the flag agree, so the two
 * cannot drift apart silently.
 *
 * Only add a fact you have checked against a source you can name. A fact here
 * is repeated by the model on every page it drafts.
 */

export type VerifiedFact = {
	/** Stable kebab-case id. */
	id: string;
	/** The claim, written as it may be published. */
	claim: string;
	source: {
		/** The document's own title. */
		title: string;
		/** URL, or path to the source file in the HHVC document set. */
		location: string;
	};
	/** YYYY-MM-DD the claim was last checked against the source. */
	checkedOn: string;
	/** Who checked it. */
	checkedBy: string;
};

export type OpenQuestion = {
	/** Stable kebab-case id. */
	id: string;
	/** What HHVC needs to confirm, in one neutral sentence. Sent to the model. */
	question: string;
	/**
	 * Context for the person answering: what the mockup says now, what the
	 * sources say. Never sent to the model, because it quotes the very values
	 * the model must not repeat.
	 */
	note?: string;
	/** Every corpus field this answer would settle (page slug + raw object path). */
	fields: { slug: string; path: string }[];
};

/**
 * Carried from the corpus's own notes, where the source-of-truth audit of
 * 2026-07-06 records each as tier-1 confirmed. Re-check and change `checkedBy`
 * to your name once you have.
 */
const AUDIT = 'Source-of-truth audit (carried from corpus notes)';
const FEE_SCHEDULE = {
	title: 'DPH-EHB fee schedule FY26-27',
	location: 'docs/source/hhvc-policy/2026-07-06-dph-ehb-fee-schedule-fy26-27.pdf'
};

export const VERIFIED_FACTS: VerifiedFact[] = [
	{
		id: 'reinspection-hourly-rates',
		claim:
			'FY26-27 hourly rates for reinspection work: $256 per hour for inspectors and $234 per hour for technicians.',
		source: FEE_SCHEDULE,
		checkedOn: '2026-07-06',
		checkedBy: AUDIT
	},
	{
		id: 'unpaid-invoice-interest',
		claim: 'Interest on an unpaid invoice accrues at 1.5% per month. It is not compounded.',
		source: FEE_SCHEDULE,
		checkedOn: '2026-07-06',
		checkedBy: AUDIT
	}
];

const HAPPENS = 'sf.gov/information/what-happens-after-you-report-housing-pest-problem';
// C1 (decided Nov 24, 2026): the two get-ready pages folded into step-by-step
// steps and tenant steps became an Information page, so their unverified lines
// are tracked where they now live.
const FIRST = 'sf.gov/step-by-step/report-a-pest-problem';
const FOLLOWUP = 'sf.gov/step-by-step/correct-a-violation-and-close-your-case';
const TENANT = 'sf.gov/information/tenant-steps-after-notice-of-violation';
const MOSQUITO_WS = 'sf.gov/mosquito-education-workshop';
const IPM_ED = 'sf.gov/integrated-pest-management-education';

export const OPEN_QUESTIONS: OpenQuestion[] = [
	// --- Reporting and routing
	{
		id: 'mold-test-kits',
		question:
			'Should residents be told not to rely on third-party mold test kits when they report?',
		fields: [{ slug: 'sf.gov/report-mold', path: 'sections.0.steps.3.bullets.6' }]
	},
	// The SRO intake question was answered (Decided, Nov 24, 2026: one clerk
	// takes every report), and the SRO report page it was flagged on is removed.
	{
		id: 'bed-bug-treatment-deadline',
		question:
			'Must an owner or manager start professional bed bug treatment within a set time after bed bugs are confirmed, and if so, how long?',
		note: 'The drafts say 2 working days (writing audit row 132); the Nov 24 decisions record lists it under To confirm.',
		fields: [
			{ slug: 'sf.gov/report-bed-bugs', path: 'sections.0.steps.0.bullets.0' },
			{ slug: HAPPENS, path: 'sections.4.bullets.5' }
		]
	},
	{
		id: 'public-dog-waste-311',
		question:
			'Which 311 service takes reports of dog waste on public sidewalks and streets, which HHVC does not handle?',
		note: 'Decided Nov 24, 2026: likely Public Works street cleaning; the agency is still to confirm.',
		fields: [{ slug: 'sf.gov/report-animal-waste-on-property', path: 'sections.0.steps.0.text.1' }]
	},
	{
		id: 'dbi-routing-citation',
		question:
			'What is the correct legal citation, if any, for routing structural water intrusion to DBI?',
		note: '"San Francisco Housing Code (2025)" has no tier-1 source. If there is no citation, the copy should say it "may be routed to DBI".',
		fields: [
			{ slug: HAPPENS, path: 'sections.1.bullets.3' },
			{ slug: 'sf.gov/information/learn-what-hhvc-can-inspect', path: 'sections.4.bullets.0' }
		]
	},
	{
		id: 'inspector-territories',
		question: 'Are inspectors assigned by neighborhood, or by another kind of territory?',
		fields: [
			{
				slug: 'sf.gov/find-healthy-housing-inspector-by-neighborhood',
				path: 'sections.0.paragraphs.0'
			}
		]
	},

	// --- The first inspection
	{
		id: 'inspection-access',
		question: 'What does an inspector need access to at a first inspection?',
		fields: [{ slug: FIRST, path: 'sections.1.steps.2.bullets.0' }]
	},
	{
		id: 'inspection-photos',
		question: 'Do photos help an inspection, and does HHVC prefer any format?',
		fields: [{ slug: FIRST, path: 'sections.1.steps.2.bullets.2' }]
	},
	{
		id: 'prior-communication',
		question:
			'Does HHVC use earlier tenant-to-owner communication about the problem during an inspection?',
		fields: [{ slug: FIRST, path: 'sections.1.steps.2.bullets.3' }]
	},
	{
		id: 'inspection-scope',
		question:
			'Does an inspector look at areas near the reported condition, or only the condition reported?',
		fields: [{ slug: FIRST, path: 'sections.1.steps.2.bullets.4' }]
	},

	// --- After a Notice of Violation
	{
		id: 'standard-correction-window',
		question: 'Is there a standard correction window for violations, and how long is it?',
		note: 'Mockup says 30 days. The only tier-1 "30 days" is the fee late-payment period.',
		fields: [{ slug: HAPPENS, path: 'sections.4.bullets.2' }]
	},
	{
		id: 'sewage-correction-window',
		question: 'Is there a shorter correction window for sewage backups, and how long is it?',
		note: 'Mockup says 48 to 72 hours; no tier-1 source mentions sewage backups.',
		fields: [{ slug: HAPPENS, path: 'sections.4.bullets.1' }]
	},
	{
		id: 'enforcement-chain',
		question:
			"Can persistent violations lead to citations, civil liability, or a Director's Hearing that recovers attorneys' fees and abatement costs?",
		fields: [{ slug: HAPPENS, path: 'sections.4.bullets.7' }]
	},
	{
		id: 'partial-correction',
		question:
			'Can a partial correction close part of a multi-condition notice, or must every listed condition be corrected?',
		fields: [{ slug: FOLLOWUP, path: 'sections.1.steps.4.bullets.1' }]
	},
	{
		id: 'follow-up-scope',
		question:
			'Does a follow-up inspection check anything beyond the conditions cited on the notice?',
		fields: [{ slug: FOLLOWUP, path: 'sections.1.steps.5.bullets.0' }]
	},
	{
		id: 'unit-prep-requirements',
		question:
			'What must a tenant do to have a unit ready for treatment or repair (move furniture, bag belongings)?',
		fields: [{ slug: TENANT, path: 'sections.0.bullets.1' }]
	},
	{
		id: 'unit-prep-instructions',
		question: 'Who issues unit-preparation instructions: the owner or manager, HHVC, or either?',
		fields: [{ slug: TENANT, path: 'sections.0.bullets.2' }]
	},
	{
		id: 'entry-notice-period',
		question:
			'How much notice must an owner give a tenant before entering for treatment, repair or a follow-up inspection?',
		fields: [{ slug: TENANT, path: 'sections.0.bullets.3' }]
	},

	// --- Fees
	{
		id: 'fee-7-to-10-units',
		question: 'What is the FY26-27 annual Healthy Housing fee for a building with 7 to 10 units?',
		note: 'Posted worksheet says $174; the Controller fee-adjustment table rounds $174.50 to $175.',
		fields: [
			{
				slug: 'sf.gov/pay-your-annual-healthy-housing-fee-apartment-buildings',
				path: 'sections.0.steps.1.bullets.2'
			}
		]
	},

	// --- Mosquito Control and IPM education
	{
		id: 'mosquito-program-phone',
		question: 'What is the Mosquito Control Program phone number?',
		note: 'Mockup uses 415-252-3806, which appears in no source; the audit found 415-252-3800 as a tier-1 SFDPH number and suspects a digit swap.',
		fields: [{ slug: MOSQUITO_WS, path: 'sections.5.facts.0' }]
	},
	{
		id: 'mosquito-workshop-request',
		question: 'How does a group request a mosquito education workshop?',
		note: 'No request form exists yet; the button is a placeholder.',
		fields: [{ slug: MOSQUITO_WS, path: 'sections.4.paragraphs.0' }]
	},
	{
		id: 'mosquito-workshop-capacity',
		question: 'How many students fit in one mosquito workshop session?',
		note: 'Mockup placeholder: about 60.',
		fields: [{ slug: MOSQUITO_WS, path: 'sections.5.facts.2' }]
	},
	{
		id: 'mosquito-workshop-lead-time',
		question: 'How far ahead must a mosquito workshop be requested?',
		note: 'Mockup placeholder: 3 weeks.',
		fields: [{ slug: MOSQUITO_WS, path: 'sections.5.facts.3' }]
	},
	{
		id: 'ipm-session-request',
		question: 'How does a group request an IPM education session?',
		note: 'Mockup placeholder: through 311.',
		fields: [{ slug: IPM_ED, path: 'sections.4.paragraphs.0' }]
	},
	{
		id: 'ipm-session-capacity',
		question: 'How many residents fit in one IPM education session?',
		note: 'Mockup placeholder: about 40.',
		fields: [{ slug: IPM_ED, path: 'sections.5.facts.2' }]
	},
	{
		id: 'ipm-session-lead-time',
		question: 'How far ahead must an IPM education session be requested?',
		note: 'Mockup placeholder: 2 weeks.',
		fields: [{ slug: IPM_ED, path: 'sections.5.facts.3' }]
	},
	// --- Community-education pages ported from HHVC_manager_review_current_tool_package
	{
		id: 'bed-bug-inspection-deadline',
		question:
			'Must an owner have a licensed pest control company inspect the unit and the units next to it within a set time after a bed bug report, and if so, how long?',
		note: "The bed bug education page says 2 working days, from Director's Rules Owner 2.4-2.6. Distinct from bed-bug-treatment-deadline, which is about starting treatment. Confirm against the v4 Director's Rules draft.",
		fields: [
			{
				slug: 'sf.gov/information/bed-bugs-prevent-find-and-prepare-for-treatment',
				path: 'sections.4.bullets.0'
			}
		]
	},
	{
		id: 'bed-bug-disability-accommodation',
		question:
			'What reasonable-accommodation duty does an owner have toward tenants with a documented disability during bed bug treatment?',
		note: 'The bed bug education page says owners must arrange accommodations such as help preparing the room or a different treatment method, citing Director\'s Rules Owner 3.5 ("to the extent required by applicable ... law"). Confirm scope with HHVC and the City Attorney.',
		fields: [
			{
				slug: 'sf.gov/information/bed-bugs-prevent-find-and-prepare-for-treatment',
				path: 'sections.6.bullets.2'
			}
		]
	},
	{
		id: 'mold-action-threshold',
		question:
			'Should a minimum mold area at which the City can act be published, and if so, what is it?',
		note: 'The moisture and mold page says 10 square feet of walls or ceilings, from internal SFDPH program guidance rather than a cited Health Code section.',
		fields: [
			{
				slug: 'sf.gov/information/reduce-moisture-and-mold-in-your-home',
				path: 'sections.5.bullets.0'
			}
		]
	},
	{
		id: 'owner-pest-investigation-window',
		question:
			'Within what time must an owner look into a tenant pest report, and must a licensed pest control company be used?',
		note: "The rodent and pest-treatment education pages say 72 hours, from the Owner/Operator Guidelines for Vector Control (Director's Rules excerpt, items 2-3). Confirm against the v4 Director's Rules draft.",
		fields: [
			{
				slug: 'sf.gov/information/keep-rats-and-mice-out-of-your-home',
				path: 'sections.4.bullets.3'
			},
			{
				slug: 'sf.gov/information/what-to-expect-when-your-building-is-treated-for-pests',
				path: 'sections.1.bullets.0'
			}
		]
	}
];
