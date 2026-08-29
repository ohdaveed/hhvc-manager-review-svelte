<script lang="ts">
	// Inert mockup furniture, same rule as SiteHeader: every link is a plain
	// <span>, never an <a>, so nothing here is focusable or announced as
	// interactive to assistive tech.
</script>

<footer class="bg-sfds-blue-dark text-white">
	<div class="grid grid-cols-[1.5fr_1fr_1fr_1.1fr] gap-6 px-8 pt-10 pb-7">
		<div>
			<img
				src="/sfgov/Lockup_CCSF_White.png"
				alt="City and County of San Francisco"
				class="block h-auto w-full max-w-[213px]"
			/>
			<div class="mt-5 flex items-center gap-4">
				<img
					src="/sfgov/icons/facebook.svg"
					alt="Facebook"
					class="block h-6 w-6 brightness-0 invert"
				/>
				<img
					src="/sfgov/icons/instagram.svg"
					alt="Instagram"
					class="block h-6 w-6 brightness-0 invert"
				/>
				<img
					src="/sfgov/icons/threads.svg"
					alt="Threads"
					class="block h-6 w-6 brightness-0 invert"
				/>
				<img src="/sfgov/icons/x.svg" alt="X" class="block h-6 w-6 brightness-0 invert" />
			</div>
		</div>

		<div>
			<h2 class="mb-3.5 font-heading text-[17px] leading-[22px] font-bold">Our City</h2>
			<ul class="m-0 flex list-none flex-col gap-3 p-0 text-[15px]">
				<li><span class="underline underline-offset-[3px]">Services</span></li>
				<li><span class="underline underline-offset-[3px]">Departments</span></li>
				<li><span class="underline underline-offset-[3px]">Jobs</span></li>
				<li><span class="underline underline-offset-[3px]">City Hall</span></li>
			</ul>
		</div>

		<div>
			<h2 class="mb-3.5 font-heading text-[17px] leading-[22px] font-bold">Policy</h2>
			<ul class="m-0 flex list-none flex-col gap-3 p-0 text-[15px]">
				<li><span class="underline underline-offset-[3px]">Privacy policy</span></li>
				<li><span class="underline underline-offset-[3px]">Disclaimer</span></li>
			</ul>
		</div>

		<div>
			<h2 class="mb-3.5 font-heading text-[17px] leading-[22px] font-bold">Get help</h2>
			<ul class="m-0 flex list-none flex-col gap-3 p-0 text-[15px]">
				<li><span class="underline underline-offset-[3px]">Contact the City</span></li>
				<li><span class="underline underline-offset-[3px]">Report a problem</span></li>
				<li><span class="underline underline-offset-[3px]">Contact 311</span></li>
				<li><span class="underline underline-offset-[3px]">Accessibility</span></li>
			</ul>
		</div>
	</div>

	<div aria-hidden="true" class="flex items-end justify-between overflow-hidden">
		<img src="/sfgov/Illustration-Left.svg" alt="" class="block h-[92px] w-auto flex-none" />
		<img src="/sfgov/Illustration-Right.svg" alt="" class="block h-[92px] w-auto flex-none" />
	</div>
</footer>
