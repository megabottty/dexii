/**
 * Compatibility Check: a 0-100 read on how compatible you feel with a crush,
 * the reasons behind it, and your friends' own reads on the crushes you share.
 */

export interface CompatibilityZone {
  min: number;
  label: string;
  emoji: string;
  /** Hint shown under the slider while the thumb sits in this zone. */
  hint: string;
}

export const COMPATIBILITY_ZONES: ReadonlyArray<CompatibilityZone> = [
  { min: 80, label: 'Soulmate energy', emoji: '🔥', hint: 'Everything lines up. Enjoy it.' },
  { min: 60, label: 'Really clicking', emoji: '💫', hint: 'Lots in common and it feels easy.' },
  { min: 40, label: "There's something", emoji: '✨', hint: 'A spark worth exploring.' },
  { min: 20, label: 'Hmm, maybe', emoji: '🤔', hint: 'Some good signs, some question marks.' },
  { min: 0, label: 'Not feeling it', emoji: '🧊', hint: "It's okay to notice that early." }
];

/** The zone a score falls in; null for "not rated yet". */
export function compatibilityZone(score: number | null | undefined): CompatibilityZone | null {
  if (score === null || score === undefined || Number.isNaN(score)) return null;
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return COMPATIBILITY_ZONES.find((zone) => clamped >= zone.min) || COMPATIBILITY_ZONES[COMPATIBILITY_ZONES.length - 1];
}

/** "Soulmate energy 🔥" or "Not rated yet". */
export function compatibilityLabel(score: number | null | undefined): string {
  const zone = compatibilityZone(score);
  return zone ? `${zone.label} ${zone.emoji}` : 'Not rated yet';
}

export interface FriendCompatibilityVote {
  userId: string;
  username?: string;
  avatarUrl?: string;
  score: number;
  note?: string;
  at?: Date | string;
}

/** Average of your friends' reads, or null when nobody has weighed in. */
export function friendsRead(votes: ReadonlyArray<FriendCompatibilityVote> | null | undefined): { average: number; count: number } | null {
  const valid = (votes || []).filter((vote) => typeof vote.score === 'number' && !Number.isNaN(vote.score));
  if (valid.length === 0) return null;
  const average = Math.round(valid.reduce((sum, vote) => sum + vote.score, 0) / valid.length);
  return { average, count: valid.length };
}

/** The one-liner comparing your read with your friends'. */
export function readGap(mine: number | null | undefined, friends: { average: number; count: number } | null): string {
  if (mine === null || mine === undefined || !friends) return '';
  const diff = friends.average - mine;
  if (Math.abs(diff) <= 5) return 'You and your friends agree 🤝';
  if (diff > 0) return `Your friends are ${diff} points more optimistic than you 👀`;
  return `You're ${-diff} points more sure than your friends 😌`;
}

/** "↑ 12 since Sep 20" for the history card; empty with fewer than two points. */
export function compatibilityTrend(history: ReadonlyArray<{ score: number; at: Date | string }> | null | undefined): string {
  const points = (history || []).filter((entry) => typeof entry.score === 'number');
  if (points.length < 2) return '';
  const latest = points[points.length - 1];
  const previous = points[points.length - 2];
  const diff = latest.score - previous.score;
  const when = new Date(previous.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (diff === 0) return `Same as ${when}`;
  return `${diff > 0 ? '↑' : '↓'} ${Math.abs(diff)} since ${when}`;
}

/** Rotating prompts under "In your own words". */
export const COMPATIBILITY_PROMPTS: ReadonlyArray<string> = [
  'Think about the things you\'ve noticed, the values you share, or how you feel around them.',
  'What do they do that makes you feel seen?',
  'When are you most yourself with them?',
  'What would your best friend say about the two of you?'
];
