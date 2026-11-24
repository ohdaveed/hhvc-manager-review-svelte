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
const FIRST = 'sf.gov/get-ready-for-a-housing-inspection';
const FOLLOWUP = 'sf.gov/get-ready-for-a-follow-up-inspection';
const TENANT = 'sf.gov/tenant-steps-after-notice-of-violation';
const MOSQUITO_WS = 'sf.gov/mosquito-education-workshop';
const IPM_ED = 'sf.gov/integrated-pest-management-education';

export const OPEN_QUESTIONS: OpenQuestion[] = [
	// --- Reporting and routing
	{
		id: 'mold-test-kits',
		question:
			'Should residents be told not to rely on third-party mold test kits when they report?',
		fields: [
			{ slug: 'sf.gov/report-garbage-filth-vegetation', path: 'sections.0.steps.2.bullets.1' }
		]
	},
	{
		id: 'sro-intake',
		question:
			'Do SRO, residential hotel and shelter reports go through the same 311 intake as other housing reports, or a separate one?',
		fields: [{ slug: 'sf.gov/report-problem-sro-hotel', path: 'sections.0.paragraphs.0' }]
	},
	{
		id: 'dbi-routing-citation',
		question:
			'What is the correct legal citation, if any, for routing structural water intrusion to DBI?',
		note: '"San Francisco Housing Code (2025)" has no tier-1 source. If there is no citation, the copy should say it "may be routed to DBI".',
		fields: [
			{ slug: HAPPENS, path: 'sections.0.steps.2.text.0' },
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
		fields: [{ slug: FIRST, path: 'sections.0.steps.0.text.0' }]
	},
	{
		id: 'inspection-photos',
		question: 'Do photos help an inspection, and does HHVC prefer any format?',
		fields: [{ slug: FIRST, path: 'sections.0.steps.2.bullets.0' }]
	},
	{
		id: 'prior-communication',
		question:
			'Does HHVC use earlier tenant-to-owner communication about the problem during an inspection?',
		fields: [{ slug: FIRST, path: 'sections.0.steps.2.bullets.1' }]
	},
	{
		id: 'inspection-scope',
		question:
			'Does an inspector look at areas near the reported condition, or only the condition reported?',
		fields: [{ slug: FIRST, path: 'sections.1.steps.0.text.0' }]
	},

	// --- After a Notice of Violation
	{
		id: 'standard-correction-window',
		question: 'Is there a standard correction window for violations, and how long is it?',
		note: 'Mockup says 30 days. The only tier-1 "30 days" is the fee late-payment period.',
		fields: [{ slug: HAPPENS, path: 'sections.3.bullets.2' }]
	},
	{
		id: 'sewage-correction-window',
		question: 'Is there a shorter correction window for sewage backups, and how long is it?',
		note: 'Mockup says 48 to 72 hours; no tier-1 source mentions sewage backups.',
		fields: [{ slug: HAPPENS, path: 'sections.3.bullets.1' }]
	},
	{
		id: 'interest-wording',
		question:
			'The interest wording on the after-you-report page does not match the source and needs correcting.',
		note: 'Copy says "1.5% compounded monthly interest"; the source says it "accrues at 1.5% per month" (fact unpaid-invoice-interest). A copy fix, not a research question.',
		fields: [{ slug: HAPPENS, path: 'sections.3.bullets.6' }]
	},
	{
		id: 'enforcement-chain',
		question:
			"Can persistent violations lead to citations, civil liability, or a Director's Hearing that recovers attorneys' fees and abatement costs?",
		fields: [{ slug: HAPPENS, path: 'sections.3.bullets.7' }]
	},
	{
		id: 'partial-correction',
		question:
			'Can a partial correction close part of a multi-condition notice, or must every listed condition be corrected?',
		fields: [{ slug: FOLLOWUP, path: 'sections.0.steps.1.text.0' }]
	},
	{
		id: 'follow-up-scope',
		question:
			'Does a follow-up inspection check anything beyond the conditions cited on the notice?',
		fields: [{ slug: FOLLOWUP, path: 'sections.1.steps.0.text.0' }]
	},
	{
		id: 'unit-prep-requirements',
		question:
			'What must a tenant do to have a unit ready for treatment or repair (move furniture, bag belongings)?',
		fields: [{ slug: TENANT, path: 'sections.0.steps.1.bullets.0' }]
	},
	{
		id: 'unit-prep-instructions',
		question: 'Who issues unit-preparation instructions: the owner or manager, HHVC, or either?',
		fields: [{ slug: TENANT, path: 'sections.0.steps.1.bullets.1' }]
	},
	{
		id: 'entry-notice-period',
		question:
			'How much notice must an owner give a tenant before entering for treatment, repair or a follow-up inspection?',
		fields: [{ slug: TENANT, path: 'sections.0.steps.2.text.0' }]
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
		fields: [
			{ slug: MOSQUITO_WS, path: 'sections.5.facts.0' },
			{ slug: 'sf.gov/mosquito-control-program', path: 'sections.1.bullets.1' }
		]
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
	}
];
