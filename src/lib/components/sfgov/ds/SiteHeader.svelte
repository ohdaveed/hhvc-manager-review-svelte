<script lang="ts">
	import type { LinkRef } from './types';

	/**
	 * The global site header: lockup, primary nav, language control, search.
	 *
	 * This has no JSX counterpart — it was converted from the shipped
	 * `src/lib/components/sfgov/SiteHeader.svelte`, which is deliberately INERT:
	 * every nav item, the language control and the search box are `<span>`s
	 * there, because the review canvas shows a picture of a header and a fake
	 * search box exposed as a real control fails the axe gate.
	 *
	 * This version is the opposite: real links, a real language `<select>`, a
	 * real search `<form>`. Use it when the header must work. Use the inert one
	 * inside the mockup canvas.
	 *
	 * WCAG 2.1 AA:
	 * - 1.3.1 / 2.4.1. `<header>` + `<nav aria-label="Primary">` landmarks.
	 * - 3.2.3 Consistent Navigation. Nav order comes from the caller so it can
	 *   stay identical across pages; it is not hardcoded here.
	 * - 4.1.2. The search input has a visually hidden `<label>`, not a
	 *   placeholder — a placeholder disappears on input and is not a label.
	 * - 2.5.8 / 2.5.5. The search submit is 40px square, over the 24px minimum
	 *   and at the site's own control height.
	 * - 3.2.2 On Input. The language `<select>` does not navigate on change; it
	 *   reports the choice and the caller decides. A select that navigates the
	 *   moment an arrow key moves the highlight traps keyboard users.
	 * - 1.4.11. Two-stop ring on white ground throughout.
	 */
	interface Props {
		lockup?: string;
		lockupAlt?: string;
		nav?: LinkRef[];
		languages?: { label: string; value: string }[];
		language?: string;
		searchAction?: string;
		onLanguageChange?: (value: string) => void;
		onSearch?: (query: string) => void;
		class?: string;
	}

	let {
		lockup = '/sfgov/Lockup_SFgov_Black.png',
		lockupAlt = 'SF.gov, City and County of San Francisco',
		nav = [],
		languages = [],
		language = $bindable('en'),
		searchAction = '/search',
		onLanguageChange,
		onSearch,
		class: className = ''
	}: Props = $props();

	let query = $state('');

	function submit(event: SubmitEvent) {
		if (onSearch) {
			event.preventDefault();
			onSearch(query);
		}
	}
</script>

<header class="ds-header flex flex-wrap items-center gap-4 {className}">
	<a href="/" class="ds-home flex-none">
		<img src={lockup} alt={lockupAlt} class="ds-lockup block" />
	</a>

	{#if nav.length}
		<nav aria-label="Primary" class="flex min-w-0 shrink flex-wrap gap-4">
			{#each nav as item, i (i)}
				<a href={item.href ?? '#'} class="ds-nav-link">{item.label}</a>
			{/each}
		</nav>
	{/if}

	<div class="ds-tail ml-auto flex flex-wrap items-center gap-3">
		{#if languages.length}
			<div class="flex items-center gap-2">
				<label for="ds-lang" class="ds-lang-label">Language</label>
				<select
					id="ds-lang"
					class="ds-lang"
					bind:value={language}
					onchange={() => onLanguageChange?.(language)}
				>
					{#each languages as option (option.value)}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>
		{/if}

		<form
			role="search"
			action={searchAction}
			class="ds-search flex items-stretch"
			onsubmit={submit}
		>
			<label for="ds-search-input" class="ds-sr-only">Search SF.gov</label>
			<input
				id="ds-search-input"
				name="q"
				type="search"
				bind:value={query}
				class="ds-search-input"
			/>
			<button type="submit" class="ds-search-btn flex flex-none items-center justify-center">
				<span class="ds-sr-only">Search</span>
				<svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
					<circle cx="9" cy="9" r="6" stroke="#FFFFFF" stroke-width="2" />
					<path d="M13.5 13.5L17 17" stroke="#FFFFFF" stroke-width="2" />
				</svg>
			</button>
		</form>
	</div>
</header>

<style>
	.ds-header {
		padding: 14px 18px;
		border-bottom: 1px solid var(--color-site-border-subtle, #e9eaea);
		background: #ffffff;
		font-family: var(--site-font-body);
	}

	.ds-lockup {
		height: 38px;
		width: 123px;
	}

	.ds-nav-link {
		font-size: 14px;
		line-height: 20px;
		font-weight: 700;
		white-space: nowrap;
		color: var(--color-site-ink, #0b0c0c);
		text-decoration: none;
	}
	.ds-nav-link:hover {
		color: var(--color-site-action, #1b519e);
		text-decoration: underline;
	}

	.ds-lang-label {
		font-size: 14px;
		line-height: 20px;
		font-weight: 700;
		color: var(--color-site-ink, #0b0c0c);
	}

	.ds-lang {
		height: 34px;
		padding: 0 8px;
		border: 1px solid var(--color-site-ink-muted, #5b5f63);
		border-radius: var(--site-radius, 4px);
		background: #ffffff;
		font-family: inherit;
		font-size: 14px;
		color: var(--color-site-ink, #0b0c0c);
	}

	.ds-search {
		border: 2px solid var(--color-site-ink, #0b0c0c);
		border-radius: var(--site-radius, 4px);
		overflow: hidden;
	}

	.ds-search-input {
		min-width: 0;
		width: 160px;
		height: 36px;
		padding: 0 8px;
		border: 0;
		background: #ffffff;
		font-family: inherit;
		font-size: 14px;
		color: var(--color-site-ink, #0b0c0c);
	}
	.ds-search-input:focus {
		outline: none;
	}

	.ds-search-btn {
		width: 40px;
		border: 0;
		background: var(--color-site-action, #1b519e);
		cursor: pointer;
	}
	.ds-search-btn:hover {
		background: var(--color-site-action-hover, #001d4e);
	}

	/* The ring goes on the whole search box when either part has focus, so the
	   two halves read as one control. */
	.ds-search:focus-within {
		box-shadow: var(--site-focus-ring, 0 0 0 4px #fcfcfc, 0 0 0 7px #386ebf);
	}

	.ds-home:focus-visible,
	.ds-nav-link:focus-visible,
	.ds-lang:focus-visible {
		outline: none;
		box-shadow: var(--site-focus-ring, 0 0 0 4px #fcfcfc, 0 0 0 7px #386ebf);
		border-radius: 2px;
	}

	.ds-sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
