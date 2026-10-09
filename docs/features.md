## Dexii: Private Dating CRM & Sharing App

Dexii is designed for high-security, high-glamour tracking of your dating life. It is a "digital little black book" built for privacy and sharing between trusted friends.

## 🔐 Core Security & Vault
- **Accessing the App**: Enter your 4-digit PIN on the **Dexii Vault** screen. (Default test PIN: `1111`).
- **Manual Lock**: Tap the **Lock** button in the top navigation to instantly secure the app and return to the PIN screen.
- **Stealth Mode**: Toggle between **Onyx** (Dark) and **Pearl** (Glamour Mauve) themes to change the app's visual profile.
- **18+ Photo Vault**: Secure area for intimate content in the Vault Center. Requires extra age verification. Content is blurred by default and requires interaction to reveal.
- **Private Journal**: A strictly private section in the Vault Center for thoughts that are never shared, even with friends.
- **PIN Recovery/Setup**: First-time users are prompted to set a 4-digit PIN stored locally.

## 🍵 Tea (inbox)
- **One stream**: everything friends do toward you — shared crushes (with the crush inline), shared notes, friend requests (Accept/Decline inline), nudges, invites accepted, journal prompts. Unread first, filters for Requests / Shared crushes / Notes, "Show earlier" for read items.
- **Tea = what your friends share with you and requests waiting for you.** Chat is only conversations. Notifications are push alerts about Tea and Chat; there are no in-app pop-ups.
- Sharing has two tabs: Controls (what each friend can see) and History (the log of what you've shared, with viewed status).

## 🗂 The Rolodex (Dashboard)
- **Crush Cards**: View your active prospects. Includes "Nickname", "Attraction Rating" (1-5 Stars), and "Last Interaction" date.
- **New Entry**: Create new profiles with an avatar (upload a photo, pick from the diverse preset gallery, or build a custom cartoon avatar), status (Crush → Plotting → Dating → Exclusive, or Broken Up / Heartbroken / Archived / Friend), and bios.
- **Archive**: Move past crushes to the archive to keep your dashboard clean. Toggle between Active and Archived views on the main dashboard.
- **Vibe Meter**: Visual indicator of the emotional trajectory (1-10) based on entry history.
- **"Spill the Tea" Simulation**: Quick-action button on the dashboard that simulates receiving a private, secret note from a friend.

## 👥 Friends & Sharing
- **Inner Circle**: Manage your friends list. Includes categories like "Close Friends", "Casual", and "Work".
- **One-to-One Sharing**: All sharing is strictly one-to-one. No groups or public profiles.
- **Granular Controls**: Decide which friend can see which crush profile or specific "Tea" (Notes). (Simulated UI).
- **In-App Messaging**: Secure, end-to-end encrypted style chat between friends.
- **Self-Destructing Messages**: Messages containing the word "secret" are automatically flagged for self-destruction/deletion.
- **Crush Tier Limits**: Free keeps up to 3 crushes, Premium 8, Gold unlimited. Friends are never limited.
- **Dashboard tabs**: All = every crush that isn't archived; Dating = status Dating or Exclusive; Not dating = everything else (Crush, Plotting, Broken Up, Heartbroken, Friend). The tabs follow the crush's Status, not its relationship labels.

## 💖 Safety & Moderation
- **Safety Check-In**: High-priority feature for dates. Notifies trusted contacts and tracks status (`Draft` -> `Sent` -> `Safe`).
- **Red Flag Tracking**: Log cautionary flags for any crush profile. If flags exceed a threshold, the UI reflects a "Vibe Shift".
- **AI Moderation**: In-app messaging and content fields are monitored by automated safety checks to prevent abuse.
- **Emergency Mode**: Quick toggle in the profile detail to escalate a safety check.

## 💎 Monetization (Freemium)
- **Subscription Tiers**:
  - **Free**: 3 crushes, basic features.
  - **Premium**: 8 crushes, advanced safety features.
  - **Gold ($15/mo)**: Enhanced vault storage, priority support, and all premium features.
- **Feature Gating**: Limits on crushes and advanced vault sections for the Free tier.

## Friends: one page per friend

- **The friend page** lives at `/friends/<username>` (old `/user/<id>` links redirect there). It shows the
  friend's bio and About details, the crushes they share with you, the crushes you share with them (with
  seen/not-seen and Unshare), your History together, and, last, your **Friendship Profile** card: relationship
  name, type, how you met, trust level and notes. Those notes are private to you and are saved on your
  account (`PUT /api/friends/:id/friendship-profile`), so they follow you between devices. Anything saved in a
  browser before this existed is moved to the server the first time it is seen.
- **Edit** in the header jumps to that card in edit mode; **Chat** opens the conversation. The pause (⏸) and
  remove (🗑) icon buttons on the card manage the friendship.
- **Friend cards** on the Friends page carry four actions: Share (opens the friend page), Chat, pause and
  remove. Paused cards show Resume, Chat and remove plus the mute toggle.
- **Destructive actions always confirm** with a titled dialog whose button says what it does ("Remove",
  "Delete 3") in the outlined red danger style: removing a friend, deleting a vault photo, deleting crush
  photos.
- **Photos can be deleted in bulk**: the Vault photo grid has Select → tick photos (or Select all) →
  Delete selected; a crush's photo gallery has "Select photos", which opens a thumbnail sheet with the same
  controls and calls `POST /api/crushes/:id/photos/delete` with the chosen ids.

## Accessibility (WCAG 2.1 AA)

The whole app is built to the WCAG 2.1 AA bar. The rules the code follows:

- **Dialogs** use `role="dialog" aria-modal="true"` with a labelled title and the shared `appFocusTrap`
  directive (`core/a11y/focus-trap.directive.ts`): focus moves in when a dialog opens, Tab wraps inside
  it, Escape closes it and focus returns to where it was.
- **Every control has a name**: visible `<label for>` on form fields, `aria-label` on icon-only buttons,
  `alt` on images. Rows you can tap are real `<button>`s so they work from the keyboard.
- **State is not colour alone**: tabs and toggles carry `aria-pressed`/`aria-selected`, the selected
  avatar preset shows a check mark, the PIN read-out announces how many digits are entered.
- **Contrast**: `ThemeService` exposes `onBgPrimary`, `onBgAccent`, `danger`, `text` and
  `textSecondary` already nudged to read at 4.5:1 on every surface of the current theme. Use those for
  coloured text (never raw `primary`/`accent`/hard-coded reds), and never fade text with `opacity`.
- **Focus ring**: the global `:focus-visible` ring uses `--focus-ring`, set per theme (dark amber on
  light themes, bright amber on dark ones). No component sets `outline: none`.
- **Structure**: one `h1` per page, route titles ("Friends · Dexii") via `DexiiTitleStrategy`, and a
  skip link that moves focus to `<main>`.
- **Targets**: interactive elements are at least 44px (`--tap-min`), including the walkthrough dots,
  the phone menu toggle and the avatar colour swatches.
- **Check it**: `npm run a11y` runs axe-core (via Playwright) over the main screens at phone and
  desktop widths against a local dev server and demo API, and fails on serious or critical issues.

---
*Note: This is still a prototype. Crushes, entries, friends, and messages can use the backend when MongoDB is available; local state remains a demo/offline fallback. PINs and some settings are stored locally for testing.*
