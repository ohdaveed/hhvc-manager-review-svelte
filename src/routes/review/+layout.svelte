<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { pageStore } from '$lib/stores/pageData.svelte';
	import { loadReview } from '$lib/stores/reviewState';
	import ReviewQueue from '$lib/components/workspace/ReviewQueue.svelte';
	import ReviewWorkspace from '$lib/components/workspace/ReviewWorkspace.svelte';
	import ActionBar from '$lib/components/workspace/ActionBar.svelte';

	let { children } = $props();

	// Karl tag display is not implemented — nothing reads this yet. The control
	// stays disabled rather than animating over dead state; it was previously a
	// bare checkbox carrying DaisyUI classes for a DaisyUI that is not installed.
	let showKarlTags = $state(false);

	// Dynamically pick the page data based on slug for the workspace
	const pageData = $derived(pageStore.pages.find((p) => p.id === $page.params.slug));

	onMount(() => {
		// If the layout is torn down before loadReview resolves -- a slow Supabase
		// round trip plus quick navigation -- the destroy callback fires while
		// cleanup is still undefined, and the subscription then installs after
		// teardown with nothing left to remove it. Remounting would stack channels.
		let disposed = false;
		let cleanup: (() => void) | undefined;

		loadReview().then((fn) => {
			if (disposed) fn();
			else cleanup = fn;
		});

		return () => {
			disposed = true;
			cleanup?.();
		};
	});
</script>

<div class="bg-muted/40 grid h-screen w-full grid-cols-[250px_1fr_300px] overflow-hidden">
	<!-- Left Sidebar: Global Navigation & Review Queue -->
	<aside class="bg-background flex h-full flex-col border-r">
		<div class="p-4">
			<div class="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
				SFDS rebuild
			</div>
			<h2 class="font-heading mt-1 text-lg font-bold">HHVC mockup review</h2>
		</div>
		<Separator />
		<ScrollArea class="min-h-0 flex-1">
			<div class="p-4">
				<ReviewQueue />
			</div>
		</ScrollArea>
		<Separator />
		<div class="p-4">
			<Button variant="ghost" class="w-full justify-start font-normal">Export Data &rarr;</Button>
		</div>
	</aside>

	<!-- Center Canvas: The Mockup -->
	<main
		class="bg-muted relative flex h-full cursor-default flex-col overflow-hidden"
		onclick={() => (pageStore.activeField = null)}
		role="presentation"
	>
		<!-- Toolbar (Top) -->
		<nav class="bg-background flex items-center justify-between border-b px-4 py-2">
			<div class="text-muted-foreground text-sm">https://sf.gov/</div>
			<div class="flex items-center gap-2 text-sm">
				<Label for="tagToggle" class="text-muted-foreground">Karl tags</Label>
				<Switch
					id="tagToggle"
					bind:checked={showKarlTags}
					disabled
					title="Karl tag display is not implemented yet"
				/>
			</div>
		</nav>

		<!-- Scrollable Mockup Container -->
		<div class="flex flex-1 justify-center overflow-y-auto p-8">
			<figure class="min-h-full w-full max-w-4xl border border-gray-200 bg-white pb-32 shadow-md">
				<!-- Legacy SF.gov Header -->
				<header class="flex items-center justify-between bg-[#002f6c] p-4 text-white">
					<div class="text-xl font-bold">SF.gov</div>
					<div class="flex gap-4 text-sm">
						<span>Services</span>
						<span>Departments</span>
					</div>
				</header>

				<!-- Page specific content -->
				<div id="mockPage" class="p-8">
					{@render children()}
				</div>

				<!-- Legacy SF.gov Footer -->
				<footer class="mt-12 border-t border-gray-200 bg-gray-100 p-8">
					<div class="font-bold">City and County of San Francisco</div>
				</footer>
			</figure>
		</div>

		<!-- Action Bar (Sticky at bottom of center canvas) -->
		<div
			id="actionBarContainer"
			class="pointer-events-none absolute bottom-0 left-0 flex w-full justify-center p-4 pb-6"
		>
			<ActionBar
				activeField={pageStore.activeField}
				onCancel={() => (pageStore.activeField = null)}
				onSave={(val: string) => {
					if (pageStore.activeField) pageStore.activeField.update(val);
					pageStore.activeField = null;
				}}
			/>
		</div>
	</main>

	<!-- Right Sidebar: Contextual Manager Review & Checks -->
	<section class="bg-background flex h-full flex-col overflow-hidden border-l">
		<ReviewWorkspace {pageData} />
	</section>
</div>
