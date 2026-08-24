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
	it('names the target section and quotes its Karl mapping', () => {
		const prompt = buildRethinkPrompt(args);
		expect(prompt).toContain('what-we-do');
		expect(prompt).toContain('Information block 2, rich text plus bullets.');
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
