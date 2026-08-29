import { describe, it, expect } from 'vitest';
import {
	headingJumps,
	imagesMissingAlt,
	tableIssues,
	videoIssues
} from '../src/lib/analysis/domChecks';

const mount = (html: string): HTMLElement => {
	const root = document.createElement('div');
	root.innerHTML = html;
	document.body.appendChild(root);
	return root;
};

describe('headingJumps', () => {
	it('flags a skipped level', () => {
		const root = mount('<h2>What to do</h2><h4>Step one</h4>');
		const { jumps, count } = headingJumps(root);
		expect(count).toBe(2);
		expect(jumps).toHaveLength(1);
		expect(jumps[0]).toMatchObject({ fromLevel: 2, toLevel: 4 });
	});

	it('allows stepping back up more than one level', () => {
		const root = mount('<h2>A</h2><h3>B</h3><h2>C</h2>');
		expect(headingJumps(root).jumps).toEqual([]);
	});

	it('reads heading text through the EditTarget button wrapper', () => {
		// Signed in, every heading is `<h2><button class="edit-target">text</button></h2>`.
		// A port that skipped `button` elements would report empty heading text.
		const root = mount(
			'<h2 class="section-heading"><button class="edit-target">What to do</button></h2>' +
				'<h4><button class="edit-target">Step one</button></h4>'
		);
		const { jumps } = headingJumps(root);
		expect(jumps[0].fromText).toBe('What to do');
		expect(jumps[0].toText).toBe('Step one');
	});

	it('excludes the selection badge from heading text', () => {
		const root = mount(
			'<h2><button class="edit-target"><span class="edit-target-badge">1 · Heading</span>What to do</button></h2>' +
				'<h4><button class="edit-target">Step one</button></h4>'
		);
		expect(headingJumps(root).jumps[0].fromText).toBe('What to do');
	});

	it('ignores headings hidden from assistive technology', () => {
		const root = mount('<h2>A</h2><h4 aria-hidden="true">Hidden</h4>');
		expect(headingJumps(root).jumps).toEqual([]);
		expect(headingJumps(root).count).toBe(1);
	});

	it('reports no headings as a count of zero rather than a pass', () => {
		expect(headingJumps(mount('<p>No headings here.</p>')).count).toBe(0);
	});
});

describe('imagesMissingAlt', () => {
	it('flags an image with no alt attribute', () => {
		const root = mount('<img src="/media/rat.jpg">');
		const { issues, count } = imagesMissingAlt(root);
		expect(count).toBe(1);
		expect(issues[0].filename).toBe('rat.jpg');
	});

	it('passes an image with alt text', () => {
		expect(imagesMissingAlt(mount('<img src="/a.jpg" alt="A rat trap">')).issues).toEqual([]);
	});

	it('passes an explicitly decorative image, which is different from a missing attribute', () => {
		expect(imagesMissingAlt(mount('<img src="/spacer.gif" alt="">')).issues).toEqual([]);
	});

	it('flags whitespace-only alt text', () => {
		expect(imagesMissingAlt(mount('<img src="/a.jpg" alt="   ">')).issues).toHaveLength(1);
	});
});

describe('tableIssues', () => {
	it('flags a table with neither caption nor headers', () => {
		const root = mount('<table><tr><td>Fee</td></tr></table>');
		const { issues } = tableIssues(root);
		expect(issues[0]).toMatchObject({ missingCaption: true, missingHeaders: true });
	});

	it('passes a table with a caption and a header row', () => {
		const root = mount(
			'<table><caption>Fee schedule</caption><tr><th>Tier</th></tr><tr><td>1</td></tr></table>'
		);
		expect(tableIssues(root).issues).toEqual([]);
	});

	it('counts zero tables rather than passing an empty page', () => {
		expect(tableIssues(mount('<p>No tables.</p>')).count).toBe(0);
	});
});

describe('videoIssues', () => {
	it('flags a video with no caption track', () => {
		expect(videoIssues(mount('<video src="/a.mp4"></video>')).issues).toHaveLength(1);
	});

	it('passes a video with a captions track', () => {
		const root = mount('<video src="/a.mp4"><track kind="captions" src="/a.vtt"></video>');
		expect(videoIssues(root).issues).toEqual([]);
	});

	it('reports an embedded player as unverifiable rather than as a pass', () => {
		const root = mount('<iframe src="https://www.youtube.com/embed/abc"></iframe>');
		const { issues, count } = videoIssues(root);
		expect(count).toBe(1);
		expect(issues[0].reason).toContain('cannot be checked');
	});

	it('ignores an iframe that is not a video player', () => {
		expect(videoIssues(mount('<iframe src="https://sf.gov/form"></iframe>')).count).toBe(0);
	});
});
