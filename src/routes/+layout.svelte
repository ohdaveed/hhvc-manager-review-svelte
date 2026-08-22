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
<svelte:head>
	<title>HHVC mockup review</title>
</svelte:head>

<main class="min-h-screen bg-slate-50 antialiased">
	{@render children?.()}
</main>
