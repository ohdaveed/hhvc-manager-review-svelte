/**
 * The markup half of the accessibility tests: heading nesting, image alt text,
 * table headers and video captions.
 *
 * These stay on the rendered DOM because they are properties of markup, not of
 * copy — a heading level and an `alt` attribute do not exist in the corpus at
 * all. Everything text-shaped is checked from the corpus instead (`pageCopy.ts`
 * explains why), so this module is deliberately small.
 *
 * Two adaptations that a literal port of the extension gets wrong here:
 *
 * 1. **Signed in, every piece of copy is inside a `<button>`.** `EditTarget`
 *    wraps each paragraph, bullet and heading in `button.edit-target` so it can
 *    be selected for rewriting. Karl Jr. skips `button` elements wholesale — on
 *    a live SF.gov page a button is a control — so a literal port would have
 *    seen an empty page when signed in and a full one when signed out, and
 *    reported both as findings. Those buttons are treated as transparent here.
 * 2. **No geometry.** The extension filters headings by `getBoundingClientRect`
 *    to catch visually-hidden ones. jsdom has no layout engine and returns a
 *    zero rect for everything, so that filter would drop every heading in every
 *    test while passing in a browser — a check that is green where it is
 *    verified and untested where it runs. Computed style, `hidden` and
 *    `aria-hidden` are used instead; the mockup renders no clipped headings.
 */

/** Review-tool chrome that is in the mockup DOM but is not mockup content. */
const TOOL_CHROME = '.page-section-chrome, .edit-target-badge';

/** The mockup root. Excludes the fake SF.gov header and footer, which are its siblings. */
export const MOCKUP_ROOT_SELECTOR = '#mockPage';

export type HeadingJump = {
	fromLevel: number;
	toLevel: number;
	fromText: string;
	toText: string;
};

export type ImageIssue = { src: string; filename: string; altText: string };

export type TableIssue = { index: number; missingCaption: boolean; missingHeaders: boolean };

export type VideoIssue = { index: number; src: string; reason: string };

export type DomChecks = {
	headingJumps: HeadingJump[];
	headingCount: number;
	imagesMissingAlt: ImageIssue[];
	imageCount: number;
	tableIssues: TableIssue[];
	tableCount: number;
	videoIssues: VideoIssue[];
	videoCount: number;
};

/** Whether an element is hidden from assistive technology by style or attribute. */
function isHidden(el: Element): boolean {
	let current: Element | null = el;
	while (current) {
		if (current.getAttribute('aria-hidden') === 'true') return true;
		if (current.hasAttribute('hidden')) return true;
		const view = current.ownerDocument?.defaultView;
		if (view) {
			const style = view.getComputedStyle(current);
			if (style.display === 'none' || style.visibility === 'hidden') return true;
		}
		current = current.parentElement;
	}
	return false;
}

/** An element's text with review-tool chrome removed. */
function contentText(el: Element): string {
	const clone = el.cloneNode(true) as Element;
	clone.querySelectorAll(TOOL_CHROME).forEach((node) => node.remove());
	return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Headings whose level jumps by more than one.
 *
 * Consecutive pairs only, in document order — h2 followed by h4 is a finding,
 * h4 followed by h2 is not (going back up is legal). This is the extension's
 * rule exactly.
 */
export function headingJumps(root: ParentNode): { jumps: HeadingJump[]; count: number } {
	const headings = Array.from(root.querySelectorAll('h1, h2, h3, h4, h5, h6')).filter(
		(h) => !h.closest(TOOL_CHROME) && !isHidden(h)
	);

	const jumps: HeadingJump[] = [];
	for (let i = 1; i < headings.length; i++) {
		const previous = headings[i - 1];
		const current = headings[i];
		const fromLevel = Number(previous.tagName.substring(1));
		const toLevel = Number(current.tagName.substring(1));
		if (toLevel > fromLevel + 1) {
			jumps.push({
				fromLevel,
				toLevel,
				fromText: contentText(previous),
				toText: contentText(current)
			});
		}
	}
	return { jumps, count: headings.length };
}

/**
 * The last path segment of an image src, for naming the image in a finding.
 *
 * Resolved against a base so a relative src still parses; an src that is not a
 * URL at all is reported verbatim rather than as an empty string, because
 * "an image with no alt text" and "an image whose name we could not read" are
 * different things to an editor hunting for it.
 */
function fileNameFrom(src: string): string {
	try {
		return new URL(src, 'https://sf.gov').pathname.split('/').pop() ?? '';
	} catch {
		return src;
	}
}

/** Images with no usable `alt`. An explicit `alt=""` is decorative and passes. */
export function imagesMissingAlt(root: ParentNode): { issues: ImageIssue[]; count: number } {
	const images = Array.from(root.querySelectorAll('img')).filter(
		(img) => !img.closest(TOOL_CHROME)
	);
	const issues: ImageIssue[] = [];
	for (const img of images) {
		const alt = img.getAttribute('alt');
		// `null` is "no alt attribute", which fails. `""` is a deliberate
		// decorative marker, which passes — conflating the two would tell an
		// editor to describe a spacer.
		if (alt !== null && alt.trim() !== '') continue;
		if (alt === '') continue;
		const src = img.getAttribute('src') ?? '';
		issues.push({ src, filename: fileNameFrom(src), altText: alt ?? '' });
	}
	return { issues, count: images.length };
}

/** Tables missing a caption or a header row/column. */
export function tableIssues(root: ParentNode): { issues: TableIssue[]; count: number } {
	const tables = Array.from(root.querySelectorAll('table')).filter((t) => !t.closest(TOOL_CHROME));
	const issues: TableIssue[] = [];
	tables.forEach((table, index) => {
		const caption = table.querySelector('caption');
		const missingCaption = !caption || contentText(caption) === '';
		const missingHeaders = table.querySelectorAll('th').length === 0;
		if (missingCaption || missingHeaders) {
			issues.push({ index: index + 1, missingCaption, missingHeaders });
		}
	});
	return { issues, count: tables.length };
}

/**
 * Videos without captions.
 *
 * A `<video>` can be inspected directly for caption tracks. An embedded player
 * cannot — the iframe is cross-origin, and no amount of DOM reading will say
 * whether the YouTube video has captions or whether Karl's Video transcript
 * field was filled in. Those are reported as unverifiable rather than as a pass,
 * because a silent pass on an unanswerable question is the worse error.
 */
export function videoIssues(root: ParentNode): { issues: VideoIssue[]; count: number } {
	const videos = Array.from(root.querySelectorAll('video')).filter((v) => !v.closest(TOOL_CHROME));
	const embeds = Array.from(root.querySelectorAll('iframe')).filter(
		(f) => !f.closest(TOOL_CHROME) && /youtube|youtu\.be|vimeo/i.test(f.getAttribute('src') ?? '')
	);

	const issues: VideoIssue[] = [];
	videos.forEach((video, index) => {
		const tracks = Array.from(video.querySelectorAll('track')).filter((t) => {
			const kind = (t.getAttribute('kind') ?? '').toLowerCase();
			return kind === 'captions' || kind === 'subtitles';
		});
		if (tracks.length === 0) {
			issues.push({
				index: index + 1,
				src: video.getAttribute('src') ?? '',
				reason: 'No caption or subtitle track on this video.'
			});
		}
	});
	embeds.forEach((embed, index) => {
		issues.push({
			index: videos.length + index + 1,
			src: embed.getAttribute('src') ?? '',
			reason:
				'Embedded player — captions and the Karl transcript field cannot be checked from here. Verify both in Karl.'
		});
	});

	return { issues, count: videos.length + embeds.length };
}

/** Every markup check, over one root. */
export function runDomChecks(root: ParentNode): DomChecks {
	const headings = headingJumps(root);
	const images = imagesMissingAlt(root);
	const tables = tableIssues(root);
	const videos = videoIssues(root);
	return {
		headingJumps: headings.jumps,
		headingCount: headings.count,
		imagesMissingAlt: images.issues,
		imageCount: images.count,
		tableIssues: tables.issues,
		tableCount: tables.count,
		videoIssues: videos.issues,
		videoCount: videos.count
	};
}
