import { describe, expect, it } from 'vitest';
import { panelsFor } from '$lib/legacy-core/karl-blocks.js';
import { SCHEMA_TYPES, declaredRules, schemaFor } from './schema';

type Row = { rawName: string; order: number };
const inventory = (type: string) => (panelsFor as unknown as (t: string) => Row[])(type);

describe('Karl schema', () => {
	it.each(SCHEMA_TYPES)('%s: every rule names a panel the live form has', (type) => {
		const names = new Set(inventory(type).map((p) => p.rawName));
		for (const rawName of Object.keys(declaredRules(type))) expect(names).toContain(rawName);
	});

	it.each(SCHEMA_TYPES)('%s: panels come from the inventory, in its order', (type) => {
		const schema = schemaFor(type);
		expect(schema?.panels.map((p) => [p.rawName, p.order])).toEqual(
			inventory(type).map((p) => [p.rawName, p.order])
		);
	});

	it.each(SCHEMA_TYPES)('%s: every rule, and the URL pattern, carries a citation', (type) => {
		const schema = schemaFor(type)!;
		expect(schema.url.cite.url).toMatch(/^https:\/\//);
		expect(schema.url.cite.says).not.toBe('');
		for (const panel of schema.panels) {
			for (const rule of panel.rules) {
				expect(rule.cite.url).not.toBe('');
				expect(rule.cite.says).not.toBe('');
			}
		}
	});

	it('states the Title and Description limits Karl gives', () => {
		const tx = schemaFor('Transaction')!;
		const rule = (raw: string) => tx.panels.find((p) => p.rawName === raw)!.rules[0];
		expect(rule('title')).toMatchObject({ kind: 'maxChars', max: 65, strict: true });
		expect(rule('description')).toMatchObject({ kind: 'maxChars', max: 110, strict: false });
		expect(rule('things_to_know')).toMatchObject({ kind: 'maxItems', max: 2 });
		expect(rule('section_specifics')).toMatchObject({ sub: 'Button link', max: 25 });
		expect(rule('what_to_do')).toMatchObject({ kind: 'fixedHeading', heading: 'What to do' });
	});

	it('marks the URL patterns Karl contradicts itself on as unconfirmed', () => {
		expect(schemaFor('Transaction')!.url.status).toBe('confirmed');
		expect(schemaFor('Information')!.url.status).toBe('unconfirmed');
		expect(schemaFor('Resource Collection')!.url.status).toBe('unconfirmed');
	});

	it('knows Resource Collection has no Related panel', () => {
		expect(schemaFor('Resource Collection')!.relatedTargets).toBeNull();
		expect(schemaFor('Transaction')!.relatedTargets).toContain('Information');
	});

	it('marks the redirect panel inert, and nothing else on these types', () => {
		const inert = SCHEMA_TYPES.flatMap((t) =>
			schemaFor(t)!
				.panels.filter((p) => p.inert)
				.map((p) => `${t}.${p.rawName}`)
		);
		expect(inert).toEqual(['Transaction.redirect_url']);
	});

	it('returns null for a type this slice does not cover', () => {
		expect(schemaFor('Topic')).toBeNull();
		expect(schemaFor(undefined)).toBeNull();
	});
});
