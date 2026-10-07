import { Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../services/theme.service';
import { AvatarPickerComponent } from '../avatar-picker/avatar-picker.component';
import { CrushFormValue } from '../../utils/crush-form.util';
import {
  BUILD_OPTIONS,
  CRUSH_STATUS_OPTIONS,
  DISPLAY_NAME_OPTIONS,
  EYE_OPTIONS,
  HAIR_OPTIONS,
  HEARTBROKEN_LABEL,
  NOTE_VISIBILITY_OPTIONS,
  OTHER_LABEL,
  PRONOUN_OPTIONS,
  SCHOOL_OR_WORK_OPTIONS,
  relationshipStatusOptions
} from '../../config/crush-form-options';

type ListKey = 'hair' | 'eyes' | 'build';
type ListNotesKey = 'hairNotes' | 'eyeNotes' | 'buildNotes';

interface ListGroup {
  key: ListKey;
  notesKey: ListNotesKey;
  label: string;
  notesLabel: string;
  placeholder: string;
  options: ReadonlyArray<string>;
}

/**
 * Every question about a crush, in one place. The New Crush modal and Edit Profile both
 * render this so they always ask the same things with the same choices. The parent owns
 * the `CrushFormValue` object and this component edits it in place.
 */
@Component({
  selector: 'app-crush-form',
  standalone: true,
  imports: [FormsModule, AvatarPickerComponent],
  styleUrl: './crush-form.component.css',
  template: `
    <div class="cf">

      <!-- Basics -->
      <div class="cf-field">
        <label [style.color]="theme.colors().textSecondary" class="cf-label">Pronouns</label>
        <div class="cf-tile-grid">
          @for (p of pronounOptions; track p.value) {
            <div (click)="form().pronouns = p.value"
                 role="button"
                 tabindex="0"
                 (keydown.enter)="form().pronouns = p.value"
                 (keydown.space)="form().pronouns = p.value; $event.preventDefault()"
                 [attr.aria-pressed]="form().pronouns === p.value"
                 [style.border]="tileBorder(form().pronouns === p.value)"
                 [style.background-color]="tileBackground(form().pronouns === p.value)"
                 class="cf-tile">
              <div [style.border]="'2px solid ' + (form().pronouns === p.value ? theme.colors().primary : theme.colors().textSecondary)"
                   [style.background-color]="form().pronouns === p.value ? theme.colors().primary : 'transparent'"
                   class="cf-check cf-check--round">
                @if (form().pronouns === p.value) { <span class="cf-check__mark" aria-hidden="true">✓</span> }
              </div>
              <span class="cf-tile__text">{{ p.label }}</span>
            </div>
          }
        </div>
      </div>

      <app-avatar-picker [(url)]="form().avatarUrl" [(config)]="form().avatarConfig"></app-avatar-picker>

      <div class="cf-field">
        <label [style.color]="theme.colors().textSecondary" class="cf-label" for="cf-nickname">Nickname (Optional)</label>
        <input id="cf-nickname" [(ngModel)]="form().nickname" [style.background-color]="theme.colors().bgSecondary" [style.border]="inputBorder()" [style.color]="theme.colors().text" class="cf-input">
      </div>

      <div class="cf-field">
        <label [style.color]="theme.colors().textSecondary" class="cf-label" for="cf-full-name">First Name</label>
        <input id="cf-full-name" [(ngModel)]="form().fullName" [style.background-color]="theme.colors().bgSecondary" [style.border]="inputBorder()" [style.color]="theme.colors().text" class="cf-input">
      </div>

      <div class="cf-field">
        <label [style.color]="theme.colors().textSecondary" class="cf-label" for="cf-display-name">Name shown on cards</label>
        <select id="cf-display-name" [(ngModel)]="form().displayName" [style.background-color]="theme.colors().bgSecondary" [style.border]="inputBorder()" [style.color]="theme.colors().text" class="cf-input cf-select">
          @for (option of displayNameOptions; track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
          }
        </select>
      </div>

      <div class="cf-field">
        <label [style.color]="theme.colors().textSecondary" class="cf-label" for="cf-status">Status</label>
        <select id="cf-status" [(ngModel)]="form().status" [style.background-color]="theme.colors().bgSecondary" [style.border]="inputBorder()" [style.color]="theme.colors().text" class="cf-input cf-select">
          @for (option of statusOptions; track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
          }
        </select>
        <span [style.color]="theme.colors().textSecondary" class="cf-hint">Where things stand right now.</span>
      </div>

      <!-- Crush note -->
      <div class="cf-field">
        <label [style.color]="theme.colors().textSecondary" class="cf-label" for="cf-note">Crush Note (Optional)</label>
        <textarea id="cf-note" [(ngModel)]="form().note"
                  [style.background-color]="theme.colors().bgSecondary"
                  [style.border]="inputBorder()"
                  [style.color]="theme.colors().text"
                  rows="4"
                  placeholder="Add a note about this crush..." class="cf-textarea"></textarea>
        <div class="cf-note-visibility">
          <p [style.color]="theme.colors().textSecondary" class="cf-label cf-label--tight">Note Visibility</p>
          <div class="cf-chip-row">
            @for (option of noteVisibilityOptions; track option.value) {
              <button type="button"
                      (click)="form().noteVisibility = option.value"
                      [attr.aria-pressed]="form().noteVisibility === option.value"
                      [style.background-color]="form().noteVisibility === option.value ? theme.colors().primary : 'transparent'"
                      [style.color]="form().noteVisibility === option.value ? 'white' : theme.colors().text"
                      [style.border]="'1px solid ' + (form().noteVisibility === option.value ? theme.colors().primary : theme.colors().border)"
                      class="cf-chip">{{ option.label }}</button>
            }
          </div>
        </div>
      </div>

      <!-- About them -->
      <div [style.border-top]="'1px solid ' + theme.colors().border" class="cf-section">
        <h4 [style.color]="theme.colors().primary" class="cf-section-title">About Them</h4>

        @for (group of listGroups; track group.key) {
          <div class="cf-field">
            <label [style.color]="theme.colors().textSecondary" class="cf-label cf-label--center">{{ group.label }}</label>
            <div class="cf-tile-grid" role="group" [attr.aria-label]="group.label">
              @for (item of group.options; track item) {
                <div (click)="toggleList(group.key, item)"
                     role="checkbox"
                     tabindex="0"
                     (keydown.enter)="toggleList(group.key, item)"
                     (keydown.space)="toggleList(group.key, item); $event.preventDefault()"
                     [attr.aria-checked]="form()[group.key].includes(item)"
                     [style.border]="tileBorder(form()[group.key].includes(item))"
                     [style.background-color]="tileBackground(form()[group.key].includes(item))"
                     class="cf-tile">
                  <div [style.border]="'2px solid ' + (form()[group.key].includes(item) ? theme.colors().primary : theme.colors().textSecondary)"
                       [style.background-color]="form()[group.key].includes(item) ? theme.colors().primary : 'transparent'"
                       class="cf-check">
                    @if (form()[group.key].includes(item)) { <span class="cf-check__mark" aria-hidden="true">✓</span> }
                  </div>
                  <span class="cf-tile__text">{{ item }}</span>
                </div>
              }
            </div>
            @if (form()[group.key].includes(otherLabel)) {
              <div class="cf-subfield">
                <label [style.color]="theme.colors().textSecondary" class="cf-label cf-label--center" [attr.for]="'cf-' + group.notesKey">{{ group.notesLabel }}</label>
                <textarea [id]="'cf-' + group.notesKey" [(ngModel)]="form()[group.notesKey]"
                          [style.background-color]="theme.colors().bgSecondary"
                          [style.border]="inputBorder()"
                          [style.color]="theme.colors().text"
                          rows="2"
                          [placeholder]="group.placeholder"
                          class="cf-textarea"></textarea>
              </div>
            }
          </div>
        }
      </div>

      <!-- Social handles -->
      <div [style.border-top]="'1px solid ' + theme.colors().border" class="cf-section">
        <h4 [style.color]="theme.colors().primary" class="cf-section-title">Where I can find them</h4>
        <div class="cf-social-list">
          @for (s of socialFields; track s.key) {
            <div class="cf-social-row">
              <label [style.color]="theme.colors().textSecondary" class="cf-label cf-label--tight" [attr.for]="'cf-social-' + s.key">{{ s.label }}</label>
              <div class="cf-social-input-wrap">
                <span class="cf-social-icon" aria-hidden="true">{{ s.icon }}</span>
                <input [id]="'cf-social-' + s.key" [placeholder]="s.placeholder" [(ngModel)]="form().social[s.key]" [style.background-color]="theme.colors().bgSecondary" [style.border]="inputBorder()" [style.color]="theme.colors().text" class="cf-social-input">
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Relationship status -->
      <div [style.border-top]="'1px solid ' + theme.colors().border" class="cf-section">
        <h4 [style.color]="theme.colors().primary" class="cf-section-title">Relationship Status</h4>
        <p [style.color]="theme.colors().textSecondary" class="cf-hint cf-hint--block">Pick everything that fits. The first one becomes the headline.</p>
        <div class="cf-tile-list" role="group" aria-label="Relationship status">
          @for (s of relationshipOptions(); track s) {
            <div (click)="toggleRelationshipLabel(s)"
                 role="checkbox"
                 tabindex="0"
                 (keydown.enter)="toggleRelationshipLabel(s)"
                 (keydown.space)="toggleRelationshipLabel(s); $event.preventDefault()"
                 [attr.aria-checked]="hasRelationshipLabel(s)"
                 [style.border]="tileBorder(hasRelationshipLabel(s))"
                 [style.background-color]="tileBackground(hasRelationshipLabel(s))"
                 class="cf-tile cf-tile--wide">
              <div [style.border]="'2px solid ' + (hasRelationshipLabel(s) ? theme.colors().primary : theme.colors().textSecondary)"
                   [style.background-color]="hasRelationshipLabel(s) ? theme.colors().primary : 'transparent'"
                   class="cf-check">
                @if (hasRelationshipLabel(s)) { <span class="cf-check__mark" aria-hidden="true">✓</span> }
              </div>
              <span class="cf-tile__text">{{ s === otherLabel ? 'Other / add my own' : s }}</span>
              @if (headlineLabel() === s && form().relationshipLabels.length > 1) {
                <span [style.color]="theme.colors().primary" class="cf-headline-badge">Headline</span>
              }
            </div>
          }
        </div>

        @if (form().relationshipLabels.length > 1) {
          <div class="cf-subfield">
            <span [style.color]="theme.colors().textSecondary" class="cf-hint">Your picks, in order. The first is the headline. Drag or use the arrows to reorder.</span>
            <div class="cf-order-list">
              @for (label of form().relationshipLabels; track label; let i = $index; let last = $last) {
                <div draggable="true"
                     (dragstart)="startRelationshipLabelDrag(label, $event)"
                     (dragover)="$event.preventDefault()"
                     (drop)="dropRelationshipLabel(label, $event)"
                     (dragend)="clearRelationshipLabelDrag()"
                     [style.background-color]="i === 0 ? theme.colors().primary : 'transparent'"
                     [style.color]="i === 0 ? 'white' : theme.colors().text"
                     [style.border]="'1px solid ' + theme.colors().primary"
                     class="cf-order-chip">
                  <span class="cf-order-chip__text">{{ label }}</span>
                  <button type="button" class="cf-order-btn" [disabled]="i === 0" (click)="moveRelationshipLabel(label, -1)" [attr.aria-label]="'Move ' + label + ' up'">▲</button>
                  <button type="button" class="cf-order-btn" [disabled]="last" (click)="moveRelationshipLabel(label, 1)" [attr.aria-label]="'Move ' + label + ' down'">▼</button>
                </div>
              }
            </div>
          </div>
        }

        @if (form().relationshipOtherOpen) {
          <div class="cf-subfield">
            <label [style.color]="theme.colors().textSecondary" class="cf-label cf-label--center" for="cf-custom-label">Add my own label</label>
            <div class="cf-custom-label-row">
              <input id="cf-custom-label" [(ngModel)]="form().customRelationshipLabelDraft"
                     (keydown.enter)="addCustomRelationshipLabel(); $event.preventDefault()"
                     [style.background-color]="theme.colors().bgSecondary"
                     [style.border]="inputBorder()"
                     [style.color]="theme.colors().text"
                     class="cf-input"
                     placeholder="e.g. Long distance">
              <button type="button"
                      (click)="addCustomRelationshipLabel()"
                      [style.background-color]="theme.colors().primary"
                      [style.border]="'1px solid ' + theme.colors().primary"
                      class="cf-chip cf-chip--solid">Add label</button>
            </div>
          </div>
          <div class="cf-subfield">
            <label [style.color]="theme.colors().textSecondary" class="cf-label cf-label--center" for="cf-relationship-notes">Relationship Notes</label>
            <textarea id="cf-relationship-notes" [(ngModel)]="form().relationshipNotes"
                      [style.background-color]="theme.colors().bgSecondary"
                      [style.border]="inputBorder()"
                      [style.color]="theme.colors().text"
                      rows="2"
                      placeholder="Describe your relationship status..."
                      class="cf-textarea"></textarea>
          </div>
        }

        @if (hasRelationshipLabel(heartbrokenLabel)) {
          <div class="cf-subfield">
            <label [style.color]="theme.colors().textSecondary" class="cf-label cf-label--center" for="cf-heartbreak-song">Heartbreak Song</label>
            <input id="cf-heartbreak-song" [(ngModel)]="form().heartbreakSong"
                   [style.background-color]="theme.colors().bgSecondary"
                   [style.border]="inputBorder()"
                   [style.color]="theme.colors().text"
                   placeholder="What song are you listening to?"
                   class="cf-input">
          </div>
          <div class="cf-subfield">
            <label [style.color]="theme.colors().textSecondary" class="cf-label cf-label--center" for="cf-heartbreak-recovery">How I'm Getting Over It</label>
            <textarea id="cf-heartbreak-recovery" [(ngModel)]="form().heartbreakRecovery"
                      [style.background-color]="theme.colors().bgSecondary"
                      [style.border]="inputBorder()"
                      [style.color]="theme.colors().text"
                      rows="2"
                      placeholder="Gym, journaling, long walks, etc."
                      class="cf-textarea"></textarea>
          </div>
        }
      </div>

      <!-- Vibes -->
      <div [style.border-top]="'1px solid ' + theme.colors().border" class="cf-section">
        <div class="cf-field">
          <label [style.color]="theme.colors().textSecondary" class="cf-label">Initial Vibe (1-5 Stars)</label>
          <span [style.color]="theme.colors().textSecondary" class="cf-hint cf-hint--block">Your first impression.</span>
          <div class="cf-stars" role="group" aria-label="Initial vibe">
            @for (star of stars; track star) {
              <button type="button" (click)="form().initialRating = star" [attr.aria-label]="'Set initial vibe to ' + star + ' stars'"
                      [attr.aria-pressed]="form().initialRating === star"
                      [style.color]="form().initialRating >= star ? theme.colors().accent : theme.colors().border" class="cf-star">★</button>
            }
          </div>
        </div>
        <div class="cf-field">
          <label [style.color]="theme.colors().textSecondary" class="cf-label">Current Vibe (Optional)</label>
          <span [style.color]="theme.colors().textSecondary" class="cf-hint cf-hint--block">How you feel now. Skip means the same as your initial vibe.</span>
          <div class="cf-stars" role="group" aria-label="Current vibe">
            @for (star of stars; track star) {
              <button type="button" (click)="form().currentRating = star" [attr.aria-label]="'Set current vibe to ' + star + ' stars'"
                      [attr.aria-pressed]="form().currentRating === star"
                      [style.color]="(form().currentRating ?? 0) >= star ? theme.colors().accent : theme.colors().border" class="cf-star">★</button>
            }
            <button type="button" (click)="form().currentRating = null"
                    [attr.aria-pressed]="form().currentRating === null"
                    [style.color]="form().currentRating === null ? theme.colors().primary : theme.colors().textSecondary"
                    class="cf-star cf-star--skip"
                    aria-label="Skip current vibe">Skip</button>
          </div>
        </div>
      </div>

      <!-- More about them -->
      <div [style.border-top]="'1px solid ' + theme.colors().border" class="cf-section">
        <h4 [style.color]="theme.colors().primary" class="cf-section-title">More About Them</h4>

        <div class="cf-field">
          <label [style.color]="theme.colors().textSecondary" class="cf-label cf-label--center" for="cf-bio">Bio</label>
          <textarea id="cf-bio" [(ngModel)]="form().bio" [style.background-color]="theme.colors().bgSecondary" [style.border]="inputBorder()" [style.color]="theme.colors().text" rows="3" placeholder="A little about them..." class="cf-textarea"></textarea>
        </div>

        <div class="cf-field">
          <label [style.color]="theme.colors().textSecondary" class="cf-label cf-label--center" for="cf-location">Location</label>
          <input id="cf-location" [(ngModel)]="form().location" [style.background-color]="theme.colors().bgSecondary" [style.border]="inputBorder()" [style.color]="theme.colors().text" class="cf-input">
        </div>

        <div class="cf-field">
          <label [style.color]="theme.colors().textSecondary" class="cf-label cf-label--center" for="cf-dob">Age</label>
          <input id="cf-dob" type="date" [(ngModel)]="form().dateOfBirth" [max]="todayDate" [style.background-color]="theme.colors().bgSecondary" [style.border]="inputBorder()" [style.color]="theme.colors().text" class="cf-input">
          <span [style.color]="theme.colors().textSecondary" class="cf-hint cf-hint--block">Enter their birthday so the displayed age stays current.</span>
        </div>

        <div class="cf-field">
          <label [style.color]="theme.colors().textSecondary" class="cf-label cf-label--center" for="cf-how-we-met">How We Met</label>
          <input id="cf-how-we-met" [(ngModel)]="form().howWeMet" [style.background-color]="theme.colors().bgSecondary" [style.border]="inputBorder()" [style.color]="theme.colors().text" class="cf-input">
        </div>

        <div class="cf-field">
          <label [style.color]="theme.colors().textSecondary" class="cf-label cf-label--center" for="cf-when-we-met">When We Met</label>
          <input id="cf-when-we-met" [(ngModel)]="form().whenWeMet" [style.background-color]="theme.colors().bgSecondary" [style.border]="inputBorder()" [style.color]="theme.colors().text" class="cf-input">
        </div>

        <div class="cf-field">
          <label [style.color]="theme.colors().textSecondary" class="cf-label cf-label--center">Are they in school or working?</label>
          <div class="cf-tile-grid" role="group" aria-label="School or work">
            @for (option of schoolOrWorkOptions; track option.value) {
              <div (click)="form().schoolOrWork = option.value"
                   role="button"
                   tabindex="0"
                   (keydown.enter)="form().schoolOrWork = option.value"
                   (keydown.space)="form().schoolOrWork = option.value; $event.preventDefault()"
                   [attr.aria-pressed]="form().schoolOrWork === option.value"
                   [style.border]="tileBorder(form().schoolOrWork === option.value)"
                   [style.background-color]="tileBackground(form().schoolOrWork === option.value)"
                   class="cf-tile">
                <div [style.border]="'2px solid ' + (form().schoolOrWork === option.value ? theme.colors().primary : theme.colors().textSecondary)"
                     [style.background-color]="form().schoolOrWork === option.value ? theme.colors().primary : 'transparent'"
                     class="cf-check cf-check--round">
                  @if (form().schoolOrWork === option.value) { <span class="cf-check__mark" aria-hidden="true">✓</span> }
                </div>
                <span class="cf-tile__text">{{ option.label }}</span>
              </div>
            }
          </div>
        </div>

        @if (shouldShowGrade()) {
          <div class="cf-field">
            <label [style.color]="theme.colors().textSecondary" class="cf-label cf-label--center" for="cf-grade">Grade</label>
            <input id="cf-grade" [(ngModel)]="form().grade" [style.background-color]="theme.colors().bgSecondary" [style.border]="inputBorder()" [style.color]="theme.colors().text" class="cf-input">
          </div>
        }

        @if (shouldShowOccupation()) {
          <div class="cf-field">
            <label [style.color]="theme.colors().textSecondary" class="cf-label cf-label--center" for="cf-occupation">Occupation</label>
            <input id="cf-occupation" [(ngModel)]="form().occupation" [style.background-color]="theme.colors().bgSecondary" [style.border]="inputBorder()" [style.color]="theme.colors().text" class="cf-input">
          </div>
        }

        <div class="cf-field">
          <label [style.color]="theme.colors().textSecondary" class="cf-label cf-label--center" for="cf-family">Family</label>
          <input id="cf-family" [(ngModel)]="form().family" [style.background-color]="theme.colors().bgSecondary" [style.border]="inputBorder()" [style.color]="theme.colors().text" class="cf-input">
        </div>

        <div class="cf-field">
          <label [style.color]="theme.colors().textSecondary" class="cf-label cf-label--center" for="cf-friends">Their Friends (comma separated)</label>
          <input id="cf-friends" [(ngModel)]="form().friends" [style.background-color]="theme.colors().bgSecondary" [style.border]="inputBorder()" [style.color]="theme.colors().text" class="cf-input" placeholder="e.g. Alex, Jordan, Sam">
        </div>

        <div class="cf-field">
          <label [style.color]="theme.colors().textSecondary" class="cf-label cf-label--center" for="cf-moments">Memorable Moments</label>
          <textarea id="cf-moments" [(ngModel)]="form().memorableMoments" [style.background-color]="theme.colors().bgSecondary" [style.border]="inputBorder()" [style.color]="theme.colors().text" rows="3" placeholder="Any moments worth remembering..." class="cf-textarea"></textarea>
        </div>

        <div class="cf-field">
          <label [style.color]="theme.colors().textSecondary" class="cf-label cf-label--center" for="cf-private-notes">Private Notes</label>
          <textarea id="cf-private-notes" [(ngModel)]="form().privateNotes" [style.background-color]="theme.colors().bgSecondary" [style.border]="inputBorder()" [style.color]="theme.colors().text" rows="3" placeholder="Your private thoughts..." class="cf-textarea"></textarea>
        </div>
      </div>
    </div>
  `
})
export class CrushFormComponent {
  /** The parent owns this object; the form edits it in place. */
  readonly form = input.required<CrushFormValue>();

  readonly theme = inject(ThemeService);
  readonly todayDate = new Date().toISOString().slice(0, 10);
  readonly stars = [1, 2, 3, 4, 5];

  readonly pronounOptions = PRONOUN_OPTIONS;
  readonly statusOptions = CRUSH_STATUS_OPTIONS;
  readonly displayNameOptions = DISPLAY_NAME_OPTIONS;
  readonly noteVisibilityOptions = NOTE_VISIBILITY_OPTIONS;
  readonly schoolOrWorkOptions = SCHOOL_OR_WORK_OPTIONS;
  readonly otherLabel = OTHER_LABEL;
  readonly heartbrokenLabel = HEARTBROKEN_LABEL;

  readonly listGroups: ReadonlyArray<ListGroup> = [
    { key: 'hair', notesKey: 'hairNotes', label: 'Hair', notesLabel: 'Hair Notes', placeholder: 'Describe their hair...', options: HAIR_OPTIONS },
    { key: 'eyes', notesKey: 'eyeNotes', label: 'Eyes', notesLabel: 'Eye Notes', placeholder: 'Describe their eyes...', options: EYE_OPTIONS },
    { key: 'build', notesKey: 'buildNotes', label: 'Build', notesLabel: 'Build Notes', placeholder: 'Describe their build...', options: BUILD_OPTIONS }
  ];

  readonly socialFields: ReadonlyArray<{ key: keyof CrushFormValue['social']; label: string; icon: string; placeholder: string }> = [
    { key: 'snapchat', label: 'Snapchat', icon: '👻', placeholder: 'Snapchat username' },
    { key: 'whatsapp', label: 'WhatsApp', icon: '💬', placeholder: 'WhatsApp number' },
    { key: 'twitter', label: 'Twitter', icon: '🐦', placeholder: '@username' },
    { key: 'facebook', label: 'Facebook', icon: '📘', placeholder: 'facebook.com/…' },
    { key: 'instagram', label: 'Instagram', icon: '📸', placeholder: '@username' }
  ];

  private draggedRelationshipLabel: string | null = null;

  relationshipOptions(): string[] {
    return relationshipStatusOptions(this.form().pronouns);
  }

  headlineLabel(): string | undefined {
    return this.form().relationshipLabels[0];
  }

  tileBorder(selected: boolean): string {
    return '1px solid ' + (selected ? this.theme.colors().primary : this.theme.colors().border);
  }

  tileBackground(selected: boolean): string {
    return selected ? this.theme.colors().primary + '10' : 'transparent';
  }

  inputBorder(): string {
    return '1px solid ' + this.theme.colors().border;
  }

  /** Hair / Eyes / Build: tick or untick one option. Unticking "Other" clears its notes. */
  toggleList(key: ListKey, item: string): void {
    const form = this.form();
    const list = form[key];
    const index = list.indexOf(item);
    if (index > -1) list.splice(index, 1); else list.push(item);
    if (item === OTHER_LABEL && index > -1) {
      const group = this.listGroups.find((g) => g.key === key);
      if (group) form[group.notesKey] = '';
    }
  }

  hasRelationshipLabel(label: string): boolean {
    if (label === OTHER_LABEL) return this.form().relationshipOtherOpen;
    return this.form().relationshipLabels.includes(label);
  }

  /** Multi-select. The first label chosen is the headline shown on cards. */
  toggleRelationshipLabel(label: string): void {
    const form = this.form();
    if (label === OTHER_LABEL) {
      form.relationshipOtherOpen = !form.relationshipOtherOpen;
      if (!form.relationshipOtherOpen) {
        form.relationshipNotes = '';
        form.customRelationshipLabelDraft = '';
      }
      return;
    }

    const labels = [...form.relationshipLabels];
    const index = labels.indexOf(label);
    if (index >= 0) labels.splice(index, 1); else labels.push(label);
    form.relationshipLabels = labels;

    if (!labels.includes(HEARTBROKEN_LABEL)) {
      form.heartbreakSong = '';
      form.heartbreakRecovery = '';
    }
  }

  addCustomRelationshipLabel(): void {
    const form = this.form();
    const label = (form.customRelationshipLabelDraft || '').trim();
    if (!label) return;
    if (!form.relationshipLabels.includes(label)) {
      form.relationshipLabels = [...form.relationshipLabels, label];
    }
    form.customRelationshipLabelDraft = '';
  }

  moveRelationshipLabel(label: string, delta: -1 | 1): void {
    const form = this.form();
    const labels = [...form.relationshipLabels];
    const from = labels.indexOf(label);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= labels.length) return;
    labels.splice(from, 1);
    labels.splice(to, 0, label);
    form.relationshipLabels = labels;
  }

  startRelationshipLabelDrag(label: string, event: DragEvent): void {
    this.draggedRelationshipLabel = label;
    event.dataTransfer?.setData('text/plain', label);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  clearRelationshipLabelDrag(): void {
    this.draggedRelationshipLabel = null;
  }

  dropRelationshipLabel(targetLabel: string, event: DragEvent): void {
    event.preventDefault();
    const dragged = this.draggedRelationshipLabel || event.dataTransfer?.getData('text/plain');
    this.draggedRelationshipLabel = null;
    if (!dragged || dragged === targetLabel) return;

    const form = this.form();
    const labels = [...form.relationshipLabels];
    const fromIndex = labels.indexOf(dragged);
    const toIndex = labels.indexOf(targetLabel);
    if (fromIndex < 0 || toIndex < 0) return;
    labels.splice(fromIndex, 1);
    labels.splice(toIndex, 0, dragged);
    form.relationshipLabels = labels;
  }

  shouldShowGrade(): boolean {
    const value = this.form().schoolOrWork;
    return !value || value === 'school' || value === 'both';
  }

  shouldShowOccupation(): boolean {
    const value = this.form().schoolOrWork;
    return !value || value === 'working' || value === 'both';
  }
}
