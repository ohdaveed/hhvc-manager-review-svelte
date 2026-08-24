import { filthReport } from './report-garbage-filth-vegetation';
import { inspectionPrepFollowup } from './get-ready-for-followup-inspection';
import { recordsHub } from './lookup-building-records';
import { noticeOfViolation } from './respond-to-notice-of-violation';
import { inspectorLookup } from './find-inspector-by-neighborhood';
import { inspectionPrepInitial } from './get-ready-for-first-inspection';
import { article11Guide } from './health-code-article-11';
import { sroHotelReport } from './report-sro-hotel-problem';
import { aboutHhvcTeam } from './about-hhvc-team';
import { afterReport } from './what-happens-after-report';
import { ownerHub } from './property-owner-responsibilities';
import { publicRecords } from './public-records-request';
import { findHotelRecords } from './lookup-residential-hotel-records';
import { verminResources } from './healthy-housing-vermin-resources';
import { pestsTopic } from './agency-service-grouping';
import { rodentsReport } from './report-rats-mice-four-legged-problems';
import { tenantNoticeSteps } from './tenant-steps-after-notice-of-violation';
import { insectsReport } from './report-cockroaches-mosquitoes-insects';
import { tenantRights } from './tenant-rights-reporting';
import { findViolations } from './lookup-residential-violations';
import { findRecords } from './lookup-complaints-inspections';
import { mosquitoWorkshop } from './mosquito-education-workshop';
import { healthyHousingTopic } from './healthy-housing-conditions-topic';
import { article11Compliance } from './article-11-compliance-for-property-owners';
import { mosquitoControl } from './mosquito-control-program';
import { ownerGuidance } from './integrated-pest-management-property-managers';
import { payFee } from './pay-healthy-housing-fee';
import { ipmEducation } from './integrated-pest-management-education';
import { scopeInfo } from './hhvc-inspection-scope';

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
	filthReport,
	inspectionPrepFollowup,
	recordsHub,
	noticeOfViolation,
	inspectorLookup,
	inspectionPrepInitial,
	article11Guide,
	sroHotelReport,
	aboutHhvcTeam,
	afterReport,
	ownerHub,
	publicRecords,
	findHotelRecords,
	verminResources,
	pestsTopic,
	rodentsReport,
	tenantNoticeSteps,
	insectsReport,
	tenantRights,
	findViolations,
	findRecords,
	mosquitoWorkshop,
	healthyHousingTopic,
	article11Compliance,
	mosquitoControl,
	ownerGuidance,
	payFee,
	ipmEducation,
	scopeInfo
};

export const allPages = Object.values(pagesByKey);
