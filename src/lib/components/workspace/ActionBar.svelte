<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { requestGeneration } from '$lib/ai/generate';

	// Props to receive the currently selected field data (mocked for now)
	let { activeField = null, onCancel, onSave } = $props();

	let editValue = $state('');
	let isAiLoading = $state(false);

	$effect(() => {
		if (activeField) {
			editValue = activeField.content;
		}
	});

	// Function to simulate AI rewrite
	const handleAiRewrite = async () => {
		if (!editValue.trim()) return;
		isAiLoading = true;
		try {
			const data = await requestGeneration({
				task: 'rewrite-field',
				provider: 'gemini',
				fieldText: editValue
			});
			if (data.result && data.result.rewrittenText) {
				editValue = data.result.rewrittenText;
			}
		} catch (e) {
			console.error('Rewrite failed', e);
			alert('AI Rewrite failed.');
		} finally {
			isAiLoading = false;
		}
	};

	// Function to simulate Plain Language check/rewrite
	const handlePlainLanguage = async () => {
		if (!editValue.trim()) return;
		isAiLoading = true;
		try {
			const data = await requestGeneration({
				task: 'rewrite-field',
				provider: 'gemini',
				fieldText: editValue,
				instruction: 'Rewrite this text into simple plain language at a 6th-grade reading level.'
			});
			if (data.result && data.result.rewrittenText) {
				editValue = data.result.rewrittenText;
			}
		} catch (e) {
			console.error('Plain language rewrite failed', e);
			alert('Plain language rewrite failed.');
		} finally {
			isAiLoading = false;
		}
	};

	const handleSave = () => {
		if (!activeField) return;
		onSave(editValue);
	};
</script>

{#if activeField}
	<!-- Added stopPropagation to prevent the background click from dismissing the Action Bar -->
	<Card.Root
		size="sm"
		class="pointer-events-auto w-full max-w-3xl shadow-xl"
		onclick={(e: MouseEvent) => e.stopPropagation()}
	>
		<Card.Header class="flex-row items-center justify-between gap-3">
			<div class="flex items-center gap-2">
				<Badge variant="secondary">Editing: {activeField.name || 'Paragraph'}</Badge>
				<span class="text-muted-foreground text-xs">Original text preserved until saved.</span>
			</div>

			<Card.Action class="flex gap-2">
				<Button variant="outline" size="sm" onclick={handlePlainLanguage} disabled={isAiLoading}>
					✨ Plain Language
				</Button>
				<Button variant="secondary" size="sm" onclick={handleAiRewrite} disabled={isAiLoading}>
					🪄 AI Rewrite
				</Button>
			</Card.Action>
		</Card.Header>

		<Card.Content>
			<Textarea
				bind:value={editValue}
				rows={3}
				aria-label="Edit {activeField.name || 'field'} content"
				placeholder="Edit the content here..."
			/>
		</Card.Content>

		<Card.Footer class="justify-end gap-2 border-t pt-3">
			<Button variant="ghost" onclick={onCancel}>Cancel</Button>
			<Button onclick={handleSave}>Save Edit</Button>
		</Card.Footer>
	</Card.Root>
{/if}
