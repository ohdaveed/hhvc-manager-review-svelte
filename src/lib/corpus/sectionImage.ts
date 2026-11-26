/**
 * A photo attached to one mockup section, and the Karl image rules it has to
 * meet before an editor can upload it.
 *
 * Two homes exist in the corpus today, and the section decides which:
 *
 * - an **Information** page section → an `Image` block in the Information
 *   section stream, placed after that section's `Title and text` block;
 * - a **Campaign** section tagged `component: 'spotlight'` → that Spotlight's
 *   "Spotlight image" field.
 *
 * Every other placement is refused here rather than guessed at. Karl's help
 * centre lists more image fields (Agency Highlights, Location, Topic and Report
 * Spotlights), but the field map this repo verified (`KARL_PANELS`) does not
 * show them on those types, and a mockup image with no verified destination is
 * exactly what the 1:1 rule forbids.
 *
 * The rules below are Karl's own, from the SF.gov / Karl Editor Help Center
 * (Components → Images), read 2026-11-26:
 *
 * - "Size and cropping specs": Information page images at least 700 px wide
 *   (shown uncropped); Spotlight at least 1080 px wide and 350 px high.
 * - "Alt text": required, succinct, and never "image of …" / "graphic of …",
 *   because the screen reader already says it is an image. "Descriptive alt
 *   text in context" aims for under 120 characters.
 * - "Image guidance": a Creative Commons photo needs an attribution -- title
 *   if any, creator, a link to the source, and the licence. Public-domain
 *   photos are credited too, so the provenance is not lost between here and
 *   the upload.
 *
 * Two rules cannot be checked by code and were checked by eye when each photo
 * was chosen: no text in the image (incidental text is allowed), and no
 * abstract, artistic or posed-stock photography.
 */
export type SectionImage = {
	/** Path under `static/`, e.g. `/images/mockup/bed-bug-adult.webp`. */
	src: string;
	alt: string;
	/** The file's real pixel size, not a display size. */
	width: number;
	height: number;
	credit: {
		title?: string;
		creator: string;
		/** The page the photo was taken from, not the file URL. */
		sourceUrl: string;
		/** As it should read in the attribution, e.g. `CC BY 2.0` or `Public domain`. */
		license: string;
	};
};

export type ImagePlacement = {
	/** The Karl field the image lands in. */
	field: string;
	minWidth: number;
	minHeight: number;
};

export const ALT_TEXT_MAX = 120;

/**
 * Where a section's image goes in Karl, or null when the corpus has no
 * verified field for it.
 */
export function imagePlacement(pageType: string, component?: string): ImagePlacement | null {
	if (pageType === 'Information') {
		return { field: 'Information section · Image', minWidth: 700, minHeight: 0 };
	}
	if (pageType === 'Campaign' && component === 'spotlight') {
		return { field: 'Spotlight · Spotlight image', minWidth: 1080, minHeight: 350 };
	}
	return null;
}

export type ImageIssue = { slug: string; section: string; problem: string };

/* eslint-disable-next-line @typescript-eslint/no-explicit-any --
   corpus modules are plain untyped objects; same scoped boundary as
   oneToOne.ts and fieldResolver.ts. */
type AnyPage = Record<string, any>;

/** Every Karl image rule a section image breaks, across the given pages. */
export function findImageIssues(pages: AnyPage[]): ImageIssue[] {
	const issues: ImageIssue[] = [];

	for (const page of pages) {
		const slug = String(page?.slug ?? '');
		const sections: AnyPage[] = Array.isArray(page?.sections) ? page.sections : [];

		for (const section of sections) {
			const image = section?.image as SectionImage | undefined;
			if (!image) continue;
			const where = String(section.heading ?? '(untitled section)');
			const flag = (problem: string) => issues.push({ slug, section: where, problem });

			const placement = imagePlacement(String(page.type ?? ''), section.component);
			if (!placement) {
				flag(`no verified Karl image field on a ${page.type} section`);
				continue;
			}
			if (!(image.width >= placement.minWidth)) {
				flag(`${image.width}px wide; ${placement.field} needs at least ${placement.minWidth}px`);
			}
			if (!(image.height >= placement.minHeight)) {
				flag(`${image.height}px high; ${placement.field} needs at least ${placement.minHeight}px`);
			}

			const alt = String(image.alt ?? '').trim();
			if (!alt) flag('alt text is required');
			if (alt.length > ALT_TEXT_MAX)
				flag(`alt text is ${alt.length} characters; aim for ${ALT_TEXT_MAX} or fewer`);
			if (/^(an? )?(image|graphic|picture|photo)( of)?\b/i.test(alt)) {
				flag(
					'alt text must not start with "image of" or similar: the screen reader already says so'
				);
			}

			const credit = image.credit ?? ({} as SectionImage['credit']);
			if (!credit.creator?.trim()) flag('credit needs the creator');
			if (!/^https:\/\//.test(credit.sourceUrl ?? ''))
				flag('credit needs an https link to the source');
			if (!credit.license?.trim()) flag('credit needs the licence');
		}
	}

	return issues;
}
