import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FriendsApiService } from './friends-api.service';

describe('FriendsApiService.getFriendSharedCrushes', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("leaves out a friend's archived crush, even if the server sends it (DEX-61)", async () => {
    const crushes = [
      { _id: 'c1', userId: 'u2', nickname: 'Alex', status: 'Dating', visibility: ['me'] },
      { _id: 'c2', userId: 'u2', nickname: 'Costco Twerp', status: 'Archived', visibility: ['me'] }
    ];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => crushes }));

    const result = await TestBed.inject(FriendsApiService).getFriendSharedCrushes('u2');

    expect(result.map((c) => c.nickname)).toEqual(['Alex']);
  });
});
