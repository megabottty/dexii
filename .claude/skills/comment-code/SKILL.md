---
name: comment-code
description: Leave plain-English comments on every function touched in the Dexii codebase. Use whenever writing, editing, fixing or refactoring any code in this repo (Angular frontend in src/, Node server in server/), even a one-line change, so Megan can read the code cold and understand what each function does.
---

# Comment the code you touch

Megan wants to be able to open any file and understand what's happening without asking. Whenever you touch code, the functions involved must explain themselves.

## The rule

**Every function you add or edit gets a comment explaining what it does.** This covers:
- new functions, methods, components, services, route handlers and helpers
- existing functions you change, even by one line. If one has no comment, add one. If its comment is now wrong, fix it.
- non-obvious template blocks you add or change in Angular HTML (`<!-- ... -->`)

## What a good comment says

Put it directly above the function, in short plain English:
1. **What it does**, in one sentence from the app's point of view ("Loads the updates a friend can see on this crush").
2. **Why or when**, if that isn't obvious: who calls it, which screen uses it, any rule it enforces.
3. **The ticket**, if one drove the change: `(DEX-71)`.

Inside the function, add a short inline comment before any step that isn't obvious. That means access checks, data shape quirks, timing and debounce, fallbacks for old data, or anything you'd have to explain in a code review.

## Format

- TS/JS: JSDoc `/** ... */` above functions and methods, and `//` for inline steps.
- Angular templates: `<!-- ... -->` above a block whose purpose isn't clear from the markup.
- CSS: a `/* ... */` above any rule set that isn't obvious, such as layout tricks or z-index or positioning hacks.

## Example

```ts
/**
 * Lets a friend react to an update on a crush that was shared with them (DEX-71).
 * Owners can always react. Friends only see updates posted after the crush was shared.
 */
const loadReactableUpdate = async (req, res) => {
  // Treat "not shared with you" like "not found" so we don't leak that the update exists.
  ...
};
```

## Don't

- Restate the code line by line (`// increment i`).
- Use jargon-only comments ("handles the thing", "util fn").
- Leave stale comments that describe old behaviour.
- Mention file names or class names when a screen name says it better ("the Tea page", "the crush profile").

## Before you commit

Scan your diff (`git diff`). Every function you added or changed should have an accurate comment above it. Add any that are missing before committing.
