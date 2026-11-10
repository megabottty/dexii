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

- **The Tea on a crush:** updates you post about this crush. Update types are Note, Update, Status change, Date, Red flag, Safety check and Private journal. Friends you share with can react and comment.
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
- **Friendship profile:** your private notes on the friendship, such as relationship type (Close Friend, Bestie, Work Friend, Family Friend, New Friend) and trust level.
- **Pause:** a paused friend moves to the Paused tab and stops seeing your shared crushes until you resume. Delete removes the friendship.

## Sharing crushes with friends

A crush is shared friend by friend: only friends on its share list can see it, its updates and its shared photos.

- **Where to share:** the + on a friend's profile, Share with a Friend on a crush profile, or the Sharing Controls page.
- **Sharing Controls:** two tabs. Controls shows what you're sharing and with whom, and lets you share or unshare. History shows past shares.
- **Who sees what:** a friend on the share list sees the crush on your friend profile, its updates in The Tea, and photos set to "shared". Photos set to "friends" are visible to all your friends.

> **Important:** friends never see archived crushes, and a paused friend sees nothing from you. A pause leaves no trace for the person paused.
- **Unsharing:** takes the friend off the share list straight away.

## The Tea

The Tea is the feed of what's happening in your Inner Circle. The same name is used for the updates list on a crush or friend profile (DEX-44).

- **Filter tabs:** All, Requests, Shared crushes and Updates, each with a count when there's something new.
- **What shows:** friend requests, crushes newly shared with you, and updates friends post on crushes they share with you. Archived crushes and paused friends don't appear.
- **Reacting:** react to an update, comment on it, edit or delete your own comment, and heart a comment.

## Chat

Chat is one-to-one messaging with friends, plus group chats.

- **Starting a chat:** the Chat button on a friend's profile, or the Chat page's conversation list.
- **Messages:** send, edit, delete and react. Messages are marked read when opened. New messages can send a notification (a Settings choice).
- **Groups:** create a group, add members, and leave it. Each group has its own read state.
- **Moderation:** messages pass through a moderation check before they're saved.

## The Vault

The Vault is your private space. Nothing in it is shared.

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
