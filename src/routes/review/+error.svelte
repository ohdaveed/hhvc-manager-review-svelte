<script lang="ts">
	import { page } from '$app/stores';
	import * as Alert from '$lib/components/ui/alert/index.js';

	// The message `+page.ts` passed to `error()`, or a plain fallback for any
	// other status that lands here.
	const detail = $derived($page.error?.message ?? 'Something went wrong.');
</script>

<!-- SFDS red, not shadcn's `destructive`.
     MEASURED on this page as rendered: the stock variant puts the title at
     4.77:1 (#e7000b on white) and the description at 4.54:1 (#e91923, the
     `/90` blend). Both clear WCAG AA, the description by 0.04 -- the same
     margin `--color-sfds-slate-l2` had before it turned out to fail outright
     on a tinted row. SFDS's own red is 6.44:1 here and is what the Analysis
     panel's issue badges already use, so an error state reads the same red
     wherever it appears.

     This surface is NOT covered by the axe gate, and deliberately so: it is a
     404 document, and `tests/fixtures.ts` fails any test that navigates to a
     4xx -- which is why `/review/[slug]`'s 404 is a unit test
     (`tests/reviewSlug404.spec.ts`) rather than an e2e. The numbers above were
     taken by hand in Chromium against the built app. -->
<Alert.Root
	variant="destructive"
	class="text-sfds-red *:data-[slot=alert-description]:text-sfds-red"
>
	<Alert.Title>
		{$page.status === 404 ? 'Page not found' : `Error ${$page.status}`}
	</Alert.Title>
	<Alert.Description>{detail}</Alert.Description>
</Alert.Root>
