import { describe, expect, it } from 'vitest';
import {
	COMPONENT_SUPPORT,
	isSupported,
	type KarlComponent,
	type Support
} from './componentSupport';

// Every row of the help center's Components pages, as read 2026-11-22.
const cases: [KarlComponent, string, Support][] = [
	['callout', 'Transaction', 'yes'],
	['callout', 'Information', 'yes'],
	['callout', 'Data story', 'yes'],
	['callout', 'Campaign', 'no'],
	['callout', 'Report', 'no'],
	['accordion', 'Campaign', 'yes'],
	['accordion', 'Location', 'yes'],
	['accordion', 'Meeting', 'yes'],
	['accordion', 'Transaction', 'yes'],
	['accordion', 'Information', 'no'],
	['button', 'Transaction', 'yes'],
	['button', 'Event', 'yes'],
	['button', 'Meeting', 'yes'],
	['button', 'Campaign', 'no'],
	['spotlightButton', 'Agency', 'yes'],
	['spotlightButton', 'Campaign', 'yes'],
	['spotlightButton', 'Report', 'yes'],
	['spotlightButton', 'Topic', 'unknown'],
	['spotlightButton', 'Profile', 'unknown'],
	['spotlightButton', 'Information', 'no'],
	['spotlight', 'Agency', 'yes'],
	['spotlight', 'Campaign', 'yes'],
	['spotlight', 'Report', 'yes'],
	['spotlight', 'Profile', 'yes'],
	['spotlight', 'Topic', 'yes'],
	['spotlight', 'Transaction', 'no'],
	['resources', 'About us', 'yes'],
	['resources', 'Campaign', 'yes'],
	['resources', 'Resource Collection', 'yes'],
	['resources', 'Topic', 'yes'],
	['resources', 'Agency', 'unknown'],
	['resources', 'Information', 'no'],
	['related', 'Transaction', 'yes'],
	['related', 'Information', 'yes'],
	['related', 'Campaign', 'yes'],
	['related', 'Topic', 'yes'],
	['related', 'Resource Collection', 'no'],
	['related', 'Agency', 'no'],
	['table', 'Report', 'yes'],
	['table', 'Information', 'no'],
	['alert', 'Agency', 'yes'],
	['alert', 'Location', 'yes'],
	['alert', 'Transaction', 'no']
];

describe('isSupported', () => {
	it.each(cases)('%s on %s is %s', (component, type, expected) => {
		expect(isSupported(component, type)).toBe(expected);
	});

	it('reads Step by step as unsupported for every component', () => {
		for (const component of Object.keys(COMPONENT_SUPPORT) as KarlComponent[]) {
			expect(isSupported(component, 'Step by step')).toBe('no');
		}
	});

	it('uses the corpus spelling of Karl type names', () => {
		// Karl says "About" and "Resource collection"; the corpus does not.
		expect(isSupported('resources', 'About')).toBe('no');
		expect(isSupported('resources', 'Resource collection')).toBe('no');
	});
});

describe('limits', () => {
	it('carries the help center character limits', () => {
		expect(COMPONENT_SUPPORT.accordion.maxChars).toEqual({ title: 65 });
		expect(COMPONENT_SUPPORT.button.maxChars).toEqual({ label: 25 });
		expect(COMPONENT_SUPPORT.spotlightButton.maxChars).toEqual({ label: 25 });
		expect(COMPONENT_SUPPORT.alert.maxChars).toEqual({ title: 30, description: 120 });
	});

	it('caps spotlights per page by type', () => {
		expect(COMPONENT_SUPPORT.spotlight.maxPerPage).toEqual({
			Agency: 2,
			Campaign: 2,
			Report: 1,
			Profile: 1,
			Topic: 1
		});
	});

	it('cites a Components help page on every row', () => {
		for (const rule of Object.values(COMPONENT_SUPPORT)) {
			expect(rule.url).toMatch(
				/^https:\/\/sfdigitalservices\.gitbook\.io\/karl-sf\.gov-editor-help-center\/using-karl-the-cms\/components\/[a-z-]+$/
			);
		}
	});
});
