import { AvatarConfig } from '../models/avatar-config.model';
import { CrushProfile, CrushStatus, SchoolOrWork } from '../models/crush-profile.model';
import { CrushPronoun, HEARTBROKEN_LABEL, OTHER_LABEL, relationshipStatusOptions } from '../config/crush-form-options';

/**
 * The value behind the shared crush form. Both the New Crush modal and Edit Profile
 * bind to this shape, and both save through `formValueToCrushPatch`.
 */
export interface CrushFormValue {
  nickname: string;
  fullName: string;
  displayName: 'nickname' | 'fullName';
  pronouns: CrushPronoun;
  avatarUrl: string;
  avatarConfig: AvatarConfig | undefined;
  status: CrushStatus;
  /** Form-only: saved as a separate Note entry, not on the crush. */
  note: string;
  noteVisibility: 'private' | 'public';
  hair: string[];
  eyes: string[];
  build: string[];
  /** Form-only: packed into `customNotes` on save. */
  hairNotes: string;
  eyeNotes: string;
  buildNotes: string;
  social: {
    snapchat: string;
    whatsapp: string;
    twitter: string;
    facebook: string;
    instagram: string;
  };
  /** Ordered. Never contains "Other". May contain custom text. The first one is the headline. */
  relationshipLabels: string[];
  /** Form-only: whether the "Other" tile is open (custom label box + Relationship Notes). */
  relationshipOtherOpen: boolean;
  /** Form-only: text typed into the custom label box but not added yet. */
  customRelationshipLabelDraft: string;
  /** Form-only: packed into `customNotes` on save. */
  relationshipNotes: string;
  heartbreakSong: string;
  heartbreakRecovery: string;
  initialRating: number;
  /** null means "Skip": the current vibe is the same as the initial one. */
  currentRating: number | null;
  bio: string;
  location: string;
  /** YYYY-MM-DD or ''. */
  dateOfBirth: string;
  howWeMet: string;
  whenWeMet: string;
  schoolOrWork: SchoolOrWork | '';
  grade: string;
  occupation: string;
  family: string;
  /** Comma separated in the form; split into an array on save. */
  friends: string;
  memorableMoments: string;
  privateNotes: string;
}

export interface ParsedCustomNotes {
  hairNotes: string;
  eyeNotes: string;
  buildNotes: string;
  relationshipNotes: string;
  privateNotes: string;
}

export type CrushFormPatch = Pick<CrushProfile,
  'nickname' | 'fullName' | 'displayName' | 'pronouns' | 'avatarUrl' | 'avatarConfig' | 'bio' | 'status'
  | 'rating' | 'initialRating' | 'hair' | 'eyes' | 'build' | 'social' | 'relationshipStatus' | 'relationshipLabels'
  | 'heartbreakSong' | 'heartbreakRecovery' | 'customNotes' | 'location' | 'dateOfBirth' | 'howWeMet' | 'whenWeMet'
  | 'schoolOrWork' | 'grade' | 'occupation' | 'family' | 'friends' | 'memorableMoments'>;

const NOTE_KINDS: ReadonlyArray<{ key: keyof Omit<ParsedCustomNotes, 'privateNotes'>; label: string }> = [
  { key: 'hairNotes', label: 'Hair' },
  { key: 'eyeNotes', label: 'Eyes' },
  { key: 'buildNotes', label: 'Build' },
  { key: 'relationshipNotes', label: 'Relationship' }
];

const LEGACY_OTHER_PREFIX = 'Other: ';

export function emptyCrushFormValue(): CrushFormValue {
  return {
    nickname: '',
    fullName: '',
    displayName: 'nickname',
    pronouns: 'they',
    avatarUrl: '',
    avatarConfig: undefined,
    status: CrushStatus.Crush,
    note: '',
    noteVisibility: 'private',
    hair: [],
    eyes: [],
    build: [],
    hairNotes: '',
    eyeNotes: '',
    buildNotes: '',
    social: { snapchat: '', whatsapp: '', twitter: '', facebook: '', instagram: '' },
    relationshipLabels: [],
    relationshipOtherOpen: false,
    customRelationshipLabelDraft: '',
    relationshipNotes: '',
    heartbreakSong: '',
    heartbreakRecovery: '',
    initialRating: 3,
    currentRating: null,
    bio: '',
    location: '',
    dateOfBirth: '',
    howWeMet: '',
    whenWeMet: '',
    schoolOrWork: '',
    grade: '',
    occupation: '',
    family: '',
    friends: '',
    memorableMoments: '',
    privateNotes: ''
  };
}

/** Packs the "Other" detail notes and the private notes into one `customNotes` string. */
export function composeCustomNotes(parts: ParsedCustomNotes): string {
  let notes = '';
  for (const kind of NOTE_KINDS) {
    const text = (parts[kind.key] || '').trim();
    if (text) notes += `Other: ${kind.label} - ${text}\n`;
  }
  if (parts.privateNotes) notes += parts.privateNotes;
  return notes.trim();
}

/**
 * Splits `customNotes` back into its parts. Understands the current
 * `Other: Hair - …` lines and the older `Hair: …` lines; everything else is private notes.
 */
export function parseCustomNotes(notes: string | undefined | null): ParsedCustomNotes {
  const parsed: ParsedCustomNotes = { hairNotes: '', eyeNotes: '', buildNotes: '', relationshipNotes: '', privateNotes: '' };
  if (!notes) return parsed;

  const privateLines: string[] = [];
  for (const line of notes.split('\n')) {
    const kind = NOTE_KINDS.find((k) => line.startsWith(`Other: ${k.label} - `) || line.startsWith(`${k.label}:`));
    if (!kind) {
      privateLines.push(line);
      continue;
    }
    const prefix = line.startsWith('Other: ') ? `Other: ${kind.label} - ` : `${kind.label}:`;
    const text = line.slice(prefix.length).trim();
    // First line of each kind wins, matching how the old parser read them.
    if (text && !parsed[kind.key]) parsed[kind.key] = text;
  }
  parsed.privateNotes = privateLines.join('\n').trim();
  return parsed;
}

/** Fills the form from a saved crush (used when opening Edit Profile). */
export function crushToFormValue(crush: CrushProfile): CrushFormValue {
  const value = emptyCrushFormValue();
  const pronouns: CrushPronoun = crush.pronouns === 'he' || crush.pronouns === 'she' ? crush.pronouns : 'they';
  const parsed = parseCustomNotes(crush.customNotes);

  // Older crushes stored a custom label as "Other: text". Keep the text as a label.
  const rawLabels = Array.isArray(crush.relationshipLabels) ? crush.relationshipLabels : [];
  const legacyOther = rawLabels.find((label) => typeof label === 'string' && label.startsWith(LEGACY_OTHER_PREFIX));
  const labels = cleanLabels(rawLabels.map((label) =>
    typeof label === 'string' && label.startsWith(LEGACY_OTHER_PREFIX) ? label.slice(LEGACY_OTHER_PREFIX.length) : label
  ));
  const relationshipNotes = parsed.relationshipNotes || (legacyOther ? legacyOther.slice(LEGACY_OTHER_PREFIX.length) : '');
  const standardOptions = relationshipStatusOptions(pronouns);
  const hasCustomLabel = labels.some((label) => !standardOptions.includes(label));

  return {
    ...value,
    nickname: crush.nickname || '',
    fullName: crush.fullName || '',
    displayName: crush.displayName === 'fullName' ? 'fullName' : 'nickname',
    pronouns,
    avatarUrl: crush.avatarUrl || '',
    avatarConfig: crush.avatarConfig,
    status: crush.status || CrushStatus.Crush,
    hair: crush.hair ? [...crush.hair] : [],
    eyes: crush.eyes ? [...crush.eyes] : [],
    build: crush.build ? [...crush.build] : [],
    hairNotes: parsed.hairNotes,
    eyeNotes: parsed.eyeNotes,
    buildNotes: parsed.buildNotes,
    social: {
      snapchat: crush.social?.snapchat || '',
      whatsapp: crush.social?.whatsapp || '',
      twitter: crush.social?.twitter || '',
      facebook: crush.social?.facebook || '',
      instagram: crush.social?.instagram || ''
    },
    relationshipLabels: labels,
    relationshipOtherOpen: Boolean(relationshipNotes) || hasCustomLabel,
    relationshipNotes,
    heartbreakSong: crush.heartbreakSong || '',
    heartbreakRecovery: crush.heartbreakRecovery || '',
    initialRating: crush.initialRating || crush.rating || 3,
    currentRating: crush.rating ?? null,
    bio: crush.bio || '',
    location: crush.location || '',
    dateOfBirth: crush.dateOfBirth ? String(crush.dateOfBirth).slice(0, 10) : '',
    howWeMet: crush.howWeMet || '',
    whenWeMet: crush.whenWeMet || '',
    schoolOrWork: crush.schoolOrWork || '',
    grade: crush.grade || '',
    occupation: crush.occupation || '',
    family: crush.family || '',
    friends: crush.friends ? crush.friends.join(', ') : '',
    memorableMoments: crush.memorableMoments || '',
    privateNotes: parsed.privateNotes
  };
}

/** Turns the form into the crush fields to save. Used by both create and edit. */
export function formValueToCrushPatch(value: CrushFormValue): CrushFormPatch {
  const labels = cleanLabels(value.relationshipLabels);
  const heartbroken = labels.includes(HEARTBROKEN_LABEL);

  return {
    nickname: value.nickname.trim(),
    fullName: value.fullName.trim(),
    displayName: value.displayName,
    pronouns: value.pronouns,
    avatarUrl: value.avatarUrl,
    avatarConfig: value.avatarConfig,
    bio: value.bio,
    status: value.status,
    rating: value.currentRating ?? value.initialRating,
    initialRating: value.initialRating,
    hair: [...value.hair],
    eyes: [...value.eyes],
    build: [...value.build],
    social: { ...value.social },
    relationshipStatus: labels[0] ?? '',
    relationshipLabels: labels,
    heartbreakSong: heartbroken ? value.heartbreakSong : '',
    heartbreakRecovery: heartbroken ? value.heartbreakRecovery : '',
    customNotes: composeCustomNotes({
      hairNotes: value.hairNotes,
      eyeNotes: value.eyeNotes,
      buildNotes: value.buildNotes,
      relationshipNotes: value.relationshipNotes,
      privateNotes: value.privateNotes
    }),
    location: value.location,
    dateOfBirth: value.dateOfBirth || undefined,
    howWeMet: value.howWeMet,
    whenWeMet: value.whenWeMet,
    schoolOrWork: value.schoolOrWork || undefined,
    grade: value.grade,
    occupation: value.occupation,
    family: value.family,
    friends: value.friends
      ? value.friends.split(',').map((f) => f.trim()).filter((f) => f)
      : [],
    memorableMoments: value.memorableMoments
  };
}

/** The free-text fields that go through content moderation before saving. */
export function crushFormTextFields(value: CrushFormValue): string[] {
  return [
    value.nickname,
    value.fullName,
    value.note,
    value.privateNotes,
    value.relationshipNotes,
    value.bio,
    value.memorableMoments
  ];
}

/** Trims, drops blanks and "Other", and removes duplicates while keeping order. */
function cleanLabels(labels: ReadonlyArray<unknown>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of labels) {
    if (typeof raw !== 'string') continue;
    const label = raw.trim();
    if (!label || label === OTHER_LABEL || seen.has(label)) continue;
    seen.add(label);
    result.push(label);
  }
  return result;
}
