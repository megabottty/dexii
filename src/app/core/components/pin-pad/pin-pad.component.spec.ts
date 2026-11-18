import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SecurityService } from '../../services/security.service';
import { PinPadComponent } from './pin-pad.component';

/** The PIN pad that guards the Vault: checks the app PIN without locking or moving the app. */
describe('PinPadComponent', () => {
  let verifyPin: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [PinPadComponent], providers: [provideRouter([])] });
    const security = TestBed.inject(SecurityService);
    verifyPin = vi.spyOn(security, 'verifyPin') as any;
  });

  /** Renders the pad and taps the given digits on its buttons. */
  const tap = async (digits: string) => {
    const fixture = TestBed.createComponent(PinPadComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    for (const d of digits) {
      const key = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === d)!;
      key.click();
    }
    for (let i = 0; i < 3; i++) await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();
    return { fixture, root };
  };

  it('checks the 4 digits against the app PIN without navigating', async () => {
    verifyPin.mockResolvedValue(true);
    await tap('1234');
    expect(verifyPin).toHaveBeenCalledWith('1234', false);
  });

  it('says it is unlocked when the PIN is right', async () => {
    verifyPin.mockResolvedValue(true);
    const fixture = TestBed.createComponent(PinPadComponent);
    const unlocked = vi.fn();
    fixture.componentInstance.unlocked.subscribe(unlocked);
    fixture.detectChanges();
    for (const d of '4321') await fixture.componentInstance.press(d);
    expect(unlocked).toHaveBeenCalledTimes(1);
  });

  it('shows an error and clears the dots when the PIN is wrong', async () => {
    verifyPin.mockResolvedValue(false);
    const { fixture, root } = await tap('0000');
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Incorrect PIN');
    expect(fixture.componentInstance.enteredPin()).toBe('');
  });
});
