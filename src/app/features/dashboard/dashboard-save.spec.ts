import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { signal } from '@angular/core';
import { DataService } from '../../core/services/data.service';
import { ModalService } from '../../core/services/modal.service';
import { DashboardComponent } from './dashboard.component';

let createStatus = 500;

describe('New Crush when the save fails (DEX-58)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('dexii_api_token', 'token');
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
      const ok = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
      if (String(url).endsWith('/crushes') && init?.method === 'POST') {
        return createStatus === 201 ? ok({ _id: '6b0000000000000000000001', nickname: 'Sunny', status: 'Undefined', visibility: [] }, 201) : ok({ message: 'Server error' }, createStatus);
      }
      return ok([]);
    }));
    TestBed.configureTestingModule({ imports: [DashboardComponent], providers: [provideRouter([])] });
    vi.spyOn(TestBed.inject(ModalService), 'show').mockImplementation(() => undefined);
  });
  afterEach(() => vi.unstubAllGlobals());

  const fillAndSave = async () => {
    const dashboard = TestBed.createComponent(DashboardComponent).componentInstance;
    dashboard.showNewEntryModal.set(true);
    dashboard.newCrush.nickname = 'Sunny';
    dashboard.newCrush.avatarUrl = 'data:image/png;base64,AAAA';
    await dashboard.saveCrush();
    return dashboard;
  };

  it('keeps the New Crush form open with your answers, so you can try again', async () => {
    createStatus = 500;
    const dashboard = await fillAndSave();
    expect(dashboard.showNewEntryModal()).toBe(true);
    expect(dashboard.newCrush.nickname).toBe('Sunny');
  });

  it('closes the form once the crush is saved', async () => {
    createStatus = 201;
    const dashboard = await fillAndSave();
    expect(dashboard.showNewEntryModal()).toBe(false);
  });

  it('opens the new crush, showing their details first (DEX-48)', async () => {
    createStatus = 201;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const data = TestBed.inject(DataService);
    vi.spyOn(data, 'getAllCrushes').mockReturnValue(signal([{}, {}]) as any);
    await fillAndSave();
    expect(navigate).toHaveBeenCalledWith(['/profile', '6b0000000000000000000001'], { state: { justCreated: '6b0000000000000000000001' } });
  });

  it('stays on the Stash for your very first crush, where the share tour runs', async () => {
    createStatus = 201;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    vi.spyOn(TestBed.inject(DataService), 'getAllCrushes').mockReturnValue(signal([{}]) as any);
    await fillAndSave();
    expect(navigate).not.toHaveBeenCalledWith(['/profile', expect.anything()], expect.anything());
  });
});
