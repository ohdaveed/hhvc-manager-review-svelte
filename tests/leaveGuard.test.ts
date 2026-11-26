import { describe, it, expect } from 'vitest';
import { warnBeforeLeaving } from '../src/lib/stores/leaveGuard';

const unload = () => new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;

describe('warnBeforeLeaving', () => {
	it('asks when there is unsaved work', () => {
		const e = unload();
		warnBeforeLeaving(e, 2);
		expect(e.defaultPrevented).toBe(true);
	});

	it('lets the tab go when there is none', () => {
		const e = unload();
		warnBeforeLeaving(e, 0);
		expect(e.defaultPrevented).toBe(false);
	});
});
