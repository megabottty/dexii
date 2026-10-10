import { describe, expect, it } from 'vitest';
import { syncOrder, toBack, toFront } from './crush-stack.util';

describe('crush stack order', () => {
  it('cycles the front card to the back and back again', () => {
    expect(toBack(['a', 'b', 'c'])).toEqual(['b', 'c', 'a']);
    expect(toFront(['b', 'c', 'a'])).toEqual(['a', 'b', 'c']);
    expect(toBack(['a'])).toEqual(['a']);
  });

  it('keeps the current order when the list changes', () => {
    expect(syncOrder(['b', 'c', 'a'], ['a', 'b', 'c', 'd'])).toEqual(['b', 'c', 'a', 'd']);
    expect(syncOrder(['b', 'c', 'a'], ['a', 'c'])).toEqual(['c', 'a']);
    expect(syncOrder([], ['x', 'y'])).toEqual(['x', 'y']);
  });
});
