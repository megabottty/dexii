import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { VaultService, VaultFile } from '../../core/services/vault.service';
import { PrivacyService } from '../../core/services/privacy.service';
import { ThemeService } from '../../core/services/theme.service';
import { SecurityService } from '../../core/services/security.service';
import { Entry } from '../../core/models/entry.model';

@Component({
  selector: 'app-vault-center',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div [style.background-color]="theme.colors().bg" [style.color]="theme.colors().text"
         style="min-height: 100vh; font-family: 'Times New Roman', serif; padding: 60px 40px;">

      <div style="max-width: 1000px; margin: 0 auto;">

        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 60px; border-bottom: 1px solid {{ theme.colors().border }}; padding-bottom: 30px;">
          <div>
            <h2 style="font-size: 32px; font-weight: 200; text-transform: uppercase; letter-spacing: 6px; margin: 0;">Dexii Vault</h2>
            <p [style.color]="theme.colors().primary" style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-top: 8px;">Private Journal & Intimate Content</p>
          </div>
          <div style="display: flex; gap: 20px;">
             <button (click)="activeTab.set('journal')" [style.color]="activeTab() === 'journal' ? theme.colors().primary : theme.colors().textSecondary"
                     style="background: none; border: none; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; cursor: pointer;">Journal</button>
             <button (click)="activeTab.set('photos')" [style.color]="activeTab() === 'photos' ? theme.colors().primary : theme.colors().textSecondary"
                     style="background: none; border: none; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; cursor: pointer;">Photo Vault</button>
          </div>
        </div>

        <!-- Private Journal Tab -->
        @if (activeTab() === 'journal') {
          <div style="display: flex; flex-direction: column; gap: 40px;">
            <div [style.background-color]="theme.colors().bgSecondary" style="padding: 30px; border: 1px solid {{ theme.colors().border }};">
               <h3 style="font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px;">New Journal Entry</h3>
               <textarea [(ngModel)]="newJournalEntry" placeholder="Write your private thoughts here... (Never shared)"
                         [style.background-color]="theme.colors().bg" [style.color]="theme.colors().text" [style.border]="'1px solid ' + theme.colors().border"
                         style="width: 100%; height: 120px; padding: 15px; border-radius: 0px; outline: none; font-family: 'Times New Roman', serif; margin-bottom: 20px; resize: none;"></textarea>
               <button (click)="saveJournal()" [style.background-color]="theme.colors().primary"
                       style="color: white; border: none; padding: 12px 30px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; cursor: pointer;">Secure Entry</button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 24px;">
              @for (entry of journalEntries(); track entry.id) {
                <div [style.border-left]="'3px solid ' + theme.colors().primary" [style.background-color]="theme.colors().bgSecondary"
                     style="padding: 24px; position: relative;">
                  <span [style.color]="theme.colors().textSecondary" style="font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; display: block; margin-bottom: 12px;">
                    {{ entry.timestamp | date:'MMMM d, y h:mm a' }}
                  </span>
                  <p style="font-size: 16px; line-height: 1.6; font-style: italic; margin: 0;">"{{ entry.content }}"</p>
                </div>
              }
            </div>
          </div>
        }

        <!-- Photo Vault Tab -->
        @if (activeTab() === 'photos') {
          @if (!security.isVerified18()) {
            <div style="text-align: center; padding: 80px 40px; border: 1px dashed {{ theme.colors().border }};">
               <h3 style="font-size: 24px; font-weight: 200; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 20px;">18+ Restricted Area</h3>
               <p [style.color]="theme.colors().textSecondary" style="margin-bottom: 40px; font-size: 14px;">Intimate content requires age verification and additional security clearance.</p>
               <button (click)="security.verifyAge()" [style.background-color]="theme.colors().primary"
                       style="color: white; border: none; padding: 16px 40px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; cursor: pointer;">Start Verification</button>
            </div>
          } @else {
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px;">
              <div (click)="fileInput.click()" [style.border]="'2px dashed ' + theme.colors().border"
                   style="height: 200px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; opacity: 0.6; transition: opacity 0.3s;">
                <span style="font-size: 32px;">+</span>
                <span style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">Add Sensitive Photo</span>
                <input #fileInput type="file" (change)="onFileSelected($event)" accept="image/*" style="display: none;">
              </div>

              @for (file of vault.files(); track file.id) {
                <div style="height: 200px; position: relative; border: 1px solid {{ theme.colors().border }}; group">
                   <img [src]="file.url" style="width: 100%; height: 100%; object-fit: cover; filter: blur(20px); transition: filter 0.5s;"
                        (mouseenter)="$any($event.target).style.filter = 'none'"
                        (mouseleave)="$any($event.target).style.filter = 'blur(20px)'">
                   <button (click)="vault.deleteFile(file.id)" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.5); color: white; border: none; padding: 5px 8px; font-size: 10px; cursor: pointer;">✕</button>
                   <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 10px; background: rgba(0,0,0,0.4); color: white; font-size: 8px; text-transform: uppercase; letter-spacing: 1px;">
                     {{ file.uploadedAt | date:'MMM d' }} • TAP TO UNBLUR
                   </div>
                </div>
              }
            </div>
          }
        }

      </div>
    </div>
  `
})
export class VaultCenterComponent {
  public vault = inject(VaultService);
  public privacy = inject(PrivacyService);
  public theme = inject(ThemeService);
  public security = inject(SecurityService);

  activeTab = signal<'journal' | 'photos'>('journal');
  newJournalEntry = '';

  journalEntries = computed(() =>
    this.privacy.getEntriesForCrush('private_vault')() // Using a special ID for global journal
  );

  saveJournal() {
    if (!this.newJournalEntry.trim()) return;
    this.privacy.addEntry({
      crushId: 'private_vault',
      type: 'PrivateJournal',
      content: this.newJournalEntry,
      visibility: [],
      isSensitive: true
    });
    this.newJournalEntry = '';
    alert("Journal entry secured. Permanently separate from all sharing.");
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.vault.uploadImage(file);
      alert("Sensitive image uploaded and blurred in your vault.");
    }
  }
}
