import { deriveFieldKey } from '$lib/corpus/fieldKey';
import { sectionDisplayLabel } from '$lib/corpus/fieldResolver';
import type { CorpusPage } from '$lib/corpus/fields';
import { placementsFor, type PagePlacements, type PlacementStatus } from './placement';
import type { ReviewRecord } from './reviewRecord';

export type ReadinessBadge =
	'populated' | 'ai-drafted' | 'mapped' | 'needs-fix' | 'unconfirmed' | 'unmapped';

export type ReadinessRow = {
	id: string;
	label: string;
	badge: ReadinessBadge;
	badgeLabel: string;
	highlightKind: 'field' | 'section' | 'whatToKnow';
	highlightTarget: string;
	karlPanel: string | null;
	reasons: string[];
};

export type ReadinessSummary = {
	/** Sections (or top-level items when a page has no sections) that map into Karl. */
	inKarlCount: number;
	totalCount: number;
	unit: 'sections' | 'items';
	rows: ReadinessRow[];
};

type SectionShape = {
	fieldKey?: unknown;
	heading?: unknown;
};

type PageShape = CorpusPage & {
	id?: string;
	title?: unknown;
	summary?: unknown;
	whatToKnow?: unknown;
	sections?: SectionShape[];
};

const BADGE_LABEL: Record<ReadinessBadge, string> = {
	populated: 'Populated',
	'ai-drafted': 'AI-drafted',
	mapped: 'Mapped to Karl',
	'needs-fix': 'Needs a fix',
	unconfirmed: 'Unconfirmed',
	unmapped: 'Unmapped'
};

function mapFieldBadge(
	status: PlacementStatus | undefined,
	hasValue: boolean,
	isDraft: boolean
): ReadinessBadge {
	if (!hasValue) return 'unmapped';
	if (status === 'unplaced') return 'unmapped';
	if (status === 'needs-fix') return 'needs-fix';
	if (status === 'unconfirmed') return 'unconfirmed';
	return isDraft ? 'ai-drafted' : 'populated';
}

function mapSectionBadge(status: PlacementStatus | undefined): ReadinessBadge {
	if (status === 'unplaced' || !status) return 'unmapped';
	if (status === 'needs-fix') return 'needs-fix';
	if (status === 'unconfirmed') return 'unconfirmed';
	return 'mapped';
}

/**
 * Derives the ordered Karl Readiness rows shown in the Fields tab from the
 * page's live copy and computed Karl placements.
 */
export function buildReadinessSummary(
	page: PageShape | null | undefined,
	record: ReviewRecord | null,
	pagesByKey: object,
	options: { isDraft?: boolean } = {}
): ReadinessSummary {
	if (!page) {
		return { inKarlCount: 0, totalCount: 0, unit: 'items', rows: [] };
	}

	const isDraft = options.isDraft === true;
	const placements: PagePlacements = placementsFor(page, record, pagesByKey);
	const rows: ReadinessRow[] = [];

	const titleText = typeof page.title === 'string' ? page.title.trim() : '';
	const titlePlacement = placements.fields.get('title');
	const titleBadge = mapFieldBadge(titlePlacement?.status, titleText.length > 0, isDraft);
	rows.push({
		id: 'title',
		label: 'Title / H1',
		badge: titleBadge,
		badgeLabel: BADGE_LABEL[titleBadge],
		highlightKind: 'field',
		highlightTarget: 'title',
		karlPanel: titlePlacement?.rawName ?? null,
		reasons: titlePlacement?.reasons ?? []
	});

	const summaryText = typeof page.summary === 'string' ? page.summary.trim() : '';
	const summaryPlacement = placements.fields.get('summary');
	const summaryBadge = mapFieldBadge(summaryPlacement?.status, summaryText.length > 0, isDraft);
	rows.push({
		id: 'summary',
		label: 'Summary / Lead',
		badge: summaryBadge,
		badgeLabel: BADGE_LABEL[summaryBadge],
		highlightKind: 'field',
		highlightTarget: 'summary',
		karlPanel: summaryPlacement?.rawName ?? null,
		reasons: summaryPlacement?.reasons ?? []
	});

	if (page.whatToKnow) {
		const wtkBadge = mapSectionBadge(placements.whatToKnow?.status);
		rows.push({
			id: 'whatToKnow',
			label: 'What to know',
			badge: wtkBadge,
			badgeLabel: BADGE_LABEL[wtkBadge],
			highlightKind: 'whatToKnow',
			highlightTarget: 'whatToKnow',
			karlPanel: placements.whatToKnow?.rawName ?? null,
			reasons: placements.whatToKnow?.reasons ?? []
		});
	}

	const sections = Array.isArray(page.sections) ? page.sections : [];
	let placedSections = 0;

	sections.forEach((section, index) => {
		const key =
			typeof section.fieldKey === 'string' && section.fieldKey
				? section.fieldKey
				: deriveFieldKey(section, index);
		const placement = placements.sections.get(key);
		const badge = mapSectionBadge(placement?.status);
		if (badge !== 'unmapped') placedSections += 1;

		rows.push({
			id: `section:${key}`,
			label: sectionDisplayLabel(section.heading, index),
			badge,
			badgeLabel: BADGE_LABEL[badge],
			highlightKind: 'section',
			highlightTarget: key,
			karlPanel: placement?.rawName ?? null,
			reasons: placement?.reasons ?? []
		});
	});

	if (sections.length > 0) {
		return {
			inKarlCount: placedSections,
			totalCount: sections.length,
			unit: 'sections',
			rows
		};
	}

	const inKarlItems = rows.filter((row) => row.badge !== 'unmapped').length;
	return {
		inKarlCount: inKarlItems,
		totalCount: rows.length,
		unit: 'items',
		rows
	};
}
