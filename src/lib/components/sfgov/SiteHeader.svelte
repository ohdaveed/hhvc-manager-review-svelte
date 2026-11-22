<script lang="ts">
	// Inert mockup furniture: a picture of the SF.gov site header shown around a
	// reviewed page, not a working header. Every nav item, the language control
	// and the search box are plain <span>s on purpose -- no <a>, <button>, or
	// <input> -- so nothing here is focusable or announced as interactive to
	// assistive tech. tests/e2e's axe pass is a merge gate; a fake search box
	// exposed as a real control would fail it.
	//
	// Matches the live 2026 header, captured 2026-11-22: a navy (#043578) band,
	// the city seal, and a two-line "City and County of / San Francisco"
	// wordmark set in Roboto Slab. It replaced the white bar and black "SF.gov"
	// lockup this component used to draw. The seal is the site's own
	// `CCSF_seal_2026_white.svg`, rasterised to a 128px PNG because the SVG is
	// 844KB and this renders on every review page.
</script>

<header class="sfgov-header bg-site-action-dark text-white">
	<img src="/sfgov/CCSF_seal_2026_white.png" alt="" class="sfgov-seal flex-none" />

	<div class="sfgov-main">
		<div class="sfgov-top">
			<span class="sfgov-wordmark">
				<span class="sfgov-wordmark-small">City and County of</span>
				<span class="sfgov-wordmark-large">San Francisco</span>
			</span>

			<span class="ml-auto flex items-center">
				<span class="sfgov-lang inline-flex items-center gap-2 font-bold whitespace-nowrap">
					English
					<img src="/sfgov/icons/chevron-down.svg" alt="" class="h-4 w-4 brightness-0 invert" />
				</span>

				<span class="sfgov-search">
					<span class="sfgov-search-field">Search</span>
					<span aria-hidden="true" class="sfgov-search-button">
						<img src="/sfgov/icons/search.svg" alt="" class="h-[18px] w-[18px]" />
					</span>
				</span>

				<!-- Compact header: search collapses to its icon and the nav to a
				     labelled Menu button, each behind a vertical rule. -->
				<span class="sfgov-compact" aria-hidden="true">
					<img src="/sfgov/icons/search.svg" alt="" class="h-5 w-5 brightness-0 invert" />
				</span>
				<span class="sfgov-compact sfgov-menu" aria-hidden="true">
					<span class="sfgov-burger"><i></i><i></i><i></i></span>
					<span class="text-[11px] leading-none">Menu</span>
				</span>
			</span>
		</div>

		<nav aria-label="Primary" class="sfgov-nav">
			<span class="inline-flex items-center gap-1.5">
				Services
				<img src="/sfgov/icons/chevron-down.svg" alt="" class="h-4 w-4 brightness-0 invert" />
			</span>
			<span class="inline-flex items-center gap-1.5">
				Departments
				<img src="/sfgov/icons/chevron-down.svg" alt="" class="h-4 w-4 brightness-0 invert" />
			</span>
			<span>Jobs</span>
			<span class="inline-flex items-center gap-1.5">
				Contact
				<img src="/sfgov/icons/chevron-down.svg" alt="" class="h-4 w-4 brightness-0 invert" />
			</span>
		</nav>
	</div>
</header>

<style>
	/* Reflow against the MOCKUP FRAME, not the viewport: the frame is a named
	   container (src/routes/review/+layout.svelte) far narrower than the
	   window, so a media query would show the desktop header at phone width.

	   One step, at the same 1000px as the type ladder in app.css. Live sf.gov
	   switches from the full header to the compact one at a 1024px viewport;
	   the frame's border makes the "Desktop 1024px" preset a 1022px box. */
	.sfgov-header {
		display: flex;
		gap: 1.25rem;
		padding: 1rem 1.5rem 0.5rem;
		font-family: var(--site-font-body);
	}

	.sfgov-seal {
		width: 110px;
		height: 110px;
	}

	.sfgov-main {
		display: flex;
		flex: 1;
		min-width: 0;
		flex-direction: column;
	}

	.sfgov-top {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid rgb(255 255 255 / 0.35);
	}

	.sfgov-wordmark {
		display: flex;
		flex-direction: column;
	}
	.sfgov-wordmark-small {
		font-size: 0.875rem;
		line-height: 1.25rem;
	}
	.sfgov-wordmark-large {
		font-family: var(--site-font-display);
		font-size: 2rem;
		font-weight: 600;
		line-height: 2.25rem;
	}

	.sfgov-lang {
		margin-right: 1.75rem;
	}

	.sfgov-search {
		display: flex;
		height: 46px;
		border-radius: 4px;
		overflow: hidden;
		background: #fff;
	}
	.sfgov-search-field {
		display: flex;
		align-items: center;
		width: 206px;
		padding-inline: 1rem;
		color: var(--color-site-ink-muted);
	}
	.sfgov-search-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		background: var(--color-site-action-soft);
	}

	.sfgov-nav {
		display: flex;
		gap: 1.5rem;
		padding: 1rem 0.625rem 0.5rem;
		font-weight: 700;
		white-space: nowrap;
	}

	.sfgov-compact {
		display: none;
		align-items: center;
		align-self: stretch;
		padding-inline: 0.75rem;
		border-left: 1px solid rgb(255 255 255 / 0.35);
	}
	.sfgov-menu {
		flex-direction: column;
		justify-content: center;
		gap: 4px;
	}
	.sfgov-burger {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.sfgov-burger i {
		display: block;
		width: 20px;
		height: 2px;
		background: #fff;
	}

	@container mockup (max-width: 999px) {
		.sfgov-header {
			align-items: center;
			gap: 0.75rem;
			padding: 0.5rem 0 0.5rem 0.75rem;
		}
		.sfgov-seal {
			width: 42px;
			height: 42px;
		}
		.sfgov-top {
			align-items: center;
			padding-bottom: 0;
			border-bottom: 0;
		}
		.sfgov-wordmark-small {
			font-size: 0.6875rem;
			line-height: 1rem;
			font-weight: 700;
		}
		.sfgov-wordmark-large {
			font-size: 1rem;
			line-height: 1.25rem;
		}
		.sfgov-lang {
			margin-right: 0.75rem;
		}
		.sfgov-search,
		.sfgov-nav {
			display: none;
		}
		.sfgov-compact {
			display: flex;
		}
	}
</style>
