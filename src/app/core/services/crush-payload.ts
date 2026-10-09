import { CrushProfile } from '../models/crush-profile.model';

export type CrushField = keyof CrushProfile;

/**
 * The fields the shared crush form edits. Kept in step with `formValueToCrushPatch`
 * (a spec asserts they match) so the edit form sends exactly what it owns.
 */
export const CRUSH_FORM_FIELDS: readonly CrushField[] = [
  'nickname', 'fullName', 'displayName', 'pronouns', 'avatarUrl', 'avatarConfig', 'bio', 'status',
  'rating', 'initialRating', 'hair', 'eyes', 'build', 'social', 'relationshipStatus', 'relationshipLabels',
  'heartbreakSong', 'heartbreakRecovery', 'customNotes', 'location', 'dateOfBirth', 'howWeMet', 'whenWeMet',
  'schoolOrWork', 'grade', 'occupation', 'family', 'friends', 'memorableMoments'
];

/** Never part of an update payload: identity and server-managed lists. */
const NEVER_SENT: ReadonlySet<string> = new Set(['id', 'userId', 'sharedEntries', 'viewedBy', 'photos', 'photoCount']);

/**
 * Builds the body for PUT /crushes/:id from just the fields an action changed.
 * Sending only those fields is what stops a phone or tab with old data from
 * overwriting sharing, photos or anything else it never touched.
 */
export function pickCrushPayload(crush: CrushProfile, fields: readonly CrushField[]): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of new Set(fields)) {
    if (NEVER_SENT.has(field)) continue;
    let value: unknown = crush[field];
    if (field === 'avatarConfig') value = value ?? null;
    if (field === 'schoolOrWork') value = value ?? '';
    if (field === 'relationshipLabels' || field === 'visibility') value = Array.isArray(value) ? value : [];
    payload[field] = value;
  }
  return payload;
}
