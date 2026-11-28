<script lang="ts">
	// The review panel's three stateful parts, mounted together as the workspace
	// mounts them, without the tabs: Notes and the page checks sit in tab panels
	// that render one at a time, and these tests are about the parts.
	import DecisionFooter from '../src/lib/components/workspace/DecisionFooter.svelte';
	import NotesPanel from '../src/lib/components/workspace/NotesPanel.svelte';
	import PageChecks from '../src/lib/components/workspace/PageChecks.svelte';

	let {
		pageData,
		karlReadiness = null,
		onDecided,
		onWriteFeedback,
		onOpenFields
	}: {
		pageData?: { id?: string };
		karlReadiness?: string | null;
		onDecided?: (status: string) => void;
		onWriteFeedback?: () => void;
		onOpenFields?: () => void;
	} = $props();
</script>

<NotesPanel {pageData} />
<PageChecks pageId={pageData?.id} />
<DecisionFooter {pageData} {karlReadiness} {onDecided} {onWriteFeedback} {onOpenFields} />
