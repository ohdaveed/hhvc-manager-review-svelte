<script lang="ts">
	/**
	 * SFDS 20px UI glyph.
	 *
	 * The set ships as 73 individual SVG files, stroked #0B0C0C, outlines only —
	 * not a font and not a sprite. They are rendered as `<img>` and recoloured
	 * with `brightness(0) invert(1)` for white-on-blue, or dropped to 35% for
	 * disabled. There are no filled variants; PageAlert draws its four solid
	 * status marks inline rather than approximating them with an outline.
	 *
	 * WCAG 2.1 AA — 1.1.1 Non-text Content.
	 * An `<img>` always needs an alt decision, and the JSX component made it for
	 * every caller by hardcoding `alt="" aria-hidden="true"`. That is correct for
	 * a decorative glyph and silently wrong for a meaningful one. Here the choice
	 * is required by the type: pass `label` for a glyph that carries meaning, or
	 * `decorative` for one that repeats adjacent text. `<Icon name="rat" />` with
	 * neither is a type error.
	 *
	 * Do not mix this with `lucide-svelte`. Lucide is the review tool's icon set;
	 * these are the public site's, and the stroke weights differ visibly.
	 */
	interface Base {
		/** Filename stem, e.g. `search` in `icon.20.ui.search.svg`. */
		name?: string;
		/**
		 * Full URL, bypassing `base` + `name`. For a glyph that does not follow the
		 * SFDS `icon.20.ui.*.svg` convention — the handful already in
		 * `static/sfgov/icons/` are named plainly.
		 */
		src?: string;
		size?: number;
		/** White-out for placement on a filled or navy ground. */
		invert?: boolean;
		/** 35% opacity, the set's only disabled treatment. */
		muted?: boolean;
		/** Directory the glyph files are served from. */
		base?: string;
		class?: string;
	}

	type Props = Base & ({ label: string; decorative?: never } | { decorative: true; label?: never });

	let {
		name,
		src,
		size = 20,
		invert = false,
		muted = false,
		base = '/sfgov/icons',
		label,
		decorative,
		class: className = ''
	}: Props = $props();

	const href = $derived(src ?? `${base}/icon.20.ui.${name}.svg`);
</script>

<img
	src={href}
	alt={decorative ? '' : label}
	aria-hidden={decorative ? 'true' : undefined}
	width={size}
	height={size}
	class="ds-icon block flex-none {className}"
	class:is-invert={invert}
	class:is-muted={muted}
	style="width: {size}px; height: {size}px;"
/>

<style>
	.ds-icon.is-invert {
		filter: brightness(0) invert(1);
	}

	.ds-icon.is-muted {
		opacity: 0.35;
	}
</style>
