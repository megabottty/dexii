import { describe, expect, it } from 'vitest';
import { ROUTER_SCROLLING } from './app.config';

/** DEX-75: a new page opens at the top, not wherever the last page was scrolled to. */
describe('Router scrolling (DEX-75)', () => {
  it('starts each new page at the top and returns to your spot on Back', () => {
    expect(ROUTER_SCROLLING.scrollPositionRestoration).toBe('enabled');
  });

  it('still jumps to #sections in links like /settings#settings-notifications (DEX-40)', () => {
    expect(ROUTER_SCROLLING.anchorScrolling).toBe('enabled');
  });
});
