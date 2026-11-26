<script lang="ts">
	import type { SectionImage } from '$lib/corpus/sectionImage';

	/**
	 * A section's photo: an Information section `Image` block, or a Campaign
	 * Spotlight image. What Karl gets is the file and its alt text; the credit
	 * line is shown here so the attribution a Creative Commons licence demands
	 * travels with the mockup instead of living only in a data module.
	 *
	 * `width`/`height` are the file's real pixels, set so the browser reserves
	 * the box before the image loads -- without them every image on a page
	 * shifts the text below it when it arrives.
	 */
	let { image }: { image: SectionImage } = $props();
</script>

<figure class="section-image">
	<img src={image.src} alt={image.alt} width={image.width} height={image.height} loading="lazy" />
	<figcaption class="section-image-credit">
		{#if image.credit.title}“{image.credit.title}” by{/if}
		{image.credit.creator},
		<!-- The source is always an external page (Commons, Flickr), which resolve()
		     does not apply to -- the same exemption MarkdownText makes for external links. -->
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
		<a href={image.credit.sourceUrl} rel="noopener noreferrer" target="_blank"
			>{image.credit.license}</a
		>
	</figcaption>
</figure>

<style>
	.section-image {
		margin: 16px 0;
	}

	.section-image img {
		display: block;
		width: 100%;
		height: auto;
		border-radius: 4px;
	}

	.section-image-credit {
		margin-top: 6px;
		font-size: 14px;
		line-height: 1.4;
		color: var(--color-site-ink, #3c3c3c);
	}
</style>
