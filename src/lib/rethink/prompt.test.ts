import { describe, it, expect } from 'vitest';
import { buildRethinkPrompt, MAX_PROMPT_CHARS } from './prompt';

const page = {
	title: 'About vector control',
	type: 'About us',
	reading: 'Grade 6',
	audience: ['This page is for tenants.'],
	sections: [
		{ fieldKey: 'who-we-are', heading: 'Who we are', karl: 'Information block 1.' },
		{
			fieldKey: 'what-we-do',
			heading: 'What we do',
			karl: 'Information block 2, rich text plus bullets.',
			paragraphs: ['Our work covers:'],
			bullets: ['Rats']
		}
	]
};

const args = { page, sectionKey: 'what-we-do', corpusIndex: 'scopeInfo | Information | Scope' };

describe('buildRethinkPrompt', () => {
	it('identifies the target section by ordinal position and heading, never by fieldKey', () => {
		// `fieldKey` is client-derived (`deriveFieldKey` in pageData.svelte.ts);
		// the backend has never heard of it, so it must not be how the model is
		// told which section to change.
		const prompt = buildRethinkPrompt(args);
		expect(prompt).toContain('section 2 of 2');
		expect(prompt).toContain('What we do');
		expect(prompt).toContain('Information block 2, rich text plus bullets.');
		expect(prompt).not.toContain('what-we-do');
	});

	it('tells the model exactly how many sections to return, in what order, and to change only the target', () => {
		const prompt = buildRethinkPrompt(args);
		expect(prompt).toMatch(/return exactly 2 sections/i);
		expect(prompt).toMatch(/same order/i);
		expect(prompt).toMatch(/change only section 2/i);
	});

	it('tells the model to leave steps and cards alone when the section has them', () => {
		const withSteps = {
			...page,
			sections: [page.sections[0], { ...page.sections[1], steps: [{ title: 'Call 311' }] }]
		};

		expect(buildRethinkPrompt({ ...args, page: withSteps })).toMatch(
			/"steps" and\/or "cards"[\s\S]*exactly as given/i
		);
	});

	it('says nothing about steps or cards for a section that has neither', () => {
		// Naming absent fields invites the model to invent them; 70 of the
		// corpus's 136 sections have none.
		expect(buildRethinkPrompt(args)).not.toMatch(/steps/i);
	});

	it('tells the model to put its reasoning in the page-level editorNote field', () => {
		const prompt = buildRethinkPrompt(args);
		expect(prompt).toMatch(/page-level "editorNote" field/i);
	});

	it('carries the rubric constraints that keep the proposal publishable', () => {
		const prompt = buildRethinkPrompt(args);
		expect(prompt).toContain('Grade 6');
		expect(prompt).toMatch(/never invent/i);
		expect(prompt).toMatch(/preserve every link/i);
		expect(prompt).toMatch(/what is missing/i);
	});

	it('passes the corpus index through so link targets can be checked', () => {
		expect(buildRethinkPrompt(args)).toContain('scopeInfo | Information | Scope');
	});

	it("includes the reviewer's own instruction when there is one", () => {
		const prompt = buildRethinkPrompt({ ...args, instruction: 'Lead with what a tenant does.' });
		expect(prompt).toContain('Lead with what a tenant does.');
	});

	it('refuses a section key that is not on the page rather than rethinking the wrong one', () => {
		expect(() => buildRethinkPrompt({ ...args, sectionKey: 'nope' })).toThrow(/not on this page/i);
	});

	it('refuses a prompt over the cap and names the number', () => {
		expect(() =>
			buildRethinkPrompt({ ...args, corpusIndex: 'x'.repeat(MAX_PROMPT_CHARS) })
		).toThrow(new RegExp(`${MAX_PROMPT_CHARS.toLocaleString()}`));
	});
});
