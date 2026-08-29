/**
 * Karl Jr.'s six accessibility tests, assembled for one mockup page.
 *
 * The tests are the ones the help center lists for the extension — heading
 * nesting, missing image alt text, inaccessible link text, missing table
 * captions or headers, missing video transcripts or captions, and readability.
 * Two things here are not in the extension, both because this app has data a
 * live SF.gov page does not:
 *
 * - the score is compared against the page's own declared `reading` target, and
 * - every finding carries a `help` key, so no claim is made without a link to
 *   the Karl guidance behind it. `Finding.help` is required, which is the
 *   enforcement: a check cannot be added without choosing a citation for it.
 *
 * A check with nothing to look at reports `unavailable`, never `pass`. The
 * mockup corpus contains no images, tables or videos today, and reporting that
 * as four green ticks would be a claim this tool has not earned.
 */

import type { CorpusPage } from '$lib/corpus/fields';
import type { KarlHelpKey } from './karlHelp';
import { analyzableCopy, readabilityTextFrom, type CopyEntry, type EditRow } from './pageCopy';
import {
	normalizeForReadability,
	parseReadingTarget,
	scoreReadability,
	type Readability
} from './readability';
import { labelCount, longParagraphs, rawUrlsInProse, vagueLabels } from './textChecks';
import { runDomChecks } from './domChecks';

export type FindingStatus = 'pass' | 'issue' | 'unavailable';

export type FindingItem = {
	/** The `extractCopy` key or DOM position the item was found at. */
	key?: string;
	text: string;
	detail?: string;
};

export type Finding = {
	id: string;
	title: string;
	status: FindingStatus;
	/** The claim, in one sentence. */
	summary: string;
	/** Required: the Karl help page backing the claim. */
	help: KarlHelpKey;
	items: FindingItem[];
};

export type Analysis = {
	readability: Readability;
	/** The grade the page's corpus module declares, or null if it declares none. */
	target: number | null;
	/** Whether the score meets the declared target. `unavailable` when there is no target or no text. */
	targetStatus: FindingStatus;
	/** Karl's own site-wide guideline, cited alongside the page's target. */
	readabilityHelp: KarlHelpKey;
	findings: Finding[];
	/** How many corpus strings were measured — the honest denominator for the score. */
	measuredFields: number;
};

/** SF.gov's site-wide guideline. "5th grade reading level is not required on SF.gov, but it's a helpful guideline." */
export const SFGOV_READING_GUIDELINE = 5;

export type AnalyzeInput = {
	page: CorpusPage & { reading?: unknown };
	edits?: EditRow[];
	/** The rendered mockup root. Omitted in tests that only exercise the copy checks. */
	root?: ParentNode | null;
};

export function analyzePage({ page, edits = [], root = null }: AnalyzeInput): Analysis {
	const entries: CopyEntry[] = analyzableCopy(page, edits);
	const text = normalizeForReadability(readabilityTextFrom(entries));
	const readability = scoreReadability(text);

	const target = parseReadingTarget(page.reading);
	const targetStatus: FindingStatus =
		!readability.hasContent || target === null
			? 'unavailable'
			: readability.score <= target
				? 'pass'
				: 'issue';

	const findings: Finding[] = [];

	// --- Copy checks: complete, because they read the corpus rather than the DOM.

	const labels = vagueLabels(entries);
	const labelsTotal = labelCount(entries);
	findings.push({
		id: 'link-text',
		title: 'Link and button text',
		status: labelsTotal === 0 ? 'unavailable' : labels.length > 0 ? 'issue' : 'pass',
		summary:
			labelsTotal === 0
				? 'This page has no buttons or links to check.'
				: labels.length > 0
					? `${labels.length} of ${labelsTotal} labels do not say where they go.`
					: `All ${labelsTotal} labels say where they go.`,
		help: 'linkBestPractices',
		items: labels.map((i) => ({ key: i.key, text: i.text, detail: i.detail }))
	});

	// Each check states the DENOMINATOR it scanned, and reports `unavailable`
	// when that denominator is zero. Without it a page with no body copy gets a
	// green "No bare URLs in body copy" for having read nothing -- the exact
	// unearned pass this module's contract rules out, and the reason `link-text`
	// above guards on `labelsTotal`. The two counts differ because the checks
	// read different sets: `rawUrlsInProse` scans prose AND headings, while
	// `longParagraphs` scans prose only (a heading is not a paragraph).
	const proseCount = entries.filter((e) => e.kind === 'prose').length;
	const bodyCount = entries.filter((e) => e.kind === 'prose' || e.kind === 'heading').length;

	const rawUrls = rawUrlsInProse(entries);
	findings.push({
		id: 'raw-urls',
		title: 'URLs pasted into text',
		status: bodyCount === 0 ? 'unavailable' : rawUrls.length > 0 ? 'issue' : 'pass',
		summary:
			bodyCount === 0
				? 'This page has no body copy to scan.'
				: rawUrls.length > 0
					? `${rawUrls.length} bare URL${rawUrls.length > 1 ? 's' : ''} printed in body copy.`
					: `No bare URLs across ${bodyCount} copy fields.`,
		help: 'descriptiveLinks',
		items: rawUrls.map((i) => ({ key: i.key, text: i.text, detail: i.detail }))
	});

	const long = longParagraphs(entries);
	findings.push({
		id: 'paragraph-length',
		title: 'Paragraph length',
		status: proseCount === 0 ? 'unavailable' : long.length > 0 ? 'issue' : 'pass',
		summary:
			proseCount === 0
				? 'This page has no paragraphs to measure.'
				: long.length > 0
					? `${long.length} of ${proseCount} paragraph${proseCount > 1 ? 's' : ''} run past 3 sentences.`
					: `All ${proseCount} paragraphs are 3 sentences or fewer.`,
		help: 'howToWritePlainLanguage',
		items: long.map((i) => ({ key: i.key, text: i.text, detail: i.detail }))
	});

	// --- Markup checks: only meaningful against a rendered page.

	if (root) {
		const dom = runDomChecks(root);

		findings.push({
			id: 'heading-nesting',
			title: 'Heading nesting',
			status:
				dom.headingCount === 0 ? 'unavailable' : dom.headingJumps.length > 0 ? 'issue' : 'pass',
			summary:
				dom.headingCount === 0
					? 'No headings rendered on this page.'
					: dom.headingJumps.length > 0
						? `${dom.headingJumps.length} heading level${dom.headingJumps.length > 1 ? 's skip' : ' skips'} a step.`
						: `All ${dom.headingCount} headings step down one level at a time.`,
			help: 'headingLevels',
			items: dom.headingJumps.map((j) => ({
				text: `H${j.fromLevel} → H${j.toLevel}`,
				detail: `“${j.fromText}” is followed by “${j.toText}”.`
			}))
		});

		findings.push({
			id: 'image-alt',
			title: 'Image alt text',
			status:
				dom.imageCount === 0 ? 'unavailable' : dom.imagesMissingAlt.length > 0 ? 'issue' : 'pass',
			summary:
				dom.imageCount === 0
					? 'This mockup has no images. Karl requires alt text on upload, so this applies once images are added.'
					: dom.imagesMissingAlt.length > 0
						? `${dom.imagesMissingAlt.length} of ${dom.imageCount} images have no alt text.`
						: `All ${dom.imageCount} images have alt text.`,
			help: 'altText',
			items: dom.imagesMissingAlt.map((i) => ({ text: i.filename || i.src }))
		});

		findings.push({
			id: 'table-accessibility',
			title: 'Table captions and headers',
			status: dom.tableCount === 0 ? 'unavailable' : dom.tableIssues.length > 0 ? 'issue' : 'pass',
			summary:
				dom.tableCount === 0
					? 'This mockup renders no tables.'
					: dom.tableIssues.length > 0
						? `${dom.tableIssues.length} of ${dom.tableCount} tables are missing a caption or headers.`
						: `All ${dom.tableCount} tables have a caption and headers.`,
			help: 'tables',
			items: dom.tableIssues.map((t) => ({
				text: `Table ${t.index}`,
				detail: [
					t.missingCaption ? 'no caption' : null,
					t.missingHeaders ? 'no header row or column' : null
				]
					.filter(Boolean)
					.join(', ')
			}))
		});

		findings.push({
			id: 'video-accessibility',
			title: 'Video captions and transcripts',
			status: dom.videoCount === 0 ? 'unavailable' : dom.videoIssues.length > 0 ? 'issue' : 'pass',
			summary:
				dom.videoCount === 0
					? 'This mockup has no videos.'
					: dom.videoIssues.length > 0
						? `${dom.videoIssues.length} of ${dom.videoCount} videos could not be confirmed as captioned.`
						: `All ${dom.videoCount} videos have caption tracks.`,
			help: 'videoTranscript',
			items: dom.videoIssues.map((v) => ({ text: `Video ${v.index}`, detail: v.reason }))
		});
	}

	return {
		readability,
		target,
		targetStatus,
		readabilityHelp: 'readability',
		findings,
		measuredFields: entries.filter((e) => e.kind === 'heading' || e.kind === 'prose').length
	};
}

export { KARL_HELP, karlHelp } from './karlHelp';
export type { KarlHelpKey, KarlHelpLink } from './karlHelp';
export type { Readability } from './readability';
export { parseReadingTarget } from './readability';
