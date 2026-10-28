import { isFriendUpdate, isPrivateNote } from './friend-update';

describe('Updates For Friends (DEX-44)', () => {
  it('treats Updates and shared or Public notes as updates', () => {
    expect(isFriendUpdate({ type: 'Update', visibility: [] })).toBe(true);
    expect(isFriendUpdate({ type: 'Note', visibility: ['friend-1'] })).toBe(true);
    expect(isFriendUpdate({ type: 'Note', visibility: ['public'] })).toBe(true);
    expect(isFriendUpdate({ type: 'StatusChange', visibility: [] })).toBe(true);
  });

  it('keeps private notes private', () => {
    expect(isFriendUpdate({ type: 'Note', visibility: [] })).toBe(false);
    expect(isPrivateNote({ type: 'Note', visibility: [] })).toBe(true);
    expect(isPrivateNote({ type: 'Update', visibility: [] })).toBe(false);
    expect(isFriendUpdate({ type: 'Date', visibility: ['friend-1'] })).toBe(false);
  });
});
