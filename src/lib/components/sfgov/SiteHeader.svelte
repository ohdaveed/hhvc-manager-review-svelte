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
				<span class="sfgov-lang inline-flex items-center font-bold whitespace-nowrap">
					<img
						src="/sfgov/icons/translate.svg"
						alt=""
						class="sfgov-lang-glyph brightness-0 invert"
					/>
					<span class="sfgov-lang-label">English</span>
					<img
						src="/sfgov/icons/chevron-down.svg"
						alt=""
						class="sfgov-chevron brightness-0 invert"
					/>
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
					<img src="/sfgov/icons/search.svg" alt="" class="h-6 w-6 brightness-0 invert" />
				</span>
				<span class="sfgov-compact sfgov-menu" aria-hidden="true">
					<span class="sfgov-burger"><i></i><i></i><i></i></span>
					<span class="text-[10px] leading-none">Menu</span>
				</span>
			</span>
		</div>

		<nav aria-label="Primary" class="sfgov-nav">
			<span class="inline-flex items-center gap-1">
				Services
				<img src="/sfgov/icons/chevron-down.svg" alt="" class="sfgov-chevron brightness-0 invert" />
			</span>
			<span class="inline-flex items-center gap-1">
				Departments
				<img src="/sfgov/icons/chevron-down.svg" alt="" class="sfgov-chevron brightness-0 invert" />
			</span>
			<span>Jobs</span>
			<span class="inline-flex items-center gap-1">
				Contact
				<img src="/sfgov/icons/chevron-down.svg" alt="" class="sfgov-chevron brightness-0 invert" />
			</span>
		</nav>
	</div>
</header>

<style>
	/* Reflow against the MOCKUP FRAME, not the viewport: the frame is a named
	   container (src/routes/review/+layout.svelte) far narrower than the
	   window, so a media query would show the desktop header at phone width.

	   Three sizes, as on live sf.gov, measured 2026-11-26 on
	   `dph-leaves-absence` with Playwright computed styles at 390, 768 and
	   1074px. Live steps at a 768px and a 1024px viewport; the frame's 1px
	   border makes the Tablet and Desktop presets 766px and 1022px boxes,
	   hence 760 and 1000 -- the same 1000 as the type ladder in app.css.

	   - Phone: 60px band, 42px seal, 16px wordmark, search and Menu behind
	     vertical rules.
	   - Tablet: the same compact layout at 78px with a 52px seal, a 24px
	     wordmark and the translate glyph before "English".
	   - Desktop: the full 144px header, its seal and nav on the page's own
	     1076px grid -- a 96px gutter that grows once the frame is wider than
	     the grid -- so the seal lines up with the page title below it. */
	.sfgov-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 9px 0 9px 12px;
		font-family: var(--site-font-body);
	}
	.sfgov-seal {
		width: 42px;
		height: 42px;
	}
	.sfgov-main {
		display: flex;
		flex: 1;
		min-width: 0;
		flex-direction: column;
	}
	.sfgov-top {
		display: flex;
		align-items: center;
	}
	.sfgov-wordmark {
		display: flex;
		flex-direction: column;
	}
	.sfgov-wordmark-small {
		font-size: 12px;
		font-weight: 500;
		line-height: 13.68px;
	}
	.sfgov-wordmark-large {
		font-family: var(--site-font-display);
		font-size: 16px;
		font-weight: 700;
		line-height: 18.24px;
	}
	.sfgov-lang {
		margin-right: 7px;
		font-size: 14px;
		line-height: 20px;
	}
	/* Live's "English" is a 75px box around ~51px of text, so the glyph and
	   the chevron each sit 12px off it. */
	.sfgov-lang-label {
		padding-inline: 12px;
	}
	.sfgov-lang-glyph {
		display: none;
		width: 16px;
		height: 16px;
	}
	.sfgov-chevron {
		width: 12px;
		height: 12px;
	}
	.sfgov-search {
		display: none;
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
		display: none;
		gap: 24px;
		margin-top: 5px;
		padding: 10px 0 10px 2px;
		font-size: 14px;
		font-weight: 700;
		line-height: 20px;
		white-space: nowrap;
	}
	.sfgov-compact {
		display: flex;
		align-items: center;
		align-self: stretch;
		padding-inline: 10px;
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

	@container mockup (min-width: 760px) {
		.sfgov-header {
			gap: 12px;
			padding: 13px 0 13px 28px;
		}
		.sfgov-seal {
			width: 52px;
			height: 52px;
		}
		.sfgov-wordmark-small {
			font-size: 16px;
			font-weight: 400;
			line-height: 24px;
		}
		.sfgov-wordmark-large {
			font-size: 24px;
			line-height: 27.36px;
		}
		.sfgov-lang {
			margin-right: 16px;
		}
		.sfgov-lang-glyph {
			display: block;
		}
		.sfgov-chevron {
			width: 20px;
			height: 20px;
		}
		.sfgov-compact {
			padding-inline: 20px;
		}
	}

	@container mockup (min-width: 1000px) {
		.sfgov-header {
			align-items: flex-start;
			gap: 28px;
			padding: 10px max(96px, calc((100cqi - 1076px) / 2));
		}
		.sfgov-seal {
			width: 112px;
			height: 112px;
			margin-top: 6px;
		}
		.sfgov-top {
			padding-bottom: 20px;
			border-bottom: 1px solid rgb(255 255 255 / 0.35);
		}
		.sfgov-wordmark-small {
			font-size: 14px;
		}
		.sfgov-wordmark-large {
			font-size: 32px;
			line-height: 34px;
		}
		.sfgov-lang {
			margin-right: 28px;
		}
		.sfgov-search,
		.sfgov-nav {
			display: flex;
		}
		.sfgov-compact {
			display: none;
		}
	}
</style>
