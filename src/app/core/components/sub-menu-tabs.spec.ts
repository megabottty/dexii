import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SwPush, SwUpdate } from '@angular/service-worker';
import { EMPTY } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AvatarBuilderComponent } from './avatar-builder/avatar-builder.component';
import { DashboardComponent } from '../../features/dashboard/dashboard.component';
import { FeedComponent } from '../../features/feed/feed.component';
import { FriendsListComponent } from '../../features/friends-list/friends-list.component';
import { SharingComponent } from '../../features/sharing/sharing.component';

// DEX-69: every sub-menu uses one plain tab style (text with an underline), never an oval bubble.
describe('Sub-menu tabs (DEX-69)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('dexii_api_token', 'token');
    localStorage.setItem('dexii_api_user_id', '6aa2f82237d736a1196c9e1d');
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } }))));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SwPush, useValue: { isEnabled: false, messages: EMPTY, notificationClicks: EMPTY, subscription: EMPTY } },
        { provide: SwUpdate, useValue: { isEnabled: false, versionUpdates: EMPTY, unrecoverable: EMPTY } }
      ]
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  const pages: Array<[string, Type<unknown>, number]> = [
    ['Sharing Controls / History', SharingComponent, 2],
    ['The Tea', FeedComponent, 4],
    ['Inner Circle', FriendsListComponent, 5],
    ['The Stash filter', DashboardComponent, 3],
    ['Avatar builder', AvatarBuilderComponent, 2]
  ];

  for (const [name, component, minTabs] of pages) {
    it(`${name} uses the shared tab style with one tab marked as selected`, async () => {
      const fixture = TestBed.createComponent(component);
      fixture.detectChanges();
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      const bar = root.querySelector('.dx-tabs');
      expect(bar, 'no .dx-tabs bar').toBeTruthy();
      const tabs = Array.from(bar!.querySelectorAll<HTMLElement>('.dx-tab'));
      expect(tabs.length).toBeGreaterThanOrEqual(minTabs);
      for (const tab of tabs) {
        expect(tab.style.backgroundColor, 'tab still paints a bubble background').toBe('');
        expect(tab.style.border, 'tab still draws a bubble border').toBe('');
      }
      const selected = tabs.filter((t) => t.getAttribute('aria-selected') === 'true' || t.getAttribute('aria-pressed') === 'true');
      expect(selected.length).toBe(1);
    });
  }
});
