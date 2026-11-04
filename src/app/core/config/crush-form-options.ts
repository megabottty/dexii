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

/** "he" → "He/Him" for display; anything unknown comes back as typed. */
export function pronounLabel(value: string | null | undefined): string {
  if (!value) return '';
  return PRONOUN_OPTIONS.find((option) => option.value === value)?.label || value;
}

/** How a status reads on screen; the stored value stays plain ("Crush"). */
export function crushStatusLabel(status: string | null | undefined): string {
  if (!status) return '';
  return status === CrushStatus.Crush ? 'Crush 😍' : status;
}

/** The statuses a person can pick (DEX-50). Archived comes from the Archive button instead. */
export const CRUSH_STATUS_OPTIONS: ReadonlyArray<{ label: string; value: CrushStatus }> =
  Object.values(CrushStatus).filter((value) => value !== CrushStatus.Archived).map((value) => ({ label: crushStatusLabel(value), value }));

/** Retired statuses and what they became (DEX-50); mirrors server/src/utils/crushStatus.js. */
const LEGACY_STATUSES: Readonly<Record<string, CrushStatus>> = {
  Crushing: CrushStatus.Crush,
  Plotting: CrushStatus.Crush,
  Heartbroken: CrushStatus.BrokenUp,
  Friend: CrushStatus.Friends
};

/** Any stored status as a current one; unknown values read as Undefined. */
export function toCrushStatus(status?: string | null): CrushStatus {
  if (status && (Object.values(CrushStatus) as string[]).includes(status)) return status as CrushStatus;
  return (status && LEGACY_STATUSES[status]) || CrushStatus.Undefined;
}

export const HAIR_OPTIONS: ReadonlyArray<string> = ['Blonde', 'Brown', 'Black', 'Red', 'Long', 'Spikey', 'Bald', 'Other'];
export const EYE_OPTIONS: ReadonlyArray<string> = ['Grey', 'Blue', 'Aqua', 'Green', 'Brown', 'Hazel', 'Black', 'Other'];
export const BUILD_OPTIONS: ReadonlyArray<string> = ['Skinny', 'Ripped', 'Athletic', 'Tall', 'Short', 'Lots to love', 'Average', 'Other'];

export const SCHOOL_OR_WORK_OPTIONS: ReadonlyArray<{ label: string; value: SchoolOrWork }> = [
  { label: 'In school', value: 'school' },
  { label: 'Working', value: 'working' },
  { label: 'Both', value: 'both' },
  { label: 'Neither', value: 'neither' }
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

/** The Feels (DEX-46): how things feel, worded for the crush's pronouns. Arianne's list. */
export function relationshipStatusOptions(pronouns?: string): string[] {
  const he = pronouns === 'he', she = pronouns === 'she';
  const subject = he ? 'He' : she ? 'She' : 'They';
  const doesnt = he || she ? "doesn't" : "don't";
  const likes = he || she ? 'likes' : 'like';
  const theyre = he ? "He's" : she ? "She's" : "They're";
  const future = he ? 'husband' : she ? 'wife' : 'partner';

  return [
    `${subject} ${doesnt} know I exist`,
    'Definitely plotting',
    'Just talking',
    `I think ${subject.toLowerCase()} ${likes} me`,
    `${theyre} so fine!`,
    'Flirting',
    `Future ${future}!`,
    'Just sexting',
    'Seeing where it goes',
    HEARTBROKEN_LABEL,
    'I’m so in love!',
    'Like them, but still seeing other people',
    OTHER_LABEL
  ];
}
