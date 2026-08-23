import { describe, it, expect } from 'vitest';
import { deriveFieldKey } from './fieldKey.js';

describe('deriveFieldKey', () => {
	it('slugifies the heading', () => {
		expect(deriveFieldKey({ heading: 'How to report' }, 0)).toBe('how-to-report');
	});

	it('strips punctuation and collapses runs', () => {
		expect(deriveFieldKey({ heading: 'What happens next?' }, 0)).toBe('what-happens-next');
		expect(deriveFieldKey({ heading: '  Article 11 -- compliance  ' }, 0)).toBe(
			'article-11-compliance'
		);
	});

	it('falls back to the index when there is no usable heading', () => {
		expect(deriveFieldKey({}, 3)).toBe('section-3');
		expect(deriveFieldKey({ heading: '???' }, 2)).toBe('section-2');
	});

	it('ignores a non-string heading', () => {
		expect(deriveFieldKey({ heading: 42 }, 1)).toBe('section-1');
	});
});
