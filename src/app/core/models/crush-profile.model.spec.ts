import { describe, expect, it } from 'vitest';
import { crushSeenAt } from './crush-profile.model';

describe('crushSeenAt', () => {
  const crush = { viewedBy: [
    { userId: 'f1', at: new Date('2026-10-01T10:00:00Z') },
    { userId: 'f2', at: new Date('2026-10-01T11:00:00Z') },
    { userId: 'f1', at: new Date('2026-10-01T12:00:00Z') }
  ] };

  it('returns the latest time that friend opened the crush', () => {
    expect(crushSeenAt(crush, 'f1')?.toISOString()).toBe('2026-10-01T12:00:00.000Z');
    expect(crushSeenAt(crush, 'f2')?.toISOString()).toBe('2026-10-01T11:00:00.000Z');
  });

  it('is null for a friend who has not opened it, or when nothing is recorded', () => {
    expect(crushSeenAt(crush, 'f3')).toBeNull();
    expect(crushSeenAt({ viewedBy: [] }, 'f1')).toBeNull();
    expect(crushSeenAt({}, 'f1')).toBeNull();
    expect(crushSeenAt(null, 'f1')).toBeNull();
  });
});
