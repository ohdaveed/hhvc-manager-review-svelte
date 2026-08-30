/**
 * Shared types for the SF.gov design-system components.
 *
 * These mirror the `.d.ts` files in the design system's
 * `design-system/components/sfgov-*` folders. Where a type here is stricter
 * than its JSX counterpart, the reason is WCAG 2.1 AA and it is noted inline.
 */

export interface Crumb {
	label: string;
	href?: string;
}

export interface LinkRef {
	label: string;
	href?: string;
}

export type AlertKind = 'information' | 'success' | 'warning' | 'danger' | 'archive';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost';

export type SpotlightTone = 'primary' | 'secondary' | 'accent';
export type SpotlightLayout = 'side' | 'full' | 'none';

export interface ChoiceOption {
	label: string;
	value: string;
	disabled?: boolean;
}

export interface SelectOption {
	label: string;
	value: string;
	disabled?: boolean;
}

/** An `<optgroup>`. Replaces the JSX listbox's `{ group: string }` sentinel row. */
export interface SelectGroup {
	group: string;
	options: SelectOption[];
}

export type MetaIcon = 'date' | 'time' | 'location';

export interface MetaEntry {
	icon: MetaIcon;
	label: string;
}

export interface Badge {
	label: string;
	bg?: string;
	fg?: string;
}

/** A table cell is either plain text or a link. */
export type Cell = string | number | LinkRef;

export interface TableRow {
	header?: string;
	cells: Cell[];
}

export interface ContactBlock {
	heading: string;
	body: string;
}

export interface SocialLink {
	/** Used as the link's accessible name — required, never decorative. */
	label: string;
	href?: string;
	icon: string;
}

/**
 * Specimen-only state forcing.
 *
 * The JSX components take `state="hover" | "focus"` because a static React
 * specimen cannot hover itself. Real components must not fake interaction, so
 * these are real CSS states here; `demoState` exists solely so the
 * `/sfgov-components` route can photograph them, and it renders a
 * `data-demo-state` attribute that the scoped styles match alongside the real
 * pseudo-class. Never set it in application code.
 */
export type DemoState = 'hover' | 'focus';
