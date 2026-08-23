/**
 * The hosted seed must never carry the local seed's auth rows. `seed.sql`
 * creates an auth.users row whose password is the literal string
 * `dev-local-only`; applying that to the hosted project would plant a
 * known-password account. This is the guard for that failure.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { allPages } from '../src/lib/data/index.js';

const hosted = readFileSync(new URL('../supabase/seed.hosted.sql', import.meta.url), 'utf8');

describe('supabase/seed.hosted.sql', () => {
	it('contains no auth schema writes', () => {
		expect(hosted).not.toMatch(/auth\./);
		expect(hosted).not.toMatch(/dev-local-only/);
		expect(hosted).not.toMatch(/encrypted_password/);
	});

	it('inserts exactly one review', () => {
		expect(hosted.match(/INSERT INTO reviews/g)).toHaveLength(1);
	});

	it('inserts one page row per corpus page', () => {
		expect(hosted.match(/INSERT INTO pages/g)).toHaveLength(1);
		const values = hosted.slice(Math.max(0, hosted.indexOf('AS corpus(path)') - 4000));
		for (const page of allPages) {
			const id = page.slug
				? page.slug.replace('sf.gov/', '').replace(/\//g, '-')
				: page.title.replace(/\s+/g, '-').toLowerCase();
			expect(values).toContain(`('${id}')`);
		}
	});

	it('is idempotent', () => {
		expect(hosted).toContain('ON CONFLICT (id) DO NOTHING');
		expect(hosted).toContain('WHERE NOT EXISTS');
	});
});
