import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CrushStatus } from '../models/crush-profile.model';
import { DataService } from './data.service';
import { ModalService } from './modal.service';

/** What the server answers for POST /crushes in each test. */
let createResponse: () => Promise<Response>;
const calls: string[] = [];

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

const newCrush = () => ({
  nickname: 'Sunny', fullName: '', displayName: 'nickname' as const, avatarUrl: '', status: CrushStatus.Undefined,
  visibility: [], rating: 3, relationshipLabels: [], customNotes: ''
}) as any;

describe('Saving a new crush (DEX-58)', () => {
  let data: DataService;
  let shown: string[];

  beforeEach(() => {
    localStorage.clear();
    calls.length = 0;
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
      const path = String(url);
      calls.push(`${init?.method || 'GET'} ${path}`);
      if (path.endsWith('/crushes') && init?.method === 'POST') return createResponse();
      return json([]);
    }));
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    data = TestBed.inject(DataService);
    shown = [];
    vi.spyOn(TestBed.inject(ModalService), 'show').mockImplementation((message: string) => { shown.push(message); });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('swaps in the saved crush when the server accepts it', async () => {
    localStorage.setItem('dexii_api_token', 'token');
    createResponse = () => json({ _id: '6b0000000000000000000001', nickname: 'Sunny', status: 'Undefined', visibility: [] }, 201);
    const local = data.addCrush(newCrush());
    const saved = await data.savedCrush(local.id);
    expect(saved?.id).toBe('6b0000000000000000000001');
    expect(data.getAllCrushes()().map((c) => c.id)).toEqual(['6b0000000000000000000001']);
  });

  it('when the server refuses, the crush is not left on screen and you are told it did not save', async () => {
    localStorage.setItem('dexii_api_token', 'token');
    createResponse = () => json({ message: 'Server error' }, 500);
    const local = data.addCrush(newCrush());
    expect(await data.savedCrush(local.id)).toBeNull();
    expect(data.getAllCrushes()()).toEqual([]);
    expect(shown.join(' ')).toMatch(/couldn.t save/i);
  });

  it('when signed out, nothing is written anywhere else and you are asked to sign in again', async () => {
    createResponse = () => json({}, 201);
    const local = data.addCrush(newCrush());
    expect(await data.savedCrush(local.id)).toBeNull();
    expect(data.getAllCrushes()()).toEqual([]);
    expect(calls.some((c) => c.includes('/demo/'))).toBe(false);
    expect(shown.join(' ')).toMatch(/sign in/i);
  });

  it('a lost connection never falls back to the demo store', async () => {
    localStorage.setItem('dexii_api_token', 'token');
    createResponse = () => Promise.reject(new TypeError('Failed to fetch'));
    const local = data.addCrush(newCrush());
    expect(await data.savedCrush(local.id)).toBeNull();
    expect(calls.some((c) => c.includes('/demo/'))).toBe(false);
    expect(shown.join(' ')).toMatch(/couldn.t save/i);
  });

  it('editing, sharing, deleting and loading never use the demo store when signed out (DEX-58)', async () => {
    const crush = { ...newCrush(), id: '6b0000000000000000000002', userId: 'me', lastInteraction: new Date(), vibeHistory: [3], redFlags: 0, sharedEntries: [] };
    data.updateCrush(crush, { fields: ['nickname'] });
    data.deleteCrush(crush.id);
    await data.refreshCrushes({ force: true });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(calls.filter((c) => c.includes('/demo/'))).toEqual([]);
  });
});
