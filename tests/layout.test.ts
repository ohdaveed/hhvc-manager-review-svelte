/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Layout from '../src/routes/+layout.svelte';

describe('Root Layout', () => {
	it('wraps the app without claiming the main landmark', () => {
		const { container } = render(Layout);
		// Each route owns its <main>; one here nested a second inside every page.
		expect(container.querySelector('main')).toBeNull();
		expect(container.querySelector('.min-h-screen')).toBeTruthy();
	});
});
