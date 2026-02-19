import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PrivacyService } from '../../core/services/privacy.service';
import { ThemeService } from '../../core/services/theme.service';
import { SecurityService } from '../../core/services/security.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { CrushProfile, CrushStatus } from '../../core/models/crush-profile.model';
import { Entry } from '../../core/models/entry.model';

@Component({
  selector: 'app-profile-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div [style.background-color]="theme.colors().bg" [style.color]="theme.colors().text"
         style="min-height: 100vh; font-family: 'Times New Roman', serif; padding: 60px 40px; transition: all 0.8s ease; position: relative; overflow-x: hidden;">

      <div style="max-width: 1000px; margin: 0 auto; position: relative; z-index: 10;">

        <!-- Back Button -->
        <a routerLink="/dashboard" [style.color]="theme.colors().textSecondary"
           style="display: inline-flex; align-items: center; gap: 12px; text-decoration: none; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 60px;">
          ← Return to Collection
        </a>

        @if (crush(); as c) {
          <!-- Glamour Header -->
          <header style="display: flex; gap: 60px; align-items: center; margin-bottom: 80px; flex-wrap: wrap;">
            <div [style.border]="'1px solid ' + theme.colors().border"
                 style="width: 280px; height: 380px; border-radius: 0px; overflow: hidden; shadow: 0 30px 60px -12px rgba(0,0,0,0.2); position: relative;">
              <img [src]="c.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop'"
                   style="width: 100%; height: 100%; object-fit: cover;">
              @if (theme.mode() === 'light') {
                <div style="position: absolute; inset: 0; border: 15px solid rgba(255,255,255,0.1); pointer-events: none;"></div>
              }
            </div>

            <div style="flex: 1; min-width: 340px;">
              <div style="margin-bottom: 32px;">
                <span [style.color]="theme.colors().primary" style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 5px; display: block; margin-bottom: 16px;">
                  Exclusive {{ c.status }}
                </span>
                <h1 style="font-size: 72px; font-weight: 200; margin: 0; line-height: 0.9; text-transform: uppercase; letter-spacing: -2px;">{{ c.nickname }}</h1>
              </div>

              <p [style.color]="theme.colors().textSecondary" style="font-size: 22px; margin: 0 0 40px 0; font-style: italic; font-weight: 200;">{{ c.fullName }}</p>

              <div style="display: flex; gap: 20px;">
                <button (click)="addNote(c.id)" [style.background-color]="theme.colors().primary"
                        style="color: white; border: none; padding: 14px 40px; border-radius: 0px; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 2px; shadow: 0 10px 20px rgba(219,39,119,0.2);">
                  Add Note
                </button>
                <button (click)="toggleSafety(c.id)" [style.background-color]="'transparent'"
                        [style.color]="isSafetyActive() ? '#ef4444' : theme.colors().text"
                        [style.border]="'1px solid ' + (isSafetyActive() ? '#ef4444' : theme.colors().text)"
                        style="padding: 14px 40px; border-radius: 0px; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 2px;">
                  {{ isSafetyActive() ? 'Emergency Mode' : 'Safety Check' }}
                </button>
                <button (click)="toggleArchive(c)" [style.background-color]="'transparent'"
                        [style.color]="theme.colors().textSecondary"
                        [style.border]="'1px solid ' + theme.colors().border"
                        style="padding: 14px 20px; border-radius: 0px; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 2px; font-size: 10px;">
                  {{ c.status === statuses.Archived ? 'Unarchive' : 'Archive' }}
                </button>
              </div>
            </div>
          </header>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 80px;">
            <!-- Left -->
            <div>
              <section style="margin-bottom: 60px;">
                <h3 [style.color]="theme.colors().textSecondary" style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 24px; border-bottom: 1px solid; padding-bottom: 8px;">The Narrative</h3>
                <p [style.color]="theme.colors().text" style="font-size: 20px; line-height: 1.8; margin: 0 0 32px 0; font-style: italic; font-weight: 200;">
                  "{{ c.bio || 'A mysterious entry in the personal rolodex, awaiting further interaction and documentation.' }}"
                </p>

                <div style="display: flex; flex-wrap: wrap; gap: 32px; border-top: 1px solid {{theme.colors().border}}; padding-top: 32px;">
                  @if (c.hair && c.hair.length > 0) {
                    <div>
                      <span [style.color]="theme.colors().textSecondary" style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; display: block; margin-bottom: 8px;">Hair</span>
                      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        @for (h of c.hair; track h) {
                          <span [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" style="padding: 4px 12px; font-size: 12px; border-radius: 4px;">{{h}}</span>
                        }
                      </div>
                    </div>
                  }
                  @if (c.eyes && c.eyes.length > 0) {
                    <div>
                      <span [style.color]="theme.colors().textSecondary" style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; display: block; margin-bottom: 8px;">Eyes</span>
                      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        @for (e of c.eyes; track e) {
                          <span [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" style="padding: 4px 12px; font-size: 12px; border-radius: 4px;">{{e}}</span>
                        }
                      </div>
                    </div>
                  }
                  @if (c.build && c.build.length > 0) {
                    <div>
                      <span [style.color]="theme.colors().textSecondary" style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; display: block; margin-bottom: 8px;">Build</span>
                      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        @for (b of c.build; track b) {
                          <span [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" style="padding: 4px 12px; font-size: 12px; border-radius: 4px;">{{b}}</span>
                        }
                      </div>
                    </div>
                  }
                </div>

                @if (c.social && (c.social.snapchat || c.social.whatsapp || c.social.twitter || c.social.facebook || c.social.instagram)) {
                  <div style="margin-top: 32px; display: flex; gap: 20px; flex-wrap: wrap;">
                    @if (c.social.snapchat) { <div [style.color]="theme.colors().text" style="font-size: 13px;">👻 {{c.social.snapchat}}</div> }
                    @if (c.social.whatsapp) { <div [style.color]="theme.colors().text" style="font-size: 13px;">💬 {{c.social.whatsapp}}</div> }
                    @if (c.social.twitter) { <div [style.color]="theme.colors().text" style="font-size: 13px;">🐦 {{c.social.twitter}}</div> }
                    @if (c.social.facebook) { <div [style.color]="theme.colors().text" style="font-size: 13px;">📘 {{c.social.facebook}}</div> }
                    @if (c.social.instagram) { <div [style.color]="theme.colors().text" style="font-size: 13px;">📸 {{c.social.instagram}}</div> }
                  </div>
                }

                @if (c.relationshipStatus) {
                  <div style="margin-top: 32px; padding: 16px; border: 1px dashed {{theme.colors().primary}}; display: inline-block;">
                    <span [style.color]="theme.colors().primary" style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; display: block; margin-bottom: 4px;">Status with me</span>
                    <span style="font-size: 15px; font-weight: 400;">{{c.relationshipStatus}}</span>
                  </div>
                }
              </section>

              <section>
                <h3 [style.color]="theme.colors().textSecondary" style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 24px; border-bottom: 1px solid; padding-bottom: 8px;">History</h3>
                <div [style.border-left]="'1px solid ' + theme.colors().border" style="padding-left: 32px; margin-left: 4px;">
                   @for (entry of entries(); track entry.id) {
                     <div style="margin-bottom: 32px; position: relative;">
                       <div [style.background-color]="theme.colors().primary" style="position: absolute; left: -37px; top: 4px; width: 9px; height: 9px; border-radius: 50%;"></div>
                       <span [style.color]="theme.colors().primary" style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; display: block; margin-bottom: 8px;">
                         {{ entry.type }} • {{ entry.timestamp | date:'MMM d' }}
                         <span *ngIf="entry.isBurnAfterReading" style="color: #ef4444; margin-left: 8px;">🔥 Disappearing</span>
                       </span>
                       <p [style.color]="theme.colors().textSecondary" style="font-size: 14px; line-height: 1.6; margin: 0;">{{ entry.content }}</p>
                     </div>
                   }
                </div>
              </section>
            </div>

            <!-- Right -->
            <div style="display: flex; flex-direction: column; gap: 40px;">
              <div [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" style="padding: 40px; border-radius: 0px;">
                 <h4 [style.color]="theme.colors().textSecondary" style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 32px; text-align: center;">Vibe Analysis</h4>

                 <!-- Tea-Meter Visual -->
                 <div style="display: flex; align-items: flex-end; justify-content: center; gap: 8px; height: 60px; margin-bottom: 24px;">
                    @for (vibe of c.vibeHistory; track $index) {
                      <div [style.height]="(vibe * 10) + '%'"
                           [style.background-color]="theme.colors().primary"
                           [style.opacity]="0.3 + ($index * (0.7 / c.vibeHistory.length))"
                           style="width: 12px; border-radius: 2px; transition: all 1s ease;"></div>
                    }
                 </div>

                 <div style="text-align: center; margin-bottom: 32px;">
                   <button (click)="logVibe(c.id)" style="background: none; border: none; color: {{theme.colors().primary}}; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; cursor: pointer; text-decoration: underline;">
                     Log New Vibe
                   </button>
                 </div>

                 <div style="text-align: center; margin-bottom: 40px;">
                   <p [style.color]="theme.colors().textSecondary" style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px;">Attraction Level</p>
                   <div [style.color]="theme.colors().accent" style="font-size: 24px; letter-spacing: 8px;">
                     @for (star of [1,2,3,4,5]; track star) {
                       {{ (c.rating || 0) >= star ? '★' : '☆' }}
                     }
                   </div>
                 </div>

                 <div style="text-align: center; margin-bottom: 40px;">
                   <p [style.color]="theme.colors().textSecondary" style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Cautionary Flags</p>
                   <p [style.color]="c.redFlags > 2 ? '#ef4444' : theme.colors().text" style="font-size: 24px; font-weight: 900; margin: 0;">{{ c.redFlags }}</p>
                 </div>

                 <button (click)="logRedFlag(c.id)" style="width: 100%; background: transparent; color: #ef4444; border: 1px solid #ef4444; padding: 14px; border-radius: 0px; font-size: 10px; font-weight: 900; cursor: pointer; text-transform: uppercase; letter-spacing: 3px; transition: all 0.3s;">
                   Mark Red Flag
                 </button>
              </div>

              <div [style.border]="'1px solid ' + theme.colors().border" style="padding: 32px; text-align: center; font-style: italic;">
                 <p [style.color]="theme.colors().textSecondary" style="font-size: 12px; line-height: 1.6; margin: 0;">"The tea is always sweeter when it's kept in the vault."</p>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class ProfileDetailComponent {
  private route = inject(ActivatedRoute);
  private privacy = inject(PrivacyService);
  public theme = inject(ThemeService);
  public security = inject(SecurityService);
  public subscription = inject(SubscriptionService);

  crushId = signal<string | null>(null);
  isSafetyActive = signal(false);
  statuses = CrushStatus;

  crush = computed(() => {
    const id = this.crushId();
    if (!id) return null;
    return this.privacy.visibleCrushes().find(c => c.id === id) || null;
  });

  entries = computed(() => {
    const id = this.crushId();
    if (!id) return [];
    return this.privacy.getEntriesForCrush(id)();
  });

  constructor() {
    this.crushId.set(this.route.snapshot.paramMap.get('id'));
  }

  logRedFlag(id: string) {
    this.privacy.incrementRedFlag(id);
    this.privacy.addEntry({
      crushId: id,
      type: 'RedFlag',
      content: 'A new cautionary flag was raised.',
      isBurnAfterReading: false,
      visibility: [],
      isSensitive: false
    });
  }

  logVibe(id: string) {
    const score = prompt("Rate the current vibe (1-10):", "5");
    if (score && !isNaN(Number(score))) {
      const num = Math.max(1, Math.min(10, Number(score)));
      this.privacy.updateVibe(id, num);
      this.privacy.addEntry({
        crushId: id,
        type: 'Note',
        content: `New Vibe Analysis Logged: ${num}/10`,
        isBurnAfterReading: false,
        visibility: [],
        isSensitive: false
      });
    }
  }

  addNote(id: string) {
    const tea = prompt("What's the tea?");
    if (tea) {
      const isBurn = confirm("Should this note disappear after reading?");
      this.privacy.addEntry({
        crushId: id,
        type: 'Note',
        content: tea,
        isBurnAfterReading: isBurn,
        visibility: [],
        isSensitive: false
      });
    }
  }

  toggleSafety(id: string) {
    this.isSafetyActive.update(v => !v);
    const status = this.isSafetyActive() ? 'Sent' : 'Safe';

    this.privacy.addEntry({
      crushId: id,
      type: 'SafetyCheck',
      content: this.isSafetyActive() ? 'Safety Check-In Started.' : 'Safety Check-In Resolved: I am safe.',
      visibility: [],
      isSensitive: true,
      safetyStatus: status,
      safetyContactId: 'friend_99' // Mock contact
    });

    if (this.isSafetyActive()) {
      alert("Safety Check Enabled. Your trusted contacts have been notified of your 'Date' status.");
    } else {
      alert("Safety Check Resolved. Status updated to Safe.");
    }
  }

  toggleArchive(crush: CrushProfile) {
    const newStatus = crush.status === CrushStatus.Archived ? CrushStatus.Crush : CrushStatus.Archived;
    this.privacy.setCrushes(this.privacy.visibleCrushes().map(c =>
      c.id === crush.id ? { ...c, status: newStatus } : c
    ));
    alert(newStatus === CrushStatus.Archived ? "Profile moved to Archive." : "Profile restored to active.");
  }
}
