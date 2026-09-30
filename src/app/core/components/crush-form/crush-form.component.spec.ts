import { Component, model } from '@angular/core';
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
}

describe('CrushFormComponent', () => {
  let fixture: ComponentFixture<CrushFormComponent>;
  let form: CrushFormValue;

  const tiles = () =>
    Array.from(fixture.nativeElement.querySelectorAll('[role="group"][aria-label="Relationship status"] [role="checkbox"]')) as HTMLElement[];
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
    for (const label of ['Pronouns', 'Nickname', 'Name shown on cards', 'Status', 'Crush Note', 'Hair', 'Eyes', 'Build',
      'Where I can find them', 'Relationship Status', 'Initial Vibe', 'Current Vibe', 'Bio', 'Age', 'How We Met',
      'Are they in school or working?', 'Grade', 'Occupation', 'Their Friends', 'Memorable Moments', 'Private Notes']) {
      expect(text).toContain(label);
    }
  });

  it('makes the first relationship pick the headline', () => {
    tileByText('Just flirting').click();
    tileByText('Just friends').click();
    fixture.detectChanges();

    expect(form.relationshipLabels).toEqual(['Just flirting', 'Just friends']);
    expect(tileByText('Just flirting').textContent).toContain('Headline');
    expect(tileByText('Just friends').textContent).not.toContain('Headline');
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
});
