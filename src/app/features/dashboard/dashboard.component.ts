import { Component, signal, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/services/data.service';
import { SecurityService } from '../../core/services/security.service';
import { ThemeService } from '../../core/services/theme.service';
import { MessagingService } from '../../core/services/messaging.service';
import { ModalService } from '../../core/services/modal.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { PageHintComponent } from '../../core/components/page-hint.component';
import { CrushStatus } from '../../core/models/crush-profile.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  styleUrl: './dashboard.component.css',
  imports: [CommonModule, RouterModule, FormsModule, PageHintComponent],
  template: `
    <div [style.background-color]="theme.colors().bg" [style.color]="theme.colors().text"
         class="dashboard-component__s1">

      <!-- New Entry Modal -->
      @if (showNewEntryModal()) {
        <div class="dashboard-component__s2">
          <div [style.background-color]="theme.colors().bg"
               [style.border]="'1px solid ' + theme.colors().border"
               class="dashboard-component__s3">

            <button (click)="closeModal()" [style.color]="theme.colors().textSecondary" aria-label="Close new connection modal" class="dashboard-component__s4">✕</button>

            <h3 class="dashboard-component__s5">New Connection</h3>

            <div class="dashboard-component__s6">
              <div>
                <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s7">Avatar (Optional)</label>
                <div class="dashboard-component__s8">
                  <button (click)="avatarUpload.click()" [style.border]="'1px solid ' + theme.colors().primary"
                          [style.color]="theme.colors().primary"
                          class="dashboard-component__s9">
                    Upload Photo
                  </button>
                  <input #avatarUpload type="file" accept="image/*" (change)="onAvatarFileSelected($event)" class="dashboard-component__s10">
                  @if (uploadedAvatarName()) {
                    <span [style.color]="theme.colors().textSecondary" class="dashboard-component__s11">{{ uploadedAvatarName() }}</span>
                  }
                </div>

                @if (newCrush.avatarUrl) {
                  <div class="dashboard-component__s12">
                    <img [src]="newCrush.avatarUrl" alt="Selected avatar preview" [style.border]="'1px solid ' + theme.colors().border"
                         class="dashboard-component__s13">
                    @if (cropSourceImage()) {
                      <button (click)="showCropModal.set(true)" [style.border]="'1px solid ' + theme.colors().border"
                              [style.color]="theme.colors().text"
                              class="dashboard-component__s14">
                        Re-Crop
                      </button>
                    }
                  </div>
                }

                <div class="dashboard-component__s15">
                   @for (avatar of mockAvatars; track avatar) {
                     <img [src]="avatar" [alt]="'Avatar option ' + ($index + 1)" (click)="newCrush.avatarUrl = avatar"
                          role="button"
                          tabindex="0"
                          (keydown.enter)="newCrush.avatarUrl = avatar"
                          (keydown.space)="newCrush.avatarUrl = avatar; $event.preventDefault()"
                          [style.border]="newCrush.avatarUrl === avatar ? '2px solid ' + theme.colors().primary : '1px solid ' + theme.colors().border"
                          class="dashboard-component__s16">
                   }
                </div>
              </div>

              <div>
                <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s7">Nickname</label>
                <input [(ngModel)]="newCrush.nickname" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="dashboard-component__s17">
              </div>

              <div>
                <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s7">First Name (Optional)</label>
                <input [(ngModel)]="newCrush.firstName" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="dashboard-component__s18">
              </div>

              <div>
                <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s7">Status</label>
                <select [(ngModel)]="newCrush.status" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="dashboard-component__s19">
                  <option [value]="statuses.Crush">Crush</option>
                  <option [value]="statuses.Dating">Dating</option>
                  <option [value]="statuses.Exclusive">Exclusive</option>
                </select>
              </div>

              <div>
                <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s7">Connection Note (Optional)</label>
                <textarea [(ngModel)]="newCrush.note"
                          [style.background-color]="theme.colors().bgSecondary"
                          [style.border]="'1px solid ' + theme.colors().border"
                          [style.color]="theme.colors().text"
                          rows="4"
                         
                          placeholder="Add your first note about this connection..." class="dashboard-component__s20"></textarea>

                <div class="dashboard-component__s21">
                  <p [style.color]="theme.colors().textSecondary" class="dashboard-component__s22">
                    Note Visibility
                  </p>
                  <div class="dashboard-component__s23">
                    <button (click)="newCrush.noteVisibility = 'private'"
                            [style.background-color]="newCrush.noteVisibility === 'private' ? theme.colors().primary : 'transparent'"
                            [style.color]="newCrush.noteVisibility === 'private' ? 'white' : theme.colors().text"
                            [style.border]="'1px solid ' + (newCrush.noteVisibility === 'private' ? theme.colors().primary : theme.colors().border)"
                            class="dashboard-component__s24">
                      Private
                    </button>
                    <button (click)="newCrush.noteVisibility = 'public'"
                            [style.background-color]="newCrush.noteVisibility === 'public' ? theme.colors().primary : 'transparent'"
                            [style.color]="newCrush.noteVisibility === 'public' ? 'white' : theme.colors().text"
                            [style.border]="'1px solid ' + (newCrush.noteVisibility === 'public' ? theme.colors().primary : theme.colors().border)"
                            class="dashboard-component__s24">
                      Public
                    </button>
                  </div>
                </div>
              </div>

              <!-- About the Boy Sections -->
              <div [style.border-top]="'1px solid ' + theme.colors().border" class="dashboard-section-top">
                <h4 [style.color]="theme.colors().primary" class="dashboard-component__s25">About the Boy</h4>

                <div class="dashboard-component__s26">
                  <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s27">Hair</label>
                  <div class="dashboard-component__s28">
                    @for (h of ['Blonde', 'Brown', 'Black', 'Red', 'Long', 'Spikey', 'Bald', 'Other']; track h) {
                      <div (click)="toggleSelection(newCrush.hair, h)"
                           role="button"
                           tabindex="0"
                           (keydown.enter)="toggleSelection(newCrush.hair, h)"
                           (keydown.space)="toggleSelection(newCrush.hair, h); $event.preventDefault()"
                           [attr.aria-pressed]="newCrush.hair.includes(h)"
                           [style.border]="newCrush.hair.includes(h) ? '1px solid ' + theme.colors().primary : '1px solid ' + theme.colors().border"
                           [style.background-color]="newCrush.hair.includes(h) ? theme.colors().primary + '10' : 'transparent'"
                           class="dashboard-component__s29">
                        <div [style.border]="'2px solid ' + (newCrush.hair.includes(h) ? theme.colors().primary : theme.colors().textSecondary)"
                             [style.background-color]="newCrush.hair.includes(h) ? theme.colors().primary : 'transparent'"
                             class="dashboard-component__s30">
                           @if (newCrush.hair.includes(h)) {
                             <span class="dashboard-component__s31">✓</span>
                           }
                        </div>
                        <span class="dashboard-component__s32">{{h}}</span>
                      </div>
                    }
                  </div>
                </div>

                <div class="dashboard-component__s26">
                  <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s27">Eyes</label>
                  <div class="dashboard-component__s28">
                    @for (e of ['Grey', 'Blue', 'Aqua', 'Green', 'Brown', 'Hazel', 'Black', 'Other']; track e) {
                      <div (click)="toggleSelection(newCrush.eyes, e)"
                           role="button"
                           tabindex="0"
                           (keydown.enter)="toggleSelection(newCrush.eyes, e)"
                           (keydown.space)="toggleSelection(newCrush.eyes, e); $event.preventDefault()"
                           [attr.aria-pressed]="newCrush.eyes.includes(e)"
                           [style.border]="newCrush.eyes.includes(e) ? '1px solid ' + theme.colors().primary : '1px solid ' + theme.colors().border"
                           [style.background-color]="newCrush.eyes.includes(e) ? theme.colors().primary + '10' : 'transparent'"
                           class="dashboard-component__s29">
                        <div [style.border]="'2px solid ' + (newCrush.eyes.includes(e) ? theme.colors().primary : theme.colors().textSecondary)"
                             [style.background-color]="newCrush.eyes.includes(e) ? theme.colors().primary : 'transparent'"
                             class="dashboard-component__s30">
                           @if (newCrush.eyes.includes(e)) {
                             <span class="dashboard-component__s31">✓</span>
                           }
                        </div>
                        <span class="dashboard-component__s32">{{e}}</span>
                      </div>
                    }
                  </div>
                </div>

                <div class="dashboard-component__s26">
                  <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s27">Build</label>
                  <div class="dashboard-component__s28">
                    @for (b of ['Skinny', 'Ripped', 'Athletic', 'Tall', 'Short', 'Lots to love', 'Average', 'Other']; track b) {
                      <div (click)="toggleSelection(newCrush.build, b)"
                           role="button"
                           tabindex="0"
                           (keydown.enter)="toggleSelection(newCrush.build, b)"
                           (keydown.space)="toggleSelection(newCrush.build, b); $event.preventDefault()"
                           [attr.aria-pressed]="newCrush.build.includes(b)"
                           [style.border]="newCrush.build.includes(b) ? '1px solid ' + theme.colors().primary : '1px solid ' + theme.colors().border"
                           [style.background-color]="newCrush.build.includes(b) ? theme.colors().primary + '10' : 'transparent'"
                           class="dashboard-component__s29">
                        <div [style.border]="'2px solid ' + (newCrush.build.includes(b) ? theme.colors().primary : theme.colors().textSecondary)"
                             [style.background-color]="newCrush.build.includes(b) ? theme.colors().primary : 'transparent'"
                             class="dashboard-component__s30">
                           @if (newCrush.build.includes(b)) {
                             <span class="dashboard-component__s31">✓</span>
                           }
                        </div>
                        <span class="dashboard-component__s32">{{b}}</span>
                      </div>
                    }
                  </div>
                </div>
              </div>

              <!-- Social Handles -->
              <div [style.border-top]="'1px solid ' + theme.colors().border" class="dashboard-section-top">
                <h4 [style.color]="theme.colors().primary" class="dashboard-component__s25">Where I can find them</h4>
                <div class="dashboard-component__s33">
                  <div class="dashboard-component__s34">
                    <span class="dashboard-component__s35">👻</span>
                    <input placeholder="Snapchat Username" [(ngModel)]="newCrush.social.snapchat" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="dashboard-component__s36">
                  </div>
                  <div class="dashboard-component__s34">
                    <span class="dashboard-component__s35">💬</span>
                    <input placeholder="WhatsApp Number" [(ngModel)]="newCrush.social.whatsapp" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="dashboard-component__s36">
                  </div>
                  <div class="dashboard-component__s34">
                    <span class="dashboard-component__s35">🐦</span>
                    <input placeholder="Twitter @username" [(ngModel)]="newCrush.social.twitter" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="dashboard-component__s36">
                  </div>
                  <div class="dashboard-component__s34">
                    <span class="dashboard-component__s35">📘</span>
                    <input placeholder="Facebook.com/" [(ngModel)]="newCrush.social.facebook" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="dashboard-component__s36">
                  </div>
                  <div class="dashboard-component__s34">
                    <span class="dashboard-component__s35">📸</span>
                    <input placeholder="Instagram @username" [(ngModel)]="newCrush.social.instagram" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" class="dashboard-component__s36">
                  </div>
                </div>
              </div>

              <!-- Relationship Status -->
              <div [style.border-top]="'1px solid ' + theme.colors().border" class="dashboard-section-top">
                <h4 [style.color]="theme.colors().primary" class="dashboard-component__s25">Relationship Status</h4>
                <div class="dashboard-component__s37">
                  @for (s of ["He doesn't know I exist", "Just friends", "I think he likes me", "Getting serious", "We are a couple", "Friends With Benefits", "We are engaged", "Other"]; track s) {
                    <div (click)="newCrush.relationshipStatus = s"
                         role="button"
                         tabindex="0"
                         (keydown.enter)="newCrush.relationshipStatus = s"
                         (keydown.space)="newCrush.relationshipStatus = s; $event.preventDefault()"
                         [attr.aria-pressed]="newCrush.relationshipStatus === s"
                         [style.border]="newCrush.relationshipStatus === s ? '1px solid ' + theme.colors().primary : '1px solid ' + theme.colors().border"
                         [style.background-color]="newCrush.relationshipStatus === s ? theme.colors().primary + '10' : 'transparent'"
                         class="dashboard-component__s38">
                      <div [style.border]="'2px solid ' + (newCrush.relationshipStatus === s ? theme.colors().primary : theme.colors().textSecondary)"
                           class="dashboard-component__s39">
                         @if (newCrush.relationshipStatus === s) {
                           <div [style.background-color]="theme.colors().primary" class="dashboard-component__s40"></div>
                         }
                      </div>
                      <span class="dashboard-component__s32">{{s}}</span>
                    </div>
                  }
                </div>
              </div>

              <div>
                <label [style.color]="theme.colors().textSecondary" class="dashboard-component__s41">Initial Vibe (1-5 Stars)</label>
                <div class="dashboard-component__s42">
                  @for (star of [1,2,3,4,5]; track star) {
                    <button type="button" (click)="newCrush.rating = star" [attr.aria-label]="'Set rating to ' + star + ' stars'"
                            [style.color]="newCrush.rating >= star ? theme.colors().accent : theme.colors().border" class="dashboard-rating-star">★</button>
                  }
                </div>
              </div>
            </div>

            <button (click)="saveCrush()" [style.background-color]="theme.colors().primary" class="dashboard-component__s43">
              Save Connection
            </button>
          </div>
        </div>
      }

      @if (showCropModal() && cropSourceImage()) {
        <div class="dashboard-component__s44">
          <div [style.background-color]="theme.colors().bg" [style.border]="'1px solid ' + theme.colors().border"
               class="dashboard-component__s45">
            <h3 class="dashboard-component__s46">Crop Avatar</h3>
            <div [style.background-color]="theme.colors().bgSecondary" class="dashboard-component__s47">
              <div class="dashboard-component__s48">
                <img [src]="cropSourceImage()!" alt="Avatar crop preview"
                     [style.transform]="cropTransform()"
                     class="dashboard-component__s49">
              </div>
            </div>
            <div class="dashboard-component__s50">
              <label class="dashboard-component__s51">
                Zoom
                <input type="range" min="1" max="3" step="0.05" [value]="cropZoom()" (input)="cropZoom.set(toNumber($event, 1.5))" class="dashboard-component__s52">
              </label>
              <label class="dashboard-component__s51">
                Horizontal
                <input type="range" min="-120" max="120" step="1" [value]="cropOffsetX()" (input)="cropOffsetX.set(toNumber($event, 0))" class="dashboard-component__s52">
              </label>
              <label class="dashboard-component__s51">
                Vertical
                <input type="range" min="-120" max="120" step="1" [value]="cropOffsetY()" (input)="cropOffsetY.set(toNumber($event, 0))" class="dashboard-component__s52">
              </label>
            </div>
            <div class="dashboard-component__s53">
              <button (click)="cancelCrop()" [style.border]="'1px solid ' + theme.colors().border"
                      class="dashboard-component__s54">
                Cancel
              </button>
              <button (click)="applyCrop()" [style.background-color]="theme.colors().primary"
                      class="dashboard-component__s55">
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Digital Note Passing Overlay (Simulation) -->
      @if (isNotePassing()) {
        <div class="dashboard-component__s56">
          <div (click)="closeNote()"
               role="button"
               tabindex="0"
               (keydown.enter)="closeNote()"
               (keydown.space)="closeNote(); $event.preventDefault()"
                [style.background-color]="theme.colors().bgSecondary"
                [style.border]="'2px solid ' + theme.colors().primary"
                class="dashboard-component__s57">
             <span [style.color]="theme.colors().primary" class="dashboard-component__s58">Private Note Received</span>
             <p class="dashboard-component__s59">"{{ currentTeaPreview() || 'No new tea right now.' }}"</p>
           </div>
        </div>
      }

      <!-- Glamour Decorative Elements -->
      @if (theme.mode() === 'light') {
        <div class="dashboard-component__s60"></div>
      }

      <!-- Navigation -->
      <nav aria-label="Primary navigation" [style.background-color]="theme.colors().bgSecondary"
           [style.border-bottom]="'1px solid ' + theme.colors().border"
           class="dashboard-component__s61">
        <div class="dashboard-component__s62">
          <div [style.background]="'linear-gradient(135deg, ' + theme.colors().primary + ', ' + theme.colors().accent + ')'"
               class="dashboard-component__s63">D</div>
          <span class="dashboard-component__s64">Dexii</span>
        </div>

        <div class="dashboard-component__s65">
          <a routerLink="/friends"
             [style.color]="theme.colors().text"
             class="dashboard-component__s66">
            Friends
          </a>
          <a routerLink="/user/me"
             [style.color]="theme.colors().text"
             class="dashboard-component__s66">
            Profile
          </a>
          <button (click)="theme.toggleTheme()"
                  [style.background-color]="'transparent'"
                  [style.color]="theme.colors().text"
                  [style.border]="'1px solid ' + theme.colors().border"
                  class="dashboard-component__s67">
            {{ theme.mode() === 'dark' ? 'Pearl' : 'Onyx' }}
          </button>
          <button (click)="security.lockApp()"
                  [style.background-color]="theme.colors().primary"
                  class="dashboard-component__s68">
            Lock
          </button>
          <a routerLink="/vault"
             [style.background-color]="theme.colors().accent"
             class="dashboard-component__s69">
            Vault
          </a>
        </div>
      </nav>

      <main class="dashboard-component__s70">
        <app-page-hint
          hintKey="dashboard_inline"
          title="Dashboard Hint"
          message="Use New Entry to add a crush. Keep notes private/public, then control who sees what from Friends > Sharing Controls.">
        </app-page-hint>

        <!-- Hero Section -->
        <div class="dashboard-component__s71">
          <div class="dashboard-component__s72">
            <h2 class="dashboard-component__s73">The Rolodex</h2>
            <p [style.color]="theme.colors().textSecondary" class="dashboard-component__s74">Curating {{ dataService.visibleCrushes().length }} exclusive connections.</p>
            @if (!subscription.isPremium()) {
              <p [style.color]="theme.colors().textSecondary" class="dashboard-component__s75">
                Free tier: up to {{ freeCrushLimit }} crushes.
              </p>
            }
          </div>
          <div class="dashboard-component__s76">
            <button (click)="simulateNote()"
                    [style.border]="'1px solid ' + theme.colors().border"
                    [style.color]="theme.colors().text"
                    class="dashboard-component__s77">
               Waiting for the Tea? {{ unreadTeaCount() > 0 ? '(' + unreadTeaCount() + ')' : '' }}
            </button>
            <button (click)="openNewEntryModal()" [style.border]="'1px solid ' + theme.colors().primary"
                    [style.color]="theme.colors().primary"
                    class="dashboard-component__s78">
               + New Entry
            </button>
          </div>
        </div>

        <!-- Filter Chips -->
        <div class="dashboard-component__s79">
          <button (click)="selectedFilter.set('All')"
                  [style.color]="selectedFilter() === 'All' ? theme.colors().primary : theme.colors().textSecondary"
                  [style.border-bottom]="selectedFilter() === 'All' ? '2px solid ' + theme.colors().primary : 'none'"
                  class="dashboard-component__s80">All</button>
          <button (click)="selectedFilter.set('Dating')"
                  [style.color]="selectedFilter() === 'Dating' ? theme.colors().primary : theme.colors().textSecondary"
                  [style.border-bottom]="selectedFilter() === 'Dating' ? '2px solid ' + theme.colors().primary : 'none'"
                  class="dashboard-component__s81">Dating</button>
          <button (click)="selectedFilter.set('Prospects')"
                  [style.color]="selectedFilter() === 'Prospects' ? theme.colors().primary : theme.colors().textSecondary"
                  [style.border-bottom]="selectedFilter() === 'Prospects' ? '2px solid ' + theme.colors().primary : 'none'"
                  class="dashboard-component__s81">Prospects</button>
        </div>

        <!-- Grid -->
          <div class="dashboard-component__s82">
             <h2 [style.color]="theme.colors().primary" class="dashboard-rolodex-mini-title">The Rolodex</h2>
             <button (click)="toggleArchived()"
                     [style.color]="theme.colors().textSecondary"
                     class="dashboard-component__s83">
               {{ showArchived() ? 'View Active' : 'View Archive' }}
             </button>
          </div>

        <div class="dashboard-component__s84">
          @for (crush of filteredCrushes(); track crush.id) {
            <div [routerLink]="['/profile', crush.id]"
                 [style.background-color]="theme.colors().cardBg"
                 [style.border]="'1px solid ' + theme.colors().border"
                 class="dashboard-component__s85">

              <!-- Shimmer Effect on Card (Light Mode) -->
              @if (theme.mode() === 'light') {
                <div class="dashboard-component__s86"></div>
              }

              <!-- Image Area -->
              <div class="dashboard-component__s87">
                <img [src]="crush.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop'"
                     [alt]="crush.nickname + ' profile photo'"
                     class="dashboard-component__s88">
                <div class="dashboard-component__s89"></div>
                <div class="dashboard-component__s90">
                   <span [style.background-color]="'rgba(255,255,255,0.9)'"
                         [style.color]="theme.colors().primary"
                         class="dashboard-component__s91">
                     {{ crush.status }}
                   </span>
                   <span *ngIf="crush.redFlags > 0" class="dashboard-red-flag-chip">
                     {{ crush.redFlags }} Flags
                   </span>
                </div>
              </div>

              <!-- Content -->
              <div class="dashboard-component__s92">
                <h3 class="dashboard-component__s93">{{ crush.nickname }}</h3>

                <div [style.color]="theme.colors().accent" class="dashboard-component__s94">
                  @for (star of [1,2,3,4,5]; track star) {
                     {{ (crush.rating || 0) >= star ? '★' : '☆' }}
                  }
                </div>

                <p [style.color]="theme.colors().textSecondary" class="dashboard-component__s95">
                  "{{ crush.bio || 'A connection waiting to be defined.' }}"
                </p>

                <div [style.border-top]="'1px solid ' + theme.colors().border" class="dashboard-component__s96">
                  <span [style.color]="theme.colors().textSecondary" class="dashboard-component__s97">Profile Active • {{ crush.lastInteraction | date:'MMM d' }}</span>
                </div>
              </div>
            </div>
          }
        </div>
      </main>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  public dataService = inject(DataService);
  public security = inject(SecurityService);
  public theme = inject(ThemeService);
  public messaging = inject(MessagingService);
  public modal = inject(ModalService);
  public subscription = inject(SubscriptionService);

  isNotePassing = signal(false);
  currentTeaPreview = signal('');
  showNewEntryModal = signal(false);
  showCropModal = signal(false);
  statuses = CrushStatus;
  uploadedAvatarName = signal('');
  cropSourceImage = signal<string | null>(null);
  cropZoom = signal(1);
  cropOffsetX = signal(0);
  cropOffsetY = signal(0);

  mockAvatars = [
    'https://i.pravatar.cc/150?u=1',
    'https://i.pravatar.cc/150?u=2',
    'https://i.pravatar.cc/150?u=3',
    'https://i.pravatar.cc/150?u=4'
  ];

  showArchived = signal(false);
  selectedFilter = signal<'All' | 'Dating' | 'Prospects'>('All');
  freeCrushLimit = 5;

  filteredCrushes = computed(() => {
    let crushes = this.dataService.visibleCrushes();

    if (this.showArchived()) {
      return crushes.filter((c: any) => c.status === CrushStatus.Archived);
    }

    // Filter by Archive first
    crushes = crushes.filter((c: any) => c.status !== CrushStatus.Archived);

    // Apply category filters
    const filter = this.selectedFilter();
    if (filter === 'Dating') {
      return crushes.filter((c: any) => c.status === CrushStatus.Dating || c.status === CrushStatus.Exclusive);
    } else if (filter === 'Prospects') {
      return crushes.filter((c: any) => c.status === CrushStatus.Crush);
    }

    return crushes;
  });

  unreadTeaCount = computed(() => this.messaging.getUnreadForUser('me').length);

  newCrush = {
    nickname: '',
    firstName: '',
    status: CrushStatus.Crush,
    rating: 3,
    note: '',
    noteVisibility: 'private' as 'private' | 'public',
    visibility: [] as string[],
    avatarUrl: '',
    hair: [] as string[],
    eyes: [] as string[],
    build: [] as string[],
    social: {
      snapchat: '',
      whatsapp: '',
      twitter: '',
      facebook: '',
      instagram: ''
    },
    relationshipStatus: ''
  };

  ngOnInit() {}

  toggleArchived() {
    this.showArchived.update(v => !v);
  }

  simulateNote() {
    const latestUnread = this.messaging.getLatestUnreadForUser('me');
    if (latestUnread) {
      this.currentTeaPreview.set(latestUnread.content);
      this.messaging.markUnreadForUserAsRead('me');
    } else {
      this.currentTeaPreview.set('No unread private tea at the moment.');
    }
    this.isNotePassing.set(true);
  }

  closeNote() {
    this.isNotePassing.set(false);
    this.currentTeaPreview.set('');
  }

  openNewEntryModal() {
    if (!this.subscription.checkLimit(this.dataService.getAllCrushes()().length, this.freeCrushLimit)) {
      this.modal.show(`Free tier allows up to ${this.freeCrushLimit} crushes. Upgrade to add more.`);
      return;
    }
    this.showNewEntryModal.set(true);
  }

  closeModal() {
    this.showNewEntryModal.set(false);
    this.cancelCrop();
    this.resetForm();
  }

  toggleSelection(list: string[], item: string) {
    const index = list.indexOf(item);
    if (index > -1) {
      list.splice(index, 1);
    } else {
      list.push(item);
    }
  }

  saveCrush() {
    if (!this.subscription.checkLimit(this.dataService.getAllCrushes()().length, this.freeCrushLimit)) {
      this.modal.show(`Free tier allows up to ${this.freeCrushLimit} crushes. Upgrade to add more.`);
      return;
    }

    if (!this.newCrush.nickname) {
      this.modal.show('Please enter a nickname at least!');
      return;
    }
    if (!this.security.moderateContent(this.newCrush.nickname) ||
        !this.security.moderateContent(this.newCrush.firstName) ||
        !this.security.moderateContent(this.newCrush.note)) {
      this.modal.show('Profile text flagged by AI moderation.');
      return;
    }

    const createdCrush = this.dataService.addCrush({
      nickname: this.newCrush.nickname,
      fullName: this.newCrush.firstName,
      status: this.newCrush.status,
      rating: this.newCrush.rating,
      bio: '',
      visibility: [],
      avatarUrl: this.newCrush.avatarUrl || `https://i.pravatar.cc/150?u=${this.newCrush.nickname}`, // Fallback avatar
      hair: this.newCrush.hair,
      eyes: this.newCrush.eyes,
      build: this.newCrush.build,
      social: { ...this.newCrush.social },
      relationshipStatus: this.newCrush.relationshipStatus
    });

    const note = this.newCrush.note.trim();
    if (note) {
      this.dataService.addEntry({
        crushId: createdCrush.id,
        type: 'Note',
        content: note,
        isBurnAfterReading: false,
        visibility: this.newCrush.noteVisibility === 'public' ? ['public'] : [],
        isSensitive: false
      });
    }

    this.closeModal();
    this.modal.show('Profile Secured in the Rolodex.');
  }

  onAvatarFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.modal.show('Please upload an image file.');
      return;
    }

    this.uploadedAvatarName.set(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') return;
      this.cropSourceImage.set(result);
      this.cropZoom.set(1);
      this.cropOffsetX.set(0);
      this.cropOffsetY.set(0);
      this.showCropModal.set(true);
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  cropTransform(): string {
    return `translate(${this.cropOffsetX()}px, ${this.cropOffsetY()}px) scale(${this.cropZoom()})`;
  }

  toNumber(event: Event, fallback: number): number {
    const target = event.target as HTMLInputElement | null;
    if (!target) return fallback;
    const parsed = Number(target.value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  cancelCrop() {
    this.showCropModal.set(false);
  }

  applyCrop() {
    const source = this.cropSourceImage();
    if (!source) return;

    const image = new Image();
    image.onload = () => {
      const size = 512;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const coverScale = Math.max(size / image.width, size / image.height);
      const scale = coverScale * this.cropZoom();
      const drawWidth = image.width * scale;
      const drawHeight = image.height * scale;
      const dx = (size - drawWidth) / 2 + this.cropOffsetX();
      const dy = (size - drawHeight) / 2 + this.cropOffsetY();

      ctx.drawImage(image, dx, dy, drawWidth, drawHeight);

      this.newCrush.avatarUrl = canvas.toDataURL('image/jpeg', 0.92);
      this.showCropModal.set(false);
    };
    image.src = source;
  }

  resetForm() {
    this.newCrush = {
      nickname: '',
      firstName: '',
      status: CrushStatus.Crush,
      rating: 3,
      note: '',
      noteVisibility: 'private',
      visibility: [],
      avatarUrl: '',
      hair: [],
      eyes: [],
      build: [],
      social: {
        snapchat: '',
        whatsapp: '',
        twitter: '',
        facebook: '',
        instagram: ''
      },
      relationshipStatus: ''
    };
    this.uploadedAvatarName.set('');
    this.cropSourceImage.set(null);
    this.cropZoom.set(1);
    this.cropOffsetX.set(0);
    this.cropOffsetY.set(0);
  }
}
