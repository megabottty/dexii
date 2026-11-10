import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SwPush, SwUpdate } from '@angular/service-worker';
import { EMPTY } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsComponent } from './settings.component';

// The top of Settings matches a friend's profile: a full-width photo with your name over it.
describe('Settings header (DEX-72 look)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }))));
    TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        provideRouter([]),
        { provide: SwPush, useValue: { isEnabled: false, messages: EMPTY, notificationClicks: EMPTY, subscription: EMPTY } },
        { provide: SwUpdate, useValue: { isEnabled: false, versionUpdates: EMPTY, unrecoverable: EMPTY } }
      ]
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  const render = () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  };

  it('shows your name and @username over a full-width photo', () => {
    const { root } = render();
    const media = root.querySelector('.settings-hero__media')!;
    expect(media).toBeTruthy();
    expect(media.querySelector('h1')).toBeTruthy();
    expect(media.querySelector('.settings-hero__username')!.textContent).toContain('@');
    expect(root.innerHTML).not.toContain('pravatar');
  });

  it('opens the photo picker from the camera button on the photo', () => {
    const { fixture, root } = render();
    expect(root.querySelector('#settings-photo-picker')).toBeNull();
    const camera = root.querySelector<HTMLButtonElement>('.settings-hero__media button[aria-label="Change your photo"]')!;
    expect(camera.getAttribute('aria-expanded')).toBe('false');
    camera.click();
    fixture.detectChanges();
    expect(root.querySelector('#settings-photo-picker')).toBeTruthy();
    expect(camera.getAttribute('aria-expanded')).toBe('true');
  });

  it('keeps Save Changes and Reset Defaults under the photo, without a separate Change photo button', () => {
    const { root } = render();
    const actions = root.querySelector('.settings-actions')!;
    expect(actions.textContent).toContain('Save Changes');
    expect(actions.textContent).toContain('Reset Defaults');
    expect(actions.textContent).not.toContain('Change photo');
  });
});
