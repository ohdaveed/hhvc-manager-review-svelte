<script>
	/**
	 * A missing-asset placeholder, not a corpus field. Nothing in `src/lib/data`
	 * carries actual image copy today -- several `karl` notes flag a real
	 * asset ("Spotlight image (min 1080x350px)... no mockup equivalent") that
	 * Digital Services has not supplied yet. So this renders no `<img>` (there
	 * is nothing to point one at, and an `<img>` with a fake `src` and a
	 * placeholder `alt` would misreport what a reviewer is looking at) and no
	 * `EditTarget` (there is no reviewable string here to select). `slot` is
	 * plain caption text describing what belongs here.
	 */
	let { slot = 'Image not yet supplied' } = $props();
</script>

<div class="image-block" role="img" aria-label={slot}>
	<p>{slot}</p>
</div>

<style>
	.image-block {
		height: 200px;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 0 24px;
		margin: 16px 0;
		background: repeating-linear-gradient(135deg, #f7f7f5, #f7f7f5 8px, #efefec 8px, #efefec 16px);
	}

	.image-block p {
		margin: 0;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 12px;
		color: var(--text-secondary, #1d4d70);
	}
</style>
