<script lang="ts">
	import type { Walkthrough } from '$lib/karl/walkthrough';

	/**
	 * The navy bar that replaces the canvas toolbar while the walkthrough is
	 * open. It spans the whole centre column, above both the drawer and the
	 * mockup, so it is its own component rather than part of the drawer.
	 *
	 * The add-page link is derived from the page's content type, never
	 * hardcoded: sending a reviewer to the Transaction form to rebuild an
	 * Information page produces the wrong page type, and they find out on save.
	 */
	let {
		walkthrough,
		copied,
		onExit
	}: { walkthrough: Walkthrough; copied: number; onExit: () => void } = $props();

	/**
	 * The markdown export, which used to be a whole tab called "Help".
	 *
	 * It stays because it is the only form of this that leaves the tool -- to
	 * paste into Teams, to work from on a second screen, to keep beside a page
	 * someone else rebuilds -- and the only one carrying the "NOT APPROVED — do
	 * not publish" banner. It does not need a tab: it is one of the Karl
	 * actions, so it sits with the other Karl actions.
	 *
	 * Built in `buildWalkthrough` from the same transcript the steps come from,
	 * so the file and the drawer cannot disagree.
	 */
	let copyState = $state<'idle' | 'done'>('idle');
	let copyTimer: ReturnType<typeof setTimeout> | undefined;

	async function copyMarkdown() {
		try {
			await navigator.clipboard.writeText(walkthrough.markdown);
			copyState = 'done';
			clearTimeout(copyTimer);
			copyTimer = setTimeout(() => (copyState = 'idle'), 1400);
		} catch {
			// Clipboard is permission-gated and unavailable over plain http. The
			// Download button is the fallback and is right beside it, so a failure
			// here is not a dead end -- and throwing would take the header down
			// mid-rebuild, the same reasoning as the drawer's Copy.
			copyState = 'idle';
		}
	}

	/**
	 * Download rather than a data: URL in an `href`.
	 *
	 * A `data:` link is blocked as a top-level navigation in Chrome, and the
	 * file has to be named: `<slug>-karl-transcript.md` is what a reviewer
	 * handling several pages needs in their Downloads folder. The object URL is
	 * revoked on the next frame -- not synchronously, which cancels the
	 * download in Safari.
	 */
	function downloadMarkdown() {
		const name = `${(walkthrough.title || 'page')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '')}-karl-transcript.md`;
		const url = URL.createObjectURL(new Blob([walkthrough.markdown], { type: 'text/markdown' }));
		const a = document.createElement('a');
		a.href = url;
		a.download = name;
		a.click();
		setTimeout(() => URL.revokeObjectURL(url), 0);
	}
</script>

<nav class="wt-header" aria-label="Walkthrough">
	<div class="wt-left">
		<span class="wt-title">Rebuild in Karl</span>
		<span class="wt-page">{walkthrough.title} · {walkthrough.type}</span>
	</div>
	<div class="wt-right">
		<span class="wt-count">{copied} of {walkthrough.copyableCount} fields copied</span>
		<!-- api.sf.gov is the real Karl admin, not a route in this app. -->
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
		<a class="wt-form" href={walkthrough.formUrl} target="_blank" rel="noreferrer">
			Open Karl add-page form ↗
		</a>
		<button type="button" class="wt-export" onclick={copyMarkdown}>
			{copyState === 'done' ? 'Copied' : 'Copy markdown'}
		</button>
		<button type="button" class="wt-export" onclick={downloadMarkdown}>Download .md</button>
		<button type="button" class="wt-exit" onclick={onExit}>Exit walkthrough</button>
	</div>
</nav>

<style>
	.wt-header {
		height: 48px;
		flex: none;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 0 20px;
		background: var(--sfds-color-blue-dark, #0c1464);
		color: #ffffff;
	}

	.wt-left {
		display: flex;
		align-items: baseline;
		gap: 12px;
		min-width: 0;
		font-size: 0.8125rem;
	}

	.wt-title {
		flex: none;
		font-family: var(--font-display);
		font-size: 0.9375rem;
		font-weight: 700;
	}

	.wt-page {
		opacity: 0.75;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.wt-right {
		display: flex;
		align-items: center;
		gap: 16px;
		flex: none;
		font-size: 0.8125rem;
	}

	.wt-count {
		opacity: 0.85;
		white-space: nowrap;
	}

	.wt-form {
		color: #ffffff;
		font-weight: 600;
		text-decoration: underline;
		text-underline-offset: 3px;
		white-space: nowrap;
	}

	/* The two export buttons read as secondary to Exit: same height and radius,
	   but no border, so the bar has one outlined control rather than three
	   competing for the same weight. */
	.wt-export {
		flex: none;
		height: 28px;
		padding: 0 10px;
		border: 0;
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.12);
		color: #ffffff;
		font-size: 0.75rem;
		font-weight: 600;
		white-space: nowrap;
		cursor: pointer;
	}

	.wt-export:hover {
		background: rgba(255, 255, 255, 0.22);
	}

	.wt-exit {
		flex: none;
		height: 28px;
		padding: 0 12px;
		border: 1px solid rgba(255, 255, 255, 0.4);
		border-radius: 6px;
		background: transparent;
		color: #ffffff;
		font-size: 0.75rem;
		font-weight: 600;
		white-space: nowrap;
		cursor: pointer;
	}

	.wt-exit:hover {
		background: rgba(255, 255, 255, 0.1);
	}
</style>
