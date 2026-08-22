<script lang="ts">
	import { saveInlineEdit } from '$lib/stores/reviewState';
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
	<div 
		class="pointer-events-auto w-full max-w-3xl rounded-lg border border-gray-200 bg-white p-4 shadow-xl ring-1 ring-black/5"
		onclick={(e) => e.stopPropagation()}
		role="presentation"
	>
		<div class="mb-3 flex items-center justify-between">
			<div class="flex items-center gap-2">
				<span class="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
					Editing: {activeField.name || 'Paragraph'}
				</span>
				<span class="text-xs text-gray-500">Original text preserved until saved.</span>
			</div>

			<div class="flex gap-2">
				<button
					onclick={handlePlainLanguage}
					disabled={isAiLoading}
					class="flex items-center gap-1 rounded border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
				>
					✨ Plain Language
				</button>
				<button
					onclick={handleAiRewrite}
					disabled={isAiLoading}
					class="flex items-center gap-1 rounded bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
				>
					🪄 AI Rewrite
				</button>
			</div>
		</div>

		<textarea
			bind:value={editValue}
			rows="3"
			class="mb-3 w-full rounded border border-gray-300 p-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
			placeholder="Edit the content here..."></textarea>

		<div class="flex justify-end gap-2 border-t border-gray-100 pt-3">
			<button
				onclick={onCancel}
				class="rounded px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
			>
				Cancel
			</button>
			<button
				onclick={handleSave}
				class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
			>
				Save Edit
			</button>
		</div>
	</div>
{/if}
