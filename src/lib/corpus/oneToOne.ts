import { KARL_PANELS } from '$lib/legacy-core/karl-blocks.js';

/**
 * The 1:1 rule: a mockup may not contain anything Karl has no field for.
 *
 * A mockup exists to be retyped into Karl by hand. Copy with no destination
 * field is therefore worse than absent -- a reviewer reads it, approves it, and
 * it silently cannot be rebuilt. The walkthrough's amber gap cards were the
 * manual version of this warning; a check at import replaces them for the class
 * of problem where the *mockup* is wrong rather than the page being incomplete.
 *
 * This cannot be derived wholesale from `KARL_PANELS`, and it is worth saying
 * why rather than leaving the next reader to rediscover it. Of the 89 panels
 * across the eight content types, only 27 carry a `source.path`; 40 are `none`
 * (Karl fields the mockups have no source for -- gaps, not violations) and 17
 * are `sections` (fed generically by the sections array). There are 9 distinct
 * source paths in total and none of them mentions `callout`. So the panel
 * inventory answers "which Karl field does this page-level property feed?" and
 * cannot answer "does this mockup element have anywhere to go?". The rules
 * below are the ones the 1:1 decision actually states, kept explicit and
 * individually justified.
 */
export type OneToOneViolation = {
	/** Page slug, as written in the data module. */
	slug: string;
	type: string;
	/** Where on the page, human-readable enough to find it. */
	where: string;
	/** The offending text, so a fix can be judged without opening the file. */
	text: string;
	rule: string;
	/** Why Karl cannot hold it. */
	reason: string;
};

/* eslint-disable-next-line @typescript-eslint/no-explicit-any --
   corpus modules are plain untyped objects; same scoped boundary as
   fieldResolver.ts and sitemap.ts. */
type AnyPage = Record<string, any>;

const PANELS = KARL_PANELS as unknown as Record<string, { blockTypesDoc?: unknown }[]>;

/**
 * Whether a content type has any panel that can hold an image.
 *
 * Read from the inventory rather than hardcoding the four types that can,
 * because that list is a property of the field map and will move with it. A
 * type with no inventory at all returns false: an unknown type cannot be shown
 * to have a home for the image, and the 1:1 rule fails closed.
 */
function acceptsImage(type: string): boolean {
	return (PANELS[type] ?? []).some((panel) => /image/i.test(String(panel.blockTypesDoc ?? '')));
}

export function findOneToOneViolations(pages: AnyPage[]): OneToOneViolation[] {
	const violations: OneToOneViolation[] = [];

	for (const page of pages) {
		const slug = String(page?.slug ?? '');
		const type = String(page?.type ?? '');

		// A Callout is ONE rich-text field, on any host. It has no title on any
		// content type, so a title written here has nowhere to land and whatever
		// it said is lost on rebuild.
		for (const section of page?.sections ?? []) {
			const hosts = [
				{ callout: section?.callout, where: `section "${String(section.heading ?? '')}" callout` },
				...(Array.isArray(section?.steps)
					? section.steps.map((step: AnyPage, i: number) => ({
						callout: step?.callout,
						where: `section "${String(section.heading ?? '')}" step [${i + 1}] callout`
					}))
					: [])
			];
			for (const host of hosts) {
				const title = host.callout?.title;
				if (typeof title === 'string' && title.trim()) {
					violations.push({
						slug,
						type,
						where: host.where,
						text: title.trim(),
						rule: 'callout-title',
						reason:
							'A Callout is one rich-text field with no title, on any host. Fold this into the callout body or drop it.'
					});
				}
			}
		}

		// Images belong to the types whose inventory has an image-bearing panel
		// (Information, Campaign, Agency, News). A Transaction has none, so a
		// photo on one cannot be rebuilt.
		if (page?.photo && !acceptsImage(type)) {
			violations.push({
				slug,
				type,
				where: 'page photo',
				text: String(page.photo?.alt ?? page.photo?.src ?? '(photo)'),
				rule: 'image-without-panel',
				reason: `No panel on a ${type || 'page'} holds an image.`
			});
		}
	}

	return violations;
}
