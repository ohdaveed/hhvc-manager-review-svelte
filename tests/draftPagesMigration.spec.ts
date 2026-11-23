/**
 * `draft_pages` holds AI-drafted page content. Like `pages`, it has no write
 * policy: every write goes through a service-role server route, so a signed-in
 * client can read drafts but never forge one.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const sql = readFileSync(
	new URL('../supabase/migrations/20261123100000_draft_pages.sql', import.meta.url),
	'utf8'
);

describe('draft_pages migration', () => {
	it('enables RLS and grants only SELECT to authenticated', () => {
		expect(sql).toMatch(/ALTER TABLE draft_pages ENABLE ROW LEVEL SECURITY/);
		expect(sql).toMatch(
			/CREATE POLICY "draft_pages_select" ON draft_pages\s+FOR SELECT TO authenticated/
		);
		expect(sql).not.toMatch(/FOR (INSERT|UPDATE|DELETE)/);
	});

	it('constrains state to the three values the client branches on', () => {
		expect(sql).toMatch(/CHECK \(state IN \('drafting', ?'ready', ?'failed'\)\)/);
	});

	it('states its table privileges rather than inheriting them', () => {
		expect(sql).toMatch(/GRANT SELECT ON draft_pages TO authenticated/);
		expect(sql).not.toMatch(/GRANT (INSERT|UPDATE|DELETE|ALL)/);
	});
});
