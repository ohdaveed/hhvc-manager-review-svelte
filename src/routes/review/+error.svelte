<script lang="ts">
	import { page } from '$app/stores';
	import * as Alert from '$lib/components/ui/alert/index.js';

	// The message `+page.ts` passed to `error()`, or a plain fallback for any
	// other status that lands here.
	const detail = $derived($page.error?.message ?? 'Something went wrong.');
</script>

<Alert.Root variant="destructive">
	<Alert.Title>
		{$page.status === 404 ? 'Page not found' : `Error ${$page.status}`}
	</Alert.Title>
	<Alert.Description>{detail}</Alert.Description>
</Alert.Root>
