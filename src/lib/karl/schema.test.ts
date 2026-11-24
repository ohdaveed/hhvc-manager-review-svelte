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
		expect(inert).toEqual(['Transaction.redirect_url', 'Agency.agency_redirect']);
	});

	it('returns null for a type this slice does not cover', () => {
		expect(schemaFor('About us')).toBeNull();
		expect(schemaFor(undefined)).toBeNull();
	});
});

describe('Step by step schema', () => {
	const sbs = schemaFor('Step by step')!;
	const rules = (raw: string) => sbs.panels.find((p) => p.rawName === raw)!.rules;

	it('caps steps at 15, advises 5, requires a title, and allows one Transaction link each', () => {
		expect(rules('steps')).toEqual([
			expect.objectContaining({ kind: 'maxItems', max: 15, status: 'confirmed' }),
			expect.objectContaining({ kind: 'targetItems', target: 5 }),
			expect.objectContaining({ kind: 'required', sub: 'Title' }),
			expect.objectContaining({ kind: 'maxItems', max: 1, per: 'step', status: 'confirmed' })
		]);
	});

	it('marks the Topics behaviour and the URL unconfirmed: Karl contradicts itself on both', () => {
		expect(rules('topics')).toEqual([
			expect.objectContaining({ kind: 'caveat', status: 'unconfirmed' })
		]);
		expect(sbs.url.status).toBe('unconfirmed');
	});

	it('has no Related panel', () => {
		expect(sbs.relatedTargets).toBeNull();
		expect(sbs.panels.map((p) => p.rawName)).not.toContain('related');
	});
});

describe('Topic schema', () => {
	const topic = schemaFor('Topic')!;
	const rules = (raw: string) => topic.panels.find((p) => p.rawName === raw)!.rules;

	it('labels the content stream as the form does, and says which "Child topics" it is', () => {
		const panel = topic.panels.find((p) => p.rawName === 'content_fields')!;
		expect(panel.label).toBe('Child topics');
		expect(panel.helpLabel).toBe('Page content');
	});

	it('allows one spotlight, and marks the button and More services unconfirmed', () => {
		expect(rules('content_fields')).toEqual([
			expect.objectContaining({
				kind: 'maxItems',
				max: 1,
				block: 'spotlight',
				status: 'confirmed'
			}),
			expect.objectContaining({ kind: 'caveat', sub: 'Spotlight button', status: 'unconfirmed' }),
			expect.objectContaining({ kind: 'caveat', sub: 'Services', status: 'unconfirmed' })
		]);
	});

	it('says only Digital Services can create a Topic page', () => {
		expect(topic.pageCaveats).toEqual([
			expect.objectContaining({
				status: 'confirmed',
				cite: expect.objectContaining({ says: 'Only DS can make new topics.' })
			})
		]);
	});

	it('has no Related panel and an unconfirmed URL', () => {
		expect(topic.relatedTargets).toBeNull();
		expect(topic.url.status).toBe('unconfirmed');
	});
});

describe('Campaign schema', () => {
	const campaign = schemaFor('Campaign')!;
	const rules = (raw: string) => campaign.panels.find((p) => p.rawName === raw)!.rules;

	it('caps a spotlight button at 25 characters on both spotlights', () => {
		for (const raw of ['spotlight_1', 'spotlight_2'])
			expect(rules(raw)).toEqual([
				expect.objectContaining({ kind: 'maxChars', sub: 'Button', max: 25 })
			]);
	});

	it('advises no more than 5 accordions, and has no Description panel', () => {
		expect(rules('additional_content')).toEqual([
			expect.objectContaining({ kind: 'targetItems', target: 5, block: 'supporting' })
		]);
		expect(campaign.panels.map((p) => p.rawName)).not.toContain('description');
	});

	it('marks Contact us unconfirmed: the form has it, Karl’s Campaign guide does not', () => {
		expect(rules('contact')).toEqual([
			expect.objectContaining({ kind: 'caveat', status: 'unconfirmed' })
		]);
	});

	it('has a confirmed URL and a Related panel', () => {
		expect(campaign.url.status).toBe('confirmed');
		expect(campaign.relatedTargets).toContain('Transaction');
	});
});
