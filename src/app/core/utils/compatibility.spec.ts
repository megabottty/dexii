import { describe, expect, it } from 'vitest';
import { compatibilityLabel, compatibilityTrend, compatibilityZone, friendsRead, readGap } from './compatibility';

describe('compatibility helpers', () => {
  it('maps scores to zones and treats null as unrated', () => {
    expect(compatibilityZone(0)?.label).toBe('Not feeling it');
    expect(compatibilityZone(19)?.label).toBe('Not feeling it');
    expect(compatibilityZone(20)?.label).toBe('Hmm, maybe');
    expect(compatibilityZone(55)?.label).toBe("There's something");
    expect(compatibilityZone(79)?.label).toBe('Really clicking');
    expect(compatibilityZone(80)?.emoji).toBe('🔥');
    expect(compatibilityZone(140)?.emoji).toBe('🔥');
    expect(compatibilityZone(null)).toBeNull();
    expect(compatibilityLabel(undefined)).toBe('Not rated yet');
    expect(compatibilityLabel(85)).toBe('Soulmate energy 🔥');
  });

  it('averages the friends who weighed in', () => {
    expect(friendsRead([])).toBeNull();
    expect(friendsRead([{ userId: 'a', score: 60 }, { userId: 'b', score: 71 }])).toEqual({ average: 66, count: 2 });
  });

  it('writes the gap line in plain words', () => {
    expect(readGap(70, { average: 72, count: 2 })).toBe('You and your friends agree 🤝');
    expect(readGap(50, { average: 70, count: 1 })).toBe('Your friends are 20 points more optimistic than you 👀');
    expect(readGap(80, { average: 60, count: 3 })).toBe("You're 20 points more sure than your friends 😌");
    expect(readGap(null, { average: 60, count: 3 })).toBe('');
    expect(readGap(60, null)).toBe('');
  });

  it('describes the latest move in the history', () => {
    expect(compatibilityTrend([{ score: 50, at: '2026-09-20T00:00:00Z' }])).toBe('');
    expect(compatibilityTrend([{ score: 50, at: '2026-09-20T12:00:00Z' }, { score: 62, at: '2026-10-09T12:00:00Z' }])).toMatch(/^↑ 12 since Sep 2\d$/);
    expect(compatibilityTrend([{ score: 50, at: '2026-09-20T12:00:00Z' }, { score: 40, at: '2026-10-09T12:00:00Z' }])).toMatch(/^↓ 10 since/);
  });
});
