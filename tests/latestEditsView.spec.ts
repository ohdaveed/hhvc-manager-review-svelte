/**
 * `latest_edits` must keep `security_invoker = true`.
 *
 * Without it a view runs with its owner's rights, so the RLS on `edits` stops
 * applying to whoever reads through it. `edits_select` is `USING (true)` today,
 * so nothing leaks either way right now -- which is exactly why a regression
 * here would be invisible until the day that policy is narrowed and the
 * narrowing fails to reach this view's readers. Guard the property, not the
 * symptom.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const sql = readFileSync(
	new URL('../supabase/migrations/20260827110000_latest_edits_view.sql', import.meta.url),
	'utf8'
);

describe('supabase/migrations/20260827110000_latest_edits_view.sql', () => {
	it('creates the view with security_invoker enabled', () => {
		expect(sql).toMatch(/CREATE VIEW latest_edits WITH \(security_invoker = true\)/);
	});

	it('returns one row per (page_id, field_id), newest first', () => {
		expect(sql).toMatch(/DISTINCT ON \(page_id, field_id\)/);
		expect(sql).toMatch(/ORDER BY page_id, field_id, created_at DESC/);
	});

	it('indexes the columns the view distinguishes and orders on', () => {
		expect(sql).toMatch(/ON edits \(page_id, field_id, created_at DESC\)/);
	});

	it('grants the view to authenticated, and nothing to anon', () => {
		expect(sql).toMatch(/GRANT SELECT ON latest_edits TO authenticated/);
		expect(sql).not.toMatch(/TO anon/);
	});
});
