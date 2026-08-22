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
