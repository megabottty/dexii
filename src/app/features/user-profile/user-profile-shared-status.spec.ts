import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserProfileComponent } from './user-profile.component';
import { DataService } from '../../core/services/data.service';

const ME = '6aa2f82237d736a1196c9e1d';
const MICHELLE = '6aab389c4cdfe3aa2ae76a8d';
const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

/** DEX-73: the "Crushes You've Shared" card shows one status and The Feels, with no duplicate field. */
describe("Crushes You've Shared on a friend's page (DEX-73)", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('dexii_api_token', 'token');
    localStorage.setItem('dexii_api_user_id', ME);
    const michelle = {
      id: MICHELLE, username: 'mgrange', firstName: 'Michelle', lastName: 'Grange',
      friendCategories: ['Best Friends'], friendshipProfile: {}
    };
    // My crush Geoff, shared with Michelle. relationshipStatus is always the first Feel.
    const geoff = {
      _id: '6ab000000000000000000009', userId: ME, nickname: 'Geoff', status: 'Dating', visibility: [MICHELLE],
      relationshipStatus: 'Situationship', relationshipLabels: ['Situationship', 'Slow burn']
    };
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      const u = String(url);
      if (u.endsWith('/friends')) return json([michelle]);
      if (u.endsWith('/crushes')) return json([geoff]);
      if (u.includes('/crushes/friend/')) return json([]);
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

  /** Renders the page after the crush list has loaded and returns the shared-crush card's details. */
  const renderDetails = async () => {
    await TestBed.inject(DataService).refreshCrushes({ force: true });
    const fixture = TestBed.createComponent(UserProfileComponent);
    fixture.detectChanges();
    for (let i = 0; i < 6; i++) { await new Promise((r) => setTimeout(r, 0)); fixture.detectChanges(); }
    const grid = (fixture.nativeElement as HTMLElement).querySelector('.user-profile-shared-crush-grid');
    return grid?.textContent?.replace(/\s+/g, ' ') ?? '';
  };

  it('shows Relationship Status as the main status and The Feels as the labels', async () => {
    const text = await renderDetails();
    expect(text).toContain('Relationship Status: Dating');
    expect(text).toContain('The Feels: Situationship, Slow burn');
  });

  it('drops the confusing "Your status" and the duplicate first-Feel field', async () => {
    const text = await renderDetails();
    expect(text).not.toMatch(/Your status/i);
    expect(text).not.toContain('Relationship status: Situationship');
    expect(text).not.toContain('Labels:');
  });
});
