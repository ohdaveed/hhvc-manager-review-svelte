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
			class="section-heading edit-target"
			id={section.heading.toLowerCase().replace(/\s+/g, '-')}
			onclick={selectField(
				`Section [${index + 1}] Heading`,
				section.heading,
				(v) => (section.heading = v)
			)}
			role="button"
			tabindex="0"
		>
			{section.heading}
		</h2>
	{/if}

	{#if section.paragraphs}
		{#each section.paragraphs as p, i}
			<p
				class="edit-target"
				data-rewrite-field="sections.{index}.paragraphs.{i}"
				onclick={selectField(
					`Section [${index + 1}] Paragraph`,
					p,
					(v) => (section.paragraphs[i] = v)
				)}
				role="button"
				tabindex="0"
			>
				{p}
			</p>
		{/each}
	{/if}

	{#if section.bullets}
		{@render bulletsSnippet(section.bullets)}
	{/if}

	{#if section.callout}
		{@render calloutSnippet(section.callout)}
	{/if}
</div>

{#snippet bulletsSnippet(bullets)}
	<ul class="list-disc pl-5">
		{#each bullets as b, i}
			<li
				class="edit-target my-1"
				data-rewrite-field="sections.{index}.bullets.{i}"
				onclick={selectField(`Section [${index + 1}] Bullet`, b, (v) => (bullets[i] = v))}
				role="button"
				tabindex="0"
			>
				{b}
			</li>
		{/each}
	</ul>
{/snippet}

{#snippet calloutSnippet(callout)}
	<div class="callout my-4 border-l-4 border-blue-600 bg-blue-50 p-4">
		{#if callout.title}
			<h3
				class="edit-target mb-2 text-lg font-bold"
				onclick={selectField(`Callout Title`, callout.title, (v) => (callout.title = v))}
				role="button"
				tabindex="0"
			>
				{callout.title}
			</h3>
		{/if}
		<p
			class="edit-target"
			data-rewrite-field="sections.{index}.callout.text"
			onclick={selectField(`Callout Text`, callout.text, (v) => (callout.text = v))}
			role="button"
			tabindex="0"
		>
			{callout.text}
		</p>
	</div>
{/snippet}
