<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { buildTranscript, renderTranscriptMarkdown } from '$lib/legacy-core/karl-transcript.js';
	import { pagesByKey } from '$lib/data';
	import { editsStore, pagesStore } from '$lib/stores/reviewState';

	let { pageData } = $props();

	// `buildTranscript` is untyped legacy JS; these describe the shapes it expects
	// rather than opting the whole call site out of type checking.
	type ReviewRecord = {
		section_edits: Record<string, string>;
		decision: string;
		edited_title?: string;
		edited_summary?: string;
		url_slug?: string;
	};

	// Map live Supabase edits to the legacy reviewRecord format
	let record = $derived.by(() => {
		if (!pageData) return null;

		const livePage = $pagesStore.find((p) => p.path === pageData.id);
		// Append-only table: a field can have several rows, and the fold below is
		// last-write-wins, so order explicitly rather than trusting the row order
		// PostgREST happened to return.
		const edits = $editsStore
			.filter((e) => e.page_id === livePage?.id)
			.slice()
			.sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));

		const statusLabels: Record<string, string> = {
			approved: 'Approved',
			blocked: 'Blocked',
			revise: 'Needs revision'
		};

		const reviewRecord: ReviewRecord = {
			section_edits: {},
			decision: statusLabels[livePage?.status ?? ''] ?? 'Needs review'
		};

		for (const edit of edits) {
			if (edit.field_id === 'title') reviewRecord.edited_title = edit.new_content;
			else if (edit.field_id === 'summary') reviewRecord.edited_summary = edit.new_content;
			else if (edit.field_id === 'slug') reviewRecord.url_slug = edit.new_content;
			else reviewRecord.section_edits[edit.field_id] = edit.new_content;
		}

		return Object.keys(reviewRecord.section_edits).length > 0 ||
			edits.length > 0 ||
			livePage?.status
			? reviewRecord
			: null;
	});

	// Build the markdown transcript for the current page
	let markdownContent = $derived.by(() => {
		if (!pageData) return 'No page selected.';
		try {
			// `pagesByKey`, NOT a map keyed by the derived routable id.
			//
			// Every lookup the transcript does against this map is a TARGET lookup
			// -- `linkRepresentation`, `buttonTarget`, `card.target` -- and a target
			// is a `pagesByKey` key (`afterReport`), which is also what
			// `src/lib/data/index.ts` documents as "the AI backend's link
			// vocabulary". Keyed by routable id instead, none of them resolved: on
			// `article-11-compliance-for-property-owners` all four internal links
			// rendered as "unresolved target -- neither a page key in this corpus
			// nor an http(s) URL", where they should read
			// `Internal link -> "<title>"`. The transcript is what an editor
			// retypes into Karl, so this was telling them a real destination did
			// not exist.
			const transcript = buildTranscript(pageData, record, pagesByKey);
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

<div class="flex h-full flex-col gap-4 p-4">
	<Card.Root size="sm">
		<Card.Header>
			<Card.Title>Karl Transcript</Card.Title>
			<Card.Description>
				What an editor types into Karl for the open page, field by field, in the order Karl's own
				form presents.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<Button class="w-full" onclick={copyTranscript}>Copy Markdown</Button>
		</Card.Content>
	</Card.Root>

	<ScrollArea class="min-h-0 flex-1 rounded-lg border bg-muted/40">
		<pre class="p-4 font-mono text-xs whitespace-pre-wrap">{markdownContent}</pre>
	</ScrollArea>
</div>
