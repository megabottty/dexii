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

  it('looks like a Stash card: photo across the top with the name on it, details below', async () => {
    const root = await render();
    const card = root.querySelector('a.friends-list-card')!;
    expect(card).toBeTruthy();
    const media = card.querySelector('.friends-list-card__media')!;
    expect(media.querySelector('img')!.getAttribute('src')).toBe('https://example.com/m.jpg');
    expect(media.querySelector('.friends-list-card__name')!.textContent).toContain('Michelle Grange');
    const body = card.querySelector('.friends-list-card__body')!;
    expect(body.textContent).toContain('@mgrange');
    expect(body.textContent).toContain('3 crushes shared with you');
    expect(card.textContent).not.toContain('Best Friends');
    expect(card.querySelectorAll('button').length).toBe(0);
  });

  it('opens their profile from anywhere on the card', async () => {
    const root = await render();
    const link = root.querySelector('a.friends-list-card')!;
    expect(link.getAttribute('href')).toBe('/friends/mgrange');
    expect(root.querySelectorAll('.friends-list-card a').length).toBe(0);
  });
});
