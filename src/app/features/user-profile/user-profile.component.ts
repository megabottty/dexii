import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { ThemeService } from '../../core/services/theme.service';
import { MessagingService } from '../../core/services/messaging.service';
import { AuditService } from '../../core/services/audit.service';
import { PageHintComponent } from '../../core/components/page-hint.component';

import { NavbarComponent } from '../../core/components/navbar/navbar.component';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  styleUrl: './user-profile.component.css',
  imports: [CommonModule, RouterModule, PageHintComponent, NavbarComponent],
  template: `
    <div [style.background-color]="theme.colors().bg"
         [style.color]="theme.colors().text"
         class="user-profile-component__s1">
      <app-navbar></app-navbar>

      <div class="user-profile-component__s4">
        <app-page-hint
          hintKey="user_profile_inline"
          title="Profile Hint"
          message="This page shows the user's crush list. Open any crush card to view details and notes.">
        </app-page-hint>

        <div [style.background-color]="theme.colors().bgSecondary"
             [style.border]="'1px solid ' + theme.colors().border"
             class="user-profile-component__s5">
          <div class="user-profile-component__s6">
            <img [src]="profileAvatar()"
                 [alt]="profileDisplayName()"
                 class="user-profile-component__s7">
            <div>
              <h1 class="user-profile-component__s8">{{ profileDisplayName() }}</h1>
              <div style="display: flex; gap: 0.5rem; align-items: center; margin-top: 0.25rem;">
                <p [style.color]="theme.colors().primary"
                   class="user-profile-component__s9" style="font-style: italic; margin: 0;">
                  "Spilling the tea since day one."
                </p>
                @if (!isSelf()) {
                  <button (click)="auditLogView.set(!auditLogView())"
                          [style.color]="theme.colors().primary"
                          [style.border]="'1px solid ' + theme.colors().primary"
                          style="background: transparent; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                    📜 {{ auditLogView() ? 'Close History' : 'Shared History' }}
                  </button>
                }
              </div>
              @if (profileBio()) {
                <p [style.color]="theme.colors().textSecondary"
                   class="user-profile-component__s10">
                  {{ profileBio() }}
                </p>
              }
            </div>
          </div>
        </div>

        @if (auditLogView() && !isSelf()) {
          <div [style.background-color]="theme.colors().bgSecondary"
               [style.border]="'1px solid ' + theme.colors().border"
               class="user-profile-component__s11" style="margin-top: 1rem; animation: slideDown 0.3s ease-out;">
            <div class="user-profile-component__s12" style="border-bottom: 1px solid {{theme.colors().border}}; padding-bottom: 0.75rem; margin-bottom: 1rem;">
              <h2 class="section-title">Audit Log: History with {{ profileDisplayName() }}</h2>
              <p [style.color]="theme.colors().textSecondary" class="user-profile-component__s13">
                Tracking all shared tea and interactions
              </p>
            </div>

            <div style="display: flex; flex-direction: column; gap: 1rem; max-height: 400px; overflow-y: auto; padding-right: 0.5rem;">
              @for (entry of auditLog(); track entry.id) {
                <div [style.border-left]="'3px solid ' + (entry.isFromMe ? theme.colors().primary : '#10b981')"
                     style="padding: 0.75rem 1rem; background: rgba(0,0,0,0.02); border-radius: 0 8px 8px 0;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.25rem;">
                    <span style="font-weight: 600; font-size: 0.85rem;" [style.color]="entry.isFromMe ? theme.colors().primary : '#10b981'">
                      {{ entry.isFromMe ? 'You sent' : entry.friendName + ' sent' }}
                    </span>
                    <span [style.color]="theme.colors().textSecondary" style="font-size: 0.75rem;">
                      {{ entry.timestamp | date:'short' }}
                    </span>
                  </div>
                  <p style="margin: 0; font-size: 0.95rem;">
                    {{ entry.content }}
                    @if (entry.crushId) {
                      <a [routerLink]="['/profile', entry.crushId]" [style.color]="theme.colors().primary" style="text-decoration: underline; margin-left: 4px;">
                        View {{ entry.crushName }}
                      </a>
                    }
                  </p>
                  @if (entry.isFromMe) {
                    <div style="margin-top: 0.4rem; display: flex; align-items: center; gap: 0.4rem;">
                      @if (entry.readAt) {
                        <span style="font-size: 0.75rem; color: #10b981; display: flex; align-items: center; gap: 2px;">
                          <span style="font-size: 0.9rem;">👁️</span> Viewed {{ entry.readAt | date:'shortTime' }}
                        </span>
                      } @else {
                        <span style="font-size: 0.75rem;" [style.color]="theme.colors().textSecondary" title="Pending view">
                          <span style="font-size: 0.9rem;">⌛👁️</span> Pending...
                        </span>
                      }
                    </div>
                  }
                </div>
              } @empty {
                <div style="text-align: center; padding: 2rem 0;">
                  <p [style.color]="theme.colors().textSecondary">No shared history found yet.</p>
                </div>
              }
            </div>
          </div>
        }

        <div [style.background-color]="theme.colors().bgSecondary"
             [style.border]="'1px solid ' + theme.colors().border"
             class="user-profile-component__s11">
          <div class="user-profile-component__s12">
            <h2 class="section-title">{{ isSelf() ? 'Your Boys' : profileDisplayName() + "'s Boys" }}</h2>
            <p [style.color]="theme.colors().textSecondary"
               class="user-profile-component__s13">
              {{ crushes().length }} crushes
            </p>
            @if (isSelf()) {
              <a routerLink="/dashboard"
                 [style.color]="theme.colors().primary"
                 class="user-profile-component__s14">
                + Add New Crush
              </a>
            }
          </div>

          @if (crushes().length > 0) {
            <div class="user-profile-component__s15">
              @for (crush of crushes(); track crush.id) {
                <a [routerLink]="['/profile', crush.id]"
                   [style.background-color]="theme.colors().bg"
                   [style.border]="'1px solid ' + theme.colors().border"
                   [style.color]="theme.colors().text"
                   class="user-profile-component__s16">
                  <div class="user-profile-component__s17">
                    <img [src]="crush.avatarUrl || 'https://i.pravatar.cc/150?u=' + crush.nickname"
                         [alt]="crush.nickname"
                         class="user-profile-component__s18">
                    <div>
                      <p class="user-profile-component__s19">{{ crush.nickname }}</p>
                      <p [style.color]="theme.colors().textSecondary"
                         class="user-profile-component__s20">{{ crush.fullName || 'No first name set' }}</p>
                    </div>
                  </div>
                  <span [style.color]="theme.colors().primary"
                        class="user-profile-component__s21">
                    {{ crush.status }}
                  </span>
                </a>
              }
            </div>
          } @else {
            <div [style.border]="'1px dashed ' + theme.colors().border"
                 class="user-profile-component__s22">
              <p [style.color]="theme.colors().textSecondary" class="user-profile-component__s23">No crush profiles found for this user yet.</p>
            </div>
          }
        </div>

        @if (!isSelf()) {
          <!-- Crushes they've shared with you -->
          <div [style.background-color]="theme.colors().bgSecondary"
               [style.border]="'1px solid ' + theme.colors().border"
               class="user-profile-component__s11" style="margin-top: 2rem;">
            <div class="user-profile-component__s12">
              <h2 class="section-title">Crushes Shared with You</h2>
              <p [style.color]="theme.colors().textSecondary" class="user-profile-component__s13">
                {{ sharedWithMe().length }} crushes
              </p>
            </div>
            @if (sharedWithMe().length > 0) {
              <div class="user-profile-component__s15">
                @for (crush of sharedWithMe(); track crush.id) {
                  <a [routerLink]="['/profile', crush.id]"
                     [style.background-color]="theme.colors().bg"
                     [style.border]="'1px solid ' + theme.colors().border"
                     [style.color]="theme.colors().text"
                     class="user-profile-component__s16">
                    <div class="user-profile-component__s17">
                      <img [src]="crush.avatarUrl || 'https://i.pravatar.cc/150?u=' + crush.nickname"
                           [alt]="crush.nickname"
                           class="user-profile-component__s18">
                      <div>
                        <p class="user-profile-component__s19">{{ crush.nickname }}</p>
                        <p [style.color]="theme.colors().textSecondary" class="user-profile-component__s20">Shared by {{ profileDisplayName() }}</p>
                      </div>
                    </div>
                  </a>
                }
              </div>
            } @else {
              <div [style.border]="'1px dashed ' + theme.colors().border" class="user-profile-component__s22">
                <p [style.color]="theme.colors().textSecondary" class="user-profile-component__s23">No crushes shared with you by this friend yet.</p>
              </div>
            }
          </div>

          <!-- Crushes you've shared with them -->
          <div [style.background-color]="theme.colors().bgSecondary"
               [style.border]="'1px solid ' + theme.colors().border"
               class="user-profile-component__s11" style="margin-top: 2rem;">
            <div class="user-profile-component__s12" style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h2 class="section-title">Crushes You've Shared</h2>
                <p [style.color]="theme.colors().textSecondary" class="user-profile-component__s13">
                  {{ sharedWithThem().length }} crushes
                </p>
              </div>
              <button (click)="showShareSelector.set(!showShareSelector())"
                      [style.background-color]="showShareSelector() ? theme.colors().bg : theme.colors().primary"
                      [style.color]="showShareSelector() ? theme.colors().text : 'white'"
                      [style.border]="'1px solid ' + theme.colors().primary"
                      style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 1.2rem; transition: all 0.2s;">
                +
              </button>
            </div>

            @if (showShareSelector()) {
              <div class="share-modal-backdrop" (click)="showShareSelector.set(false)">
                <div [style.background-color]="theme.colors().bg"
                     [style.border]="'1px solid ' + theme.colors().border"
                     class="share-modal-content"
                     (click)="$event.stopPropagation()">

                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h3 style="margin: 0; font-size: 1.2rem; font-weight: bold;">Share Tea with {{ profileDisplayName() }}</h3>
                    <button (click)="showShareSelector.set(false)"
                            [style.color]="theme.colors().textSecondary"
                            style="background: none; border: none; font-size: 1.5rem; cursor: pointer; padding: 0;">×</button>
                  </div>

                  <p [style.color]="theme.colors().textSecondary" style="margin-bottom: 1rem; font-size: 0.9rem;">Select crushes to share with your friend:</p>

                  <div style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 60vh; overflow-y: auto; padding-right: 0.5rem;">
                    @for (crush of myCrushes(); track crush.id) {
                      <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border-radius: 8px;"
                           [style.background-color]="theme.colors().bgSecondary"
                           [style.border]="'1px solid ' + theme.colors().border">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                          <img [src]="crush.avatarUrl || 'https://i.pravatar.cc/150?u=' + crush.nickname"
                               style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                          <div>
                            <p style="margin: 0; font-weight: 500;">{{ crush.nickname }}</p>
                            <p [style.color]="theme.colors().textSecondary" style="margin: 0; font-size: 0.8rem;">{{ crush.fullName }}</p>
                          </div>
                        </div>
                        <button (click)="toggleShare(crush.id)"
                                [style.background-color]="isShared(crush) ? theme.colors().primary : 'transparent'"
                                [style.color]="isShared(crush) ? 'white' : theme.colors().text"
                                [style.border]="'1px solid ' + (isShared(crush) ? theme.colors().primary : theme.colors().border)"
                                style="padding: 6px 16px; border-radius: 20px; font-size: 0.85rem; cursor: pointer; font-weight: 500; transition: all 0.2s;">
                          {{ isShared(crush) ? 'Shared' : 'Share' }}
                        </button>
                      </div>
                    } @empty {
                      <div style="text-align: center; padding: 2rem 0;">
                        <p [style.color]="theme.colors().textSecondary">You have no crushes to share yet.</p>
                        <a routerLink="/dashboard" (click)="showShareSelector.set(false)" [style.color]="theme.colors().primary">Create a crush profile</a>
                      </div>
                    }
                  </div>
                </div>
              </div>
            }

            @if (sharedWithThem().length > 0) {
              <div class="user-profile-component__s15">
                @for (crush of sharedWithThem(); track crush.id) {
                  <div [style.background-color]="theme.colors().bg"
                       [style.border]="'1px solid ' + theme.colors().border"
                       [style.color]="theme.colors().text"
                       class="user-profile-component__s16" style="display: flex; justify-content: space-between; align-items: center; width: 100%; box-sizing: border-box;">
                    <a [routerLink]="['/profile', crush.id]" style="display: flex; align-items: center; gap: 1rem; text-decoration: none; color: inherit; flex-grow: 1;">
                      <img [src]="crush.avatarUrl || 'https://i.pravatar.cc/150?u=' + crush.nickname"
                           [alt]="crush.nickname"
                           class="user-profile-component__s18">
                      <div>
                        <p class="user-profile-component__s19">{{ crush.nickname }}</p>
                        <div class="user-profile-component__s20" style="display: flex; align-items: center; gap: 0.5rem;">
                           <span [style.color]="theme.colors().textSecondary">Visible to {{ profileDisplayName() }}</span>
                           @if (crush.viewedByFriend) {
                             <span class="status-icon viewed" title="Viewed" style="font-size: 0.8rem;">👁️</span>
                           } @else {
                             <span class="status-icon pending" title="Pending" style="font-size: 0.8rem;">👁️‍🗨️</span>
                           }
                        </div>
                      </div>
                    </a>
                    <button (click)="unshare(crush.id)"
                            style="background: transparent; border: 1px solid #ef4444; color: #ef4444; padding: 4px 10px; border-radius: 4px; font-size: 0.8rem; cursor: pointer;">
                      Unshare
                    </button>
                  </div>
                }
              </div>
            } @else {
              <div [style.border]="'1px dashed ' + theme.colors().border" class="user-profile-component__s22">
                <p [style.color]="theme.colors().textSecondary" class="user-profile-component__s23">You haven't shared any crushes with this friend yet.</p>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class UserProfileComponent {
  private route = inject(ActivatedRoute);
  private dataService = inject(DataService);
  private messaging = inject(MessagingService);
  private audit = inject(AuditService);
  public theme = inject(ThemeService);

  private routeUserId = signal('');
  protected auditLogView = signal(false);

  constructor() {
    this.route.paramMap.subscribe(params => {
      this.routeUserId.set(params.get('id') || 'me');
    });
    this.route.queryParamMap.subscribe(params => {
      if (params.get('history') === 'true') {
        this.auditLogView.set(true);
      }
    });
  }

  isSelf = computed(() => {
    return this.dataService.isMe(this.routeUserId());
  });

  profileDisplayName = computed(() => {
    const id = this.routeUserId();
    if (this.isSelf()) return this.dataService.getUserId();
    return id === 'me' ? this.dataService.getUserId() : id;
  });
  profileBio = computed(() => (this.isSelf() ? (localStorage.getItem('dexii_profile_bio') || '') : ''));

  profileAvatar = computed(() => `https://i.pravatar.cc/300?u=${encodeURIComponent(this.profileDisplayName())}`);

  crushes = computed(() => {
    const all = this.dataService.getAllCrushes()();
    const friendId = this.routeUserId();

    if (this.isSelf()) return all;

    const myId = this.dataService.getUserId();

    // For others, only show what they explicitly shared with me
    return all.filter((c) => {
      const isSharedWithMe = c.visibility.some(id =>
        id === 'me' ||
        id === myId ||
        (id.toLowerCase().replace(/\s+/g, '_') === myId.toLowerCase().replace(/\s+/g, '_'))
      );
      return isSharedWithMe;
    });
  });

  sharedWithMe = computed(() => {
    const all = this.dataService.getAllCrushes()();
    const friendId = this.routeUserId();

    if (this.isSelf()) return [];

    const myId = this.dataService.getUserId();

    return all.filter(c => {
      const isSharedWithMe = c.visibility.some(id =>
        id === 'me' ||
        id === myId ||
        (id.toLowerCase().replace(/\s+/g, '_') === myId.toLowerCase().replace(/\s+/g, '_'))
      );
      return isSharedWithMe;
    });
  });

  sharedWithThem = computed(() => {
    const friendId = this.routeUserId();
    return this.audit.getSentCrushesStatus(friendId, this.dataService)();
  });

  auditLog = computed(() => {
    const friendId = this.routeUserId();
    return this.audit.getHistoryWithFriend(friendId, this.dataService)();
  });

  myCrushes = computed(() => {
    // Return all crushes. In the demo environment, this list is already filtered by owner on the backend.
    return this.dataService.getAllCrushes()();
  });

  protected showShareSelector = signal(false);

  isShared(crush: any): boolean {
    const friendId = this.routeUserId();
    return this.dataService.isCrushSharedWith(crush, friendId);
  }

  toggleShare(crushId: string) {
    let friendId = this.routeUserId();
    if (this.dataService.isMe(friendId)) friendId = this.dataService.getUserId();
    this.dataService.toggleCrushVisibility(crushId, friendId);
  }

  unshare(crushId: string) {
    let friendId = this.routeUserId();
    if (this.dataService.isMe(friendId)) friendId = this.dataService.getUserId();
    this.dataService.toggleCrushVisibility(crushId, friendId);
  }
}
