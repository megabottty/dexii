import { WalkthroughStep } from '../services/walkthrough.service';

/** Shown once, the first time a user lands on the dashboard after signing in. */
export const FIRST_LOGIN_TOUR_KEY = 'first_login';

export const FIRST_LOGIN_TOUR: WalkthroughStep[] = [
  {
    icon: '💖',
    title: 'Welcome to Dexii',
    body: 'Your private little black book. Everything here is locked behind your PIN, and nothing is shared unless you choose to share it.'
  },
  {
    icon: '🗂',
    title: 'Add your crushes',
    body: 'Tap "New Crush" on your dashboard to add someone. Track their vibe, how you met, red flags, and anything else worth remembering.'
  },
  {
    icon: '👥',
    title: 'Build your inner circle',
    body: 'Head to Friends to search for people and send friend requests. Your friends list is private to you.'
  },
  {
    icon: '🤫',
    title: 'Share only what you want',
    body: 'Sharing is one-to-one and opt-in. You pick which crush, and which friend sees it. Everything else stays private.'
  },
  {
    icon: '🛡️',
    title: 'Stay safe out there',
    body: 'Open any crush profile and use Safety Check to set a check-in before a date, so a trusted friend knows where you are.'
  },
  {
    icon: '🔒',
    title: 'Your vault',
    body: 'The Vault holds your most sensitive content behind an extra layer of protection. You can revisit this tour any time from Settings.'
  }
];

/** Shown once, immediately after the user creates their very first crush. */
export const FIRST_CRUSH_SHARE_TOUR_KEY = 'first_crush_share';

export const FIRST_CRUSH_SHARE_TOUR: WalkthroughStep[] = [
  {
    icon: '🎉',
    title: 'Your first crush is saved',
    body: 'Nice. Right now this profile is completely private — no one else can see it.'
  },
  {
    icon: '👥',
    title: 'Sharing starts with a friend',
    body: 'To share, you first need someone in your circle. Go to Friends and add the person you trust with the tea.'
  },
  {
    icon: '🔗',
    title: 'Pick who sees what',
    body: 'On the Friends page, open the sharing controls for a friend. You choose each crush you want that specific friend to see.'
  },
  {
    icon: '🫖',
    title: 'Share the details',
    body: 'You can share a whole profile, or just individual entries. Anything you do not explicitly share stays private to you.'
  },
  {
    icon: '↩️',
    title: 'You can undo it',
    body: 'Sharing is never permanent. Toggle it off at any time from the same sharing controls.'
  }
];
