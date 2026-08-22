import { describe, it, expect } from 'vitest';
import { pageStore } from '../src/lib/stores/pageData.svelte.js';

describe('Page Data Store', () => {
    it('should initialize with all ported pages', () => {
        expect(pageStore.pages.length).toBeGreaterThan(0);
    });

    it('should allow adding a page', () => {
        const initialCount = pageStore.pages.length;
        pageStore.addPage({ id: 'test-page', title: 'Test Page' });
        expect(pageStore.pages.length).toBe(initialCount + 1);
        expect(pageStore.pages[pageStore.pages.length - 1].id).toBe('test-page');
    });
});
