import { describe, it, expect } from 'vitest';
import { resolveLinkTarget } from './links';
import { routableId } from './pageId';
import { pagesByKey, allPages } from '$lib/data/index';
import { extractCopy } from './fields';
import { markdownLinksIn } from './markdown';

describe('routableId', () => {
	it('strips the sf.gov prefix and flattens slashes for the [slug] router', () => {
		expect(routableId({ slug: 'sf.gov/topic-x--about' })).toBe('topic-x--about');
		expect(routableId({ slug: 'sf.gov/information/learn-what-hhvc-can-inspect' })).toBe(
			'information-learn-what-hhvc-can-inspect'
		);
	});

	it('falls back to a slugified title when there is no slug', () => {
		expect(routableId({ title: 'About Vector Control' })).toBe('about-vector-control');
	});
});

describe('resolveLinkTarget', () => {
	it('treats an http(s) address as external', () => {
		expect(resolveLinkTarget('https://sf.gov/x')).toEqual({
			kind: 'external',
			href: 'https://sf.gov/x'
		});
	});

	it('resolves a pagesByKey key to that page slug and title', () => {
		const resolved = resolveLinkTarget('afterReport');
		expect(resolved.kind).toBe('internal');
		if (resolved.kind !== 'internal') return;
		expect(resolved.slug).toBe(routableId(pagesByKey.afterReport));
		expect(resolved.title).toBe(pagesByKey.afterReport.title);
	});

	it('treats `#` as an inert sentinel, not a broken link', () => {
		// The mockups use `#` where a link belongs but the destination is not
		// decided. Reporting it as broken would be a false finding.
		expect(resolveLinkTarget('#')).toEqual({ kind: 'inert' });
	});

	it('reports anything else as unresolved rather than guessing', () => {
		expect(resolveLinkTarget('notAPage')).toEqual({ kind: 'unresolved', target: 'notAPage' });
	});
});

describe('over the real corpus', () => {
	it('resolves every markdown link target on every page', () => {
		const unresolved: string[] = [];
		for (const page of allPages as Record<string, unknown>[]) {
			for (const [key, text] of Object.entries(extractCopy(page as never))) {
				for (const link of markdownLinksIn(text)) {
					if (resolveLinkTarget(link.url).kind === 'unresolved') {
						unresolved.push(`${String(page.slug)} / ${key} -> ${link.url}`);
					}
				}
			}
		}
		expect(unresolved, `unresolved link targets:\n${unresolved.join('\n')}`).toEqual([]);
	});

	it('resolves every internal target to a slug that matches a real page', () => {
		const ids = new Set((allPages as Record<string, unknown>[]).map((p) => routableId(p as never)));
		for (const key of Object.keys(pagesByKey)) {
			const resolved = resolveLinkTarget(key);
			expect(resolved.kind).toBe('internal');
			if (resolved.kind !== 'internal') continue;
			expect(ids.has(resolved.slug), `${key} -> /review/${resolved.slug}`).toBe(true);
		}
	});
});
