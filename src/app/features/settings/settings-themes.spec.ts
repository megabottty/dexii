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

  it('starts collapsed, showing only the current theme, unlocked and free during beta, with a down arrow', () => {
    const { root } = render();
    const current = TestBed.inject(ThemeService).themes.find((t) => t.id === TestBed.inject(ThemeService).mode());
    expect(themeCards(root).length).toBe(0);
    const toggle = root.querySelector<HTMLButtonElement>('#theme .settings-theme-current')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.textContent).toContain(current?.name ?? 'Custom');
    expect(toggle.textContent).toContain('🔓');
    expect(toggle.textContent).toContain('Free during beta');
    expect(toggle.textContent).not.toContain('🔒');
    expect(toggle.textContent).toContain('▼');
    expect(root.querySelector('#theme .settings-custom-theme-editor')).toBeNull();
  });

  const openAndPickAnother = (fixture: any, root: HTMLElement) => {
    root.querySelector<HTMLButtonElement>('#theme .settings-theme-current')!.click();
    fixture.detectChanges();
    const service = TestBed.inject(ThemeService);
    const other = service.themes.find((t) => t.id !== service.mode())!;
    (Array.from(themeCards(root)).find((c) => c.textContent?.includes(other.name)) as HTMLButtonElement).click();
    fixture.detectChanges();
    return other;
  };
  const question = (root: HTMLElement) => root.querySelector<HTMLElement>('[aria-labelledby="theme-interest-title"]');

  it('opens to every theme and asks once whether they would pay $1.99, applying the theme whatever they say', () => {
    localStorage.setItem('dexii_api_token', 'token');
    const { fixture, root } = render();
    const service = TestBed.inject(ThemeService);
    root.querySelector<HTMLButtonElement>('#theme .settings-theme-current')!.click();
    fixture.detectChanges();
    expect(themeCards(root).length).toBe(service.themes.length + 1); // + Custom
    (root.querySelector<HTMLButtonElement>('#theme .settings-theme-current')!).click();
    fixture.detectChanges();

    const other = openAndPickAnother(fixture, root);
    expect(question(root)!.textContent).toContain('Would you pay $1.99 for this theme?');
    const maybe = Array.from(question(root)!.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Maybe')!;
    maybe.click();
    fixture.detectChanges();
    expect(service.mode()).toBe(other.id);
    expect(question(root)).toBeNull();
    const call = (fetch as any).mock.calls.find(([url]: [string]) => String(url).endsWith('/auth/theme-interest'));
    expect(JSON.parse(call[1].body)).toEqual({ answer: 'maybe', theme: other.id, price: 1.99 });
  });

  it('does not ask again once they have answered', () => {
    localStorage.setItem('dexii_theme_interest', 'yes');
    const { fixture, root } = render();
    const other = openAndPickAnother(fixture, root);
    expect(question(root)).toBeNull();
    expect(TestBed.inject(ThemeService).mode()).toBe(other.id);
  });

  it('stays registered as a Gold feature that is switched off during beta', () => {
    expect(PREMIUM_FEATURES.premiumThemes.minTier).toBe('Gold');
    expect(PREMIUM_FEATURES.premiumThemes.enabled).toBe(false);
  });
});
