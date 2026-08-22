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
        this.pages = allPages.map(p => {
            // Remove 'sf.gov/' and replace any remaining slashes with dashes so it plays nice with SvelteKit's [slug] router
            let cleanId = p.slug ? p.slug.replace('sf.gov/', '').replace(/\//g, '-') : p.title.replace(/\s+/g, '-').toLowerCase();
            return {
                ...p,
                id: cleanId
            };
        });
    }

    addPage(page: Page) {
        this.pages.push(page);
    }
}

export const pageStore = new PageStore();
