import { CrushStatus, SchoolOrWork } from '../models/crush-profile.model';

/**
 * Option lists shared by every crush form (New Crush modal and Edit Profile),
 * so both flows always ask the same questions with the same answers.
 */

export type CrushPronoun = 'he' | 'she' | 'they';

export const PRONOUN_OPTIONS: ReadonlyArray<{ label: string; value: CrushPronoun }> = [
  { label: 'He/Him', value: 'he' },
  { label: 'She/Her', value: 'she' },
  { label: 'They/Them', value: 'they' }
];

/** The enum values double as their display labels. */
export const CRUSH_STATUS_OPTIONS: ReadonlyArray<{ label: string; value: CrushStatus }> =
  Object.values(CrushStatus).map((value) => ({ label: value, value }));

export const HAIR_OPTIONS: ReadonlyArray<string> = ['Blonde', 'Brown', 'Black', 'Red', 'Long', 'Spikey', 'Bald', 'Other'];
export const EYE_OPTIONS: ReadonlyArray<string> = ['Grey', 'Blue', 'Aqua', 'Green', 'Brown', 'Hazel', 'Black', 'Other'];
export const BUILD_OPTIONS: ReadonlyArray<string> = ['Skinny', 'Ripped', 'Athletic', 'Tall', 'Short', 'Lots to love', 'Average', 'Other'];

export const SCHOOL_OR_WORK_OPTIONS: ReadonlyArray<{ label: string; value: SchoolOrWork }> = [
  { label: 'In school', value: 'school' },
  { label: 'Working', value: 'working' },
  { label: 'Both', value: 'both' },
  { label: 'Neither', value: 'neither' }
];

export const NOTE_VISIBILITY_OPTIONS: ReadonlyArray<{ label: string; value: 'private' | 'public' }> = [
  { label: 'Private', value: 'private' },
  { label: 'Public', value: 'public' }
];

export const DISPLAY_NAME_OPTIONS: ReadonlyArray<{ label: string; value: 'nickname' | 'fullName' }> = [
  { label: 'Nickname', value: 'nickname' },
  { label: 'Real name', value: 'fullName' }
];

/** The "Other" tile: opens the custom label box and Relationship Notes; never stored as a label itself. */
/** Compatibility Check chips: what's making you feel compatible? */
export const COMPATIBILITY_FACTORS: ReadonlyArray<string> = [
  'Shared values', 'Makes me laugh', 'I feel like myself around them', 'We talk easily', 'Same life goals',
  'Chemistry', 'Similar lifestyle', 'Kind to others', 'Respects my boundaries', 'My friends like them'
];
export const COMPATIBILITY_OTHER_LABEL = 'Something else';

export const OTHER_LABEL = 'Other';
export const HEARTBROKEN_LABEL = 'Heartbroken';

/** Relationship status choices, worded for the crush's pronouns. */
export function relationshipStatusOptions(pronouns?: string): string[] {
  const subject = pronouns === 'he' ? 'he' : pronouns === 'she' ? 'she' : 'they';
  const subjectCap = subject.charAt(0).toUpperCase() + subject.slice(1);
  const verb = subject === 'they' ? "don't" : "doesn't";
  const likes = subject === 'they' ? 'like' : 'likes';

  return [
    `${subjectCap} ${verb} know I exist`,
    'Just friends',
    'Just flirting',
    'Just sexting',
    "Seeing where it goes (more than friends, haven't DTR)",
    HEARTBROKEN_LABEL,
    `I think ${subject} ${likes} me`,
    'Getting serious',
    'We are a couple',
    'Friends With Benefits',
    'We are engaged',
    OTHER_LABEL
  ];
}
