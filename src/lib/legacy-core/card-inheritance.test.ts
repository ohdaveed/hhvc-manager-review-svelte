import { describe, expect, it } from 'vitest';
import { classifySection } from './card-inheritance.js';

const of = (karl: string) => classifySection({ karl });

describe('classifySection', () => {
	it('classifies a note that names a block positively', () => {
		expect(of('Maps to a Title and text block.')).toBe('authored');
		expect(of('Maps to the Related field: a generic unrestricted "Page" chooser.')).toBe(
			'title-only'
		);
		expect(of('Maps to the Agency Services subsection.')).toBe('inherits');
		expect(of('An external-URL card.')).toBe('unknown');
	});

	// A note that describes a field by denying it used to be read as naming it.
	describe('ignores a block named only to deny it', () => {
		it.each([
			['Transaction has no per-step page chooser.', 'unknown'],
			["there's no accompanying Title and text block here.", 'unknown'],
			['This is not a Title and text block.', 'unknown'],
			['Shown without a Related panel.', 'unknown'],
			['Maps to the Related field, rather than a Title and text block.', 'title-only'],
			[
				'Resource Collection has no dedicated Related field — maps to a Resource section.',
				'title-only'
			]
		])('%s → %s', (karl, expected) => {
			expect(of(karl)).toBe(expected);
		});
	});

	it('still matches a block named again positively after a denial', () => {
		expect(of('There is no Related panel. Maps to a Title and text block.')).toBe('authored');
	});

	it('does not read a negation that is more than three words away', () => {
		expect(of('Information has no Contact us panel, so this maps to a Title and text block.')).toBe(
			'authored'
		);
	});
});
