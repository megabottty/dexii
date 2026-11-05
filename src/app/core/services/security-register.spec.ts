import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SecurityService } from './security.service';

describe('SecurityService.registerUser', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sends the first and last name typed at sign-up (DEX-53)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ emailSent: true }) });
    vi.stubGlobal('fetch', fetchMock);
    localStorage.setItem('dexii_pending_username', 'mgrange');
    localStorage.setItem('dexii_pending_email', 'michelle@example.com');
    localStorage.setItem('dexii_pending_firstName', 'Michelle');
    localStorage.setItem('dexii_pending_lastName', 'Grange');

    await TestBed.inject(SecurityService).registerUser('password123', '1234');

    const register = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/auth/register'));
    const body = JSON.parse(register![1].body);
    expect(body.firstName).toBe('Michelle');
    expect(body.lastName).toBe('Grange');
  });
});
