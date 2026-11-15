import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedComponent } from './feed.component';
import { TeaFeedService } from '../../core/services/tea-feed.service';
import { WebPushService } from '../../core/services/web-push.service';

const ME = '6aa2f82237d736a1196c9e1d';
const SAM = '6aab389c4cdfe3aa2ae76a8d';
const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

/** DEX-68: The Tea opens on a Feed tab, left of All. */
describe('The Tea Feed tab (DEX-68)', () => {
  let shared: unknown[];
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('dexii_api_token', 'token');
    localStorage.setItem('dexii_api_user_id', ME);
    shared = [];
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      const u = String(url);
      if (u.includes('/entries/shared')) return json(shared);
      if (u.endsWith('/friends')) return json([{ id: SAM, username: 'sam', displayName: 'Sam Lee' }]);
      if (u.includes(`/crushes/friend/${SAM}`)) return json([{ _id: 'c1', userId: SAM, nickname: 'Alex', status: 'Dating', visibility: [ME] }]);
      if (u.includes('/unread-count')) return json({ count: 0 });
      return json([]);
    }));
    TestBed.configureTestingModule({
      imports: [FeedComponent],
      providers: [
        provideRouter([]),
        // Push needs a service worker, which tests don't have.
        { provide: WebPushService, useValue: { shouldPrompt: () => false, status: () => 'off', error: () => null, busy: () => false } }
      ]
    });
    // Another visit may have left a different tab picked.
    TestBed.inject(TeaFeedService).filter.set('requests');
  });
  afterEach(() => vi.unstubAllGlobals());

  /** Renders The Tea and waits for its data to load. */
  const render = async () => {
    const fixture = TestBed.createComponent(FeedComponent);
    fixture.detectChanges();
    for (let i = 0; i < 8; i++) { await new Promise((r) => setTimeout(r, 0)); fixture.detectChanges(); }
    return { fixture, root: fixture.nativeElement as HTMLElement };
  };

  it('puts Feed first, left of All, and always opens on it', async () => {
    const { root } = await render();
    const tabs = Array.from(root.querySelectorAll('[role="tab"]')).map((t) => t.textContent?.trim());
    expect(tabs[0]).toBe('Feed');
    expect(tabs[1]).toBe('All');
    expect(root.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim()).toBe('Feed');
  });

  it("shows friends' entries, each type marked differently", async () => {
    shared = [
      { _id: 'e1', id: 'e1', userId: SAM, owner: { id: SAM, username: 'sam', displayName: 'Sam Lee' }, crushId: 'c1', type: 'Update', content: 'We kissed!', timestamp: '2026-11-10T10:00:00Z', visibility: [] },
      { _id: 'e2', id: 'e2', userId: SAM, owner: { id: SAM, username: 'sam', displayName: 'Sam Lee' }, crushId: 'c1', type: 'StatusChange', content: 'Dating', previousStatus: 'Crush', timestamp: '2026-11-12T10:00:00Z', visibility: [] }
    ];
    const { root } = await render();
    const rows = Array.from(root.querySelectorAll('.tea-feed-row'));
    expect(rows.length).toBe(2);
    expect(rows[0].classList).toContain('tea-feed-row--status');
    expect(rows[0].textContent).toContain('Crush → Dating');
    expect(rows[0].textContent).toContain("Sam Lee's crush Alex");
    expect(rows[1].classList).toContain('tea-feed-row--update');
    expect(root.querySelector('.tea-feed-row .ut-reactions, .tea-feed-row .ut-chat')).toBeNull();
  });

  it('explains what will show up when the Feed is empty', async () => {
    const { root } = await render();
    expect(root.querySelector('.feed-empty-state')?.textContent).toContain("they'll show up here");
  });
});
