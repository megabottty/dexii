import { Component, input, model } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { CrushFormComponent } from './crush-form.component';
import { AvatarPickerComponent } from '../avatar-picker/avatar-picker.component';
import { AvatarConfig } from '../../models/avatar-config.model';
import { CrushFormValue, emptyCrushFormValue } from '../../utils/crush-form.util';

/** Stands in for the real picker so the form can be tested on its own. */
@Component({ selector: 'app-avatar-picker', standalone: true, template: '' })
class AvatarPickerStubComponent {
  readonly url = model<string>('');
  readonly config = model<AvatarConfig | undefined>(undefined);
  readonly initial = input('');
}

describe('CrushFormComponent', () => {
  let fixture: ComponentFixture<CrushFormComponent>;
  let form: CrushFormValue;

  const tiles = () =>
    Array.from(fixture.nativeElement.querySelectorAll('[role="group"][aria-label="The Feels"] [role="checkbox"]')) as HTMLElement[];
  const tileByText = (text: string) =>
    tiles().find((tile) => tile.textContent?.includes(text)) as HTMLElement;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [CrushFormComponent] })
      .overrideComponent(CrushFormComponent, {
        remove: { imports: [AvatarPickerComponent] },
        add: { imports: [AvatarPickerStubComponent] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(CrushFormComponent);
    form = emptyCrushFormValue();
    fixture.componentRef.setInput('form', form);
    fixture.detectChanges();
  });

  it('renders every question', () => {
    const text = fixture.nativeElement.textContent as string;
    for (const label of ['Pronouns', 'Nickname', 'Name shown on cards', 'Status', 'Hair', 'Eyes', 'Build',
      'Where I can find them', 'The Feels', 'The Details', 'Initial Vibe', 'Current Vibe', 'Bio', 'Age', 'Birthday', 'How We Met',
      'Are they in school or working?', 'Grade', 'Occupation', 'Their Friends', 'Memorable Moments']) {
      expect(text).toContain(label);
    }
  });

  it('has no note fields: friends get updates, private thoughts go in the Vault (DEX-42)', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).not.toContain('Crush Note');
    expect(text).not.toContain('Private Notes');
    expect(text.toLowerCase()).not.toContain('add a note');
  });

  it('asks the essentials first, in the order the profile shows them (DEX-41)', () => {
    const text = fixture.nativeElement.textContent as string;
    const order = ['First Name', 'Nickname', 'Headline', 'Age', 'Birthday', 'Location', 'Initial Vibe', 'Status',
      'The Feels', 'The Details', 'Bio', 'Where I can find them', 'Compatibility Check'];
    const positions = order.map((label) => text.indexOf(label));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((x, y) => x - y)).toEqual(positions);
  });

  it('keeps Socials and Compatibility collapsed until opened', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#cf-social-instagram')).toBeNull();
    expect(el.querySelector('.cf-compat-range')).toBeNull();
    const toggles = Array.from(el.querySelectorAll<HTMLButtonElement>('.cf-disclosure'));
    expect(toggles.map((b) => b.getAttribute('aria-expanded'))).toEqual(['false', 'false']);
    toggles.forEach((b) => b.click());
    fixture.detectChanges();
    expect(el.querySelector('#cf-social-instagram')).not.toBeNull();
    expect(el.querySelector('.cf-compat-range')).not.toBeNull();
  });

  it('fills in Age when a birthday is picked', () => {
    fixture.componentInstance.setBirthday('2000-01-01');
    expect(form.dateOfBirth).toBe('2000-01-01');
    expect(form.age).toBe(new Date().getFullYear() - 2000);
  });

  it('makes the first relationship pick the headline', () => {
    tileByText('Flirting').click();
    tileByText('Just talking').click();
    fixture.detectChanges();

    expect(form.relationshipLabels).toEqual(['Flirting', 'Just talking']);
    expect(tileByText('Flirting').textContent).toContain('Headline');
    expect(tileByText('Just talking').textContent).not.toContain('Headline');
  });

  it('clears the heartbreak song when Heartbroken is unticked', () => {
    tileByText('Heartbroken').click();
    fixture.detectChanges();
    form.heartbreakSong = 'Someone Like You';
    tileByText('Heartbroken').click();
    fixture.detectChanges();

    expect(form.relationshipLabels).toEqual([]);
    expect(form.heartbreakSong).toBe('');
  });

  it('adds a custom label from the Other box', () => {
    tileByText('Other').click();
    fixture.detectChanges();
    form.customRelationshipLabelDraft = 'Long distance';
    fixture.componentInstance.addCustomRelationshipLabel();

    expect(form.relationshipLabels).toEqual(['Long distance']);
    expect(form.customRelationshipLabelDraft).toBe('');
  });

  it('hides Occupation when they are in school', () => {
    expect(fixture.nativeElement.querySelector('#cf-occupation')).not.toBeNull();
    form.schoolOrWork = 'school';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#cf-occupation')).toBeNull();
    expect(fixture.nativeElement.querySelector('#cf-grade')).not.toBeNull();
  });

  describe('More Pictures on Edit (DEX-59)', () => {
    it('shows "More Pictures" with room left after the pictures they already have', () => {
      fixture.componentRef.setInput('allowPhotos', true);
      fixture.componentRef.setInput('existingPhotoCount', 18);
      fixture.detectChanges();
      const text = (fixture.nativeElement as HTMLElement).textContent as string;
      expect(text).toContain('More Pictures');
      expect(text).toContain('18 already on their profile');
      expect(text).toContain('Add More Pictures');
      expect(fixture.componentInstance.photoRoom()).toBe(2);
    });

    it('hides the add button once the crush has the most pictures allowed', () => {
      fixture.componentRef.setInput('allowPhotos', true);
      fixture.componentRef.setInput('existingPhotoCount', fixture.componentInstance.maxPhotos);
      fixture.detectChanges();
      expect(fixture.componentInstance.photoRoom()).toBe(0);
      expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Add More Pictures');
    });
  });
});
