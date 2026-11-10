import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { LoadingOverlayComponent } from './loading-overlay.component';
import { LoadingService } from '../services/loading.service';

// A page can ask the global loading overlay to use its own spinner (the Stash's 💖) while it's open.
@Component({ selector: 'app-heart-page', standalone: true, template: '' })
class HeartPageComponent {
  loading = signal(true);
  constructor() {
    const service = inject(LoadingService);
    service.bindHere(this.loading);
    service.useLookHere({ heart: true, label: signal('Loading your crushes…') });
  }
}

describe('Loading overlay', () => {
  const render = () => {
    TestBed.configureTestingModule({ imports: [LoadingOverlayComponent, HeartPageComponent] });
    const overlay = TestBed.createComponent(LoadingOverlayComponent);
    return { overlay, root: overlay.nativeElement as HTMLElement };
  };

  it('shows the plain spinner and "Loading…" by default', () => {
    const { overlay, root } = render();
    TestBed.inject(LoadingService).setNavigating(true);
    overlay.detectChanges();
    expect(root.querySelector('.lo-spinner')).toBeTruthy();
    expect(root.querySelector('.lo-spinner--heart')).toBeNull();
    expect(root.querySelector('.lo-label')!.textContent).toContain('Loading…');
  });

  it("uses a page's heart spinner and label while that page is open, and goes back after", () => {
    const { overlay, root } = render();
    const page = TestBed.createComponent(HeartPageComponent);
    overlay.detectChanges();
    expect(root.querySelector('.lo-spinner--heart')!.textContent).toContain('💖');
    expect(root.querySelector('.lo-label')!.textContent).toContain('Loading your crushes…');

    page.destroy();
    TestBed.inject(LoadingService).setNavigating(true);
    overlay.detectChanges();
    expect(root.querySelector('.lo-spinner--heart')).toBeNull();
    expect(root.querySelector('.lo-label')!.textContent).toContain('Loading…');
  });
});
