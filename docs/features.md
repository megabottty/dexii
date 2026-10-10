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

## 🗂 The Stash (Dashboard)

- **Stack view (default)**: crushes sit in a deck; swipe the front card left or right (or use Prev / Next, the
  arrow keys) to send it to the back and bring up the next one; tap a card to open it. **Grid** is one tap away
  via the Stack / Grid switch, remembered per device. `STACK_VIEW_ENABLED` in
  `src/app/core/config/dashboard-view.ts` turns the deck off (grid only) if it doesn't stick.
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

- **The friend page** lives at `/friends/<username>` (old `/user/<id>` links redirect there). Top to bottom:
  the friend's name/bio card with **Edit**, **+ Share crush** and **Chat**; their About details; the crushes
  they share with you; the crushes you share with them — each with seen/not-seen, Unshare, and an About-style
  detail grid (your dating status with that crush, their relationship status, labels, age, location,
  occupation); **History**, last; and your **Friendship Profile** card: relationship name, type, how you met,
  trust level and notes. Those notes are private to you and are saved on your account
  (`PUT /api/friends/:id/friendship-profile`), so they follow you between devices. Anything saved in a
  browser before this existed is moved to the server the first time it is seen.
- **Edit** in the header jumps to the Friendship Profile card in edit mode; **+ Share crush** opens a picker
  to choose any number of your crushes for this friend to see; **Chat** opens the conversation. The pause (⏸)
  and remove (🗑) icon buttons on the Friendship Profile card manage the friendship.
- **Friend cards** on the Friends page carry five actions: Profile (opens the friend page), Share (opens the
  same crush picker in place, without leaving the list), Chat, pause and remove. Paused cards show the same
  set plus Resume and the mute toggle.
- **Crush page**: one Share button opens a picker of your friends to share that crush with. **View as
  Friend** switches to a read-only preview — what any friend you've shared this crush with sees: public/
  shared notes, shared photos, no edit/share/archive controls — with an **Exit preview** to return.
- **Destructive actions always confirm** with a titled dialog whose button says what it does ("Remove",
  "Delete 3") in the outlined red danger style: removing a friend, deleting a vault photo, deleting crush
  photos.
- **Photos can be deleted in bulk**: the Vault photo grid has Select → tick photos (or Select all) →
  Delete selected; a crush's photo gallery has "Select photos", which opens a thumbnail sheet with the same
  controls and calls `POST /api/crushes/:id/photos/delete` with the chosen ids.

## Compatibility Check

- **Your read**: when adding or editing a crush, slide the 0–100 meter (🧊 Not feeling it → 🤔 Hmm, maybe →
  ✨ There's something → 💫 Really clicking → 🔥 Soulmate energy), tap the chips that explain it ("Shared values",
  "Makes me laugh", …), write it in your own words, and note anything giving you pause. Saved as
  `compatibility` on the crush; every change of score or note is appended to `compatibilityHistory` (owner only).
- **Friends' read**: friends you've shared the crush with get a "Weigh in" slider on their view
  (`PUT/DELETE /api/crushes/:id/compatibility/vote`). The owner sees the average, each friend's score and note,
  and a one-liner comparing the two reads. A vote logs `compatibility_voted` in History and lands in Tea.
- Shown as a card under the crush header and as a 💞 chip on the dashboard card. Helpers live in
  `core/utils/compatibility.ts`.
- **Weekly check-in**: when your read is 7+ days old the crush page asks "Still 72% Really clicking with Sunny?"
  with a slider; "Same as before" snoozes it for a week (`compat_checked_<id>` on the device), "Update my read"
  saves and adds a history point.
- **The reveal**: the first time you open a crush after a friend weighs in, their read pops up with a count-up
  score, their note and how it compares to yours (one card per new vote; seen votes are remembered per device).

## Plans are parked (public testing)

`TIER_GATING_ENABLED` in `src/app/core/config/premium-features.ts` (and the `TIER_GATING_ENABLED` env var on the
server) is off: everyone gets every feature and unlimited crushes, and the Crush Plan card, Settings plan
section and upgrade prompts are hidden. Super-admin tools stay admin-only. Flip the flag to `true` (and set the
env var) to bring Free / Premium / Gold back.

## Photos as the profile picture

A crush's profile-picture spot is the photo carousel: the picture is slide one and the other photos follow,
for the owner and for friends (who only see photos whose audience allows them). Owners manage photos right
there: add several at once, set any photo as the picture, choose who sees each one, reorder, remove, or
select several to delete. Archived crushes never appear in share pickers.

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
