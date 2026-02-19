export enum CrushStatus {
  Crush = 'Crush',
  Dating = 'Dating',
  Exclusive = 'Exclusive',
  Archived = 'Archived'
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
  rating?: number; // 1-5 stars
  redFlags: number;
  vibeHistory: number[]; // Array of last 5 vibe scores (1-10)
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
}
