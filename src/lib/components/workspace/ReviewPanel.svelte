<script lang="ts">
	import { updatePageStatus } from '$lib/stores/reviewState';

	// Mock page ID for testing
	const MOCK_PAGE_ID = 'page-123';

	const handleDecision = (status: 'needs-review' | 'approved' | 'blocked' | 'revise') => {
		// Uses the optimistic update method we just wrote
		updatePageStatus(MOCK_PAGE_ID, status);
	};
</script>

<div class="flex flex-col h-full divide-y divide-gray-200">
	<!-- Top Half: Manager Decision -->
	<div class="p-6 space-y-4">
		<h2 class="text-lg font-bold">Manager Review</h2>
		
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-2">Decision</label>
			<div class="flex flex-wrap gap-2">
				<button 
					onclick={() => handleDecision('approved')}
					class="px-3 py-1 text-sm border border-green-200 bg-green-50 text-green-700 rounded-full font-medium hover:bg-green-100 transition-colors"
				>
					Approve
				</button>
				<button 
					onclick={() => handleDecision('revise')}
					class="px-3 py-1 text-sm border border-yellow-200 bg-white text-yellow-700 rounded-full font-medium hover:bg-yellow-50 transition-colors"
				>
					Revise
				</button>
				<button 
					onclick={() => handleDecision('blocked')}
					class="px-3 py-1 text-sm border border-red-200 bg-white text-red-700 rounded-full font-medium hover:bg-red-50 transition-colors"
				>
					Blocked
				</button>
			</div>
		</div>

		<div>
			<label for="notes" class="block text-sm font-medium text-gray-700 mb-2">Decision Notes</label>
			<textarea id="notes" rows="4" class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2" placeholder="What needs to change before approval?"></textarea>
		</div>
	</div>

	<!-- Bottom Half: Page Checks -->
	<div class="p-6 flex-1 overflow-y-auto bg-gray-50">
		<h3 class="text-sm font-bold mb-4">Page Checks</h3>
		
		<div class="space-y-3">
			<div class="bg-white p-3 rounded shadow-sm border border-gray-100 flex gap-3 items-start">
				<span class="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Pass</span>
				<div>
					<p class="text-sm font-medium text-gray-900">Reading Level</p>
					<p class="text-xs text-gray-500 mt-1">Content is within Grade 6-8 target.</p>
				</div>
			</div>
			
			<div class="bg-white p-3 rounded shadow-sm border border-gray-100 flex gap-3 items-start">
				<span class="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">Check</span>
				<div>
					<p class="text-sm font-medium text-gray-900">Link Targets</p>
					<p class="text-xs text-gray-500 mt-1">2 external links open in same tab.</p>
				</div>
			</div>
		</div>
	</div>
</div>
