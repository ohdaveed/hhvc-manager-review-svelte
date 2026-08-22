// src/lib/stores/pageData.svelte.ts
export type Page = {
    id: string;
    title: string;
    [key: string]: any;
};

class PageStore {
    pages = $state<Page[]>([]);

    addPage(page: Page) {
        this.pages.push(page);
    }
}

export const pageStore = new PageStore();
