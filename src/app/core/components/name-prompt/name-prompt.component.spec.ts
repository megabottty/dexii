import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NamePromptComponent } from './name-prompt.component';
import { UserSettingsService } from '../../services/user-settings.service';
import { SecurityService } from '../../services/security.service';

describe('NamePromptComponent (DEX-53)', () => {
  let fixture: ComponentFixture<NamePromptComponent>;
  const needsName = signal(true);
  const saveRealName = vi.fn().mockResolvedValue(undefined);
  const skipNamePrompt = vi.fn(() => needsName.set(false));

  beforeEach(async () => {
    needsName.set(true);
    saveRealName.mockClear();
    await TestBed.configureTestingModule({
      imports: [NamePromptComponent],
      providers: [
        { provide: UserSettingsService, useValue: { needsName, saveRealName, skipNamePrompt } },
        { provide: SecurityService, useValue: { isLoggedIn: signal(true), isLocked: signal(false) } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(NamePromptComponent);
    fixture.detectChanges();
  });

  const text = () => (fixture.nativeElement as HTMLElement).textContent || '';

  it('asks what friends should call you', () => {
    expect(text()).toContain('What should friends call you?');
  });

  it('needs a first name before saving', async () => {
    await fixture.componentInstance.save();
    expect(saveRealName).not.toHaveBeenCalled();
    expect(fixture.componentInstance.error()).toContain('first name');
  });

  it('saves the trimmed first and last name', async () => {
    fixture.componentInstance.firstName.set(' Michelle ');
    fixture.componentInstance.lastName.set(' Grange');
    await fixture.componentInstance.save();
    expect(saveRealName).toHaveBeenCalledWith('Michelle', 'Grange');
  });

  it('shows nothing once the name is known', () => {
    needsName.set(false);
    fixture.detectChanges();
    expect(text()).not.toContain('What should friends call you?');
  });
});
