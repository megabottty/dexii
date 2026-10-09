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
