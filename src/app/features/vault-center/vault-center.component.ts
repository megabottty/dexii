import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { VaultService } from '../../core/services/vault.service';
import { DataService } from '../../core/services/data.service';
import { ThemeService } from '../../core/services/theme.service';
import { SecurityService } from '../../core/services/security.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { ModalService } from '../../core/services/modal.service';
import { SubscriptionTier } from '../../core/models/user.model';
import { PageHintComponent } from '../../core/components/page-hint.component';

@Component({
  selector: 'app-vault-center',
  standalone: true,
  styleUrl: './vault-center.component.css',
  imports: [CommonModule, FormsModule, RouterModule, PageHintComponent],
  template: `
    <div [style.background-color]="theme.colors().bg" [style.color]="theme.colors().text"
         class="vault-center-component__s1">

      <div class="vault-center-component__s2">
        <app-page-hint
          hintKey="vault_inline"
          title="Vault Hint"
          message="Journal entries are private and never shared. Photo Vault unlocks on Premium/Gold with age verification.">
        </app-page-hint>

        <nav aria-label="Primary navigation" [style.background-color]="theme.colors().bgSecondary"
             [style.border]="'1px solid ' + theme.colors().border"
             class="vault-center-component__s3">
          <div class="vault-center-component__s4">
            <div [style.background]="'linear-gradient(135deg, ' + theme.colors().primary + ', ' + theme.colors().accent + ')'"
                 class="vault-center-component__s5">D</div>
            <span class="vault-center-component__s6">Dexii</span>
          </div>
          <div class="vault-center-component__s7">
            <a routerLink="/dashboard" [style.color]="theme.colors().text" [style.border]="'1px solid ' + theme.colors().border"
               class="vault-nav-link">Dashboard</a>
            <a routerLink="/friends" [style.color]="theme.colors().text" [style.border]="'1px solid ' + theme.colors().border"
               class="vault-nav-link">Friends</a>
            <a routerLink="/chat" [style.color]="theme.colors().text" [style.border]="'1px solid ' + theme.colors().border"
               class="vault-nav-link">Chat</a>
            <button (click)="theme.toggleTheme()" [style.color]="theme.colors().text"
                    [style.border]="'1px solid ' + theme.colors().border"
                    class="vault-center-component__s8">
              {{ theme.mode() === 'dark' ? 'Pearl' : 'Onyx' }}
            </button>
            <button (click)="security.lockApp()" [style.background-color]="theme.colors().primary"
                    class="vault-center-component__s9">
              Lock
            </button>
          </div>
        </nav>

        <div [style.border-bottom]="'1px solid ' + theme.colors().border" class="vault-header">
          <div class="logo-group">
            <div class="logo-wrapper">
              <span class="logo-text d" [style.color]="theme.colors().text">d</span>
              <span class="logo-text e" [style.color]="theme.colors().text">e</span>
              <span class="logo-text x" [style.color]="theme.colors().text">x</span>
              <div class="logo-icon boy" [style.color]="theme.colors().primary">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="4" r="2"/>
                  <path d="M15 7H9a1 1 0 0 0-1 1v7h2v7h4v-7h2V8a1 1 0 0 0-1-1z"/>
                </svg>
              </div>
              <div class="logo-icon girl" [style.color]="theme.colors().primary">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="4" r="2.5"/>
                  <path d="M12 7L18 16H6L12 7zM10 16h2v6h-2zm2 0h2v6h-2z"/>
                </svg>
              </div>
              <span class="logo-text vault-label" [style.color]="theme.colors().text">vault</span>
            </div>
            <p [style.color]="theme.colors().primary" class="vault-subtitle">Private Journal & Intimate Content</p>
          </div>
          <div class="vault-center-component__s12">
             <button (click)="activeTab.set('journal')" [style.color]="activeTab() === 'journal' ? theme.colors().primary : theme.colors().textSecondary"
                     class="vault-center-component__s13">Journal</button>
             <button (click)="activeTab.set('photos')" [style.color]="activeTab() === 'photos' ? theme.colors().primary : theme.colors().textSecondary"
                     class="vault-center-component__s13">Photo Vault</button>
          </div>
        </div>

        <!-- Private Journal Tab -->
        @if (activeTab() === 'journal') {
          <div class="vault-center-component__s14">
            <div [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" class="vault-journal-box">
               <h3 class="vault-center-component__s15">New Journal Entry</h3>
               <textarea [(ngModel)]="newJournalEntry" placeholder="Write your private thoughts here... (Never shared)"
                         [style.background-color]="theme.colors().bg" [style.color]="theme.colors().text" [style.border]="'1px solid ' + theme.colors().border"
                         class="vault-center-component__s16"></textarea>
               <button (click)="saveJournal()" [style.background-color]="theme.colors().primary"
                       class="vault-center-component__s17">Secure Entry</button>
            </div>

            <div class="vault-center-component__s18">
              @for (entry of journalEntries(); track entry.id) {
                <div [style.border-left]="'3px solid ' + theme.colors().primary" [style.background-color]="theme.colors().bgSecondary"
                     class="vault-center-component__s19">
                  <span [style.color]="theme.colors().textSecondary" class="vault-center-component__s20">
                    {{ entry.timestamp | date:'MMMM d, y h:mm a' }}
                  </span>
                  <p class="vault-center-component__s21">"{{ entry.content }}"</p>
                </div>
              }
            </div>
          </div>
        }

        <!-- Photo Vault Tab -->
        @if (activeTab() === 'photos') {
          @if (!subscription.isPremium()) {
            <div [style.border]="'1px dashed ' + theme.colors().border" class="vault-upgrade-box">
              <h3 class="vault-center-component__s22">Premium Vault Feature</h3>
              <p [style.color]="theme.colors().textSecondary" class="vault-center-component__s23">18+ Photo Vault is available on Premium and Gold tiers.</p>
              <button (click)="subscription.upgrade(premiumTier)" [style.background-color]="theme.colors().primary"
                      class="vault-center-component__s24">Upgrade to Premium</button>
            </div>
          } @else if (!security.isVerified18()) {
            <div [style.border]="'1px dashed ' + theme.colors().border" class="vault-upgrade-box">
               <h3 class="vault-center-component__s22">18+ Restricted Area</h3>
               <p [style.color]="theme.colors().textSecondary" class="vault-center-component__s23">Intimate content requires age verification and additional security clearance.</p>
               <button (click)="security.verifyAge()" [style.background-color]="theme.colors().primary"
                       class="vault-center-component__s24">Start Verification</button>
            </div>
          } @else {
            <div class="vault-center-component__s25">
              <div (click)="fileInput.click()"
                   (keydown.enter)="fileInput.click()"
                   (keydown.space)="fileInput.click(); $event.preventDefault()"
                   role="button"
                   tabindex="0"
                   [style.border]="'2px dashed ' + theme.colors().border"
                   class="vault-center-component__s26">
                <span class="vault-center-component__s27">+</span>
                <span class="vault-center-component__s28">Add Sensitive Photo</span>
                <input #fileInput type="file" (change)="onFileSelected($event)" accept="image/*" class="vault-center-component__s29">
              </div>

              @for (file of vault.files(); track file.id) {
                <div [style.border]="'1px solid ' + theme.colors().border" class="vault-photo-card">
                   <img [src]="file.url"
                        alt="Sensitive vault image"
                        (mouseenter)="$any($event.target).style.filter = 'none'"
                        (mouseleave)="$any($event.target).style.filter = 'blur(20px)'" class="vault-center-component__s30">
                   <button (click)="vault.deleteFile(file.id)" aria-label="Delete sensitive photo" class="vault-center-component__s31">✕</button>
                   <div class="vault-center-component__s32">
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
  public dataService = inject(DataService);
  public theme = inject(ThemeService);
  public security = inject(SecurityService);
  public subscription = inject(SubscriptionService);
  public modal = inject(ModalService);
  premiumTier = SubscriptionTier.Premium;

  activeTab = signal<'journal' | 'photos'>('journal');
  newJournalEntry = '';

  journalEntries = computed(() =>
    this.dataService.getEntriesForCrush('private_vault')() // Using a special ID for global journal
  );

  saveJournal() {
    if (!this.newJournalEntry.trim()) return;
    if (!this.security.moderateContent(this.newJournalEntry)) {
      this.modal.show('Journal entry flagged by AI moderation.');
      return;
    }
    this.dataService.addEntry({
      crushId: 'private_vault',
      type: 'PrivateJournal',
      content: this.newJournalEntry,
      visibility: [],
      isSensitive: true
    });
    this.newJournalEntry = '';
    this.modal.show('Journal entry secured. Permanently separate from all sharing.');
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.vault.uploadImage(file);
      this.modal.show('Sensitive image uploaded and blurred in your vault.');
    }
  }
}
