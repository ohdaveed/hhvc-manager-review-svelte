<script lang="ts">
	import { onNavigate } from '$app/navigation';
	import '../app.css';
	let { children } = $props();

	onNavigate((navigation) => {
		if (!document.startViewTransition) return;
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<!-- No page in this app set a <title>, which axe flags as a serious WCAG
     violation (document-title): a screen-reader user has nothing to identify
     the tab or the document by. A default here covers every route; individual
     routes can still override it with their own svelte:head. -->
<!-- `noindex` on every page: each one renders an SF.gov mockup, City seal and
     "City and County of San Francisco" header included, readable signed out.
     It has to be here, not only in netlify.toml: Netlify applies that file's
     headers to static files but not to the SvelteKit function that serves the
     pages (measured on a deploy preview -- favicon.svg carried the header,
     /review/<slug> did not). -->
<svelte:head>
	<title>HHVC mockup review</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<!-- Not <main>: each route owns its landmark (`review/+layout`, `login`,
     `/`), and a <main> here nested a second one inside every page. -->
<div class="min-h-screen bg-slate-50 antialiased">
	{@render children?.()}
</div>
