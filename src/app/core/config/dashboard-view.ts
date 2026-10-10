/**
 * The home page can show crushes as a swipeable deck ("Stack") or the classic grid.
 *
 * To go back to the grid only, set this to `false`: the Stack / Grid switch disappears
 * and the grid renders exactly as before. To remove the feature entirely, delete
 * `core/components/crush-stack/`, this file, and the blocks marked `// stack view`
 * in `features/dashboard/dashboard.component.ts`.
 */
export const STACK_VIEW_ENABLED = true;

export type CrushViewMode = 'stack' | 'grid';
export const CRUSH_VIEW_STORAGE_KEY = 'dexii_crush_view';
