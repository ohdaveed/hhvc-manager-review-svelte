/**
 * @vitest-environment jsdom
 *
 * `$lib/rethink/request` is mocked, which also keeps `$lib/supabase` -- a
 * `createClient` at module scope -- out of the run.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import RethinkPanel from '../src/lib/components/workspace/RethinkPanel.svelte';
import { pageStore } from '../src/lib/stores/pageData.svelte.js';

const requestRethink = vi.fn();
vi.mock('$lib/rethink/request', () => ({
	requestRethink: (input: unknown) => requestRethink(input)
}));

const pageData = {
	id: 'topic-x--about',
	title: 'About vector control',
	sections: [
		{ fieldKey: 'what-we-do', heading: 'What we do', paragraphs: ['Our work covers:'] },
		{ fieldKey: 'who-we-are', heading: 'Who we are', paragraphs: ['Our staff...'] }
	]
};

const result = {
	rationale: 'It buries what a tenant needs behind a list of what staff do.',
	model: 'claude-opus-5',
	disclosure: 'Drafted with generative AI.',
	otherSections: ['Who we are'],
	karlBefore: 'Information block.',
	karlAfter: 'Information block.',
	ops: [
		{
			id: 'rewrite:heading:0',
			type: 'rewrite',
			kind: 'heading',
			fieldId: 'sections.what-we-do.heading',
			from: 'What we do',
			to: 'What we can inspect',
			moved: false
		},
		{
			id: 'add:bullet:1',
			type: 'add',
			kind: 'bullet',
			text: 'Call 311 if you have no heat.',
			afterFieldId: null
		},
		{
			id: 'drop:bullet:2',
			type: 'drop',
			kind: 'bullet',
			fieldId: 'sections.what-we-do.bullets.3',
			text: 'Duplicated bullet'
		}
	]
};

describe('RethinkPanel', () => {
	beforeEach(() => {
		requestRethink.mockReset();
		pageStore.enterPage('topic-x--about');
		pageStore.clearSectionSelection();
	});

	it('says what to do when no section is selected', () => {
		render(RethinkPanel, { props: { pageData } });
		expect(screen.getByText(/no section selected/i)).toBeTruthy();
	});

	it('sends the reviewer instruction with the request', async () => {
		requestRethink.mockResolvedValue(result);
		pageStore.selectSection('what-we-do');
		render(RethinkPanel, { props: { pageData } });

		await fireEvent.input(screen.getByLabelText(/what should this section accomplish/i), {
			target: { value: 'Lead with what a tenant does.' }
		});
		await fireEvent.click(screen.getByRole('button', { name: /rethink this section/i }));

		expect(requestRethink.mock.calls[0][0]).toMatchObject({
			pageId: 'topic-x--about',
			sectionKey: 'what-we-do',
			instruction: 'Lead with what a tenant does.'
		});
	});

	it('renders one toggle per op, with a drop unchecked by default', async () => {
		requestRethink.mockResolvedValue(result);
		pageStore.selectSection('what-we-do');
		render(RethinkPanel, { props: { pageData } });
		await fireEvent.click(screen.getByRole('button', { name: /rethink this section/i }));

		const rewrite = await screen.findByRole('checkbox', { name: /rewrite heading/i });
		const drop = screen.getByRole('checkbox', { name: /drop bullet/i });
		expect((rewrite as HTMLInputElement).checked).toBe(true);
		expect((drop as HTMLInputElement).checked).toBe(false);
	});

	it('flags added copy as unsourced, because nothing in the app can clear it', async () => {
		requestRethink.mockResolvedValue(result);
		pageStore.selectSection('what-we-do');
		render(RethinkPanel, { props: { pageData } });
		await fireEvent.click(screen.getByRole('button', { name: /rethink this section/i }));

		expect(await screen.findByText(/unverified/i)).toBeTruthy();
	});

	it('names the sections it also wanted to change rather than dropping them silently', async () => {
		requestRethink.mockResolvedValue(result);
		pageStore.selectSection('what-we-do');
		render(RethinkPanel, { props: { pageData } });
		await fireEvent.click(screen.getByRole('button', { name: /rethink this section/i }));

		expect(await screen.findByText(/Who we are/)).toBeTruthy();
	});

	it('shows the failure rather than an empty panel', async () => {
		requestRethink.mockRejectedValue(new Error('That request is 9,001 characters'));
		pageStore.selectSection('what-we-do');
		render(RethinkPanel, { props: { pageData } });
		await fireEvent.click(screen.getByRole('button', { name: /rethink this section/i }));

		expect(await screen.findByText(/9,001 characters/)).toBeTruthy();
	});

	it('gives two ops of the same type and kind distinct accessible names', async () => {
		requestRethink.mockResolvedValue({
			...result,
			ops: [
				{
					id: 'add:bullet:1',
					type: 'add',
					kind: 'bullet',
					text: 'Call 311 if you have no heat.',
					afterFieldId: null
				},
				{
					id: 'add:bullet:2',
					type: 'add',
					kind: 'bullet',
					text: 'Report a rodent sighting online.',
					afterFieldId: null
				}
			]
		});
		pageStore.selectSection('what-we-do');
		render(RethinkPanel, { props: { pageData } });
		await fireEvent.click(screen.getByRole('button', { name: /rethink this section/i }));

		const heat = await screen.findByRole('checkbox', { name: /call 311 if you have no heat/i });
		const rodent = screen.getByRole('checkbox', { name: /report a rodent sighting online/i });
		expect(heat).not.toBe(rodent);
	});

	it('applies nothing -- slice 1 is read-only', async () => {
		requestRethink.mockResolvedValue(result);
		pageStore.selectSection('what-we-do');
		render(RethinkPanel, { props: { pageData } });
		await fireEvent.click(screen.getByRole('button', { name: /rethink this section/i }));
		await screen.findByRole('checkbox', { name: /rewrite heading/i });

		expect(screen.queryByRole('button', { name: /^apply/i })).toBeNull();
		expect(pageData.sections[0].heading).toBe('What we do');
	});

	it('does not flag a Karl-mapping change when the mapping did not change (decision 9)', async () => {
		requestRethink.mockResolvedValue(result);
		pageStore.selectSection('what-we-do');
		render(RethinkPanel, { props: { pageData } });
		await fireEvent.click(screen.getByRole('button', { name: /rethink this section/i }));
		await screen.findByRole('checkbox', { name: /rewrite heading/i });

		expect(screen.queryByText(/karl mapping changed/i)).toBeNull();
	});

	it('shows both Karl mappings prominently, above the ops list, when the proposal changes them', async () => {
		requestRethink.mockResolvedValue({
			...result,
			karlBefore: 'Information block.',
			karlAfter: 'Rich text, restructured as steps.'
		});
		pageStore.selectSection('what-we-do');
		render(RethinkPanel, { props: { pageData } });
		await fireEvent.click(screen.getByRole('button', { name: /rethink this section/i }));

		const notice = await screen.findByText(/karl mapping changed/i);
		expect(screen.getByText('Information block.')).toBeTruthy();
		expect(screen.getByText('Rich text, restructured as steps.')).toBeTruthy();

		const ops = screen.getByRole('list', { name: /proposed changes/i });
		expect(notice.compareDocumentPosition(ops) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it('will not start a second Rethink while one is loading', async () => {
		let resolveFirst: (value: unknown) => void = () => {};
		requestRethink.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					resolveFirst = resolve;
				})
		);
		pageStore.selectSection('what-we-do');
		render(RethinkPanel, { props: { pageData } });

		const button = screen.getByRole('button', { name: /rethink this section/i });
		fireEvent.click(button);
		fireEvent.click(button);
		await tick();

		expect(requestRethink).toHaveBeenCalledTimes(1);
		resolveFirst(result);
	});

	it('aborts the in-flight request when the reviewer switches sections, so a stale Cancel is never a no-op', async () => {
		const pending: { reject: (e: unknown) => void }[] = [];
		requestRethink.mockImplementation(
			(input: { signal?: AbortSignal }) =>
				new Promise((_resolve, reject) => {
					pending.push({ reject });
					input.signal?.addEventListener('abort', () => {
						reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
					});
				})
		);

		pageStore.selectSection('what-we-do');
		render(RethinkPanel, { props: { pageData } });
		await fireEvent.click(screen.getByRole('button', { name: /rethink this section/i }));

		const aSignal = requestRethink.mock.calls[0][0].signal as AbortSignal;
		expect(aSignal.aborted).toBe(false);

		// The store resets `rethink` to idle without touching any
		// AbortController -- the panel itself must abort section A's request.
		pageStore.selectSection('who-we-are');
		await tick();

		expect(aSignal.aborted).toBe(true);

		// Section B's own Cancel must still work -- this is the bug: A's
		// `finally` used to clear the controller unconditionally, so it
		// clobbered B's reference and B's Cancel became a silent no-op.
		await fireEvent.click(screen.getByRole('button', { name: /rethink this section/i }));
		const bSignal = requestRethink.mock.calls[1][0].signal as AbortSignal;

		await fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
		expect(bSignal.aborted).toBe(true);
	});
});
