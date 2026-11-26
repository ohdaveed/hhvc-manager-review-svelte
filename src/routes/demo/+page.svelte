<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<!-- Each route owns its <main>; the root layout no longer wraps one. -->
<main>
	<a href={resolve('/demo/playwright')}>playwright</a>
</main>
