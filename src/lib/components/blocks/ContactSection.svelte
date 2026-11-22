<script lang="ts">
	import EditTarget from '../EditTarget.svelte';

	/**
	 * `page.contact`, as sf.gov's "Contact us" block. Measured 2026-11-22 on
	 * `report-health-nuisance-or-hazards` (Phone) and
	 * `departments--department-public-health--environmental-health` (Address,
	 * Phone, Email) at 390, 768 and 1280:
	 *
	 * - It spans the full 1076px grid, not the 7/12 reading column.
	 * - h2 "Contact us", then 32px to the channels (12px h2 margin + a 20px gap).
	 * - Channels stack below `md` with a 1px `#C9CACA` rule under each but the
	 *   last. From `md` they sit in a row, 28px apart, each at most 400px wide,
	 *   with the rule on the right instead and 12px (20px at `lg`) before it.
	 *   16px under every channel.
	 * - A 24px glyph (ink, 12px below), a Slab 500 h3 at 20/28 -> 24/32 (12px
	 *   below), then each value as a link (Flex 16/24, `#2A60AF`, underlined),
	 *   28px between values.
	 *
	 * The corpus carries `phone`, `email` and `other`. `other` holds an office
	 * name ("Environmental Health -- Healthy Housing and Vector Control"), not an
	 * address, so it gets a neutral "Other" heading, no glyph and plain text
	 * rather than live's Address column, which would invent a channel. Only
	 * channels with at least one string render, and with none the whole block
	 * (h2 included) does not render.
	 *
	 * Field ids are `contact.<channel>.<i>`, exactly what `extractCopy` emits.
	 * Values are inert spans, never `tel:` / `mailto:` anchors.
	 */
	let {
		contact
	}: {
		contact: { phone?: unknown; email?: unknown; other?: unknown } | undefined;
	} = $props();

	// The two sf.gov glyphs the corpus has a channel for, copied from live.
	const icons: Record<string, string> = {
		phone:
			'M12.3304 8.00001L6.91616 2.5858L2.91614 6.58579L2.91615 8.19554L2.98979 8.37666C4.32049 11.6495 5.82807 14.1623 7.8494 16.1798C9.87182 18.1983 12.353 19.6656 15.5482 20.9299L15.7255 21L17.3304 21L21.3304 17L15.9162 11.5858L13.6825 13.8194C12.5458 13.3315 11.9337 12.9712 11.4701 12.5063C11.0009 12.0359 10.6269 11.4017 10.1041 10.2263L12.3304 8.00001ZM4.91614 7.41422L6.91616 5.41422L9.50195 8.00001L7.73217 9.76978L7.99561 10.3906C8.66175 11.9605 9.20411 13.0665 10.0539 13.9186C10.9086 14.7757 11.9976 15.3 13.5398 15.9265L14.1543 16.1761L15.9162 14.4142L18.5019 17L16.5019 19H16.1081C13.168 17.819 10.9997 16.4983 9.26226 14.7642C7.5235 13.0288 6.16281 10.8261 4.91615 7.80321L4.91614 7.41422Z',
		email:
			'M4 12C4 7.58172 7.58172 4 12 4C16.4183 4 20 7.58172 20 12C20 13.1518 19.551 14.3748 18.8589 15.1849C18.1824 15.9767 17.4069 16.2567 16.6062 15.9817C16.3471 15.8927 16.146 15.773 16 15.6391V7H14V7.41604C13.3875 7.14845 12.7111 7 12 7C9.23858 7 7 9.23858 7 12C7 14.7614 9.23858 17 12 17C12.7672 17 13.4941 16.8272 14.1438 16.5184L14.1679 16.5547C14.6088 17.216 15.2727 17.6384 15.9566 17.8733C17.7653 18.4945 19.349 17.6902 20.3795 16.484C21.3944 15.296 22 13.6071 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C13.5947 22 15.1049 21.626 16.445 20.96L15.555 19.169C14.4852 19.7006 13.279 20 12 20C7.58172 20 4 16.4183 4 12ZM14 14.2361C13.4692 14.7111 12.7684 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C12.7684 9 13.4692 9.28885 14 9.76389V14.2361Z'
	};

	const channelDefs = [
		{ key: 'phone', title: 'Phone', link: true },
		{ key: 'email', title: 'Email', link: true },
		{ key: 'other', title: 'Other', link: false }
	] as const;

	// Same rule as `extractCopy`'s `set`: only strings are copy. Keeping the
	// original index keeps the field id aligned with the corpus even if a
	// non-string sits earlier in the array.
	const channels = $derived(
		channelDefs
			.map((def) => {
				const raw = contact?.[def.key];
				const entries = (Array.isArray(raw) ? raw : [])
					.map((value, i) => ({ value, i }))
					.filter((e): e is { value: string; i: number } => typeof e.value === 'string');
				return { ...def, entries };
			})
			.filter((c) => c.entries.length > 0)
	);
</script>

{#if channels.length > 0}
	<section class="contact-section">
		<h2>Contact us</h2>
		<div class="contact-section-channels">
			{#each channels as channel (channel.key)}
				<div class="contact-channel" data-channel={channel.key}>
					{#if icons[channel.key]}
						<svg
							class="contact-channel-icon"
							viewBox="0 0 24 24"
							width="24"
							height="24"
							fill="currentColor"
							aria-hidden="true"
						>
							<path fill-rule="evenodd" clip-rule="evenodd" d={icons[channel.key]} />
						</svg>
					{/if}
					<h3 class="contact-channel-title">{channel.title}</h3>
					<div class="contact-channel-values">
						{#each channel.entries as entry (entry.i)}
							<EditTarget
								as="div"
								class={channel.link ? 'contact-channel-link' : 'contact-channel-text'}
								fieldId={`contact.${channel.key}.${entry.i}`}
								name={`Contact ${channel.title} [${entry.i + 1}]`}
								value={entry.value}
							/>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</section>
{/if}

<style>
	.contact-section {
		display: flex;
		flex-direction: column;
		gap: 20px;
		margin-top: 2.5rem;
	}

	/* The h2 keeps `#mockPage h2`'s 12px margin; with the 20px gap that is the
	   measured 32px. `#mockPage h3` is an ID selector, so the h3 override below
	   needs the same weight. */
	.contact-section-channels {
		display: flex;
		flex-direction: column;
		gap: 28px;
	}

	.contact-channel {
		padding-bottom: 16px;
		border-bottom: 1px solid var(--color-site-border);
	}
	.contact-channel:last-child {
		border-bottom: 0;
	}

	.contact-channel-icon {
		display: block;
		margin-bottom: 12px;
		color: var(--color-site-ink);
	}

	:global(#mockPage) .contact-channel-title {
		margin-bottom: 12px;
		font-family: var(--site-font-display);
		font-size: 1.25rem;
		font-weight: 500;
		line-height: 1.75rem;
	}

	.contact-channel-values {
		display: flex;
		flex-direction: column;
		gap: 28px;
	}

	:global(#mockPage) .contact-section :global(.contact-channel-link),
	:global(#mockPage) .contact-section :global(.contact-channel-link .edit-target) {
		color: var(--color-site-action-fill);
		text-decoration: underline;
		text-underline-offset: 3px;
		overflow-wrap: anywhere;
	}

	/* sf.gov `md` (see LinkGrid for why 700px), then `lg` with the type step. */
	@container mockup (min-width: 700px) {
		.contact-section-channels {
			flex-direction: row;
		}
		.contact-channel {
			flex: 1 1 0;
			min-width: 0;
			max-width: 400px;
			padding-right: 12px;
			border-bottom: 0;
			border-right: 1px solid var(--color-site-border);
		}
		.contact-channel:last-child {
			padding-right: 0;
			border-right: 0;
		}
		/* "Other" has no glyph; keep its h3 level with its neighbours' (24px
		   glyph + 12px). */
		:global(#mockPage) .contact-channel-title:first-child {
			margin-top: 36px;
		}
	}
	@container mockup (min-width: 800px) {
		.contact-channel {
			padding-right: 20px;
		}
		:global(#mockPage) .contact-channel-title {
			font-size: 1.5rem;
			line-height: 2rem;
		}
	}
</style>
