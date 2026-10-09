#!/usr/bin/env node
/**
 * Runs axe-core against the main screens (signed in through the demo server
 * with mocked data) at phone and desktop widths. Fails on serious/critical
 * issues. Usage: start the demo API on :5001 and `ng serve` on :4200, then
 *   npm run a11y
 */
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const BASE = process.env.A11Y_BASE || 'http://localhost:4200';
const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
const friends = [{ id: 'f1', username: 'sam', firstName: 'Sam', lastName: 'Lee' }, { id: 'f2', username: 'bea' }];
const crushes = [
  { _id: 'c1', userId: 'avatartester', nickname: 'Sunny', status: 'Dating', visibility: ['f1'], viewedBy: [], vibeHistory: [3], rating: 3, relationshipLabels: ['Just flirting'], redFlags: 1, photoCount: 0 },
  { _id: 'c2', userId: 'avatartester', nickname: 'Moon', status: 'Crush', visibility: [], viewedBy: [], vibeHistory: [4], rating: 4, photoCount: 0 }
];
const notifs = [{ id: 'n1', recipient: 'avatartester', actor: { id: 'f1', username: 'sam' }, type: 'friend_request_received', payload: { friendRequestId: 'r9' }, read: false, createdAt: new Date().toISOString() }];

const only = (process.env.A11Y_PAGES || '').split(',').filter(Boolean);
const allPages = [
  ['login', '/login', false], ['signup', '/signup-profile', false],
  ['dashboard', '/dashboard', true], ['feed', '/feed', true], ['friends', '/friends', true], ['friends-find', '/friends?tab=find', true],
  ['friends-sent', '/friends?tab=sent', true], ['friend-profile', '/friends/sam', true], ['user', '/user/f1', true],
  ['chat-hub', '/chat', true], ['chat', '/chat?friendId=f1&friendName=sam', true], ['sharing', '/sharing', true],
  ['sharing-history', '/sharing?tab=history', true], ['settings', '/settings', true], ['vault', '/vault', true], ['profile', '/profile/c1', true]
];

const pages = only.length ? allPages.filter(([name]) => only.includes(name)) : allPages;
const browser = await chromium.launch();
let worst = 0; const report = [];
for (const [width, label] of [[390, 'phone'], [1200, 'desktop']]) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  await page.route('**/api/**', (route) => {
    const u = new URL(route.request().url()); const p = u.pathname; const m = route.request().method();
    if (p === '/api/friends' && m === 'GET') return json(route, friends);
    if (p === '/api/friends/requests' && m === 'GET') return json(route, [{ id: 'r9', from: { id: 'f9', username: 'zed' }, to: { id: 'avatartester' }, status: 'pending', createdAt: new Date().toISOString() }]);
    if (p === '/api/friends/requests/sent') return json(route, []);
    if (p === '/api/friends/profile/f1') return json(route, { ...friends[0], profileSettings: {}, isFriend: true });
    if (p === '/api/crushes' && m === 'GET') return json(route, crushes);
    if (p === '/api/crushes/friend/f1' || p === '/api/entries/shared' || p === '/api/messages/conversations' || p === '/api/crushes/c1/photos') return json(route, []);
    if (p === '/api/messages/f1') return json(route, [{ _id: 'm1', sender: 'f1', recipient: 'avatartester', content: 'hey', createdAt: new Date().toISOString() }]);
    if (p === '/api/activity' || p === '/api/friends/f1/activity') return json(route, { events: [], nextBefore: null });
    if (p === '/api/notifications/unread-count') return json(route, { count: 1 });
    if (p === '/api/notifications' && m === 'GET') return json(route, notifs);
    if (p.startsWith('/api/notifications') || p.startsWith('/api/entries')) return json(route, m === 'GET' ? [] : { ok: true });
    return route.continue();
  });
  let signedIn = false;
  for (const [name, path, needsAuth] of pages) {
    if (needsAuth && !signedIn) {
      await page.goto(`${BASE}/login`);
      await page.getByPlaceholder('Enter your username or email').fill('avatartester');
      await page.getByPlaceholder('Your account password').fill('Password123!');
      await page.getByRole('button', { name: /log ?in|sign in/i }).first().click();
      await page.waitForURL(/\/(lock|dashboard)/, { timeout: 20000 });
      if (page.url().includes('/lock')) { for (const d of ['1','2','3','4']) await page.getByRole('button', { name: d, exact: true }).click(); await page.waitForURL(/\/dashboard/); }
      signedIn = true;
    }
    if (needsAuth) { await page.evaluate((p) => { history.pushState({}, '', p); window.dispatchEvent(new PopStateEvent('popstate')); }, path); }
    else await page.goto(`${BASE}${path}`);
    await page.waitForTimeout(1500);
    await page.evaluate(() => document.querySelectorAll('app-walkthrough').forEach((e) => e.remove()));
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    const minor = results.violations.length - bad.length;
    worst = Math.max(worst, bad.length);
    console.log(`${label} ${name}: ${bad.length} serious/critical, ${minor} other`);
    for (const v of results.violations) {
      report.push(`${label} ${name} [${v.impact}] ${v.id}: ${v.help} — ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
      if (process.env.A11Y_VERBOSE) for (const n of v.nodes.slice(0, 3)) report.push(`    ${n.html.slice(0, 160)}\n    ${(n.any[0] || n.all[0] || {}).message || ''}`);
    }
  }
  await context.close();
}
await browser.close();
console.log('\n' + report.join('\n'));
process.exit(worst > 0 ? 1 : 0);
