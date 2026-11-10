import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardComponent } from './dashboard.component';
import { LoadingOverlayComponent } from '../../core/components/loading-overlay.component';

// One spinner on the Stash: the 💖 one, in the global overlay, not a second copy in the page.
describe('Stash loading spinner', () => {
  beforeEach(() => {
    localStorage.clear();
    // Never answers, so the Stash stays loading.
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    TestBed.configureTestingModule({ imports: [DashboardComponent, LoadingOverlayComponent], providers: [provideRouter([])] });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('shows the heart spinner in the overlay while crushes load, with no second spinner in the page', () => {
    const overlay = TestBed.createComponent(LoadingOverlayComponent);
    const page = TestBed.createComponent(DashboardComponent);
    page.detectChanges();
    overlay.detectChanges();
    const root = overlay.nativeElement as HTMLElement;
    expect(root.querySelector('.lo-spinner--heart')!.textContent).toContain('💖');
    expect(root.querySelector('.lo-label')!.textContent).toContain('Loading your crushes');
    expect((page.nativeElement as HTMLElement).querySelector('.dashboard-crush-loading')).toBeNull();
  });
});
