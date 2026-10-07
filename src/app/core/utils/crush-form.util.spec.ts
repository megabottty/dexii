import { CrushProfile, CrushStatus } from '../models/crush-profile.model';
import {
  composeCustomNotes,
  crushToFormValue,
  emptyCrushFormValue,
  formValueToCrushPatch,
  parseCustomNotes
} from './crush-form.util';

function crushWith(overrides: Partial<CrushProfile>): CrushProfile {
  return {
    id: 'c1',
    userId: 'u1',
    nickname: 'Sunny',
    status: CrushStatus.Crush,
    visibility: [],
    sharedEntries: [],
    lastInteraction: new Date(),
    redFlags: 0,
    vibeHistory: [3],
    ...overrides
  };
}

describe('crush form helpers', () => {
  describe('composeCustomNotes / parseCustomNotes', () => {
    it('round-trips all four detail notes plus private notes', () => {
      const parts = {
        hairNotes: 'curly',
        eyeNotes: 'one blue one green',
        buildNotes: 'swimmer',
        relationshipNotes: 'long distance',
        privateNotes: 'Line one\nLine two'
      };
      const notes = composeCustomNotes(parts);
      expect(notes).toBe(
        'Other: Hair - curly\nOther: Eyes - one blue one green\nOther: Build - swimmer\nOther: Relationship - long distance\nLine one\nLine two'
      );
      expect(parseCustomNotes(notes)).toEqual(parts);
    });

    it('round-trips a single kind and empty strings', () => {
      const parts = { hairNotes: '', eyeNotes: 'hazel-ish', buildNotes: '', relationshipNotes: '', privateNotes: '' };
      expect(parseCustomNotes(composeCustomNotes(parts))).toEqual(parts);
      expect(parseCustomNotes('')).toEqual({ hairNotes: '', eyeNotes: '', buildNotes: '', relationshipNotes: '', privateNotes: '' });
      expect(parseCustomNotes(undefined).privateNotes).toBe('');
    });

    it('reads the older "Hair: x" format and keeps free text as private notes', () => {
      const parsed = parseCustomNotes('Other: Hair - curly\nEyes: legacy brown\nfree text');
      expect(parsed.hairNotes).toBe('curly');
      expect(parsed.eyeNotes).toBe('legacy brown');
      expect(parsed.privateNotes).toBe('free text');
    });
  });

  describe('formValueToCrushPatch', () => {
    it('makes the first label the headline and drops "Other"', () => {
      const value = emptyCrushFormValue();
      value.relationshipLabels = ['Just flirting', 'Other', 'long distance', ' Just flirting '];
      const patch = formValueToCrushPatch(value);
      expect(patch.relationshipLabels).toEqual(['Just flirting', 'long distance']);
      expect(patch.relationshipStatus).toBe('Just flirting');
    });

    it('lets a custom label be the headline', () => {
      const value = emptyCrushFormValue();
      value.relationshipLabels = ['pen pals', 'Just friends'];
      expect(formValueToCrushPatch(value).relationshipStatus).toBe('pen pals');
    });

    it('uses the initial vibe as the rating when the current vibe is skipped', () => {
      const value = emptyCrushFormValue();
      value.initialRating = 4;
      value.currentRating = null;
      expect(formValueToCrushPatch(value).rating).toBe(4);
      value.currentRating = 2;
      expect(formValueToCrushPatch(value).rating).toBe(2);
      expect(formValueToCrushPatch(value).initialRating).toBe(4);
    });

    it('splits friends, blanks an empty birthday and packs the notes', () => {
      const value = emptyCrushFormValue();
      value.friends = 'Ana, Ben,, Cal ';
      value.dateOfBirth = '';
      value.hairNotes = 'curly';
      value.privateNotes = 'secret';
      value.schoolOrWork = '';
      const patch = formValueToCrushPatch(value);
      expect(patch.friends).toEqual(['Ana', 'Ben', 'Cal']);
      expect(patch.dateOfBirth).toBeUndefined();
      expect(patch.schoolOrWork).toBeUndefined();
      expect(patch.customNotes).toBe('Other: Hair - curly\nsecret');
    });

    it('clears the heartbreak fields unless Heartbroken is picked', () => {
      const value = emptyCrushFormValue();
      value.heartbreakSong = 'Someone Like You';
      value.heartbreakRecovery = 'Gym';
      value.relationshipLabels = ['Just friends'];
      expect(formValueToCrushPatch(value).heartbreakSong).toBe('');
      value.relationshipLabels = ['Heartbroken'];
      expect(formValueToCrushPatch(value).heartbreakSong).toBe('Someone Like You');
      expect(formValueToCrushPatch(value).heartbreakRecovery).toBe('Gym');
    });
  });

  describe('formValueToCrushPatch names', () => {
  it('uses the first name as the nickname when no nickname is given', () => {
    const value = emptyCrushFormValue();
    value.nickname = '';
    value.fullName = 'Sun Lee';
    const patch = formValueToCrushPatch(value);
    expect(patch.nickname).toBe('Sun Lee');
    expect(patch.displayName).toBe('fullName');
  });

  it('keeps the chosen display name when a nickname exists', () => {
    const value = emptyCrushFormValue();
    value.nickname = 'Sunny';
    value.fullName = 'Sun Lee';
    value.displayName = 'nickname';
    expect(formValueToCrushPatch(value).displayName).toBe('nickname');
  });
});

describe('crushToFormValue', () => {
    it('strips the legacy "Other: " label prefix and opens the Other tile', () => {
      const value = crushToFormValue(crushWith({ relationshipLabels: ['Other: long distance', 'Just friends'] }));
      expect(value.relationshipLabels).toEqual(['long distance', 'Just friends']);
      expect(value.relationshipOtherOpen).toBe(true);
      expect(value.relationshipNotes).toBe('long distance');
    });

    it('keeps the Other tile closed for standard labels only', () => {
      const value = crushToFormValue(crushWith({ pronouns: 'she', relationshipLabels: ['She doesn\'t know I exist'] }));
      expect(value.relationshipOtherOpen).toBe(false);
      expect(value.pronouns).toBe('she');
    });

    it('round-trips what the form saved', () => {
      const original = emptyCrushFormValue();
      Object.assign(original, {
        nickname: 'Sunny',
        fullName: 'Sun Lee',
        displayName: 'fullName',
        pronouns: 'he',
        status: CrushStatus.Dating,
        hair: ['Brown', 'Other'],
        hairNotes: 'curly',
        eyeNotes: '',
        buildNotes: 'swimmer',
        social: { snapchat: 'sun', whatsapp: '', twitter: '', facebook: '', instagram: 'sunny' },
        relationshipLabels: ['Heartbroken', 'custom thing'],
        relationshipNotes: 'complicated',
        heartbreakSong: 'Blue',
        heartbreakRecovery: 'Running',
        initialRating: 4,
        currentRating: 2,
        bio: 'bio',
        location: 'Austin',
        dateOfBirth: '2000-05-06',
        howWeMet: 'gym',
        whenWeMet: 'May',
        schoolOrWork: 'both',
        grade: '12',
        occupation: 'barista',
        family: 'one sister',
        friends: 'Ana, Ben',
        memorableMoments: 'the rain',
        privateNotes: 'shh'
      });
      const saved = crushWith(formValueToCrushPatch(original));
      const reloaded = crushToFormValue(saved);
      const { relationshipOtherOpen: _a, ...expected } = original;
      const { relationshipOtherOpen: openAgain, ...actual } = reloaded;
      expect(actual).toEqual(expected);
      expect(openAgain).toBe(true);
    });
  });
});
