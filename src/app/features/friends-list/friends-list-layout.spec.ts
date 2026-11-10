import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FriendsListComponent } from './friends-list.component';

const ME = '6aa2f82237d736a1196c9e1d';
const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

describe('The Inner Circle list (DEX-52)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('dexii_api_token', 'token');
    localStorage.setItem('dexii_api_user_id', ME);
    const michelle = {
      id: '6aab389c4cdfe3aa2ae76a8d', username: 'mgrange', firstName: 'Michelle', lastName: 'Grange',
      avatarUrl: 'https://example.com/m.jpg', friendCategories: ['Best Friends'], sharedCrushCount: 3
    };
    vi.stubGlobal('fetch', vi.fn((url: string) => String(url).endsWith('/friends') ? json([michelle]) : json([])));
    TestBed.configureTestingModule({ imports: [FriendsListComponent], providers: [provideRouter([])] });
  });
  afterEach(() => vi.unstubAllGlobals());

  const render = async () => {
    const fixture = TestBed.createComponent(FriendsListComponent);
    fixture.detectChanges();
    for (let i = 0; i < 5; i++) { await new Promise((r) => setTimeout(r, 0)); fixture.detectChanges(); }
    return fixture.nativeElement as HTMLElement;
  };

  it('has the Stash-style title with the Inner Circle description under it (DEX-65)', async () => {
    const root = await render();
    const hero = root.querySelector('.friends-list-hero')!;
    expect(hero.querySelector('h1')!.textContent).toContain('The Inner Circle');
    expect(hero.textContent).toContain('Your closest friends, the ones to share all The Tea with.');
  });

  it('shows only the picture, name, @username and crushes shared on each friend card', async () => {
    const root = await render();
    const card = root.querySelector('.friends-list-card')!;
    expect(card).toBeTruthy();
    expect(card.textContent).toContain('Michelle Grange');
    expect(card.textContent).toContain('@mgrange');
    expect(card.textContent).toContain('3 crushes shared');
    expect(card.textContent).not.toContain('Best Friends');
    expect(card.querySelectorAll('button').length).toBe(0);
    expect(card.querySelector('a[href*="/chat"]')).toBeNull();
  });

  it('opens their profile from the picture or the name', async () => {
    const root = await render();
    // The whole card is one link, so the picture and the name both open the profile.
    const link = root.querySelector('a.friends-list-card')!;
    expect(link.getAttribute('href')).toBe('/friends/mgrange');
    expect(link.querySelector('img')).toBeTruthy();
    expect(link.textContent).toContain('Michelle Grange');
  });
});
