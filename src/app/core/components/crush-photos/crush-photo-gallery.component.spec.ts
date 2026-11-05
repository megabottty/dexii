import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { DataService } from '../../services/data.service';
import { FriendsApiService } from '../../services/friends-api.service';
import { CrushPhotoGalleryComponent } from './crush-photo-gallery.component';

describe('Crush photo gallery (DEX-59)', () => {
  it("reloads the owner's pictures when more are added from Edit", async () => {
    const crushes = signal([{ id: 'c1', photoCount: 1 }]);
    const loadCrushPhotos = vi.fn(async () => [] as any[]);
    TestBed.configureTestingModule({
      imports: [CrushPhotoGalleryComponent],
      providers: [
        { provide: DataService, useValue: { getAllCrushes: () => crushes, loadCrushPhotos } },
        { provide: FriendsApiService, useValue: { getSharedCrushPhotos: vi.fn(async () => []) } }
      ]
    });
    const fixture = TestBed.createComponent(CrushPhotoGalleryComponent);
    fixture.componentRef.setInput('crushId', 'c1');
    fixture.componentRef.setInput('mode', 'owner');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(loadCrushPhotos).toHaveBeenCalledTimes(1);

    crushes.set([{ id: 'c1', photoCount: 3 }]);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(loadCrushPhotos).toHaveBeenCalledTimes(2);

    // Other changes to the crush don't trigger another load.
    crushes.set([{ id: 'c1', photoCount: 3, nickname: 'x' } as any]);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(loadCrushPhotos).toHaveBeenCalledTimes(2);
  });
});
