<script lang="ts">
	import type { ContactBlock, LinkRef, SocialLink } from './types';

	/**
	 * The global footer: optional contact band, optional feedback strip, then the
	 * navy block with the City lockup, link columns and the skyline illustration.
	 *
	 * The lockup and the skyline are real supplied files, copied in unaltered.
	 * Nothing here reconstructs a City mark, and nothing should. The skyline is
	 * pinned at 103px and cropped by overflow rather than scaled.
	 *
	 * Distinct from `src/lib/components/sfgov/SiteFooter.svelte`, which is inert
	 * mockup furniture for the review canvas. This one has real links.
	 *
	 * WCAG 2.1 AA:
	 * - 1.4.11 / 2.4.7. Every link in the navy block sits on #000925, where the
	 *   focus ring's usual #FCFCFC first stop is invisible. It is white here and
	 *   the ring reads at ~18:1.
	 * - 1.4.3. #FCFCFC on #000925 is 18.7:1. The underline is kept anyway —
	 *   1.4.1 asks that a link not be identified by colour alone, and in a block
	 *   where everything is white that is the only thing distinguishing them.
	 * - 1.1.1. The lockup carries a real alt; the skyline is decorative and
	 *   carries `alt=""`. Social links take their accessible name from `label`,
	 *   which is required by the type.
	 * - 1.3.1. Each link column is a `<nav>` with its heading as the label, so
	 *   the two groups are distinguishable in a landmark list.
	 */
	interface Props {
		contact?: ContactBlock[];
		feedback?: boolean;
		departments?: LinkRef[];
		about?: LinkRef[];
		social?: SocialLink[];
		lockup?: string;
		illustration?: string;
		onFeedback?: (helpful: boolean) => void;
		class?: string;
	}

	let {
		contact,
		feedback = true,
		departments = [],
		about = [],
		social = [],
		lockup = '/sfgov/Lockup_CCSF_White.png',
		illustration = '/sfgov/Illustration-Left.svg',
		onFeedback,
		class: className = ''
	}: Props = $props();
</script>

<footer class="ds-footer {className}">
	{#if contact?.length}
		<div class="ds-contact flex flex-col gap-5">
			<h2 class="ds-contact-title m-0">Contact</h2>
			<div class="ds-contact-grid flex items-stretch gap-7">
				{#each contact as block, i (i)}
					<div class="flex flex-1 flex-col gap-2">
						<h3 class="ds-contact-heading m-0 text-xl leading-7 font-bold">{block.heading}</h3>
						<p class="ds-contact-body m-0 text-base leading-6">{block.body}</p>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#if feedback}
		<div class="ds-feedback flex flex-wrap items-center justify-between gap-6">
			<span class="ds-feedback-label text-xl leading-7 font-bold">Was this page helpful?</span>
			<div class="flex gap-3">
				<button type="button" class="ds-feedback-btn" onclick={() => onFeedback?.(true)}>Yes</button
				>
				<button type="button" class="ds-feedback-btn" onclick={() => onFeedback?.(false)}>No</button
				>
			</div>
		</div>
	{/if}

	<div class="ds-navy flex flex-col gap-7">
		<div class="ds-navy-inner flex flex-wrap items-start justify-between gap-8">
			<div class="flex flex-col gap-5 pt-6">
				<img src={lockup} alt="City and County of San Francisco" class="ds-lockup block" />
				{#if social.length}
					<div class="flex items-center gap-4">
						{#each social as link, i (i)}
							<a
								href={link.href ?? '#'}
								aria-label={link.label}
								class="ds-social inline-flex items-center justify-center"
							>
								<img src={link.icon} alt="" class="ds-social-icon block" />
							</a>
						{/each}
					</div>
				{/if}
			</div>

			<div class="flex flex-col gap-7 pt-6">
				{#if departments.length}
					<nav aria-label="Departments" class="flex flex-col gap-2">
						<h3 class="ds-col-heading m-0 text-base leading-6 font-bold">Departments</h3>
						<div class="ds-col-links flex flex-wrap">
							{#each departments as link, i (i)}
								<a href={link.href ?? '#'} class="ds-footer-link">{link.label}</a>
							{/each}
						</div>
					</nav>
				{/if}
				{#if about.length}
					<nav aria-label="About" class="flex flex-col gap-2">
						<h3 class="ds-col-heading m-0 text-base leading-6 font-bold">About</h3>
						<div class="ds-col-links flex flex-wrap">
							{#each about as link, i (i)}
								<a href={link.href ?? '#'} class="ds-footer-link">{link.label}</a>
							{/each}
						</div>
					</nav>
				{/if}
			</div>
		</div>

		<div class="ds-skyline">
			<img src={illustration} alt="" class="block" />
		</div>
	</div>
</footer>

<style>
	.ds-footer {
		font-family: var(--site-font-body);
	}

	.ds-contact {
		padding: 50px 96px 0;
		background: var(--color-site-surface, #fcfcfc);
	}
	.ds-contact-title {
		font-family: var(--site-font-display);
		font-weight: 500;
		font-size: 40px;
		line-height: 52px;
		color: #0b0b0b;
	}
	.ds-contact-grid {
		padding-bottom: 60px;
	}
	.ds-contact-heading {
		color: var(--color-site-ink, #0b0c0c);
	}
	.ds-contact-body {
		color: var(--color-site-ink, #0b0c0c);
	}

	.ds-feedback {
		padding: 24px 96px;
		background: var(--color-site-tint, #f2f6fc);
	}
	.ds-feedback-label {
		color: var(--color-site-ink, #0b0c0c);
	}
	.ds-feedback-btn {
		box-sizing: border-box;
		height: var(--site-control-height, 40px);
		padding: 0 16px;
		border: 1px solid var(--color-site-action, #1b519e);
		border-radius: var(--site-radius, 4px);
		background: transparent;
		font-family: inherit;
		font-weight: 500;
		font-size: 14px;
		line-height: 20px;
		color: var(--color-site-action, #1b519e);
		cursor: pointer;
	}
	.ds-feedback-btn:hover {
		background: var(--color-site-action-soft, #dfebfd);
		border-color: var(--color-site-action-dark, #043578);
		color: var(--color-site-action-dark, #043578);
	}
	/* The feedback strip is --site-tint, not the page colour, so the ring's
	   first stop matches the strip. */
	.ds-feedback-btn:focus-visible {
		outline: none;
		box-shadow:
			0 0 0 4px var(--color-site-tint, #f2f6fc),
			0 0 0 7px var(--color-site-focus, #386ebf);
	}

	.ds-navy {
		padding-top: 28px;
		background: var(--color-site-navy, #000925);
	}
	.ds-navy-inner {
		padding: 20px 96px 0;
	}

	.ds-lockup {
		height: 64px;
		width: auto;
	}

	.ds-social {
		width: 44px;
		height: 44px;
		border-radius: 32px;
	}
	.ds-social-icon {
		width: 24px;
		height: 24px;
		filter: brightness(0) invert(1);
	}

	.ds-col-heading {
		color: #fcfcfc;
	}
	.ds-col-links {
		gap: 4px 16px;
	}

	.ds-footer-link {
		font-size: 16px;
		line-height: 24px;
		text-decoration: underline;
		color: #fcfcfc;
	}
	.ds-footer-link:hover {
		color: #ffffff;
		text-decoration-thickness: 2px;
	}

	/* White first stop on the navy block — 19.2:1 against #000925, and the same
	   ring shape the rest of the dark-ground components use. */
	.ds-footer-link:focus-visible,
	.ds-social:focus-visible {
		outline: none;
		box-shadow: var(--site-focus-ring-dark, 0 0 0 4px #ffffff, 0 0 0 7px #386ebf);
		border-radius: 2px;
	}

	.ds-skyline {
		width: 100%;
		height: 103px;
		overflow: hidden;
	}
	.ds-skyline img {
		height: 103px;
		width: auto;
	}

	@media (max-width: 900px) {
		.ds-contact,
		.ds-feedback,
		.ds-navy-inner {
			padding-left: 20px;
			padding-right: 20px;
		}
		.ds-contact-grid {
			flex-direction: column;
			gap: 28px;
		}
	}
</style>
