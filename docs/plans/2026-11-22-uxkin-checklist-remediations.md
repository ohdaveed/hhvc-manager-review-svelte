# UXKIN Checklist Remediations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Resolve the two UXKIN Coding Agent UI Checklist defects: implement functional review data export (Checks 2 & 10) and meet the 44px touch target minimum on mobile navigation controls (Check 6).

**Architecture:**

1. Build a pure utility `buildReviewExport` and `triggerReviewExportDownload` in `$lib/data/exportReview.ts` that compiles current corpus review status, manager notes, page checks, and saved inline edits into a structured JSON export, converting the queue footer placeholder into an active, accessible button.
2. Update [`src/routes/review/+layout.svelte`](file:///home/ohdaveed/hhvc-manager-review-svelte/src/routes/review/+layout.svelte) to bind the export button to `triggerReviewExportDownload` and update toolbar buttons with `min-h-11 min-w-11` (44px) tap targets for narrow/touch viewports.
3. Update tests to verify `buildReviewExport` serialization and decoupled `queue-start` behavior without placeholder coupling.

**Tech Stack:** Svelte 5, TypeScript, Vite, Vitest, Playwright.

---

### Task 1: Create Review Data Export Utility & Unit Tests

**Files:**

- Create: `src/lib/data/exportReview.ts`
- Create: `tests/reviewExport.test.ts`

**Step 1: Write the failing unit tests for `buildReviewExport`**

Create `tests/reviewExport.test.ts` testing:

- Serializes corpus pages combined with live Supabase review status (`status`, `manager_notes`, `page_checks`).
- Defaults unreviewed pages to status `'needs-review'`.
- Includes timestamp, total pages, decided count, and all associated inline edits.

```typescript
import { describe, expect, it } from 'vitest';
import { buildReviewExport } from '$lib/data/exportReview';
import type { ReviewPage, Edit } from '$lib/stores/reviewState';

describe('buildReviewExport', () => {
	it('combines corpus metadata with live review decisions and edits', () => {
		const corpus = [
			{ id: 'page-1', title: 'Page 1', slug: 'https://sf.gov/page-1', type: 'Service' },
			{ id: 'page-2', title: 'Page 2', slug: 'https://sf.gov/page-2', type: 'Information' }
		];

		const livePages: ReviewPage[] = [
			{
				id: 'live-1',
				path: 'page-1',
				status: 'approved',
				manager_notes: 'Looks great.',
				page_checks: { altText: { status: 'pass', message: 'All images have alt' } },
				updated_at: '2026-11-22T05:00:00Z'
			}
		];

		const edits: Edit[] = [
			{
				id: 'edit-1',
				page_id: 'live-1',
				field_id: 'heading-1',
				new_content: 'Updated Heading',
				created_at: '2026-11-22T05:10:00Z'
			}
		];

		const exportData = buildReviewExport(corpus, livePages, edits);

		expect(exportData.totalPages).toBe(2);
		expect(exportData.decidedCount).toBe(1);
		expect(exportData.pages).toHaveLength(2);

		const p1 = exportData.pages.find((p) => p.id === 'page-1');
		expect(p1?.status).toBe('approved');
		expect(p1?.managerNotes).toBe('Looks great.');
		expect(p1?.pageChecks).toEqual({ altText: { status: 'pass', message: 'All images have alt' } });

		const p2 = exportData.pages.find((p) => p.id === 'page-2');
		expect(p2?.status).toBe('needs-review');
		expect(p2?.managerNotes).toBe('');

		expect(exportData.edits).toHaveLength(1);
		expect(exportData.edits[0].fieldId).toBe('heading-1');
		expect(exportData.edits[0].newContent).toBe('Updated Heading');
	});
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test:unit tests/reviewExport.test.ts --run`  
Expected: FAIL with module `$lib/data/exportReview` not found.

**Step 3: Implement `src/lib/data/exportReview.ts`**

Write `buildReviewExport` and `triggerReviewExportDownload` with proper DOM blob creation and cleanup.

**Step 4: Run test to verify it passes**

Run: `bun run test:unit tests/reviewExport.test.ts --run`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/data/exportReview.ts tests/reviewExport.test.ts
git commit -m "feat(export): add review data export serialiser and download helper"
```

---

### Task 2: Replace Queue Footer Placeholder with Real Export Button

**Files:**

- Modify: `src/routes/review/+layout.svelte:95-105, 274-285`
- Modify: `tests/toolbarQueueStart.e2e.ts:55-62`

**Step 1: Update `src/routes/review/+layout.svelte`**

1. Import `triggerReviewExportDownload` from `$lib/data/exportReview`.
2. Clean up `firstQueueTarget` comment (it now serves purely as `firstQueueTarget` for `queue-start`, rather than a dual-purpose fallback for export).
3. Replace the placeholder `<a data-testid="export-review-data">` with:
   ```svelte
   <button
   	type="button"
   	class="text-[13px] font-semibold text-sfds-action hover:underline"
   	data-testid="export-review-data"
   	onclick={() => triggerReviewExportDownload(pageStore.pages, $pagesStore, $editsStore)}
   >
   	Export review data
   </button>
   ```

**Step 2: Update `tests/toolbarQueueStart.e2e.ts`**

Update the third test:
Decouple `queue-start` from `export-review-data` and assert that `export-review-data` exists as an active export control in the queue footer while `queue-start` maintains its target.

**Step 3: Run unit and ratchet tests**

Run:
`bun run test:unit --run && bun run check:ratchet`  
Expected: PASS.

**Step 4: Commit**

```bash
git add src/routes/review/+layout.svelte tests/toolbarQueueStart.e2e.ts
git commit -m "fix(workspace): make export review data an active download control"
```

---

### Task 3: Enforce 44px Touch Targets on Mobile Toolbar Controls

**Files:**

- Modify: `src/routes/review/+layout.svelte:348-364`

**Step 1: Update mobile toolbar triggers to satisfy 44px touch target**

In `src/routes/review/+layout.svelte`:
Replace `class="narrow-only h-7 flex-none text-xs"` with:
`class="narrow-only min-h-11 min-w-11 px-3.5 text-xs font-semibold"` on both the `Queue` and `Review` sheet trigger buttons.

**Step 2: Verify responsive layout and no horizontal overflow**

Run: `bun run test:unit --run` and inspect `tests/mockupResponsive.e2e.ts` compatibility.

**Step 3: Run check ratchet and lint**

Run:
`bun run check:ratchet && bun run lint:ratchet`  
Expected: Both PASS at baseline.

**Step 4: Commit**

```bash
git add src/routes/review/+layout.svelte
git commit -m "fix(a11y): enlarge mobile sheet triggers to 44px touch targets"
```

---

### Task 4: Update UXKIN UI Checklist Audit Artifact with 10/10 Score

**Files:**

- Modify: `/home/ohdaveed/.gemini/antigravity-cli/brain/04d24f01-e67f-4ae2-b060-9d1efacb8cde/uxkin-ui-checklist-audit.md`

**Step 1: Update the audit artifact**

Reflect that Checks 2, 6, and 10 have been resolved, bringing the overall audit score to **10 / 10 Passing**.

**Step 2: Final verification**

Run full suite check:
`bun run test:unit --run && bun run check:ratchet && bun run lint:ratchet`
