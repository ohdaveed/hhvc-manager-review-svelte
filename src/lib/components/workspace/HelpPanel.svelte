<script lang="ts">
	import { buildTranscript, renderTranscriptMarkdown } from '$lib/legacy-core/karl-transcript.js';
	import { pageStore } from '$lib/stores/pageData.svelte';

	let { pageData } = $props();

	// Mock record for now, later this will be driven by the DB
	let record = null;

	// Build the markdown transcript for the current page
	let markdownContent = $derived.by(() => {
		if (!pageData) return 'No page selected.';
		// The legacy builder expects the page corpus as a map of `id -> page` for resolving link titles
		const pagesMap = pageStore.pages.reduce((acc, p) => {
			acc[p.id] = p;
			return acc;
		}, {} as Record<string, any>);

		try {
			const transcript = buildTranscript(pageData, record, pagesMap);
			return renderTranscriptMarkdown(transcript);
		} catch (e) {
			console.error('Error generating transcript:', e);
			return 'Error generating transcript.';
		}
	});

	const copyTranscript = async () => {
		try {
			await navigator.clipboard.writeText(markdownContent);
			alert('Transcript copied to clipboard!');
		} catch (err) {
			console.error('Failed to copy text: ', err);
		}
	};
</script>

<div class="p-4 overflow-y-auto h-full text-sm">
	<div class="mb-4">
		<h3 class="font-bold text-lg text-gray-900 mb-2">Karl Transcript</h3>
		<p class="text-gray-600 mb-4 text-xs">
			What an editor types into Karl for the open page, field by field, in the order Karl's own form presents.
		</p>
		<button 
			class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium w-full"
			onclick={copyTranscript}
		>
			Copy Markdown
		</button>
	</div>

	<div class="bg-gray-50 border border-gray-200 rounded p-4 font-mono text-xs whitespace-pre-wrap text-gray-800">
		{markdownContent}
	</div>
</div>
