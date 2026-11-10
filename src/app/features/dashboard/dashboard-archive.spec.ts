import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardComponent } from './dashboard.component';

describe('View Archive on the Stash (DEX-64)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } }))));
    TestBed.configureTestingModule({ imports: [DashboardComponent], providers: [provideRouter([])] });
  });
  afterEach(() => vi.unstubAllGlobals());

  const render = () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    return fixture;
  };
  const archiveButton = (root: HTMLElement) =>
    Array.from(root.querySelectorAll('button')).find((b) => /View (Archive|Active)/.test(b.textContent || ''));

  it('sits below the crushes, not in the header above them', () => {
    const root: HTMLElement = render().nativeElement;
    const button = archiveButton(root);
    const grid = root.querySelector('#crush-grid')!;
    expect(button).toBeTruthy();
    expect(root.querySelector('.dashboard-component__s82')!.contains(button!)).toBe(false);
    expect(grid.compareDocumentPosition(button!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('switches to the archive and back', () => {
    const fixture = render();
    const root: HTMLElement = fixture.nativeElement;
    archiveButton(root)!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.showArchived()).toBe(true);
    expect(archiveButton(root)!.textContent).toContain('View Active');
    archiveButton(root)!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.showArchived()).toBe(false);
  });
});
