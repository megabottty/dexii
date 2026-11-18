# Dexii: How Our Features Work

_Last updated 10 Nov 2026. When a ticket changes how a feature works, update its section here._

## Overview

Dexii (www.dexii.net) is an app for keeping track of your crushes and sharing them with a small circle of close friends. It runs in the browser and as a phone app, from one codebase.

The main areas, by the names people see in the app:

| Area | Where | What it's for |
| --- | --- | --- |
| The Stash | Home (dashboard) | Your crushes, as cards |
| Crush profile | Tap a crush | Everything about one crush, plus your updates on them |
| The Inner Circle | Friends | Your friends, requests, and each friend's profile |
| Sharing | Sharing controls | Which friends can see which crushes |
| The Tea | Feed | Updates from your friends about crushes they share with you |
| Chat | Chat, group chats | Messages with friends |
| The Vault | Vault | Private notes and journal |
| Settings | Settings | Your profile, photo, privacy, notifications and theme |

Each section below says what the feature does and the rules behind it.

## The Stash

The Stash is the home screen: one card per crush, with their photo across the top half and their name over it.

- **Adding a crush:** the New Crush form takes a nickname or full name (you pick which shows), photos, a status and details. A crush is private to you until you share it.
- **Statuses:** Undefined, Getting Acquainted, Friends, Friends With Benefits, Crush, Dating, Lovers, Exclusive, Engaged, Broken Up, and Archived.
- **Filter tabs:** All, Dating and Not dating, each with a count. They use the shared underline tab style (DEX-69).
- **Archiving:** archiving sets the status to Archived and takes the crush off the Stash. View Archive sits below the grid with the archived count, and opens the archived crushes underneath.

> **Important:** archiving hides a crush from friends. It keeps its share list, but friends can no longer see it, its updates or its photos (DEX-61). Un-archiving makes it visible to them again.

## Crush profiles

Tapping a crush opens their profile, with The Tea (your updates on them) at the top.

- **The Tea on a crush:** updates you post about this crush, plus an automatic entry whenever you change its status or its Feels (DEX-68). Update types are Note, Update, Status change, Date, Red flag, Safety check and Private journal. Friends you share with can react with an emoji. There are no comments: friends tap the chat icon (the same one as Chat in the top menu) to reply in your one-to-one chat, with the update quoted (DEX-71). Old comments are hidden but kept.
- **Heart rail slider (DEX-63):** a rail runs beside the updates and stays on screen while you scroll. On a long timeline the top-menu heart sits on it, showing how far through you are. Drag it or tap the rail to jump to older updates (the day shows while dragging), or focus it and use the arrow keys to move a day at a time.
- **Sharing an update:** after posting, Dexii can ask whether to share the update with more friends.
- **Compatibility:** your 0 to 100 read on the match, why, and anything giving you pause, with a history of changes. Friends the crush is shared with can weigh in with their own vote.
- **Details:** Info, Memorable moments, Red flag entries, Vibe tracker and Social connections. Edit Details changes them.
- **Photos:** up to 20 per crush, reorderable. Each photo can be seen by everyone the crush is shared with, or by all your friends.
- **Safety check-in:** share your date plan with trusted friends, get a check-in partway through, and an urgent button. A Premium feature, open to everyone while plans are switched off.

## The Inner Circle

The Inner Circle lists your friends as cards in the same style as the Stash (DEX-52).

> **Important:** friend cards have no buttons. Every action on a friend (Chat, share, Pause, Delete) lives on their profile.

- **Friend cards:** the photo across the top half with the name over it, then @username and "N crushes shared with you". Archived crushes aren't counted. No photo shows their initial.
- **Tabs:** Add Friend, Incoming, Pending Sent and Paused.
- **Requests:** search by name or username and send a request. The other person accepts or declines. Sent requests can be nudged or cancelled.
- **Invites:** invite someone not on Dexii by email, SMS, WhatsApp, copied message or the phone's share sheet.
- **Friend profile:** a full-width photo with the name and @username over it, a friendship chip (e.g. Best Friends), "N crushes shared with you · N you've shared", their bio, then Chat, + (share a crush), Pause and Delete (DEX-72). Below: their crushes, About, Crushes You've Shared, Friendship Profile and History.
- **Crushes You've Shared:** each card shows the crush's Relationship Status (the main status) and The Feels, with no separate "Your status" line (DEX-73).
- **Friendship profile:** your private notes on the friendship, such as relationship type (Close Friend, Bestie, Work Friend, Family Friend, New Friend) and trust level.
- **Pause:** a paused friend moves to the Paused tab and stops seeing your shared crushes until you resume. Delete removes the friendship.

## Sharing crushes with friends

A crush is shared friend by friend: only friends on its share list can see it, its updates and its shared photos.

- **Where to share:** the + on a friend's profile, Share with a Friend on a crush profile, + Add Crush in a chat (tap a crush's card to share or unshare it; a small chip under the name shows "+ Share" or "✓ Shared"), or the Sharing Controls page.
- **Sharing Controls:** two tabs. Controls shows what you're sharing and with whom, and lets you share or unshare. History shows past shares.
- **Who sees what:** a friend on the share list sees the crush on your friend profile, its updates in The Tea, and photos set to "shared". Photos set to "friends" are visible to all your friends.

> **Important:** friends never see archived crushes, and a paused friend sees nothing from you. A pause leaves no trace for the person paused.
- **Unsharing:** takes the friend off the share list straight away.

## The Tea

The Tea is the feed of what's happening in your Inner Circle. The same name is used for the updates list on a crush or friend profile (DEX-44).

- **Feed (DEX-68):** the first tab, and The Tea always opens on it. One newest-first list of every update, status change ("Crush → Dating") and Feels change friends make on crushes they share with you, from the moment each was shared. Each row shows the friend, the crush, the date and time, and an icon and colour stripe for its kind (📝 update, 💞 status, 💭 Feels). Tapping a row opens the crush at that update. No reactions or chat in the Feed itself, and your own changes don't appear in it. Rows read like Sam's crush "Alex". Rows that are new since your last visit are bold with a dot, a "You're all caught up" line sits above the ones you'd seen, and the Feed tab shows how many are new. Your last visit is saved on your account, so it matches on phone and computer (DEX-45).
- **Filter tabs:** Feed, All, Requests, Shared crushes and Updates, with a count on the last three when there's something new.
- **What shows:** friend requests, crushes newly shared with you, and updates friends post on crushes they share with you. Archived crushes and paused friends don't appear.
- **Reacting:** react to a friend's update with an emoji, or tap the chat icon to reply to them privately in chat with the update quoted (DEX-71).

## Chat

Chat is one-to-one messaging with friends, plus group chats.

- **Starting a chat:** the Chat button on a friend's profile, or the Chat page's conversation list.
- **Messages:** send, edit, delete and react. A reply sent from the chat icon on a crush update shows a short quote of that update (crush name and first ~100 characters) above the message, for both people (DEX-71). Messages are marked read when opened. New messages can send a notification (a Settings choice).
- **Typing box:** starts two lines tall and grows to about six as you type, then scrolls. On a computer, Enter sends and Shift+Enter adds a new line. On a phone, Enter adds a new line and the Send button sends. Group chats work the same way.
- **Groups:** create a group, add members, and leave it. Each group has its own read state.
- **Moderation:** messages pass through a moderation check before they're saved.

## The Vault

The Vault is your private space. Nothing in it is shared.

- **PIN:** the Vault asks for your app PIN (the same 4 digits that unlock Dexii) every time you open it. Leaving the Vault locks it again. The same wrong-guess limits apply as on the lock screen.

- **Journal:** write private journal entries. Settings sets how often Dexii prompts you to journal.
- **Photo Vault:** an 18+ area for private photos. It needs age verification first. Photos can be selected and deleted in bulk.
- **Plan:** the Photo Vault is a Premium feature, but it's open to everyone while plans are switched off.

## Settings

Settings is where you edit your own profile and preferences. Most fields save with Save Changes; your photo and theme save as soon as you pick them.

- **Top of the page:** your photo full width with your name and @username over it, in the same style as a friend's profile. The camera button on the photo opens the photo picker (upload a photo or build an avatar).
- **Profile:** display name, bio, relationship status, what you're looking for, love language and ideal date. Email is shown but can't be changed.
- **Profile visibility:** Public, Friends only, Selected friends (pick who) or Private.
- **Theme:** collapsed to your current theme. Tap it to see every theme and Custom (pick your own three colours). Your theme follows you to other devices.
- **Notifications:** chat messages, friend requests and activity on your updates, each on or off. Also the journal prompt frequency.
- **Get the App:** install Dexii on the device for a full-screen app with a home screen icon.
- **Reset Defaults:** puts the settings back to the starting values.

## Themes beta pricing test

Themes are free for everyone during beta, and we ask each person once whether they'd pay $1.99 for a theme (DEX-66). The goal is to learn whether themes are worth charging for before putting up a paywall.

**How it works for the user**

1. In Settings, the theme row shows an unlocked padlock and a "Gold · Free during beta" tag.
2. The first time they pick a theme other than their current one, a pop-up asks "Would you pay $1.99 for this theme?" with Yes, Maybe and No.
3. The theme changes whatever they answer, or if they close the pop-up.
4. They're never asked again. The answer is saved on their account, so another device won't ask either. Closing without answering stops it asking on that device only.

**What's saved:** only the first answer, with the theme they picked, the price asked and the time. A later answer never overwrites it.

**Reading the results**

Ask Claude to "run the theme tally" in any session, or run it yourself from the project folder:

```bash
cd server && node scripts/theme-interest.js
```

It needs Node 22 and the database login in `server/.env`. It only reads, never writes. It prints:

- how many users there are, and how many use a theme other than the default
- how many answered, with Yes, Maybe and No counts and percentages
- for each theme picked when asked, how many said Yes, Maybe and No

> **Important:** answers are real data from the live database, including any given while testing locally. Only each person's first answer counts.

## Plans and paid features

Plans are switched off during user testing: everyone gets every feature and unlimited crushes, and the plan screens are hidden.

> **Important:** one switch in the code (`TIER_GATING_ENABLED`) turns the Free, Premium and Gold plans back on for everyone at once.

| Feature | Plan when switched on | During beta |
| --- | --- | --- |
| Active crushes | Free 3, Premium 8, Gold unlimited | Unlimited |
| Safety check-in | Premium | Open to everyone |
| Photo Vault (18+) | Premium | Open to everyone |
| Custom avatar builder | Premium | Open to everyone |
| More themes | Gold | Open to everyone, with the $1.99 question |
| Manage super admins | Super admins only | Super admins only |

## Team scripts and operations

Everything pushed to `main` goes live on www.dexii.net automatically, through Render, a few minutes later.

> **Important:** the local API uses the live database. Anything done on localhost (a new crush, a theme answer) is real data. Scripts that change data are run on purpose after a deploy, never automatically when the server starts.

- **Ticket flow:** when a DEX ticket is shipped it goes to Ready for QA, assigned to Arianne, with a comment on what changed and how to test. Arianne moves it on after testing.
- **Tests:** `cd server && npm test` for the API, and `ng test` for the app. Both need Node 22.

**Scripts we run**

| Script | Run from | What it does | Changes data? |
| --- | --- | --- | --- |
| `node scripts/theme-interest.js` | `server/` | Tallies the $1.99 theme question (see Themes beta pricing test) | No, read only |
| `npm run activity:backfill` | `server/` | Fills in past friend activity for the activity history | Yes |
| `npm run migrate:demo-to-mongo` | `server/` | Copies the old demo storage into the database | Yes |
