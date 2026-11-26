import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findImageIssues, imagePlacement, type SectionImage } from './sectionImage.js';
import { allPages } from '../data/index.js';

const good: SectionImage = {
	src: '/images/mockup/x.webp',
	alt: 'A brown rat on a sidewalk.',
	width: 1024,
	height: 768,
	credit: { creator: 'Someone', sourceUrl: 'https://example.org/x', license: 'CC BY 2.0' }
};

const page = (type: string, image: unknown, component?: string) => [
	{ slug: 's', type, sections: [{ heading: 'H', component, image }] }
];

describe('imagePlacement', () => {
	it('knows the two verified homes and nothing else', () => {
		expect(imagePlacement('Information')?.minWidth).toBe(700);
		expect(imagePlacement('Campaign', 'spotlight')).toMatchObject({
			minWidth: 1080,
			minHeight: 350
		});
		expect(imagePlacement('Campaign', 'supporting')).toBeNull();
		expect(imagePlacement('Transaction')).toBeNull();
	});
});

describe('findImageIssues', () => {
	it('passes an image that meets every rule', () => {
		expect(findImageIssues(page('Information', good))).toEqual([]);
	});

	it('enforces the per-placement minimum size', () => {
		const narrow = { ...good, width: 600 };
		expect(findImageIssues(page('Information', narrow))[0]?.problem).toMatch(
			/needs at least 700px/
		);
		// 1024 is enough for an Information image but not a Spotlight.
		expect(findImageIssues(page('Campaign', good, 'spotlight'))[0]?.problem).toMatch(/1080px/);
	});

	it('refuses a placement Karl has no verified field for', () => {
		expect(findImageIssues(page('Transaction', good))[0]?.problem).toMatch(
			/no verified Karl image field/
		);
	});

	it('applies the alt-text rules', () => {
		const problems = (alt: string) =>
			findImageIssues(page('Information', { ...good, alt })).map((i) => i.problem);
		expect(problems('')).toContain('alt text is required');
		expect(problems('Image of a rat')[0]).toMatch(/must not start with "image of"/);
		expect(problems('Photo of a rat')[0]).toMatch(/must not start/);
		expect(problems('x'.repeat(121))[0]).toMatch(/121 characters/);
		// "Photographer" is not "photo of": the rule must not catch ordinary words.
		expect(problems('Photographers at a press event.')).toEqual([]);
	});

	it('requires a complete attribution', () => {
		const noCredit = { ...good, credit: { creator: '', sourceUrl: 'http://x', license: '' } };
		expect(findImageIssues(page('Information', noCredit)).map((i) => i.problem)).toEqual([
			'credit needs the creator',
			'credit needs an https link to the source',
			'credit needs the licence'
		]);
	});
});

/**
 * Pixel size straight from the WebP header, so the declared `width`/`height`
 * -- which are what the size rules check -- cannot drift from the file an
 * editor will actually upload. Handles the two chunk types `cwebp`/Pillow
 * write for photos: VP8 (lossy) and VP8X (extended).
 */
function webpSize(buf: Buffer): { width: number; height: number } {
	expect(buf.toString('ascii', 0, 4)).toBe('RIFF');
	expect(buf.toString('ascii', 8, 12)).toBe('WEBP');
	const chunk = buf.toString('ascii', 12, 16);
	if (chunk === 'VP8 ') {
		return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
	}
	if (chunk === 'VP8X') {
		return { width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 };
	}
	throw new Error(`unhandled WebP chunk ${chunk}`);
}

describe('the real corpus', () => {
	// Corpus modules are untyped object literals, so read them through the
	// same loose shape `findImageIssues` uses rather than fight the inferred
	// union of every section on every page.
	const images = (
		allPages as { slug: string; sections?: { heading?: string; image?: SectionImage }[] }[]
	)
		.flatMap((p) =>
			(p.sections ?? []).map((s) => ({ slug: p.slug, heading: s.heading, image: s.image }))
		)
		.filter((entry): entry is { slug: string; heading: string | undefined; image: SectionImage } =>
			Boolean(entry.image)
		);

	it('has the images this corpus is known to carry', () => {
		expect(images.length).toBe(4);
	});

	it('breaks no Karl image rule', () => {
		expect(findImageIssues(allPages)).toEqual([]);
	});

	it.each(images)('$slug › $heading: the file exists at its declared size', ({ image }) => {
		const file = join(process.cwd(), 'static', image.src);
		expect(existsSync(file)).toBe(true);
		expect(webpSize(readFileSync(file))).toEqual({ width: image.width, height: image.height });
	});
});
