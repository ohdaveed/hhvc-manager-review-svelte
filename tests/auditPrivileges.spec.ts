/**
 * The rules behind `bun run audit:privileges` (PLAN.md G2), tested without a
 * database so they run in CI, which has none.
 *
 * The script's own PASS against a clean local stack proves nothing about
 * whether it detects; these cases are what say it does.
 */
import { describe, it, expect } from 'vitest';
import { classify, ALLOWLIST, type FunctionGrant } from '../scripts/audit-privileges.js';

const fn = (over: Partial<FunctionGrant> = {}): FunctionGrant => ({
	name: 'some_fn',
	anon: false,
	authenticated: false,
	security_definer: false,
	search_path: 'search_path=""',
	...over
});

describe('classify', () => {
	it('passes a function no public role can execute', () => {
		expect(classify([fn()], [])).toEqual([]);
	});

	it('flags an anon EXECUTE grant', () => {
		expect(classify([fn({ anon: true })], [])).toEqual([
			{ name: 'some_fn', reason: 'EXECUTE granted to: anon' }
		]);
	});

	it('flags an authenticated EXECUTE grant', () => {
		expect(classify([fn({ authenticated: true })], [])[0].reason).toBe(
			'EXECUTE granted to: authenticated'
		);
	});

	it('names both roles in one finding rather than two', () => {
		const found = classify([fn({ anon: true, authenticated: true })], []);
		expect(found).toHaveLength(1);
		expect(found[0].reason).toBe('EXECUTE granted to: anon, authenticated');
	});

	it('respects the allowlist', () => {
		expect(classify([fn({ anon: true })], ['some_fn'])).toEqual([]);
	});

	it('flags SECURITY DEFINER with no pinned search_path', () => {
		const found = classify([fn({ security_definer: true, search_path: null })], []);
		expect(found).toEqual([
			{ name: 'some_fn', reason: 'SECURITY DEFINER with no SET search_path' }
		]);
	});

	it('accepts SECURITY DEFINER once search_path is pinned', () => {
		expect(classify([fn({ security_definer: true })], [])).toEqual([]);
	});

	it('reports both problems when one function has both', () => {
		const found = classify([fn({ anon: true, security_definer: true, search_path: null })], []);
		expect(found).toHaveLength(2);
	});

	/**
	 * Not style. An entry here makes a function callable at
	 * /rest/v1/rpc/<name> by anyone holding the anon key, so it should never
	 * arrive as a drive-by edit -- this failing is the prompt to justify it.
	 */
	it('ships with an empty allowlist', () => {
		expect(ALLOWLIST).toEqual([]);
	});
});
