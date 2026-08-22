<script lang="ts">
  import '../app.css';
  let { children } = $props();
</script>

<main class="min-h-screen antialiased bg-slate-50">
  {@render children?.()}
</main>
