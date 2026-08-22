# Migration Phase 1: Core Layout and Theme Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Establish the root SvelteKit layout, integrate the SF.gov CSS/font variables, and scaffold the empty app shell for the Mockup tool to prepare for page migrations.

**Architecture:** We will set up the SvelteKit root layout (`src/routes/+layout.svelte`) to import Tailwind CSS and our global theme file. We will port the global variables from the old vanilla JS app into `src/app.css`, setting up the basic SF.gov design system typography and tokens. We will use Vitest and Playwright to ensure the basic rendering is correct.

**Tech Stack:** Svelte 5, SvelteKit, Tailwind CSS v4, Vitest

---

### Task 1: Setup Global CSS with SF.gov Design System

**Files:**
- Modify: `src/app.css:1-10`
- Create: `tests/theme.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/theme.test.ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Global Theme Configuration', () => {
    it('should import the sfgov design system fonts', () => {
        const cssContent = fs.readFileSync(path.resolve('./src/app.css'), 'utf-8');
        expect(cssContent).toContain('@import "@sfgov/design-system/css/all.css";');
        expect(cssContent).toContain('@import "@fontsource-variable/roboto-flex";');
        expect(cssContent).toContain('@import "@fontsource/roboto-slab/700.css";');
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/theme.test.ts -v`
Expected: FAIL with "expected to contain '@import \"@sfgov/design-system/css/all.css\";'"

**Step 3: Write minimal implementation**

```css
/* src/app.css */
@import "tailwindcss";
@import "@sfgov/design-system/css/all.css";
@import "@fontsource-variable/roboto-flex";
@import "@fontsource/roboto-slab/700.css";

:root {
  --font-body: 'Roboto Flex Variable', sans-serif;
  --font-heading: 'Roboto Slab', serif;
}

body {
  font-family: var(--font-body);
  background-color: var(--color-gray-100, #f8f9fa);
  color: var(--color-slate-900, #1e293b);
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/theme.test.ts -v`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/theme.test.ts src/app.css
git commit -m "feat: configure sfgov design system and fonts in global css"
```

---

### Task 2: Scaffold Root Layout

**Files:**
- Create: `src/routes/+layout.svelte`
- Create: `tests/layout.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/layout.test.ts
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
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/layout.test.ts -v`
Expected: FAIL (Layout not found or render error due to missing file/package)

*(Note: We need to install `@testing-library/svelte` and `jsdom` if not already installed, but for the sake of the plan we assume the test environment handles it).*

**Step 3: Write minimal implementation**

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import '../app.css';
  let { children } = $props();
</script>

<main class="min-h-screen antialiased bg-slate-50">
  {@render children()}
</main>
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/layout.test.ts -v`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/layout.test.ts src/routes/+layout.svelte
git commit -m "feat: scaffold root layout with global css import"
```

---

### Task 3: Create Page Data Store (Runes)

**Files:**
- Create: `src/lib/stores/pageData.svelte.ts`
- Create: `tests/pageData.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/pageData.test.ts
import { describe, it, expect } from 'vitest';
import { pageStore } from '../src/lib/stores/pageData.svelte';

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
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/pageData.test.ts -v`
Expected: FAIL with "Cannot find module '../src/lib/stores/pageData.svelte'"

**Step 3: Write minimal implementation**

```typescript
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
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/pageData.test.ts -v`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/pageData.test.ts src/lib/stores/pageData.svelte.ts
git commit -m "feat: implement global page data store using svelte runes"
```
