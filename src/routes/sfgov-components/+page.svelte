<script lang="ts">
	import { onMount } from 'svelte';
	import SiteButton from '$lib/components/sfgov/ds/SiteButton.svelte';
	import Icon from '$lib/components/sfgov/ds/Icon.svelte';
	import Breadcrumbs from '$lib/components/sfgov/ds/Breadcrumbs.svelte';
	import TextField from '$lib/components/sfgov/ds/TextField.svelte';
	import TextAreaField from '$lib/components/sfgov/ds/TextAreaField.svelte';
	import ChoiceGroup from '$lib/components/sfgov/ds/ChoiceGroup.svelte';
	import Dropdown from '$lib/components/sfgov/ds/Dropdown.svelte';
	import PageHeader from '$lib/components/sfgov/ds/PageHeader.svelte';
	import PageAlert from '$lib/components/sfgov/ds/PageAlert.svelte';
	import ListItem from '$lib/components/sfgov/ds/ListItem.svelte';
	import Spotlight from '$lib/components/sfgov/ds/Spotlight.svelte';
	import DataTable from '$lib/components/sfgov/ds/DataTable.svelte';
	import SiteHeader from '$lib/components/sfgov/ds/SiteHeader.svelte';
	import SiteFooter from '$lib/components/sfgov/ds/SiteFooter.svelte';
	import OnThisPage from '$lib/components/sfgov/ds/OnThisPage.svelte';

	/**
	 * Specimen route for the SF.gov design-system components.
	 *
	 * Public on purpose. playwright.config.ts runs `npm run build && npm run
	 * preview`, so a dev-only guard would make this route invisible to
	 * tests/sfgov-components.e2e.ts — the axe gate that is the whole reason it
	 * exists. It is unlinked from any nav and excluded from the sitemap.
	 *
	 * The live axe result at the top is the same ruleset the e2e gate runs. It
	 * is a convenience for whoever is editing a component, not the gate itself:
	 * CI is what blocks a merge.
	 */

	type AxeState =
		| { status: 'idle' | 'running' }
		| { status: 'unavailable'; reason: string }
		| { status: 'done'; violations: { id: string; impact: string; nodes: number; help: string }[] };

	let axeState = $state<AxeState>({ status: 'idle' });

	// Demo bindings. Named so the panel below reads as a form, not as noise.
	let addressValue = $state('');
	let unitValue = $state('');
	let detailsValue = $state('');
	let problemTypes = $state<string[]>(['pests']);
	let contactMethod = $state('email');
	let neighborhood = $state('');

	const crumbs = [
		{ label: 'SF.gov', href: '/' },
		{ label: 'Departments', href: '/departments' },
		{ label: 'Public Health', href: '/departments/public-health' },
		{ label: 'Environmental Health', href: '/departments/environmental-health' },
		{ label: 'Healthy Housing and Vector Control', href: '/hhvc' },
		{ label: 'Report a housing or pest problem' }
	];

	const sections = [
		{ heading: 'What to know before you start' },
		{ heading: 'What to do' },
		{ heading: 'Supporting information' }
	];

	// Inline so the specimen never depends on a file that may not be copied yet.
	const photo =
		"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='420' height='315'%3E%3Crect width='420' height='315' fill='%23EFEFEC'/%3E%3Crect width='420' height='315' fill='none' stroke='%23C9CACA' stroke-width='2'/%3E%3Ctext x='210' y='160' font-family='monospace' font-size='13' fill='%235B5F63' text-anchor='middle'%3EPHOTO 4:3%3C/text%3E%3C/svg%3E";

	onMount(async () => {
		axeState = { status: 'running' };
		try {
			const axe = (await import('axe-core')).default;
			const results = await axe.run(document.body, {
				runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }
			});
			axeState = {
				status: 'done',
				violations: results.violations.map((v) => ({
					id: v.id,
					impact: v.impact ?? 'unknown',
					nodes: v.nodes.length,
					help: v.help
				}))
			};
		} catch {
			axeState = {
				status: 'unavailable',
				reason: 'axe-core is not installed. Run `npm i -D axe-core` to see live results here.'
			};
		}
	});
</script>

<svelte:head>
	<title>SF.gov components — specimen</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="specimen">
	<h1 class="specimen-h1">SF.gov design-system components</h1>
	<p class="specimen-lede">
		Every component in <code>src/lib/components/sfgov/ds/</code>, in every state the frames specify.
		Interactive states are real here — hover and focus the controls rather than reading a screenshot
		of them.
	</p>

	<section aria-labelledby="axe-h" class="axe-panel" data-testid="axe-panel">
		<h2 id="axe-h" class="specimen-h2">Accessibility check</h2>
		{#if axeState.status === 'running' || axeState.status === 'idle'}
			<p class="axe-line">Running axe-core against WCAG 2.1 A and AA…</p>
		{:else if axeState.status === 'unavailable'}
			<p class="axe-line">{axeState.reason}</p>
		{:else if axeState.violations.length === 0}
			<p class="axe-line axe-pass" data-testid="axe-result">
				No WCAG 2.1 AA violations on this page.
			</p>
		{:else}
			<p class="axe-line axe-fail" data-testid="axe-result">
				{axeState.violations.length} violation{axeState.violations.length === 1 ? '' : 's'}:
			</p>
			<ul class="axe-list">
				{#each axeState.violations as violation (violation.id)}
					<li>
						<code>{violation.id}</code> ({violation.impact}) ×{violation.nodes} — {violation.help}
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- ACTIONS ------------------------------------------------------------ -->
	<section aria-labelledby="buttons-h" class="spec">
		<h2 id="buttons-h" class="specimen-h2">SiteButton</h2>
		<p class="spec-note">
			40px tall, 4px radius, four variants. One primary per page. Hover and focus are real CSS
			states; the third row forces them so both can be seen at once.
		</p>

		<div class="row">
			<SiteButton variant="primary">Report a problem</SiteButton>
			<SiteButton variant="secondary">Save draft</SiteButton>
			<SiteButton variant="tertiary">Cancel</SiteButton>
			<SiteButton variant="ghost">Learn more</SiteButton>
		</div>
		<div class="row">
			<SiteButton variant="primary" disabled>Report a problem</SiteButton>
			<SiteButton variant="secondary" disabled>Save draft</SiteButton>
			<SiteButton variant="tertiary" disabled>Cancel</SiteButton>
			<SiteButton variant="ghost" disabled>Learn more</SiteButton>
		</div>
		<div class="row">
			<SiteButton variant="primary" demoState="hover">Forced hover</SiteButton>
			<SiteButton variant="primary" demoState="focus">Forced focus</SiteButton>
			<SiteButton variant="tertiary" demoState="hover">Forced hover</SiteButton>
			<SiteButton variant="tertiary" demoState="focus">Forced focus</SiteButton>
		</div>
		<div class="row row-dark">
			<SiteButton variant="primary" onDark demoState="focus">On navy, focused</SiteButton>
			<SiteButton variant="primary" onDark>On navy</SiteButton>
		</div>
		<div class="row">
			<SiteButton iconOnly label="Search">
				<Icon src="/sfgov/icons/search.svg" decorative size={20} />
			</SiteButton>
			<span class="spec-caption">
				<code>iconOnly</code> requires <code>label</code> — the type will not compile without it.
			</span>
		</div>
	</section>

	<section aria-labelledby="crumbs-h" class="spec">
		<h2 id="crumbs-h" class="specimen-h2">Breadcrumbs</h2>
		<p class="spec-note">
			Six levels, so the middle collapses to a <code>…</code> — a real button that expands the trail.
			The current page is never a link and is never truncated.
		</p>
		<Breadcrumbs items={crumbs} />
		<p class="spec-caption">Compact, for widths under 640px:</p>
		<Breadcrumbs items={crumbs} compact />
	</section>

	<!-- FORMS -------------------------------------------------------------- -->
	<section aria-labelledby="fields-h" class="spec">
		<h2 id="fields-h" class="specimen-h2">Form fields</h2>
		<p class="spec-note">
			Labels are always visible and always above the field, help text between the two. Errors are
			2px and a glyph, never colour alone.
		</p>

		{#snippet dollar()}${/snippet}
		{#snippet sqft()}sq ft{/snippet}

		<div class="grid">
			<TextField
				label="Street address"
				help="The address where the problem is, not your mailing address."
				placeholder="1650 Mission St"
				bind:value={addressValue}
			/>
			<TextField
				label="Unit number"
				help="Leave blank for a whole building."
				bind:value={unitValue}
			/>

			<TextField
				label="Email address"
				type="email"
				error="Enter an email address in the format name@example.com"
				value="not-an-email"
			/>
			<TextField label="Case number" value="EH-2026-00412" disabled />
			<TextField label="Amount owed" prefix={dollar} value="1,240.00" />
			<TextField label="Parcel size" suffix={sqft} value="2,400" />
		</div>

		<div class="grid">
			<TextAreaField
				label="Describe the problem"
				help="What you saw, where, and when it started."
				rows={4}
				bind:value={detailsValue}
			/>
			<TextAreaField
				label="Describe the problem"
				error="Enter a description so the inspector knows what to look for."
				rows={4}
			/>
		</div>

		<div class="grid">
			<ChoiceGroup
				type="checkbox"
				legend="What are you reporting?"
				help="Choose all that apply."
				bind:value={problemTypes}
				options={[
					{ label: 'Rats, mice, or other four-legged pests', value: 'pests' },
					{ label: 'Cockroaches, bed bugs, or other insects', value: 'insects' },
					{ label: 'Garbage, filth, or overgrown vegetation', value: 'garbage' },
					{ label: 'Mold or water damage', value: 'mold' },
					{ label: 'Not listed here', value: 'other', disabled: true }
				]}
			/>
			<ChoiceGroup
				type="radio"
				legend="How should we contact you?"
				bind:value={contactMethod}
				options={[
					{ label: 'Email', value: 'email' },
					{ label: 'Phone', value: 'phone' },
					{ label: 'Do not contact me', value: 'none' }
				]}
			/>
		</div>

		<div class="grid">
			<Dropdown
				label="Neighborhood"
				help="Six or more options is a dropdown; fewer is radios."
				bind:value={neighborhood}
				options={[
					{
						group: 'North',
						options: [
							{ label: 'Chinatown', value: 'chinatown' },
							{ label: 'North Beach', value: 'north-beach' },
							{ label: 'Russian Hill', value: 'russian-hill' }
						]
					},
					{
						group: 'South',
						options: [
							{ label: 'Bayview', value: 'bayview' },
							{ label: 'Mission', value: 'mission' },
							{ label: 'Excelsior', value: 'excelsior' }
						]
					}
				]}
			/>
			<Dropdown
				label="Neighborhood"
				error="Choose the neighborhood where the problem is."
				options={[{ label: 'Mission', value: 'mission' }]}
			/>
			<Dropdown
				label="Neighborhood"
				value="mission"
				options={[{ label: 'Mission', value: 'mission' }]}
				disabled
			/>
		</div>
	</section>

	<!-- CONTENT ------------------------------------------------------------ -->
	<section aria-labelledby="alerts-h" class="spec">
		<h2 id="alerts-h" class="specimen-h2">PageAlert</h2>
		<p class="spec-note">
			One per page. <code>danger</code> is <code>role="alert"</code>; the other four are
			<code>role="status"</code>, so an archive notice does not interrupt a screen reader
			mid-sentence.
		</p>
		<div class="stack">
			<PageAlert kind="information" title="Inspections are running about two weeks out">
				File the report anyway — the queue is ordered by the date you file.
			</PageAlert>
			<PageAlert kind="success" title="Your report was filed">
				Your case number is EH-2026-00412. An inspector will contact you.
			</PageAlert>
			<PageAlert kind="warning" title="This form closes at 5pm on Friday">
				Reports filed after Friday are handled the following week.
			</PageAlert>
			<PageAlert kind="danger" title="This building has an open Notice of Violation">
				Corrections are due 30 September 2026. Ask for an extension before the deadline, not after.
			</PageAlert>
			<PageAlert kind="archive" title="This page is no longer maintained" dismissible>
				It describes the 2024 fee schedule. See Healthy Housing fees and deadlines for current
				rates.
			</PageAlert>
		</div>
	</section>

	<section aria-labelledby="header-h" class="spec">
		<h2 id="header-h" class="specimen-h2">PageHeader</h2>
		<p class="spec-note">One H1, sentence case, under 65 characters. The lede runs under 110.</p>
		<div class="frame">
			<PageHeader
				eyebrow="Transaction"
				title="Report rats, mice, and other four-legged problems"
				subtitle="Report rats, mice, raccoons, bats, or other four-legged pest problems in a home, building, yard, or shared area."
				partOf={{ label: 'Healthy Housing and Vector Control', href: '/hhvc' }}
			/>
		</div>
	</section>

	<section aria-labelledby="otp-h" class="spec">
		<h2 id="otp-h" class="specimen-h2">OnThisPage</h2>
		<p class="spec-note">
			Renders nothing below two headings. Entries are real anchors here; the mockup version at
			<code>sfgov/OnThisPage.svelte</code> renders inert spans on purpose.
		</p>
		<div class="frame frame-narrow">
			<OnThisPage {sections} />
		</div>
	</section>

	<section aria-labelledby="spot-h" class="spec">
		<h2 id="spot-h" class="specimen-h2">Spotlight</h2>
		<p class="spec-note">One per page. Three hues x light/dark, three layouts.</p>
		<div class="stack">
			<Spotlight
				tone="primary"
				layout="side"
				title="Free integrated pest management workshop"
				image={photo}
				credit={{ label: 'SF Environment', href: '#' }}
				action={{ label: 'Request a session', href: '#' }}
			>
				Request a free session for tenant groups, resident councils, and community organizations in
				San Francisco.
			</Spotlight>
			<Spotlight
				tone="primary"
				dark
				layout="none"
				title="Report standing water"
				action={{ label: 'Start a report', href: '#' }}
			>
				Standing water in a yard, roof, gutter, or catch basin is where mosquitoes breed. Tell us
				and we will treat or remove it.
			</Spotlight>
			<Spotlight
				tone="secondary"
				layout="none"
				title="Guides in other languages"
				action={{ label: 'Browse the guides', href: '#' }}
			>
				Pest, mold, and tenant rights guides in Spanish, Chinese, Filipino, Russian, and Vietnamese.
			</Spotlight>
			<Spotlight
				tone="secondary"
				dark
				layout="none"
				title="Request an interpreter"
				action={{ label: 'Ask for an interpreter', href: '#' }}
			>
				Ask for an interpreter or a translated notice before a Healthy Housing inspection.
			</Spotlight>
			<Spotlight
				tone="accent"
				layout="none"
				title="Your Notice of Violation has a deadline"
				action={{ label: 'Read what it means', href: '#' }}
			>
				A notice lists the conditions to correct and the date they are due. Contact the investigator
				named on it before that date if you need more time.
			</Spotlight>
			<Spotlight
				tone="accent"
				dark
				layout="none"
				title="Pay a Healthy Housing citation"
				action={{ label: 'Pay your citation', href: '#' }}
			>
				A penalty issued after an uncorrected Notice of Violation or a missed re-inspection.
			</Spotlight>
		</div>
	</section>

	<section aria-labelledby="list-h" class="spec">
		<h2 id="list-h" class="specimen-h2">ListItem</h2>
		<p class="spec-note">Link text is the full title. Never "Read more".</p>
		<div class="stack">
			<ListItem
				title="Free mosquito education workshop"
				href="#"
				meta={[
					{ icon: 'date', label: '12 September 2026' },
					{ icon: 'time', label: '10:00am – 11:30am' },
					{ icon: 'location', label: '49 South Van Ness Ave' }
				]}
			>
				Request a free mosquito science workshop for schools, camps, museums, and science fairs.
			</ListItem>
			<ListItem title="Free IPM education workshop" href="#" badge={{ label: 'Cancelled' }}>
				This session was cancelled. The next one is scheduled for October.
			</ListItem>
		</div>
	</section>

	<section aria-labelledby="table-h" class="spec">
		<h2 id="table-h" class="specimen-h2">DataTable</h2>
		<p class="spec-note">
			A real <code>&lt;table&gt;</code> with <code>&lt;th scope&gt;</code>. Three columns or fewer.
			Report is the only Karl type that supports tables.
		</p>
		<DataTable
			caption="Inspection outcomes by district, 2025"
			headers={['District', 'Inspections', 'Notices issued']}
			rows={[
				{ cells: [{ label: 'Mission', href: '#' }, '412', '96'] },
				{ cells: [{ label: 'Tenderloin', href: '#' }, '388', '141'] },
				{ cells: [{ label: 'Bayview', href: '#' }, '265', '72'] }
			]}
		/>
		<p class="spec-caption">Row layout, with a header cell down the left:</p>
		<DataTable
			caption="Fee schedule for apartment buildings"
			layout="row"
			rows={[
				{ header: '3–6 units', cells: ['$189 per year'] },
				{ header: '7–29 units', cells: ['$372 per year'] },
				{ header: '30+ units', cells: ['$744 per year'] }
			]}
		/>
	</section>

	<!-- CHROME ------------------------------------------------------------- -->
	<section aria-labelledby="chrome-h" class="spec">
		<h2 id="chrome-h" class="specimen-h2">SiteHeader and SiteFooter</h2>
		<p class="spec-note">
			Real links, a real language select and a real search form — unlike the inert mockup versions
			one folder up.
		</p>
		<div class="frame">
			<SiteHeader
				nav={[
					{ label: 'Services', href: '#' },
					{ label: 'Departments', href: '#' },
					{ label: 'Jobs', href: '#' },
					{ label: 'Contact', href: '#' }
				]}
				languages={[
					{ label: 'English', value: 'en' },
					{ label: 'Español', value: 'es' },
					{ label: '中文', value: 'zh' },
					{ label: 'Filipino', value: 'fil' }
				]}
			/>
		</div>
		<div class="frame">
			<SiteFooter
				contact={[
					{
						heading: 'Healthy Housing and Vector Control',
						body: '49 South Van Ness Ave, San Francisco'
					},
					{ heading: 'Report a problem', body: 'Call 311 or file online at any time.' }
				]}
				departments={[
					{ label: 'Public Health', href: '#' },
					{ label: 'Building Inspection', href: '#' },
					{ label: 'Rent Board', href: '#' }
				]}
				about={[
					{ label: 'About SF.gov', href: '#' },
					{ label: 'Accessibility', href: '#' },
					{ label: 'Privacy', href: '#' }
				]}
			/>
		</div>
	</section>
</main>

<style>
	.specimen {
		max-width: 1080px;
		margin: 0 auto;
		padding: 48px 24px 120px;
		background: var(--color-site-surface, #fcfcfc);
		font-family: var(--site-font-body);
		color: var(--color-site-ink, #0b0c0c);
	}

	.specimen-h1 {
		margin: 0 0 12px;
		font-family: var(--site-font-display);
		font-weight: 500;
		font-size: 44px;
		line-height: 56px;
		letter-spacing: -1px;
	}

	.specimen-lede {
		margin: 0 0 40px;
		max-width: 68ch;
		font-size: 20px;
		line-height: 30px;
		color: var(--color-site-ink-secondary, #3a3e42);
		text-wrap: pretty;
	}

	.specimen-h2 {
		margin: 0 0 8px;
		font-family: var(--site-font-display);
		font-weight: 600;
		font-size: 28px;
		line-height: 38px;
		letter-spacing: -0.5px;
	}

	.spec {
		padding: 40px 0;
		border-top: 1px solid var(--color-site-border-subtle, #e9eaea);
	}

	.spec-note {
		margin: 0 0 24px;
		max-width: 72ch;
		font-size: 16px;
		line-height: 24px;
		color: var(--color-site-ink-secondary, #3a3e42);
		text-wrap: pretty;
	}

	.spec-caption {
		margin: 24px 0 12px;
		font-size: 14px;
		line-height: 20px;
		color: var(--color-site-ink-muted, #5b5f63);
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 16px;
		margin-bottom: 16px;
	}

	.row-dark {
		padding: 20px;
		border-radius: 4px;
		background: var(--color-site-navy, #000925);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: 24px;
		margin-bottom: 24px;
		align-items: start;
	}

	.stack {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.frame {
		border: 1px solid var(--color-site-border-subtle, #e9eaea);
		border-radius: 4px;
		overflow: hidden;
	}

	.frame-narrow {
		max-width: 420px;
		padding: 0 20px;
	}

	.axe-panel {
		margin-bottom: 8px;
		padding: 20px 24px;
		border: 1px solid var(--color-site-border-subtle, #e9eaea);
		border-radius: 4px;
		background: #ffffff;
	}

	.axe-line {
		margin: 0;
		font-size: 16px;
		line-height: 24px;
	}

	.axe-pass {
		font-weight: 700;
		color: var(--color-site-success, #026800);
	}

	.axe-fail {
		font-weight: 700;
		color: var(--color-site-danger, #ac0000);
	}

	.axe-list {
		margin: 12px 0 0;
		padding-left: 20px;
		font-size: 15px;
		line-height: 24px;
	}

	code {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.9em;
	}
</style>
