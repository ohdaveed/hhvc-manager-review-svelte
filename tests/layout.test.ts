/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Layout from '../src/routes/+layout.svelte';

describe('Root Layout', () => {
    it('should render a main container for the application', () => {
        const { container } = render(Layout);
        const main = container.querySelector('main');
        expect(main).toBeTruthy();
        expect(main?.classList.contains('min-h-screen')).toBe(true);
    });
});
