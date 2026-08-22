<script lang="ts">
	import Section from './Section.svelte';
	import { pageStore } from '$lib/stores/pageData.svelte';

	let { page } = $props();

	function selectField(
		name: string,
		fieldId: string,
		content: string,
		updateFn: (val: string) => void
	) {
		return (e: Event) => {
			e.stopPropagation();
			pageStore.activeField = { name, fieldId, content, update: updateFn };
		};
	}
</script>

<div class="page-body">
	{#if page.type}
		<div class="page-type-eyebrow">{page.type}</div>
	{/if}

	<h1
		class="page-title edit-target"
		data-rewrite-field="title"
		onclick={selectField('Title', 'title', page.title, (v) => (page.title = v))}
		role="button"
		tabindex="0"
	>
		{page.title}
	</h1>

	{#if page.summary}
		<div
			class="page-summary edit-target"
			data-rewrite-field="summary"
			onclick={selectField('Summary', 'summary', page.summary, (v) => (page.summary = v))}
			role="button"
			tabindex="0"
		>
			<p>{page.summary}</p>
		</div>
	{/if}

	{#if page.audience && page.audience.length > 0}
		<div class="page-audience">
			{#each page.audience as a, i}
				<p
					class="edit-target"
					data-rewrite-field="audience.{i}"
					onclick={selectField(
						`Audience [${i + 1}]`,
						`audience.${i}`,
						a,
						(v) => (page.audience[i] = v)
					)}
					role="button"
					tabindex="0"
				>
					{a}
				</p>
			{/each}
		</div>
	{/if}

	<div class="page-content">
		{#if page.sections}
			{#each page.sections as section, index}
				<Section {section} {index} />
			{/each}
		{/if}
	</div>
</div>
