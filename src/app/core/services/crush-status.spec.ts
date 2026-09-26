import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { CrushStatus } from '../models/crush-profile.model';
import { DataService } from './data.service';
import { FriendsApiService } from './friends-api.service';

describe('Crush status normalisation', () => {
  it('has Plotting and no Crushing', () => {
    expect(CrushStatus.Plotting).toBe('Plotting');
    expect(Object.values(CrushStatus)).not.toContain('Crushing');
  });

  it('maps the legacy "Crushing" value to Plotting in both services', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const data = TestBed.inject(DataService) as unknown as { toCrushStatus(s?: string): CrushStatus };
    const friends = TestBed.inject(FriendsApiService) as unknown as { toCrushStatus(s?: string): CrushStatus };
    expect(data.toCrushStatus('Crushing')).toBe(CrushStatus.Plotting);
    expect(friends.toCrushStatus('Crushing')).toBe(CrushStatus.Plotting);
    expect(data.toCrushStatus('Plotting')).toBe(CrushStatus.Plotting);
    expect(data.toCrushStatus('Broken Up')).toBe(CrushStatus.BrokenUp);
    expect(data.toCrushStatus('nonsense')).toBe(CrushStatus.Crush);
  });
});
