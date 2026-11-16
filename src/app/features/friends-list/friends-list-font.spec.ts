import { beforeAll, describe, expect, it } from 'vitest';

// Tests run in Node, so the stylesheets can be read straight off disk. Loaded at runtime because
// the app's TypeScript setup has no Node types.
const FS_MODULE = 'node:fs';
let readFileSync: (path: string, encoding: 'utf8') => string;

/** DEX-52: on phones, the Inner Circle uses the same sans-serif font as The Stash. */
describe('Inner Circle font (DEX-52)', () => {
  let css = '';
  beforeAll(async () => {
    ({ readFileSync } = await import(/* @vite-ignore */ FS_MODULE));
    css = readFileSync('src/styles.css', 'utf8');
  });
  /** The selector list of the phone-width rule that switches pages to the system sans-serif. */
  const sansRule = () => {
    const at = css.indexOf('font-family: -apple-system, BlinkMacSystemFont');
    const ruleStart = css.lastIndexOf('}', at);
    return css.slice(ruleStart, at);
  };

  it('puts the Inner Circle in the same sans-serif rule as The Stash', () => {
    expect(sansRule()).toContain('.dashboard-component__s1');
    expect(sansRule()).toContain('.friends-list-component__s1');
  });

  it('has no Times New Roman left on the Inner Circle', () => {
    const page = readFileSync('src/app/features/friends-list/friends-list.component.css', 'utf8');
    expect(page.match(/Times New Roman/g)?.length ?? 0).toBe(1); // only the desktop page root, as on The Stash
  });
});
