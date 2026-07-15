export enum CrushStatus {
  Crush = 'Crush',
  Crushing = 'Crushing',
  Dating = 'Dating',
  Exclusive = 'Exclusive',
  Archived = 'Archived',
  Friend = 'Friend'
}

export interface CrushProfile {
  id: string;
  userId: string; // The owner of this profile
  nickname: string;
  fullName?: string;
  avatarUrl?: string;
  bio?: string;
  status: CrushStatus;
  visibility: string[]; // List of friend IDs who can see basic info
  sharedEntries: string[]; // List of specific entry IDs shared with friends
  lastInteraction: Date;
  rating?: number; // 1-5 stars — current/latest vibe
  initialRating?: number; // 1-5 stars — set at creation, never overwritten by vibe logs
  redFlags: number;
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
  heartbreakSong?: string;
  heartbreakRecovery?: string;
  pronouns?: 'he' | 'she' | 'they' | 'custom';
  customNotes?: string;
  location?: string;
  age?: number;
  howWeMet?: string;
  whenWeMet?: string;
  grade?: string;
  occupation?: string;
  family?: string;
  memorableMoments?: string;
  friends?: string[];
}
