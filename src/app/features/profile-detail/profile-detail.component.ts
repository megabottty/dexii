import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { ThemeService } from '../../core/services/theme.service';
import { SecurityService } from '../../core/services/security.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { ModalService } from '../../core/services/modal.service';
import { CrushProfile, CrushStatus } from '../../core/models/crush-profile.model';
import { PageHintComponent } from '../../core/components/page-hint.component';

@Component({
  selector: 'app-profile-detail',
  standalone: true,
  styleUrl: './profile-detail.component.css',
  imports: [CommonModule, RouterModule, PageHintComponent],
  template: `
    <div [style.background-color]="theme.colors().bg" [style.color]="theme.colors().text"
         class="profile-detail-component__s1">

      <div class="profile-detail-component__s2">
        <app-page-hint
          hintKey="profile_inline"
          title="Profile Hint"
          message="Use Add Note for updates, log vibe and red flags over time, and use Safety actions when needed.">
        </app-page-hint>

        <!-- Back Button -->
        <a routerLink="/dashboard" [style.color]="theme.colors().textSecondary"
           class="profile-detail-component__s3">
          ← Return to Collection
        </a>

        @if (crush(); as c) {
          <!-- Glamour Header -->
          <header class="profile-detail-component__s4">
            <div [style.border]="'1px solid ' + theme.colors().border"
                 class="profile-detail-component__s5">
              <img [src]="c.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop'"
                   [alt]="c.nickname + ' profile photo'"
                   class="profile-detail-component__s6">
              @if (theme.mode() === 'light') {
                <div class="profile-detail-component__s7"></div>
              }
            </div>

            <div class="profile-detail-component__s8">
              <div class="profile-detail-component__s9">
                <span [style.color]="theme.colors().primary" class="profile-detail-component__s10">
                  Exclusive {{ c.status }}
                </span>
                <h1 class="profile-detail-component__s11">{{ c.nickname }}</h1>
              </div>

              <p [style.color]="theme.colors().textSecondary" class="profile-detail-component__s12">{{ c.fullName }}</p>

              <div class="profile-detail-component__s13">
                <button (click)="addNote(c.id)" [style.background-color]="theme.colors().primary"
                        class="profile-detail-component__s14">
                  Add Note
                </button>
                <button (click)="onDateMode.set(!onDateMode())" [style.background-color]="'transparent'"
                        [style.color]="onDateMode() ? theme.colors().primary : theme.colors().text"
                        [style.border]="'1px solid ' + (onDateMode() ? theme.colors().primary : theme.colors().text)"
                        class="profile-detail-component__s15">
                  Going on a Date
                </button>
                @if (onDateMode()) {
                  <button (click)="startSafetyCheck(c.id)" [style.background-color]="'transparent'"
                          [style.color]="safetyState() === 'Sent' ? theme.colors().primary : theme.colors().text"
                          [style.border]="'1px solid ' + (safetyState() === 'Sent' ? theme.colors().primary : theme.colors().text)"
                          class="profile-detail-component__s15">
                    Send Check-In
                  </button>
                  <button (click)="markSafe(c.id)" [style.background-color]="'transparent'"
                          [style.color]="safetyState() === 'Safe' ? '#16a34a' : theme.colors().text"
                          [style.border]="'1px solid ' + (safetyState() === 'Safe' ? '#16a34a' : theme.colors().text)"
                          class="profile-detail-component__s15">
                    Mark Safe
                  </button>
                  <button (click)="triggerEmergency(c.id)" [style.background-color]="'transparent'"
                          [style.color]="safetyState() === 'Urgent' ? '#ef4444' : theme.colors().text"
                          [style.border]="'1px solid ' + (safetyState() === 'Urgent' ? '#ef4444' : theme.colors().text)"
                          class="profile-detail-component__s15">
                    Emergency Mode
                  </button>
                }
                <button (click)="toggleArchive(c)" [style.background-color]="'transparent'"
                        [style.color]="theme.colors().textSecondary"
                        [style.border]="'1px solid ' + theme.colors().border"
                        class="profile-detail-component__s16">
                  {{ c.status === statuses.Archived ? 'Unarchive' : 'Archive' }}
                </button>
              </div>
              <p [style.color]="safetyState() === 'Urgent' ? '#ef4444' : theme.colors().textSecondary"
                 class="profile-detail-component__s17">
                Safety Status: {{ safetyState() }}
              </p>
            </div>
          </header>

              <div class="profile-detail-component__s18">
            <!-- Left -->
            <div>
              <section class="profile-detail-component__s19">
                <h3 [style.color]="theme.colors().textSecondary" class="profile-detail-component__s20">The Narrative</h3>
                <p [style.color]="theme.colors().text" class="profile-detail-component__s21">
                  "{{ c.bio || 'A mysterious entry in the personal rolodex, awaiting further interaction and documentation.' }}"
                </p>

                <div [style.border-top]="'1px solid ' + theme.colors().border" class="profile-detail-traits">
                  @if (c.hair && c.hair.length > 0) {
                    <div>
                      <span [style.color]="theme.colors().textSecondary" class="profile-detail-component__s22">Hair</span>
                      <div class="profile-detail-component__s23">
                        @for (h of c.hair; track h) {
                          <span [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" class="profile-detail-component__s24">{{h}}</span>
                        }
                      </div>
                    </div>
                  }
                  @if (c.eyes && c.eyes.length > 0) {
                    <div>
                      <span [style.color]="theme.colors().textSecondary" class="profile-detail-component__s22">Eyes</span>
                      <div class="profile-detail-component__s23">
                        @for (e of c.eyes; track e) {
                          <span [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" class="profile-detail-component__s24">{{e}}</span>
                        }
                      </div>
                    </div>
                  }
                  @if (c.build && c.build.length > 0) {
                    <div>
                      <span [style.color]="theme.colors().textSecondary" class="profile-detail-component__s22">Build</span>
                      <div class="profile-detail-component__s23">
                        @for (b of c.build; track b) {
                          <span [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" class="profile-detail-component__s24">{{b}}</span>
                        }
                      </div>
                    </div>
                  }
                </div>

                @if (c.social && (c.social.snapchat || c.social.whatsapp || c.social.twitter || c.social.facebook || c.social.instagram)) {
                  <div class="profile-detail-component__s25">
                    @if (c.social.snapchat) { <div [style.color]="theme.colors().text" class="profile-detail-component__s26">👻 {{c.social.snapchat}}</div> }
                    @if (c.social.whatsapp) { <div [style.color]="theme.colors().text" class="profile-detail-component__s26">💬 {{c.social.whatsapp}}</div> }
                    @if (c.social.twitter) { <div [style.color]="theme.colors().text" class="profile-detail-component__s26">🐦 {{c.social.twitter}}</div> }
                    @if (c.social.facebook) { <div [style.color]="theme.colors().text" class="profile-detail-component__s26">📘 {{c.social.facebook}}</div> }
                    @if (c.social.instagram) { <div [style.color]="theme.colors().text" class="profile-detail-component__s26">📸 {{c.social.instagram}}</div> }
                  </div>
                }

                @if (c.relationshipStatus) {
                  <div [style.border]="'1px dashed ' + theme.colors().primary" class="profile-detail-relationship">
                    <span [style.color]="theme.colors().primary" class="profile-detail-component__s27">Status with me</span>
                    <span class="profile-detail-component__s28">{{c.relationshipStatus}}</span>
                  </div>
                }
              </section>

              <section>
                <h3 [style.color]="theme.colors().textSecondary" class="profile-detail-component__s20">History</h3>
                <div [style.border-left]="'1px solid ' + theme.colors().border" class="profile-detail-component__s29">
                   @for (entry of entries(); track entry.id) {
                     <div class="profile-detail-component__s30">
                       <div [style.background-color]="theme.colors().primary" class="profile-detail-component__s31"></div>
                       <span [style.color]="theme.colors().primary" class="profile-detail-component__s22">
                         {{ entry.type }} • {{ entry.timestamp | date:'MMM d' }}
                         <span *ngIf="entry.isBurnAfterReading" class="profile-detail-component__s32">🔥 Disappearing</span>
                       </span>
                       <p [style.color]="theme.colors().textSecondary" class="profile-detail-component__s33">{{ entry.content }}</p>
                     </div>
                   }
                </div>
              </section>
            </div>

            <!-- Right -->
            <div class="profile-detail-component__s34">
              <div [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" class="profile-detail-component__s35">
                 <h4 [style.color]="theme.colors().textSecondary" class="profile-detail-component__s36">Vibe Analysis</h4>

                 <!-- Tea-Meter Visual -->
                 <div class="profile-detail-component__s37">
                    @for (vibe of c.vibeHistory; track $index) {
                      <div [style.height]="(vibe * 10) + '%'"
                           [style.background-color]="theme.colors().primary"
                           [style.opacity]="0.3 + ($index * (0.7 / c.vibeHistory.length))"
                           class="profile-detail-component__s38"></div>
                    }
                 </div>

                 <div class="profile-detail-component__s39">
                   <button (click)="logVibe(c.id)" [style.color]="theme.colors().primary" class="profile-detail-vibe-btn">
                     Log New Vibe
                   </button>
                 </div>

                 <div class="profile-detail-component__s40">
                   <p [style.color]="theme.colors().textSecondary" class="profile-detail-component__s41">Attraction Level</p>
                   <div [style.color]="theme.colors().accent" class="profile-detail-component__s42">
                     @for (star of [1,2,3,4,5]; track star) {
                       {{ (c.rating || 0) >= star ? '★' : '☆' }}
                     }
                   </div>
                 </div>

                 <div class="profile-detail-component__s40">
                   <p [style.color]="theme.colors().textSecondary" class="profile-detail-component__s43">Cautionary Flags</p>
                   <p [style.color]="c.redFlags > 2 ? '#ef4444' : theme.colors().text" class="profile-detail-red-flag-count">{{ c.redFlags }}</p>
                   @if (c.redFlags >= 3) {
                     <p class="profile-detail-component__s44">Vibe Shift Detected</p>
                   }
                 </div>

                 <button (click)="logRedFlag(c.id)" class="profile-detail-component__s45">
                   Mark Red Flag
                 </button>
              </div>

              <div [style.border]="'1px solid ' + theme.colors().border" class="profile-detail-component__s46">
                 <p [style.color]="theme.colors().textSecondary" class="profile-detail-component__s47">"The tea is always sweeter when it's kept in the vault."</p>
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
  private dataService = inject(DataService);
  public theme = inject(ThemeService);
  public security = inject(SecurityService);
  public subscription = inject(SubscriptionService);
  public modal = inject(ModalService);

  crushId = signal<string | null>(null);
  safetyState = signal<'Draft' | 'Sent' | 'Safe' | 'Urgent'>('Draft');
  onDateMode = signal(false);
  statuses = CrushStatus;

  crush = computed(() => {
    const id = this.crushId();
    if (!id) return null;
    return this.dataService.visibleCrushes().find(c => c.id === id) || null;
  });

  entries = computed(() => {
    const id = this.crushId();
    if (!id) return [];
    return this.dataService.getEntriesForCrush(id)();
  });

  constructor() {
    this.crushId.set(this.route.snapshot.paramMap.get('id'));
  }

  logRedFlag(id: string) {
    this.dataService.incrementRedFlag(id);
    this.dataService.addEntry({
      crushId: id,
      type: 'RedFlag',
      content: 'A new cautionary flag was raised.',
      isBurnAfterReading: false,
      visibility: [],
      isSensitive: false
    });
  }

  logVibe(id: string) {
    this.modal.prompt("Rate the current vibe (1-10):", "5", (score) => {
      if (score && !isNaN(Number(score))) {
        const num = Math.max(1, Math.min(10, Number(score)));
        this.dataService.updateVibe(id, num);
        this.dataService.addEntry({
          crushId: id,
          type: 'Note',
          content: `New Vibe Analysis Logged: ${num}/10`,
          isBurnAfterReading: false,
          visibility: [],
          isSensitive: false
        });
      }
    });
  }

  addNote(id: string) {
    this.modal.prompt("What's the tea?", "", (tea) => {
      if (tea) {
        if (!this.security.moderateContent(tea)) {
          this.modal.show('Note flagged by AI moderation for safety.');
          return;
        }
        this.modal.confirm("Should this note disappear after reading?", () => {
          this.dataService.addEntry({
            crushId: id,
            type: 'Note',
            content: tea,
            isBurnAfterReading: true,
            visibility: [],
            isSensitive: false
          });
        }, () => {
          this.dataService.addEntry({
            crushId: id,
            type: 'Note',
            content: tea,
            isBurnAfterReading: false,
            visibility: [],
            isSensitive: false
          });
        });
      }
    });
  }

  startSafetyCheck(id: string) {
    this.safetyState.set('Sent');
    this.dataService.addEntry({
      crushId: id,
      type: 'SafetyCheck',
      content: 'Safety Check-In Started.',
      visibility: [],
      isSensitive: true,
      safetyStatus: 'Sent',
      safetyContactId: 'friend_99' // Mock contact
    });
    this.modal.show('Safety Check Enabled. Your trusted contacts have been notified.');
  }

  markSafe(id: string) {
    this.safetyState.set('Safe');
    this.dataService.addEntry({
      crushId: id,
      type: 'SafetyCheck',
      content: 'Safety Check-In Resolved: I am safe.',
      visibility: [],
      isSensitive: true,
      safetyStatus: 'Safe',
      safetyContactId: 'friend_99'
    });
    this.modal.show('Safety Check resolved and marked Safe.');
  }

  triggerEmergency(id: string) {
    this.safetyState.set('Urgent');
    this.dataService.addEntry({
      crushId: id,
      type: 'SafetyCheck',
      content: 'Emergency Mode escalated. Immediate assistance requested.',
      visibility: [],
      isSensitive: true,
      safetyStatus: 'Urgent',
      safetyContactId: 'friend_99'
    });
    this.modal.show('Emergency Mode enabled. Trusted contacts alerted urgently.');
  }

  toggleArchive(crush: CrushProfile) {
    const newStatus = crush.status === CrushStatus.Archived ? CrushStatus.Crush : CrushStatus.Archived;
    this.dataService.setCrushes(this.dataService.visibleCrushes().map(c =>
      c.id === crush.id ? { ...c, status: newStatus } : c
    ));
    this.modal.show(newStatus === CrushStatus.Archived ? 'Profile moved to Archive.' : 'Profile restored to active.');
  }
}
