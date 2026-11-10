import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserProfileComponent } from './user-profile.component';

const ME = '6aa2f82237d736a1196c9e1d';
const MICHELLE = '6aab389c4cdfe3aa2ae76a8d';
const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

describe("A friend's profile page (DEX-72)", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('dexii_api_token', 'token');
    localStorage.setItem('dexii_api_user_id', ME);
    const michelle = {
      id: MICHELLE, username: 'mgrange', firstName: 'Michelle', lastName: 'Grange', avatarUrl: 'https://example.com/m.jpg',
      friendCategories: ['Best Friends'], friendshipProfile: {}
    };
    const alex = { _id: '6ab000000000000000000001', userId: MICHELLE, nickname: 'Alex', status: 'Dating', visibility: [ME], avatarUrl: 'https://example.com/a.jpg' };
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      const u = String(url);
      if (u.endsWith('/friends')) return json([michelle]);
      if (u.includes('/crushes/friend/')) return json([alex]);
      if (u.includes('/friends/profile/')) return json({});
      return json([]);
    }));
    TestBed.configureTestingModule({
      imports: [UserProfileComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'mgrange' })), queryParamMap: of(convertToParamMap({})) } }
      ]
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  const render = async () => {
    const fixture = TestBed.createComponent(UserProfileComponent);
    fixture.detectChanges();
    for (let i = 0; i < 5; i++) { await new Promise((r) => setTimeout(r, 0)); fixture.detectChanges(); }
    return { fixture, root: fixture.nativeElement as HTMLElement };
  };
  const follows = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

  it('shows a large picture with a + that shares a crush with them, and no pencil', async () => {
    const { fixture, root } = await render();
    const hero = root.querySelector('.up-hero__photo')!;
    expect(hero).toBeTruthy();
    const plus = root.querySelector<HTMLButtonElement>('.up-hero__share')!;
    expect(plus.getAttribute('aria-label')).toBe('Share a crush with Michelle Grange');
    expect(root.querySelector('.up-hero app-icon[name="pencil"]')).toBeNull();
    plus.click();
    fixture.detectChanges();
    expect(root.querySelector('app-crush-share-picker')).toBeTruthy();
  });

  it('shows their real name with @username beside it, and the friendship status', async () => {
    const { root } = await render();
    expect(root.querySelector('.up-hero h1')!.textContent).toContain('Michelle Grange');
    expect(root.querySelector('.up-hero__name-row')!.textContent).toContain('@mgrange');
    expect(root.querySelector('.up-hero__status')!.textContent).toContain('Best Friends');
  });

  it('keeps Chat, Pause and Delete under the name', async () => {
    const { root } = await render();
    const actions = root.querySelector('.up-hero__actions')!;
    expect(actions.querySelector('a[href*="/chat"]')).toBeTruthy();
    expect(actions.querySelector('[aria-label="Pause friendship with Michelle Grange"]')).toBeTruthy();
    expect(actions.querySelector('[aria-label="Remove Michelle Grange as a friend"]')).toBeTruthy();
  });

  it("lists their crushes right under the header, before About and the rest", async () => {
    const { root } = await render();
    const crushes = root.querySelector('#friend-crushes')!;
    expect(crushes.textContent).toContain("Michelle Grange's Crushes");
    expect(crushes.querySelector('a[href="/profile/6ab000000000000000000001"] img')).toBeTruthy();
    expect(follows(root.querySelector('.up-hero')!, crushes)).toBe(true);
    expect(follows(crushes, root.querySelector('#friendship-profile')!)).toBe(true);
  });
});
