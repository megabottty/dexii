import { AvatarConfig } from './avatar-config.model';

export enum CrushStatus {
  Crush = 'Crush',
  Plotting = 'Plotting',
  Dating = 'Dating',
  Exclusive = 'Exclusive',
  BrokenUp = 'Broken Up',
  Heartbroken = 'Heartbroken',
  Archived = 'Archived',
  Friend = 'Friend'
}

export type SchoolOrWork = 'school' | 'working' | 'both' | 'neither';

export interface CrushProfile {
  id: string;
  userId: string; // The owner of this profile
  nickname: string;
  fullName?: string;
  displayName?: 'nickname' | 'fullName';
  avatarUrl?: string;
  /** Builder options when the avatar was made with the in-app avatar builder. */
  avatarConfig?: AvatarConfig;
  bio?: string;
  status: CrushStatus;
  visibility: string[]; // List of friend IDs who can see basic info
  sharedEntries: string[]; // List of specific entry IDs shared with friends
  lastInteraction: Date;
  rating?: number; // 1-5 stars — current/latest vibe
  initialRating?: number; // 1-5 stars — set at creation, never overwritten by vibe logs
  redFlags: number;
  redFlagReason?: string;
  vibeHistory: number[]; // Array of last 10 vibe scores (1-5 stars)
  isStealth?: boolean;
  category?: string; // e.g. "Work", "Old Crush"
  hair?: string[];
  eyes?: string[];
  build?: string[];
  social?: {
    snapchat?: string;
    whatsapp?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
  relationshipStatus?: string;
  relationshipLabels?: string[];
  heartbreakSong?: string;
  heartbreakRecovery?: string;
  pronouns?: 'he' | 'she' | 'they' | 'custom';
  customNotes?: string;
  location?: string;
  dateOfBirth?: string;
  age?: number;
  howWeMet?: string;
  whenWeMet?: string;
  /** Whether they are in school, working, both or neither (decides if Grade / Occupation apply). */
  schoolOrWork?: SchoolOrWork;
  grade?: string;
  occupation?: string;
  family?: string;
  memorableMoments?: string;
  friends?: string[];
  sortOrder?: number; // Manual drag-and-drop ordering on the dashboard (lower = earlier)
  /** Friends who have opened this crush after you shared it (owner only). */
  viewedBy?: CrushView[];
  /** Photo metadata (no image data); fetch the images with loadCrushPhotos. */
  photos?: CrushPhoto[];
  /** How many photos this viewer can see. */
  photoCount?: number;
  /** Compatibility Check: the owner's read. */
  compatibility?: CrushCompatibility | null;
  /** Owner only: every time the read changed, newest last. */
  compatibilityHistory?: CompatibilityPoint[];
  /** Friends' reads on this crush (friends it is shared with). */
  friendCompatibility?: FriendCompatibilityVote[];
}

export interface CrushCompatibility {
  /** 0-100, or null when not rated yet. */
  score: number | null;
  factors: string[];
  note: string;
  /** "Anything giving you pause?" */
  pause: string;
  updatedAt?: Date | string | null;
}

export interface CompatibilityPoint {
  score: number;
  factors: string[];
  note: string;
  at: Date | string;
}

export interface FriendCompatibilityVote {
  userId: string;
  username?: string;
  avatarUrl?: string;
  score: number;
  note?: string;
  at?: Date | string;
}

export function mapCompatibility(raw: unknown): CrushCompatibility | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const score = typeof r['score'] === 'number' && !Number.isNaN(r['score']) ? Math.max(0, Math.min(100, Math.round(r['score']))) : null;
  const factors = Array.isArray(r['factors']) ? r['factors'].filter((f): f is string => typeof f === 'string') : [];
  const note = typeof r['note'] === 'string' ? r['note'] : '';
  const pause = typeof r['pause'] === 'string' ? r['pause'] : '';
  if (score === null && factors.length === 0 && !note && !pause) return null;
  return { score, factors, note, pause, updatedAt: (r['updatedAt'] as string | null) ?? null };
}

export function mapCompatibilityHistory(raw: unknown): CompatibilityPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p) => p && typeof p === 'object' && typeof (p as Record<string, unknown>)['score'] === 'number')
    .map((p) => { const r = p as Record<string, unknown>; return { score: r['score'] as number, factors: Array.isArray(r['factors']) ? (r['factors'] as string[]) : [], note: typeof r['note'] === 'string' ? r['note'] : '', at: (r['at'] as string) || new Date().toISOString() }; });
}

export function mapFriendCompatibility(raw: unknown): FriendCompatibilityVote[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((v) => v && typeof v === 'object' && typeof (v as Record<string, unknown>)['score'] === 'number')
    .map((v) => { const r = v as Record<string, unknown>; return { userId: String(r['userId'] ?? r['user'] ?? ''), username: typeof r['username'] === 'string' ? r['username'] : '', avatarUrl: typeof r['avatarUrl'] === 'string' ? r['avatarUrl'] : '', score: r['score'] as number, note: typeof r['note'] === 'string' ? r['note'] : '', at: (r['at'] as string) || undefined }; });
}

/** One photo of a crush. `url` is only present once the gallery has loaded it. */
export interface CrushPhoto {
  id: string;
  url?: string;
  width?: number;
  height?: number;
  bytes?: number;
  addedAt: Date;
  /** 'shared' = every friend the crush is shared with; 'friends' = only friendIds. */
  audience: 'shared' | 'friends';
  friendIds: string[];
}

export interface CrushView {
  userId: string;
  at: Date;
}

/** When `friendId` last opened this crush, or null if they haven't. */
export function crushSeenAt(crush: Pick<CrushProfile, 'viewedBy'> | null | undefined, friendId: string): Date | null {
  if (!crush?.viewedBy || !friendId) return null;
  let latest: Date | null = null;
  for (const view of crush.viewedBy) {
    if (view.userId !== friendId) continue;
    if (!latest || view.at.getTime() > latest.getTime()) latest = view.at;
  }
  return latest;
}

/** Photos as the server sends them → the client's shape. */
export function mapCrushPhotos(raw: unknown): CrushPhoto[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((p: any) => ({
    id: String(p.id || p._id || ''),
    url: typeof p.url === 'string' ? p.url : undefined,
    width: p.width,
    height: p.height,
    bytes: p.bytes,
    addedAt: p.addedAt ? new Date(p.addedAt) : new Date(),
    audience: p.audience === 'friends' ? 'friends' : 'shared',
    friendIds: Array.isArray(p.friendIds) ? p.friendIds.map(String) : []
  }));
}
