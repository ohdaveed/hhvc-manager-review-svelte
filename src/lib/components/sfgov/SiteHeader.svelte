<script lang="ts">
	// Inert mockup furniture: a picture of the SF.gov site header shown around a
	// reviewed page, not a working header. Every nav item, the language control
	// and the search box are plain <span>s on purpose -- no <a>, <button>, or
	// <input> -- so nothing here is focusable or announced as interactive to
	// assistive tech. tests/e2e's axe pass is a merge gate; a fake search box
	// exposed as a real control would fail it.
</script>

<header class="flex items-center gap-2 border-b border-sfds-grey-l2 bg-white px-[18px] py-3.5">
	<img
		src="/sfgov/Lockup_SFgov_Black.png"
		alt="SF.gov, City and County of San Francisco"
		class="block h-[38px] w-[123px] flex-none"
	/>

	<nav
		aria-label="Primary"
		class="sfgov-nav flex min-w-0 shrink gap-2.5 overflow-hidden text-sm font-bold"
	>
		<span class="inline-flex items-center gap-1 whitespace-nowrap">
			Services
			<img src="/sfgov/icons/chevron-down.svg" alt="" class="block h-3.5 w-3.5" />
		</span>
		<span class="inline-flex items-center gap-1 whitespace-nowrap">
			Departments
			<img src="/sfgov/icons/chevron-down.svg" alt="" class="block h-3.5 w-3.5" />
		</span>
		<span class="whitespace-nowrap">Jobs</span>
		<span class="inline-flex items-center gap-1 whitespace-nowrap">
			Contact
			<img src="/sfgov/icons/chevron-down.svg" alt="" class="block h-3.5 w-3.5" />
		</span>
	</nav>

	<span class="ml-auto flex min-w-0 flex-initial items-center gap-2.5">
		<span class="sfgov-lang inline-flex items-center gap-1 text-sm font-bold whitespace-nowrap">
			<img src="/sfgov/icons/globe.svg" alt="" class="block h-[17px] w-[17px]" />
			English
			<img src="/sfgov/icons/chevron-down.svg" alt="" class="block h-3.5 w-3.5" />
		</span>
		<span class="flex min-w-0 items-stretch border-2 border-sfds-black">
			<span
				class="sfgov-search-field flex h-[34px] w-[66px] min-w-0 flex-1 items-center overflow-hidden px-2 text-sm whitespace-nowrap text-sfds-slate-l2"
			>
				Search
			</span>
			<span
				aria-hidden="true"
				class="flex w-10 flex-none items-center justify-center bg-sfds-action"
			>
				<img
					src="/sfgov/icons/search.svg"
					alt=""
					class="block h-[18px] w-[18px] brightness-0 invert"
				/>
			</span>
		</span>
	</span>
	<!-- The hamburger the real site swaps its nav for. Hidden until the frame
	     is tablet-width or narrower. Drawn in CSS rather than added as an
	     asset, and `aria-hidden` like every other glyph in this inert
	     header. -->
	<span class="sfgov-menu" aria-hidden="true">
		<i></i><i></i><i></i>
	</span>
</header>

<style>
	/* ---------------------------------------------------------------------
	   Reflow against the MOCKUP FRAME, not the viewport.

	   This header did not participate in the `mockup` container query at all
	   -- `@container mockup` appeared only in app.css and SiteFooter.svelte --
	   so while the page body and footer reflowed with the frame, the header
	   kept its desktop row and relied on `overflow: hidden` to deal with the
	   consequences. MEASURED on the built app: at a 1100px viewport the frame
	   is 376px and the header's content overhung its right edge by 275px,
	   with 27px of scroll overflow; at 1280px, 95px of overhang. Visibly that
	   is "Departments" cut to "Departr" and the search box sliced in half --
	   a rendering sf.gov never produces at any width, shown to a reviewer
	   deciding whether the page is fit to publish.

	   The breakpoints are the two the rest of the mockup already uses, so the
	   header changes at the same frame widths as the body and footer.
	   --------------------------------------------------------------------- */
	.sfgov-menu {
		display: none;
		flex: none;
		flex-direction: column;
		gap: 4px;
		margin-left: auto;
		padding-inline: 4px;
	}

	.sfgov-menu i {
		display: block;
		width: 20px;
		height: 2px;
		background: var(--color-sfds-black);
	}

	/* Tablet: sf.gov drops the inline nav and the language control for a menu
	   button, keeping search. */
	@container mockup (max-width: 900px) {
		.sfgov-nav,
		.sfgov-lang {
			display: none;
		}

		.sfgov-menu {
			display: flex;
		}
	}

	/* Phone: the search field collapses to its icon. */
	@container mockup (max-width: 560px) {
		.sfgov-search-field {
			display: none;
		}
	}
</style>
