/**
 * @vitest-environment jsdom
 *
 * `isPlainKey` decides whether a key press is a workspace shortcut. The keys
 * record review decisions, so what it must REFUSE matters more than what it
 * accepts: anything typed into a field, and anything meant for the browser.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DECISION_KEYS, isPlainKey } from '../src/lib/review/shortcuts';
import { pageStore } from '../src/lib/stores/pageData.svelte.js';

const press = (target: Element, init: KeyboardEventInit = {}) => {
	let seen: KeyboardEvent | undefined;
	const listen = (e: Event) => (seen = e as KeyboardEvent);
	window.addEventListener('keydown', listen);
	target.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true, ...init }));
	window.removeEventListener('keydown', listen);
	return seen!;
};

const mount = (html: string) => {
	document.body.innerHTML = html;
	return document.body.firstElementChild!;
};

describe('isPlainKey', () => {
	afterEach(() => (document.body.innerHTML = ''));

	it('accepts a bare key on the page, a button or a link', () => {
		expect(isPlainKey(press(document.body))).toBe(true);
		expect(isPlainKey(press(mount('<button>Approve</button>')))).toBe(true);
		expect(isPlainKey(press(mount('<a href="#">Next</a>')))).toBe(true);
	});

	it.each([
		['a text input', '<input type="text" />'],
		['a textarea', '<textarea></textarea>'],
		['a select', '<select><option>A</option></select>'],
		['an editable region', '<div contenteditable="true"></div>'],
		['a custom textbox', '<div role="textbox"></div>']
	])('refuses a key typed into %s', (_name, html) => {
		expect(isPlainKey(press(mount(html)))).toBe(false);
	});

	it('refuses a key typed inside a field’s wrapper', () => {
		const wrapper = mount('<div role="textbox"><span>word</span></div>');
		expect(isPlainKey(press(wrapper.querySelector('span')!))).toBe(false);
	});

	// Ctrl+A selects all, Cmd+R reloads, Alt+B is a menu: none is a decision.
	it.each(['ctrlKey', 'metaKey', 'altKey'] as const)('refuses a key with %s held', (modifier) => {
		expect(isPlainKey(press(document.body, { [modifier]: true }))).toBe(false);
	});

	it('refuses a held key repeating, and one something else already handled', () => {
		expect(isPlainKey(press(document.body, { repeat: true }))).toBe(false);
		const handled = new KeyboardEvent('keydown', { key: 'a', cancelable: true });
		handled.preventDefault();
		expect(isPlainKey(handled)).toBe(false);
	});
});

describe('decision keys', () => {
	it('covers every decision, undecided included, one key each', () => {
		expect(DECISION_KEYS).toEqual({
			a: 'approved',
			r: 'revise',
			b: 'blocked',
			u: 'needs-review'
		});
	});
});

// WCAG 2.1.4: a single-character shortcut has to be one the reviewer can turn
// off, because speech input types characters.
describe('the off switch', () => {
	beforeEach(() => localStorage.clear());
	afterEach(() => {
		localStorage.clear();
		pageStore.setShortcuts(true);
	});

	it('is on until turned off, and the choice survives a reload', () => {
		pageStore.loadShortcuts();
		expect(pageStore.shortcutsOn).toBe(true);

		pageStore.setShortcuts(false);
		expect(pageStore.shortcutsOn).toBe(false);
		pageStore.shortcutsOn = true;
		pageStore.loadShortcuts();
		expect(pageStore.shortcutsOn).toBe(false);

		pageStore.setShortcuts(true);
		pageStore.loadShortcuts();
		expect(pageStore.shortcutsOn).toBe(true);
	});
});
