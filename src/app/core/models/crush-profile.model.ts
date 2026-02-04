export enum CrushStatus {
  Crush = 'Crush',
  Dating = 'Dating',
  Exclusive = 'Exclusive',
  Archive = 'Archive'
}

export interface CrushProfile {
  id: string;
  nickname: string;
  fullName?: string;
  avatarUrl?: string;
  bio?: string;
  status: CrushStatus;
  visibility: string[]; // array of friend IDs
  lastInteraction: Date;
  rating?: number; // 1-5 stars
}
