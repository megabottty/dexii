export enum SubscriptionTier {
  Free = 'Free',
  Premium = 'Premium',
  Gold = 'Gold'
}

export interface User {
  id: string;
  username: string;
  email?: string;
  bio?: string;
  friends: string[]; // array of user IDs
  blockedUsers: string[];
  subscriptionTier: SubscriptionTier;
  isVerified18: boolean;
  avatarUrl?: string;
  friendCategories: string[]; // e.g. ["Close Friends", "Casual"]
  relationshipStatus?: 'Single' | 'In a Relationship' | 'Married' | 'It\'s Complicated' | 'Open Relationship' | 'Other';
  lookingFor?: 'Long-term' | 'Short-term' | 'Friendship' | 'Not Sure' | 'Other';
  interestedIn?: 'Men' | 'Women' | 'Everyone' | 'Other';
  loveLanguage?: 'Words of Affirmation' | 'Acts of Service' | 'Receiving Gifts' | 'Quality Time' | 'Physical Touch';
  idealDate?: string;
}
