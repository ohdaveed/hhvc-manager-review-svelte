// src/lib/stores/pageData.svelte.ts
import { allPages } from '$lib/data';

export type Page = {
    id: string;
    title: string;
    [key: string]: any;
};

export type ActiveField = {
    name: string;
    content: string;
    update: (newContent: string) => void;
} | null;

class PageStore {
    pages = $state<Page[]>([]);
    activeField = $state<ActiveField>(null);

    constructor() {
        // Map the legacy objects to include an 'id' (from their 'slug' or a generated one)
        this.pages = allPages.map(p => ({
            ...p,
            id: p.slug || p.title.replace(/\s+/g, '-').toLowerCase()
        }));
    }

    addPage(page: Page) {
        this.pages.push(page);
    }
}

export const pageStore = new PageStore();
