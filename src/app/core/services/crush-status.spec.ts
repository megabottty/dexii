import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { CRUSH_STATUS_OPTIONS, crushStatusLabel } from '../config/crush-form-options';
import { CrushStatus } from '../models/crush-profile.model';
import { DataService } from './data.service';
import { FriendsApiService } from './friends-api.service';

describe('Crush status normalisation (DEX-50)', () => {
  it('offers the new statuses in order, without Archived', () => {
    expect(CRUSH_STATUS_OPTIONS.map((o) => o.value)).toEqual([
      'Undefined', 'Getting Acquainted', 'Friends', 'Friends With Benefits', 'Crush',
      'Dating', 'Lovers', 'Exclusive', 'Engaged', 'Broken Up'
    ]);
    expect(crushStatusLabel(CrushStatus.Crush)).toBe('Crush 😍');
    expect(crushStatusLabel(CrushStatus.Dating)).toBe('Dating');
  });

  it('maps retired statuses to their replacement in both services', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const data = TestBed.inject(DataService) as unknown as { toCrushStatus(s?: string): CrushStatus };
    const friends = TestBed.inject(FriendsApiService) as unknown as { toCrushStatus(s?: string): CrushStatus };
    expect(data.toCrushStatus('Crushing')).toBe(CrushStatus.Crush);
    expect(friends.toCrushStatus('Plotting')).toBe(CrushStatus.Crush);
    expect(data.toCrushStatus('Heartbroken')).toBe(CrushStatus.BrokenUp);
    expect(data.toCrushStatus('Friend')).toBe(CrushStatus.Friends);
    expect(data.toCrushStatus('Archived')).toBe(CrushStatus.Archived);
    expect(data.toCrushStatus('nonsense')).toBe(CrushStatus.Undefined);
  });
});
