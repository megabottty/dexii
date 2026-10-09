import { describe, expect, it } from 'vitest';
import { fitWithin } from './image-resize';

describe('fitWithin', () => {
  it('shrinks the longest edge to the limit and keeps the ratio', () => {
    expect(fitWithin(4000, 3000, 1024)).toEqual({ width: 1024, height: 768 });
    expect(fitWithin(3000, 4000, 1024)).toEqual({ width: 768, height: 1024 });
  });

  it('never scales up', () => {
    expect(fitWithin(640, 480, 1024)).toEqual({ width: 640, height: 480 });
  });

  it('tolerates empty dimensions', () => {
    expect(fitWithin(0, 0, 1024)).toEqual({ width: 0, height: 0 });
  });
});
