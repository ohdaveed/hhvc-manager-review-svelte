import { describe, expect, it } from 'vitest';
import { composeDraftRequest, normalizeSfPath } from './propose';

const base = { description: '  A page about rat bait  ', section: '', path: '' };

describe('composeDraftRequest', () => {
	it('is exactly the trimmed words when nothing is chosen', () => {
		expect(composeDraftRequest({ ...base, template: 'suggest' })).toBe('A page about rat bait');
	});

	it('writes each choice on its own line after a blank line', () => {
		expect(
			composeDraftRequest({
				description: 'Report a dead animal',
				section: 'Report a problem',
				template: 'Transaction',
				path: '/report-dead-animal'
			})
		).toBe(
			'Report a dead animal\n\nKarl template: Transaction.\nSection of the HHVC site: Report a problem.\nSuggested path: sf.gov/report-dead-animal'
		);
	});

	it('leaves out the template line when the drafter is to suggest one', () => {
		expect(composeDraftRequest({ ...base, section: 'About HHVC', template: 'suggest' })).toBe(
			'A page about rat bait\n\nSection of the HHVC site: About HHVC.'
		);
	});
});

describe('normalizeSfPath', () => {
	it('reads every way of writing a path as one', () => {
		for (const raw of [
			'report-dead-animal',
			'/report-dead-animal',
			'sf.gov/report-dead-animal',
			'https://www.sf.gov/report-dead-animal',
			'  report-dead-animal '
		])
			expect(normalizeSfPath(raw)).toBe('sf.gov/report-dead-animal');
	});

	it('is empty for a blank path', () => {
		expect(normalizeSfPath('   ')).toBe('');
		expect(normalizeSfPath('sf.gov/')).toBe('');
	});
});
