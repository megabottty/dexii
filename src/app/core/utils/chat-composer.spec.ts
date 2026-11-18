import { describe, expect, it } from 'vitest';
import { autoGrowComposer, COMPOSER_MAX_HEIGHT_PX } from './chat-composer';

/** Fakes a textarea whose content is `contentHeight` pixels tall. */
const box = (contentHeight: number) => {
  const el = document.createElement('textarea');
  Object.defineProperty(el, 'scrollHeight', { get: () => contentHeight });
  return el;
};

describe('autoGrowComposer', () => {
  it('grows to fit what is typed', () => {
    const el = box(90);
    autoGrowComposer(el);
    expect(el.style.height).toBe('90px');
    expect(el.style.overflowY).toBe('hidden');
  });

  it('stops at about 6 lines and scrolls after that', () => {
    const el = box(400);
    autoGrowComposer(el);
    expect(el.style.height).toBe(`${COMPOSER_MAX_HEIGHT_PX}px`);
    expect(el.style.overflowY).toBe('auto');
  });

  it('does nothing when there is no box yet', () => {
    expect(() => autoGrowComposer(undefined)).not.toThrow();
  });
});
