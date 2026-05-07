// Motion constants — Emil Kowalski's "strong" easing curves typed for Framer Motion v12+.

import type { Easing } from 'framer-motion';

/** Strong ease-out — for entering UI elements (responsive feel). */
export const easeOutStrong: Easing = [0.23, 1, 0.32, 1];

/** Strong ease-in-out — for elements moving on screen. */
export const easeInOutStrong: Easing = [0.77, 0, 0.175, 1];

/** Drawer curve (iOS-like) — for sheets and pull-to-dismiss. */
export const easeDrawer: Easing = [0.32, 0.72, 0, 1];

/** Default UI animation duration. Stay under 300ms for responsiveness. */
export const DURATION_FAST = 0.16;
export const DURATION_BASE = 0.2;
export const DURATION_MED = 0.35;
export const DURATION_SLOW = 0.5;
