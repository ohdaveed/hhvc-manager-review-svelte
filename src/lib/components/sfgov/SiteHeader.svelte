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

	<nav aria-label="Primary" class="flex gap-2.5 text-sm font-bold">
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
		<span class="inline-flex items-center gap-1 text-sm font-bold whitespace-nowrap">
			<img src="/sfgov/icons/globe.svg" alt="" class="block h-[17px] w-[17px]" />
			English
			<img src="/sfgov/icons/chevron-down.svg" alt="" class="block h-3.5 w-3.5" />
		</span>
		<span class="flex min-w-0 items-stretch border-2 border-sfds-black">
			<span
				class="flex h-[34px] w-[66px] min-w-0 flex-1 items-center overflow-hidden px-2 text-sm text-nowrap text-sfds-slate-l2"
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
</header>
