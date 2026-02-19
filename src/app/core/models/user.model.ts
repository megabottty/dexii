export enum SubscriptionTier {
  Free = 'Free',
  Premium = 'Premium',
  Gold = 'Gold'
}

export interface User {
  id: string;
  username: string;
  email?: string;
  friends: string[]; // array of user IDs
  blockedUsers: string[];
  subscriptionTier: SubscriptionTier;
  isVerified18: boolean;
  avatarUrl?: string;
  friendCategories: string[]; // e.g. ["Close Friends", "Casual"]
}
