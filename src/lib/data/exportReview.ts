import type { ReviewPage, Edit } from '$lib/stores/reviewState';

export interface ExportedPageEntry {
	id: string;
	title: string;
	slug?: string;
	type?: string;
	status: string;
	managerNotes: string;
	pageChecks: Record<string, unknown>;
}

export interface ExportedEditEntry {
	id?: string;
	pageId: string;
	fieldId: string;
	newContent: string;
	createdAt?: string | null;
}

export interface ReviewExportData {
	exportedAt: string;
	totalPages: number;
	decidedCount: number;
	pages: ExportedPageEntry[];
	edits: ExportedEditEntry[];
}

export interface CorpusExportItem {
	id: string;
	title: string;
	slug?: string;
	type?: string;
}

/**
 * Compiles static corpus pages and live review decisions/edits into a
 * structured, portable JSON representation.
 */
export function buildReviewExport(
	corpusPages: CorpusExportItem[],
	livePages: ReviewPage[],
	edits: Edit[]
): ReviewExportData {
	const pages: ExportedPageEntry[] = corpusPages.map((p) => {
		const live = livePages.find((lp) => lp.path === p.id);
		return {
			id: p.id,
			title: p.title,
			slug: p.slug,
			type: p.type,
			status: live?.status ?? 'needs-review',
			managerNotes: live?.manager_notes ?? '',
			pageChecks: (live?.page_checks as Record<string, unknown>) ?? {}
		};
	});

	return {
		exportedAt: new Date().toISOString(),
		totalPages: pages.length,
		decidedCount: pages.filter((p) => p.status !== 'needs-review').length,
		pages,
		edits: edits.map((e) => ({
			id: e.id,
			pageId: e.page_id,
			fieldId: e.field_id,
			newContent: e.new_content,
			createdAt: e.created_at
		}))
	};
}

/**
 * Triggers a client-side JSON download of the active review data.
 */
export function triggerReviewExportDownload(
	corpusPages: CorpusExportItem[],
	livePages: ReviewPage[],
	edits: Edit[]
): void {
	const data = buildReviewExport(corpusPages, livePages, edits);
	const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `hhvc-review-data-${new Date().toISOString().slice(0, 10)}.json`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
