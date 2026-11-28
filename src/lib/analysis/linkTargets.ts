import { deriveFieldKey } from '$lib/corpus/fieldKey';
import { markdownLinksIn } from '$lib/corpus/markdown';
import { entryText } from '$lib/corpus/fieldResolver';

export type LinkTargetKind = 'external' | 'internal';

export type LinkTarget = {
	id: string;
	kind: LinkTargetKind;
	rawTarget: string;
	displayUrl: string;
	label: string;
	fieldId: string;
	sectionKey?: string;
};

type PageEntry = Record<string, unknown>;

const SFGOV_HOST = /^(?:https?:\/\/)?(?:www\.)?(?:sf\.gov|sfgov\.org)(?:\/|$)/i;
const HTTP_URL = /^https?:\/\//i;
const NON_PAGE_SCHEME = /^(?:mailto:|tel:|sms:|javascript:|#)/i;

function classifyTarget(
	raw: string,
	pagesByKey: Record<string, PageEntry>
): { kind: LinkTargetKind; displayUrl: string } | null {
	const trimmed = raw.trim();
	if (!trimmed || NON_PAGE_SCHEME.test(trimmed)) return null;

	if (HTTP_URL.test(trimmed)) {
		const displayUrl = trimmed.replace(/^https?:\/\/(?:www\.)?/i, '').replace(/\/$/, '');
		return {
			kind: SFGOV_HOST.test(trimmed) ? 'internal' : 'external',
			displayUrl
		};
	}

	if (trimmed.startsWith('/')) {
		return { kind: 'internal', displayUrl: `sf.gov${trimmed}` };
	}

	if (SFGOV_HOST.test(trimmed)) {
		return {
			kind: 'internal',
			displayUrl: trimmed.replace(/^https?:\/\/(?:www\.)?/i, '').replace(/\/$/, '')
		};
	}

	const targetPage = pagesByKey[trimmed];
	const slug = typeof targetPage?.slug === 'string' ? targetPage.slug : '';
	return {
		kind: 'internal',
		displayUrl: slug ? slug.replace(/^https?:\/\/(?:www\.)?/i, '') : `sf.gov/${trimmed}`
	};
}

/**
 * Extracts every reader-facing internal and external web/page link from a page
 * in reading order so the Analysis panel can list and inspect them.
 */
export function extractLinkTargets(
	page: PageEntry | null | undefined,
	pagesByKey: Record<string, PageEntry> = {}
): LinkTarget[] {
	if (!page) return [];
	const results: LinkTarget[] = [];
	const seen = new Set<string>();

	const add = (raw: unknown, label: string, fieldId: string, sectionKey?: string) => {
		if (typeof raw !== 'string') return;
		const info = classifyTarget(raw, pagesByKey);
		if (!info) return;
		const dedupeKey = `${fieldId}\u0000${raw.trim()}`;
		if (seen.has(dedupeKey)) return;
		seen.add(dedupeKey);
		results.push({
			id: `${results.length}:${fieldId}`,
			kind: info.kind,
			rawTarget: raw.trim(),
			displayUrl: info.displayUrl,
			label: label || info.displayUrl,
			fieldId,
			sectionKey
		});
	};

	const scanText = (value: unknown, fieldId: string, sectionKey?: string) => {
		const text = entryText(value);
		if (!text) return;
		for (const link of markdownLinksIn(text)) {
			add(link.url, link.label, fieldId, sectionKey);
		}
	};

	scanText(page.summary, 'summary');

	const wtk = page.whatToKnow as
		| { cost?: unknown; thingsToKnow?: Array<string | { label?: unknown; text?: unknown }> }
		| undefined;
	if (wtk) {
		scanText(wtk.cost, 'whatToKnow.cost');
		if (Array.isArray(wtk.thingsToKnow)) {
			wtk.thingsToKnow.forEach((item, i) => {
				if (typeof item === 'string') {
					scanText(item, `whatToKnow.thingsToKnow.${i}`);
				} else if (item && typeof item === 'object') {
					scanText(item.text, `whatToKnow.thingsToKnow.${i}.text`);
				}
			});
		}
	}

	const sections = Array.isArray(page.sections) ? (page.sections as PageEntry[]) : [];
	sections.forEach((section, sIdx) => {
		const key =
			typeof section.fieldKey === 'string' && section.fieldKey
				? section.fieldKey
				: deriveFieldKey(section, sIdx);

		scanText(section.heading, `sections.${key}.heading`, key);

		if (Array.isArray(section.paragraphs)) {
			section.paragraphs.forEach((p, i) => scanText(p, `sections.${key}.paragraphs.${i}`, key));
		}
		if (Array.isArray(section.bullets)) {
			section.bullets.forEach((b, i) => scanText(b, `sections.${key}.bullets.${i}`, key));
		}

		const callout = section.callout as { title?: unknown; text?: unknown } | undefined;
		if (callout) {
			scanText(callout.text, `sections.${key}.callout.text`, key);
		}

		if (section.buttonUrl || section.buttonTarget) {
			add(
				section.buttonUrl ?? section.buttonTarget,
				typeof section.button === 'string' ? section.button : '',
				`sections.${key}.button`,
				key
			);
		}

		if (Array.isArray(section.steps)) {
			(section.steps as PageEntry[]).forEach((step, stepIdx) => {
				if (Array.isArray(step.text)) {
					step.text.forEach((t, tIdx) =>
						scanText(t, `sections.${key}.steps.${stepIdx}.text.${tIdx}`, key)
					);
				}
				if (Array.isArray(step.bullets)) {
					step.bullets.forEach((b, bIdx) =>
						scanText(b, `sections.${key}.steps.${stepIdx}.bullets.${bIdx}`, key)
					);
				}
				if (step.buttonUrl || step.buttonTarget) {
					add(
						step.buttonUrl ?? step.buttonTarget,
						typeof step.button === 'string' ? step.button : '',
						`sections.${key}.steps.${stepIdx}.button`,
						key
					);
				}
			});
		}

		if (Array.isArray(section.cards)) {
			(section.cards as PageEntry[]).forEach((card, cardIdx) => {
				if (card.url || card.target) {
					add(
						card.url ?? card.target,
						typeof card.title === 'string' ? card.title : '',
						`sections.${key}.cards.${cardIdx}.title`,
						key
					);
				}
			});
		}
	});

	if (Array.isArray(page.partnerAgencies)) {
		(page.partnerAgencies as PageEntry[]).forEach((agency, i) => {
			if (agency.url || agency.target) {
				add(
					agency.url ?? agency.target,
					typeof agency.title === 'string' ? agency.title : '',
					`partnerAgencies.${i}.title`
				);
			}
		});
	}

	const spotlight = page.spotlight as PageEntry | undefined;
	if (
		spotlight &&
		(spotlight.buttonUrl || spotlight.buttonTarget || spotlight.url || spotlight.target)
	) {
		add(
			spotlight.buttonUrl ?? spotlight.buttonTarget ?? spotlight.url ?? spotlight.target,
			typeof spotlight.button === 'string'
				? spotlight.button
				: typeof spotlight.title === 'string'
					? spotlight.title
					: '',
			'spotlight.button'
		);
	}

	return results;
}
