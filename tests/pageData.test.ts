import { describe, it, expect } from 'vitest';
import { pageStore } from '../src/lib/stores/pageData.svelte.js';

describe('Page Data Store', () => {
    it('should initialize with an empty array of pages', () => {
        expect(pageStore.pages).toEqual([]);
    });

    it('should allow adding a page', () => {
        pageStore.addPage({ id: 'test-page', title: 'Test Page' });
        expect(pageStore.pages.length).toBe(1);
        expect(pageStore.pages[0].id).toBe('test-page');
    });
});
