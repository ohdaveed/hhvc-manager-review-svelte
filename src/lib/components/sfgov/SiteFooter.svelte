<script lang="ts">
	// Inert mockup furniture, same rule as SiteHeader: every link is a plain
	// <span>, never an <a>, so nothing here is focusable or announced as
	// interactive to assistive tech.
	const social = [
		{ src: '/sfgov/icons/facebook.svg', alt: 'Facebook' },
		{ src: '/sfgov/icons/instagram.svg', alt: 'Instagram' },
		{ src: '/sfgov/icons/threads.svg', alt: 'Threads' },
		{ src: '/sfgov/icons/x.svg', alt: 'X' },
		{ src: '/sfgov/icons/bluesky.svg', alt: 'Bluesky' }
	];
	const columns = [
		{ heading: 'Our City', links: ['Services', 'Departments', 'Jobs', 'City Hall'] },
		{ heading: 'Policy', links: ['Privacy policy', 'Disclaimer'] },
		{
			heading: 'Get help',
			links: ['Contact the City', 'Report a problem', 'Contact 311', 'Accessibility']
		}
	];
</script>

<footer class="bg-site-navy text-white">
	<div class="footer-grid">
		<div class="footer-brand">
			<img
				src="/sfgov/Lockup_CCSF_White.png"
				alt="City and County of San Francisco"
				class="footer-lockup"
			/>
			<div class="footer-social">
				{#each social as icon (icon.alt)}
					<span class="footer-social-icon">
						<img src={icon.src} alt={icon.alt} class="block h-6 w-6 brightness-0 invert" />
					</span>
				{/each}
			</div>
		</div>

		{#each columns as column (column.heading)}
			<div>
				<h2 class="footer-heading">{column.heading}</h2>
				<ul class="footer-links">
					{#each column.links as link (link)}
						<li><span class="underline underline-offset-[3px]">{link}</span></li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>

	<div aria-hidden="true" class="flex items-end justify-between overflow-hidden">
		<img src="/sfgov/Illustration-Left.svg" alt="" class="block h-[92px] w-auto flex-none" />
		<img src="/sfgov/Illustration-Right.svg" alt="" class="block h-[92px] w-auto flex-none" />
	</div>
</footer>

<style>
	/* Queries the `mockup` frame declared in src/routes/review/+layout.svelte,
	   not the viewport: the mockup renders in a pane far narrower than the
	   window, so a viewport query would never leave the desktop layout.

	   Measured on live sf.gov (`dph-leaves-absence`) 2026-11-26 at 390, 768
	   and 1074px. The footer sits on the page's own grid -- 20px gutters on a
	   phone, 28px on a tablet, 96px (then the 1076px grid) on desktop -- so the
	   lockup lines up with the page title. From tablet up it is ONE row: the
	   lockup takes 5 of 12 columns and the three link columns share the other
	   7, which is what the first track's `calc` states with 28px gutters.
	   Breakpoints are 760/1000 for the same frame-border reason as SiteHeader. */
	.footer-grid {
		display: grid;
		grid-template-columns: 1fr;
		row-gap: 28px;
		padding: 28px 20px;
	}
	.footer-lockup {
		display: block;
		width: 215px;
		height: auto;
	}
	/* 48px boxes, 4px apart, a 24px glyph centred in each: live's icon links. */
	.footer-social {
		display: flex;
		gap: 4px;
		margin-top: 16px;
	}
	.footer-social-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
	}
	.footer-heading {
		margin: 0 0 12px;
		font-family: var(--site-font-display);
		font-size: 20px;
		font-weight: 500;
		line-height: 28px;
	}
	.footer-links {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin: 0;
		padding: 0;
		font-size: 16px;
		line-height: 24px;
		list-style: none;
	}

	@container mockup (min-width: 760px) {
		.footer-grid {
			grid-template-columns: calc((100% + 28px) * 5 / 12 - 28px) repeat(3, minmax(0, 1fr));
			column-gap: 28px;
			padding: 48px 28px 28px;
		}
		.footer-brand {
			padding-top: 43px;
		}
		.footer-lockup {
			width: 264px;
		}
	}

	@container mockup (min-width: 1000px) {
		.footer-grid {
			padding-inline: max(96px, calc((100cqi - 1076px) / 2));
		}
		.footer-brand {
			padding-top: 24px;
		}
		.footer-lockup {
			width: 100%;
			max-width: 344px;
		}
		.footer-heading {
			font-size: 24px;
			line-height: 32px;
		}
	}
</style>
