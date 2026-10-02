import { describe, expect, it } from 'vitest';
import { CRUSH_FORM_FIELDS, pickCrushPayload } from './crush-payload';
import { emptyCrushFormValue, formValueToCrushPatch } from '../utils/crush-form.util';
import { CrushProfile, CrushStatus } from '../models/crush-profile.model';

const crush: CrushProfile = {
  id: 'c1',
  userId: 'u1',
  nickname: 'Sunny',
  status: CrushStatus.Crush,
  visibility: ['f1'],
  sharedEntries: ['e1'],
  lastInteraction: new Date(),
  redFlags: 1,
  redFlagReason: 'late',
  vibeHistory: [3, 4],
  rating: 4,
  sortOrder: 2,
  avatarUrl: 'data:image/png;base64,abc',
  relationshipLabels: undefined,
  schoolOrWork: undefined
};

describe('pickCrushPayload', () => {
  it('sends only the requested fields', () => {
    expect(pickCrushPayload(crush, ['sortOrder'])).toEqual({ sortOrder: 2 });
    expect(pickCrushPayload(crush, ['redFlags', 'redFlagReason'])).toEqual({ redFlags: 1, redFlagReason: 'late' });
  });

  it('never sends sharing, identity or server-managed lists unless asked', () => {
    const payload = pickCrushPayload(crush, ['nickname', 'id', 'userId', 'sharedEntries']);
    expect(payload).toEqual({ nickname: 'Sunny' });
    expect(pickCrushPayload(crush, ['visibility'])).toEqual({ visibility: ['f1'] });
  });

  it('normalises the values the server expects', () => {
    const payload = pickCrushPayload(crush, ['avatarConfig', 'schoolOrWork', 'relationshipLabels']);
    expect(payload).toEqual({ avatarConfig: null, schoolOrWork: '', relationshipLabels: [] });
  });
});

describe('CRUSH_FORM_FIELDS', () => {
  it('matches exactly what the shared crush form saves', () => {
    const patchKeys = Object.keys(formValueToCrushPatch(emptyCrushFormValue())).sort();
    expect([...CRUSH_FORM_FIELDS].sort()).toEqual(patchKeys);
  });
});
