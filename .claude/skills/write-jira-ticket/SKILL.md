---
name: write-jira-ticket
description: Write or create Dexii Jira tickets (DEX project) in the team's standard structure of User story, Context and Acceptance criteria. Use whenever drafting, creating or rewriting DEX tickets, including turning meeting notes, feedback or bug reports into tickets.
---

# Writing DEX tickets

Every DEX ticket description has exactly three sections, in this order. The model ticket is DEX-46.

## The structure

```markdown
**User story**
As a <kind of Dexii user>, I want <what they want to do or see>, so that <why it matters to them>.

**Context**
<Where this came from, e.g. "From the 27 Oct review meeting." or "Reported by Arianne in QA.">
<The problem today, in plain words: what the user sees and why it is confusing or missing.>
<What was agreed or decided, including anything explicitly kept as is.>
Where it lives today: <screen and section, in the words a tester would use, e.g. "crush form, Relationship Status section">.
Depends on: DEX-n (<short name>). Related: DEX-n (<short name>). Omit either line when there is none.

**Acceptance criteria**
- <One testable outcome per bullet, phrased as what QA will see.>
- <Cover the main behaviour, edge cases, and what must NOT change.>
- <If a decision is still open, the first bullet says to decide it and record it in the ticket before building.>
```

## Rules

- **User story** is one sentence. The user is a Dexii user ("someone tracking their crushes", "a user sharing with friends"), never "the developer" or "the system".
- **Context** is short prose, not a design doc. Name screens the way they appear in the app (the Stash, New Crush form, crush profile, Vault, Settings), not file names or code.
- **Acceptance criteria** are bullets Arianne can check one by one on the live site. Avoid vague words like "better" or "cleaner"; say what is visible.
- Refer to other tickets by their real key (DEX-44), never "the Vault ticket". When creating several linked tickets, create them in dependency order so the keys exist, then edit any description that still has a placeholder.
- When rewriting an existing ticket, keep any open question to Arianne (or anyone) word for word inside Context, with its @mention live. A ticket with an @mention must be written with `contentFormat: html` and the mention as `<span data-type="mention" data-user-id="ACCOUNT_ID">@Name</span>`; markdown drops mentions. Arianne's accountId is `712020:647b00af-5e33-445f-8787-1805a0bc6e54`.
- Rewrites never touch attachments; screenshots stay on the ticket.
- Summary (title) is short and imperative: "Separate relationship Status from custom whisper labels".

## Example (DEX-46 in this structure)

```markdown
**User story**
As someone tracking a crush, I want their main relationship status to look different from my playful custom labels, so that I can tell at a glance where things actually stand.

**Context**
From the 27 Oct review meeting. The main status (Crush, Dating, Exclusive, and so on) and the custom secondary labels are shown together and look the same, so it is confusing which is which. Agreed: keep custom labels, since they let people express how they feel, but separate them from the status in wording and visuals. Working name for the secondary ones: "whisper statuses".
Where it lives today: crush form, Relationship Status section.

**Acceptance criteria**
- Decide the naming (e.g. "Status" vs "Whisper status" or "tags") and record it in this ticket before building.
- Status and custom labels have clearly different visual treatments on the crush form, the crush profile and the Stash card.
- The main status stays a single choice. Custom labels stay optional and multiple.
```

## Creating tickets in Jira

- Site `dexii.atlassian.net`, project `DEX`, tool `createJiraIssue` with `contentFormat` markdown.
- Before creating, search open DEX tickets (`searchJiraIssuesUsingJql`) for duplicates. If one exists, add a comment with the new detail instead of creating a second ticket.
- Issue type: Story for features and changes, Bug for something broken.
- Parent epic when one fits: DEX-29 Crush Creation Page, DEX-9 Crush profile page, DEX-8 Crushes landing page (the Stash), DEX-2 Friends page, DEX-10 Login Page.
- Assignee: Megan (`5d0bb9f411233f0c4ca0a0a0`) unless told otherwise. Leave status at To Do.
- Show the drafted tickets to the user before creating them when the request is a batch (for example from meeting notes), unless they already said to go ahead.
- After creating, report each key with its title and link.
