/**
 * @vitest-environment jsdom
 *
 * The walkthrough header's progress count. `copied` comes from the route and
 * counts every step marked copied -- a chooser or a flagged step can be marked
 * too -- so it has to be read against the step total, the same unit as the
 * drawer's "Step N of M". Against `copyableCount` (steps with values) it read
 * "0 of 8 fields copied" beside "Step 1 of 13", and could reach "13 of 8".
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import type { Walkthrough, WalkthroughStep } from '../src/lib/karl/walkthrough';

const { default: WalkthroughHeader } =
	await import('../src/lib/components/workspace/WalkthroughHeader.svelte');

const step = (n: number, withValue: boolean): WalkthroughStep =>
	({
		n,
		id: `panel-${n}`,
		uiLabel: `Panel ${n}`,
		rawName: `panel_${n}`,
		outcome: withValue ? 'TYPE' : 'FLAG',
		values: withValue ? [{ label: 'Text', value: `Value ${n}` }] : [],
		choices: [],
		links: [],
		notes: []
	}) as WalkthroughStep;

// 13 steps, 8 of them with a value to paste: the counts measured live on
// report-garbage-clutter-or-overgrown-plants.
const walkthrough = {
	type: 'Transaction',
	title: 'Report garbage',
	navPath: 'New: Transaction → Content',
	formUrl: 'https://api.sf.gov/admin/',
	steps: Array.from({ length: 13 }, (_, i) => step(i + 1, i < 8)),
	gaps: [],
	copyableCount: 8,
	stale: [],
	markdown: ''
} as unknown as Walkthrough;

describe('WalkthroughHeader', () => {
	it('counts copied steps against every step', () => {
		render(WalkthroughHeader, { walkthrough, copied: 0, onExit: () => {} });
		expect(screen.getByText('0 of 13 steps copied')).toBeTruthy();
	});

	it('cannot report more copied than there are, with every step marked', () => {
		render(WalkthroughHeader, { walkthrough, copied: 13, onExit: () => {} });
		expect(screen.getByText('13 of 13 steps copied')).toBeTruthy();
		expect(screen.queryByText(/of 8/)).toBeNull();
	});
});
