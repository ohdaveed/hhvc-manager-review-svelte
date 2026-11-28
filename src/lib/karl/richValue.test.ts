import { describe, expect, it } from 'vitest';
import { clipboardHtmlOf, isFormatted, linksOf, parseRichValue, plainTextOf } from './richValue';

// The Things to Know text on "Report rats or mice", as the Build in Karl view
// was showing it: brackets, parentheses and a page key in the middle of prose.
const RATS =
	'The [Health Code](https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_health/0-0-0-1890) requires property owners to keep buildings free of rats and mice. Tell your landlord first, unless the problem is urgent. [Tenant rights when reporting housing conditions](tenantRights) explains how long to wait.';

const LIST =
	'Have these details ready before you start.\n\n- **What you saw:** Which insect, and any bites.\n- **Where it is:** The address.';

describe('parseRichValue', () => {
	it('reads a plain one-line value as one unformatted paragraph', () => {
		const blocks = parseRichValue('Report rats or mice');
		expect(blocks).toEqual([
			{ kind: 'p', lines: [[{ kind: 'text', text: 'Report rats or mice' }]] }
		]);
		expect(isFormatted(blocks)).toBe(false);
	});

	it('splits paragraphs on blank lines and groups bullets into one list', () => {
		const blocks = parseRichValue(LIST);
		expect(blocks.map((b) => b.kind)).toEqual(['p', 'ul']);
		expect(blocks[1]).toMatchObject({ kind: 'ul', items: [{}, {}] });
		expect(isFormatted(blocks)).toBe(true);
	});

	it('reads numbered lines as an ordered list, without the numbers', () => {
		const blocks = parseRichValue(
			'1. **You report through 311.** 311 receives it.\n2. We inspect.'
		);
		expect(blocks.map((b) => b.kind)).toEqual(['ol']);
		expect(plainTextOf(blocks)).toBe('You report through 311. 311 receives it.\nWe inspect.');
	});

	it('keeps a line it does not recognise as its own text', () => {
		expect(plainTextOf(parseRichValue('# Not a heading here'))).toBe('# Not a heading here');
	});
});

describe('plainTextOf', () => {
	it('leaves no brackets, parentheses, asterisks or list dashes', () => {
		const text = plainTextOf(parseRichValue(`${RATS}\n\n${LIST}`));
		expect(text).not.toMatch(/\]\(|\*\*|^- /m);
		expect(text).toContain('The Health Code requires property owners');
		expect(text).toContain('Tenant rights when reporting housing conditions explains');
		expect(text).toContain(
			'\nWhat you saw: Which insect, and any bites.\nWhere it is: The address.'
		);
	});

	it('puts one paragraph or item per line, with no blank lines between', () => {
		expect(plainTextOf(parseRichValue('One.\n\nTwo.\n\n- Three'))).toBe('One.\nTwo.\nThree');
	});
});

describe('clipboardHtmlOf', () => {
	it('carries structure, bold and external links, and nothing of this tool', () => {
		const html = clipboardHtmlOf(parseRichValue(`${RATS}\n\n${LIST}`));
		expect(html).toContain(
			'<a href="https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_health/0-0-0-1890">Health Code</a>'
		);
		expect(html).toContain(
			'<ul><li><strong>What you saw:</strong> Which insect, and any bites.</li>'
		);
		expect(html).not.toMatch(/class=|style=|\/review\//);
	});

	// An internal link is chosen in Karl's page chooser. The only address this
	// tool has for the page is its own review URL, which must not reach SF.gov.
	it('writes an internal link as its words, never as an anchor', () => {
		const html = clipboardHtmlOf(parseRichValue(RATS));
		expect(html).toContain('Tenant rights when reporting housing conditions explains');
		expect(html.match(/<a /g)).toHaveLength(1);
		expect(html).not.toContain('tenantRights');
	});

	it('escapes markup in the copy', () => {
		expect(clipboardHtmlOf(parseRichValue('Rent < $500 & "fair"'))).toBe(
			'<p>Rent &lt; $500 &amp; &quot;fair&quot;</p>'
		);
	});
});

describe('linksOf', () => {
	it('lists every link with the kind Karl’s link tool asks for', () => {
		const links = linksOf(parseRichValue(RATS));
		expect(links.map((l) => [l.text, l.to.kind])).toEqual([
			['Health Code', 'external'],
			['Tenant rights when reporting housing conditions', 'internal']
		]);
		expect(links[1].to).toMatchObject({ title: 'Tenant rights when reporting housing conditions' });
	});

	it('keeps the # sentinel and an unknown key apart from real destinations', () => {
		const links = linksOf(parseRichValue('[Soon](#) and [Lost](noSuchPage)'));
		expect(links.map((l) => l.to.kind)).toEqual(['inert', 'unresolved']);
	});
});
