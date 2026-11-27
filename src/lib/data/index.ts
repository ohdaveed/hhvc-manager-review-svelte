import { inspectorLookup } from './find-inspector-by-neighborhood';
import { article11Guide } from './health-code-article-11';
import { aboutHhvcTeam } from './about-hhvc-team';
import { afterReport } from './what-happens-after-report';
import { ownerHub } from './property-owner-responsibilities';
import { publicRecords } from './public-records-request';
import { findHotelRecords } from './lookup-residential-hotel-records';
import { pestsTopic } from './agency-service-grouping';
import { rodentsReport } from './report-rats-or-mice';
import { mosquitoReport } from './report-mosquitoes-standing-water';
import { moldReport } from './report-mold';
import { garbageReport } from './report-garbage-clutter-overgrown-plants';
import { bedBugReport } from './report-bed-bugs';
import { pigeonReport } from './report-pigeon-droppings-nesting-feeding';
import { sewageReport } from './report-sewage-leak-or-backup';
import { animalWasteReport } from './report-animal-waste-on-property';
import { tenantNoticeSteps } from './tenant-steps-after-notice-of-violation';
import { insectsReport } from './report-cockroaches-or-other-insects';
import { tenantRights } from './tenant-rights-reporting';
import { findRecords } from './lookup-complaints-inspections';
import { mosquitoWorkshop } from './mosquito-education-workshop';
import { healthyHousingTopic } from './healthy-housing-conditions-topic';
import { article11Compliance } from './article-11-compliance-for-property-owners';
import { mosquitoControl } from './mosquito-control-program';
import { ownerGuidance } from './integrated-pest-management-property-managers';
import { payFee } from './pay-healthy-housing-fee';
import { ipmEducation } from './integrated-pest-management-education';
import { scopeInfo } from './hhvc-inspection-scope';

// Proposed pages from `design/HHVC Page Ideas.dc.html`, drafted for a
// supervisor review. Each carries
// `proposed: true` (what the review queue filters on) and an editorNote opening
// "PROPOSED PAGE"; `tests/proposedPages.spec.ts` keeps the two in step. Facts the
// source plan flags as unconfirmed read PLACEHOLDER rather than a plausible value.
import { stepPestReport } from './step-report-a-pest-problem';
import { stepCorrectViolation } from './step-correct-a-violation';
import { ehOffice } from './location-environmental-health-office';
import { appealNotice } from './appeal-notice-of-violation';
import { payCitation } from './pay-healthy-housing-citation';
import { languageGuides } from './guides-in-other-languages';
import { ratFreeBlocks } from './campaign-rat-free-blocks';
import { inspectionsAnnual } from './report-inspections-annual-summary';

// Five community-education pages ported from HHVC_manager_review_current_tool_package
// (merged there as #251, 2026-11-26). Each carries `editorStatus: 'needs-review'`;
// owner duties drawn from the Director's Rules are flagged `unverified`. Their links
// were remapped to this repo's page keys: bed bug links go to bedBugReport, the mold
// report link to moldReport, and the SRO-report card to stepPrepUnit — retargeted to pestTreatmentInfo
// when that Step by step was retired into it (2026-11-26).
import { bedBugsInfo } from './bed-bugs-prevent-and-prepare';
import { reduceMoisture } from './reduce-moisture-and-mold';
import { rodentsPrevention } from './keep-rats-and-mice-out';
import { cockroachesPrevention } from './control-cockroaches-without-sprays';
import { pestTreatmentInfo } from './pest-treatment-in-your-building';

/**
 * The corpus, keyed by the name `cards[].target` uses to point at a page.
 *
 * Those keys are the AI backend's link vocabulary: its card schema requires
 * `target` to name "an EXISTING page key from the list of available page keys
 * in the prompt. Never invent one." An array of pages cannot supply them, so
 * this object is the definition and `allPages` is derived from it -- two lists
 * would drift the first time a page is added to one and not the other.
 */
export const pagesByKey = {
	// First, where the combined garbage page it replaced sat: signed out, the
	// queue follows this order, and tests/toolbarNav.e2e.ts starts from it.
	garbageReport,
	inspectorLookup,
	article11Guide,
	aboutHhvcTeam,
	afterReport,
	ownerHub,
	publicRecords,
	findHotelRecords,
	pestsTopic,
	rodentsReport,
	mosquitoReport,
	moldReport,
	bedBugReport,
	pigeonReport,
	sewageReport,
	animalWasteReport,
	tenantNoticeSteps,
	insectsReport,
	tenantRights,
	findRecords,
	mosquitoWorkshop,
	healthyHousingTopic,
	article11Compliance,
	mosquitoControl,
	ownerGuidance,
	payFee,
	ipmEducation,
	scopeInfo,
	stepPestReport,
	stepCorrectViolation,
	ehOffice,
	appealNotice,
	payCitation,
	languageGuides,
	ratFreeBlocks,
	inspectionsAnnual,
	bedBugsInfo,
	reduceMoisture,
	rodentsPrevention,
	cockroachesPrevention,
	pestTreatmentInfo
};

export const allPages = Object.values(pagesByKey);
