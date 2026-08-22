<script lang="ts">
	import { pageStore } from '$lib/stores/pageData.svelte';
	let { section, index } = $props();

	function selectField(name: string, content: string, updateFn: (val: string) => void) {
		return (e: Event) => {
			e.stopPropagation();
			pageStore.activeField = { name, content, update: updateFn };
		};
	}
</script>

<div class="page-section {section.kind || 'body'}">
	{#if section.heading}
		<h2 
			class="section-heading hover:ring-2 hover:ring-blue-400 cursor-pointer transition-all rounded p-1 -mx-1" 
			id={section.heading.toLowerCase().replace(/\s+/g, '-')}
			onclick={selectField(`Section [${index+1}] Heading`, section.heading, (v) => section.heading = v)}
			role="button"
			tabindex="0"
		>
			{section.heading}
		</h2>
	{/if}

	{#if section.paragraphs}
		{#each section.paragraphs as p, i}
			<p 
				class="hover:ring-2 hover:ring-blue-400 cursor-pointer transition-all rounded p-1 -mx-1"
				data-rewrite-field="sections.{index}.paragraphs.{i}"
				onclick={selectField(`Section [${index+1}] Paragraph`, p, (v) => section.paragraphs[i] = v)}
				role="button"
				tabindex="0"
			>
				{p}
			</p>
		{/each}
	{/if}

	{#if section.bullets}
		<ul class="pl-5 list-disc">
			{#each section.bullets as b, i}
				<li 
					class="hover:ring-2 hover:ring-blue-400 cursor-pointer transition-all rounded p-1 -mx-1 my-1"
					data-rewrite-field="sections.{index}.bullets.{i}"
					onclick={selectField(`Section [${index+1}] Bullet`, b, (v) => section.bullets[i] = v)}
					role="button"
					tabindex="0"
				>
					{b}
				</li>
			{/each}
		</ul>
	{/if}

	{#if section.callout}
		<div class="callout bg-blue-50 border-l-4 border-blue-600 p-4 my-4">
			{#if section.callout.title}
				<h3 
					class="font-bold text-lg mb-2 hover:ring-2 hover:ring-blue-400 cursor-pointer transition-all rounded p-1 -mx-1"
					onclick={selectField(`Callout Title`, section.callout.title, (v) => section.callout.title = v)}
					role="button"
					tabindex="0"
				>
					{section.callout.title}
				</h3>
			{/if}
			<p 
				class="hover:ring-2 hover:ring-blue-400 cursor-pointer transition-all rounded p-1 -mx-1"
				data-rewrite-field="sections.{index}.callout.text"
				onclick={selectField(`Callout Text`, section.callout.text, (v) => section.callout.text = v)}
				role="button"
				tabindex="0"
			>
				{section.callout.text}
			</p>
		</div>
	{/if}
</div>
