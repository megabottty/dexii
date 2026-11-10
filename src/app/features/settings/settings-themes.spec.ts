import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SwPush, SwUpdate } from '@angular/service-worker';
import { EMPTY } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PREMIUM_FEATURES } from '../../core/config/premium-features';
import { ThemeService } from '../../core/services/theme.service';
import { SettingsComponent } from './settings.component';

describe('Settings themes (DEX-66)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }))));
    TestBed.configureTestingModule({ imports: [SettingsComponent], providers: [provideRouter([]), { provide: SwPush, useValue: { isEnabled: false, messages: EMPTY, notificationClicks: EMPTY, subscription: EMPTY } }, { provide: SwUpdate, useValue: { isEnabled: false, versionUpdates: EMPTY, unrecoverable: EMPTY } }] });
  });
  afterEach(() => vi.unstubAllGlobals());

  const render = () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  };
  const themeCards = (root: HTMLElement) => root.querySelectorAll('#theme .settings-theme-card');

  it('starts collapsed, showing only the current theme with a lock and a down arrow', () => {
    const { root } = render();
    const current = TestBed.inject(ThemeService).themes.find((t) => t.id === TestBed.inject(ThemeService).mode());
    expect(themeCards(root).length).toBe(0);
    const toggle = root.querySelector<HTMLButtonElement>('#theme .settings-theme-current')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.textContent).toContain(current?.name ?? 'Custom');
    expect(toggle.textContent).toContain('🔒');
    expect(toggle.textContent).toContain('▼');
    expect(root.querySelector('#theme .settings-custom-theme-editor')).toBeNull();
  });

  it('opens to every theme, all of which can be picked for now', () => {
    const { fixture, root } = render();
    root.querySelector<HTMLButtonElement>('#theme .settings-theme-current')!.click();
    fixture.detectChanges();
    const service = TestBed.inject(ThemeService);
    expect(themeCards(root).length).toBe(service.themes.length + 1); // + Custom
    const other = service.themes.find((t) => t.id !== service.mode())!;
    (Array.from(themeCards(root)).find((c) => c.textContent?.includes(other.name)) as HTMLButtonElement).click();
    expect(service.mode()).toBe(other.id);
  });

  it('is registered as a Gold feature that is not locked yet', () => {
    expect(PREMIUM_FEATURES.premiumThemes.minTier).toBe('Gold');
    expect(PREMIUM_FEATURES.premiumThemes.enabled).toBe(false);
  });
});
