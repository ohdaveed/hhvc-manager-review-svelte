import { expect, test } from './fixtures';

/**
 * Focus-indicator contrast, WCAG 2.1 AA SC 1.4.11 (Non-text Contrast).
 *
 * This test exists because **axe-core has no focus-indicator contrast rule**.
 * A green axe run is not evidence on 1.4.11, which is how a 25%-alpha ring
 * shipped past a passing suite in the predecessor app, and how a neutral-grey
 * ring at 50% alpha reached `main` here. `tests/accessibility.e2e.ts` cannot
 * catch this class of defect no matter how many routes it scans.
 *
 * ## What is measured, and why that choice
 *
 * A focused control usually paints SEVERAL layers at once. Every vendored
 * shadcn base in `src/lib/components/ui/` sets `focus-visible:border-ring`
 * (a solid 1px border) alongside `focus-visible:ring-ring/50` (a 3px shadow
 * at 50% alpha), and `.edit-target` in `src/app.css` paints a solid inset
 * shadow instead.
 *
 * SC 1.4.11 asks whether the INDICATOR is distinguishable, not whether every
 * layer of it is. So this takes the **strongest single layer** -- the highest
 * contrast ratio among outline, box-shadow and border -- and requires that to
 * clear 3:1. Measuring only the translucent ring would report failures a
 * reviewer could rebut by pointing at the solid border beside it; measuring
 * only the border would miss `toggle` and `scroll-area`, which paint a ring
 * and no border. Taking the max is the reading that survives both.
 *
 * Crucially, only layers that **change on focus** are measured. A border that
 * is painted whether or not the control is focused is not a focus indicator,
 * and counting it would let a control with no focus treatment at all pass on
 * the strength of its resting border -- turning this test into one that
 * cannot fail for the exact reason it was written. Each element is therefore
 * measured twice, blurred and focused, and only the difference counts.
 *
 * ## Colour handling
 *
 * Colours are composited by the browser on a canvas and read back as pixels
 * rather than parsed in JS. Computed styles here can be `rgb()`, `rgba()` or
 * `oklch()` depending on the property and the Chrome version -- the app's own
 * tokens are authored in `oklch()` -- and a hand-rolled parser that silently
 * mishandles one of those would produce a confidently wrong ratio. Painting
 * the real colour over the real background and reading the result asks the
 * same engine that renders the page.
 *
 * ## Focus must come from the keyboard
 *
 * `:focus-visible` is what every rule here is keyed to, and Chrome only
 * applies it to a `<button>` when focus arrived from the keyboard. Calling
 * `element.focus()` from script can silently produce the UNFOCUSED styles and
 * a test that passes because it measured nothing. Focus is therefore driven
 * with real Tab presses.
 *
 * ## One theme, deliberately
 *
 * There is no dark run. sf.gov has no dark mode, and this app's dark palette
 * was removed on 2026-08-25 -- nothing had ever set the `.dark` class that
 * gated it. Asserting a theme the property does not have would be measuring a
 * surface no reviewer can reach. `tests/theme.test.ts` guards the removal,
 * including the `@custom-variant dark` line that has to stay so the vendored
 * shadcn `dark:` utilities cannot fall back to `prefers-color-scheme`.
 */

/** SC 1.4.11 threshold for a focus indicator. */
const MIN_RATIO = 3;

/** How many Tab presses to walk. Enough to reach the panel controls. */
const TAB_DEPTH = 25;

type Measurement = {
	tag: string;
	label: string;
	ratio: number;
	layer: string;
};

/**
 * Walks focus with real Tab presses and measures each stop.
 *
 * Returns one entry per distinct focused element. Elements that paint no
 * focus indicator at all are reported with `ratio: 0` and layer `none` --
 * an invisible indicator is the worst version of this failure, not an
 * absence of data.
 */
async function measureFocusIndicators(page: import('@playwright/test').Page) {
	return page.evaluate(async (tabDepth: number) => {
		/** Paint a stack of colours over opaque white and read the result. */
		function composite(colors: string[]): [number, number, number] {
			const canvas = document.createElement('canvas');
			canvas.width = 1;
			canvas.height = 1;
			const ctx = canvas.getContext('2d');
			if (!ctx) throw new Error('no 2d context');

			// White ground: the page is painted over the browser's own white,
			// so a fully transparent stack must resolve to white rather than to
			// an undefined value.
			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, 1, 1);

			for (const color of colors) {
				ctx.fillStyle = color;
				ctx.fillRect(0, 0, 1, 1);
			}

			const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
			return [r, g, b];
		}

		/**
		 * A colour as a comparable string, resolved through the same engine.
		 *
		 * Chrome serialises the SAME colour differently depending on state --
		 * a border reads `oklch(0.922 0 0)` blurred and `oklab(0.922 0 0)`
		 * focused. Comparing the raw strings therefore reported every unchanged
		 * border as having "arrived" on focus, which produced six false
		 * failures at 1.26:1 before this existed. Compositing normalises them.
		 */
		function normalize(color: string): string {
			return composite([color]).join(',');
		}

		/** WCAG relative luminance. */
		function luminance([r, g, b]: [number, number, number]): number {
			const channel = (v: number) => {
				const s = v / 255;
				return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
			};
			return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
		}

		function ratio(a: [number, number, number], b: [number, number, number]): number {
			const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
			return (hi + 0.05) / (lo + 0.05);
		}

		/**
		 * The background an indicator composites against.
		 *
		 * `from` is the element for an INSET indicator (it is painted over the
		 * element's own fill) and the element's parent for an outer one, which
		 * with `outline-offset` sits on whatever is behind the control.
		 */
		function backgroundStack(from: Element | null): string[] {
			const stack: string[] = [];
			let node: Element | null = from;
			while (node) {
				const bg = getComputedStyle(node).backgroundColor;
				if (bg && bg !== 'transparent' && !/^rgba\(.*,\s*0\)$/.test(bg)) stack.unshift(bg);
				node = node.parentElement;
			}
			return stack;
		}

		/** Every colour a box-shadow declaration paints, with its inset flag. */
		function shadowLayers(value: string): { color: string; inset: boolean }[] {
			if (!value || value === 'none') return [];
			// Split on commas that are not inside a colour function's parens.
			const parts: string[] = [];
			let depth = 0;
			let current = '';
			for (const ch of value) {
				if (ch === '(') depth++;
				if (ch === ')') depth--;
				if (ch === ',' && depth === 0) {
					parts.push(current);
					current = '';
				} else current += ch;
			}
			if (current.trim()) parts.push(current);

			return parts
				.map((part) => {
					const inset = /\binset\b/.test(part);
					// The colour is the leading function or keyword; the rest is
					// lengths. Chrome serialises colour first for box-shadow.
					const color = /^(\s*(?:rgba?|oklch|color|hsla?)\([^)]*\)|\s*#[0-9a-f]{3,8})/i.exec(part);
					return color ? { color: color[1].trim(), inset } : null;
				})
				.filter((x): x is { color: string; inset: boolean } => x !== null);
		}

		/** The paint layers a computed style describes, as comparable strings. */
		function layersOf(style: CSSStyleDeclaration) {
			const out: { key: string; name: string; color: string; inset: boolean }[] = [];

			if (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) {
				out.push({
					key: `outline:${style.outlineWidth}:${normalize(style.outlineColor)}`,
					name: `outline ${style.outlineWidth} ${style.outlineColor}`,
					color: style.outlineColor,
					inset: false
				});
			}

			for (const { color, inset } of shadowLayers(style.boxShadow)) {
				out.push({
					key: `shadow:${inset}:${normalize(color)}`,
					name: `${inset ? 'inset ' : ''}shadow ${color}`,
					color,
					inset
				});
			}

			if (style.borderTopStyle !== 'none' && parseFloat(style.borderTopWidth) > 0) {
				out.push({
					key: `border:${style.borderTopWidth}:${normalize(style.borderTopColor)}`,
					name: `border ${style.borderTopWidth} ${style.borderTopColor}`,
					color: style.borderTopColor,
					inset: true
				});
			}

			return out;
		}

		const results: {
			tag: string;
			label: string;
			ratio: number;
			layer: string;
		}[] = [];

		const focusables = Array.from(
			document.querySelectorAll<HTMLElement>(
				'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
			)
		)
			.filter((n) => n.offsetParent !== null)
			.slice(0, tabDepth);

		for (const el of focusables) {
			// Blurred first. `:focus-visible` styles are absent here, so this is
			// the resting paint the focused state has to be distinguishable FROM.
			el.blur();
			const restingKeys = new Set(layersOf(getComputedStyle(el)).map((l) => l.key));

			el.focus();
			const focusedStyle = getComputedStyle(el);

			const outer = backgroundStack(el.parentElement);
			const inner = backgroundStack(el);
			const outerBg = composite(outer);
			const innerBg = composite(inner);

			// Only layers that ARRIVED with focus. A border painted in both
			// states is part of the control, not an indication that it is
			// focused, and counting it would let an element with no focus
			// treatment pass on the strength of its resting border.
			const arrived = layersOf(focusedStyle).filter((l) => !restingKeys.has(l.key));

			const measured = arrived.map((l) => ({
				name: l.name,
				value: ratio(
					composite([...(l.inset ? inner : outer), l.color]),
					l.inset ? innerBg : outerBg
				)
			}));

			const best = measured.sort((a, b) => b.value - a.value)[0];
			const label = (
				el.getAttribute('aria-label') ||
				(el.textContent ?? '').trim().slice(0, 40) ||
				el.className ||
				''
			).trim();

			results.push({
				tag: el.tagName.toLowerCase(),
				label: label || '(no label)',
				ratio: best ? Math.round(best.value * 100) / 100 : 0,
				layer: best ? best.name : 'none'
			});
		}

		return results;
	}, TAB_DEPTH);
}

test('focus indicators clear 3:1 (SC 1.4.11)', async ({ page }) => {
	await page.goto('/review/departments--healthy-housing-and-vector-control--about');
	await page.waitForLoadState('networkidle');

	// A genuine Tab press, so Chrome's focus-visible heuristic is armed
	// before anything is measured.
	await page.keyboard.press('Tab');

	const measured: Measurement[] = await measureFocusIndicators(page);

	expect(measured.length, 'no focusable elements were reached').toBeGreaterThan(0);

	const failures = measured.filter((m) => m.ratio < MIN_RATIO);

	expect(
		failures,
		[
			`${failures.length} of ${measured.length} focus indicators are below ${MIN_RATIO}:1.`,
			'',
			...failures.map((f) => `  ${f.ratio}:1  <${f.tag}> "${f.label}"  [${f.layer}]`)
		].join('\n')
	).toEqual([]);
});
