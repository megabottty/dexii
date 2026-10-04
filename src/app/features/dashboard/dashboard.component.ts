import { Component, signal, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/services/data.service';
import { SecurityService } from '../../core/services/security.service';
import { ThemeService } from '../../core/services/theme.service';
import { ModalService } from '../../core/services/modal.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { WalkthroughService } from '../../core/services/walkthrough.service';
import {
  FIRST_CRUSH_SHARE_TOUR,
  FIRST_CRUSH_SHARE_TOUR_KEY
} from '../../core/config/walkthrough-tours';
import { PageHintComponent } from '../../core/components/page-hint.component';
import { CrushProfile, CrushStatus } from '../../core/models/crush-profile.model';
import { CrushFormComponent } from '../../core/components/crush-form/crush-form.component';
import { CrushFormValue, crushFormTextFields, emptyCrushFormValue, formValueToCrushPatch } from '../../core/utils/crush-form.util';
import { AvatarRenderService } from '../../core/services/avatar-render.service';
import { SubscriptionTier } from '../../core/models/user.model';

import { NavbarComponent } from '../../core/components/navbar/navbar.component';
import { FriendsApiService, FriendSummary } from '../../core/services/friends-api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  styleUrl: './dashboard.component.css',
  imports: [CommonModule, RouterModule, FormsModule, PageHintComponent, NavbarComponent, CrushFormComponent],
  template: `
    <div [style.background-color]="theme.colors().bg" [style.color]="theme.colors().text"
         class="dashboard-component__s1">

      <!-- New Entry Modal -->
      @if (showNewEntryModal()) {
        <div class="dashboard-component__s2">
          <div [style.background-color]="theme.colors().bg"
               [style.border]="'1px solid ' + theme.colors().border"
               class="dashboard-component__s3">

            <button (click)="closeModal()" [style.color]="theme.colors().textSecondary" aria-label="Close new crush modal" class="dashboard-component__s4">✕</button>

            <h3 class="dashboard-component__s5">New Crush</h3>

            <div class="dashboard-component__s6">
              <app-crush-form [form]="newCrush"></app-crush-form>
            </div>

            <button (click)="saveCrush()" [style.background-color]="theme.colors().primary" class="dashboard-component__s43">
              Save Crush
            </button>
          </div>
        </div>
      }

      <!-- Glamour Decorative Elements -->
      @if (theme.isPearl()) {
        <div class="dashboard-component__s60"></div>
      }

      <!-- Navigation -->
      <app-navbar></app-navbar>

      <main class="dashboard-component__s70">
        <app-page-hint
          hintKey="dashboard_inline"
          title="Dashboard Hint"
          message="Use New Crush to add a crush. Keep notes private/public, then control who sees what from Friends > Sharing Controls.">
        </app-page-hint>

        @if (!dataService.hasLoaded()) {
          <div class="dashboard-crush-loading"
               [style.background-color]="theme.colors().bgSecondary"
               [style.border]="'1px solid ' + theme.colors().border"
               role="status"
               aria-live="polite">
            <span class="dashboard-crush-loading__spinner"
                  [style.border-color]="theme.colors().border"
                  [style.border-top-color]="theme.colors().primary"
                  aria-hidden="true">💖</span>
            <span [style.color]="theme.colors().textSecondary">Loading your crushes...</span>
          </div>
        }

        <!-- Hero Section -->
        <div class="dashboard-component__s71">
          <div class="dashboard-component__s72">
            <h2 class="dashboard-component__s73">The Rolodex</h2>
            <p [style.color]="theme.colors().textSecondary" class="dashboard-component__s74">
              Curating {{ activeCrushCount() }} active crushes
              @if (archivedCrushCount() > 0) {
                ({{ archivedCrushCount() }} archived)
              }.
            </p>
            <p [style.color]="theme.colors().textSecondary" class="dashboard-component__s75">
              {{ subscription.tier() }} tier: {{ subscription.crushLimitLabel() === 'Unlimited' ? 'unlimited crushes' : 'up to ' + subscription.crushLimitLabel() + ' crushes' }}.
            </p>
          </div>
          <div class="dashboard-component__s76">
            <button (click)="goToFriends()"
                    [style.border]="'1px solid ' + theme.colors().accent"
                    [style.color]="theme.colors().accent"
                    class="dashboard-component__s78 dashboard-component__s78--friend">
               + Add Friend
            </button>
            <button (click)="openNewEntryModal()"
                    [style.background-color]="theme.colors().primary"
                    [style.border]="'1px solid ' + theme.colors().primary"
                    [style.color]="'#ffffff'"
                    class="dashboard-component__s78 dashboard-component__s78--primary">
               + New Crush
            </button>
          </div>
        </div>

        @if (!subscription.isPremium()) {
          <div [style.background-color]="theme.colors().bgSecondary"
               [style.border]="'1px solid ' + theme.colors().border"
               style="border-radius: 12px; padding: 14px; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
              <div>
                <p style="margin: 0; font-weight: 600;">Crush Plan</p>
                <p [style.color]="theme.colors().textSecondary" style="margin: 4px 0 0 0; font-size: var(--fs-small);">
                  Friends are unlimited. Plans only change crush capacity.
                </p>
              </div>
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button (click)="subscription.upgrade(freeTier)"
                        [style.background-color]="subscription.tier() === freeTier ? theme.colors().primary : 'transparent'"
                        [style.color]="subscription.tier() === freeTier ? 'white' : theme.colors().text"
                        [style.border]="'1px solid ' + (subscription.tier() === freeTier ? theme.colors().primary : theme.colors().border)"
                        style="padding: 6px 10px; border-radius: var(--radius-pill); cursor: pointer;">
                  Free ({{ subscription.crushLimitLabel(freeTier) }})
                </button>
                <button (click)="subscription.upgrade(premiumTier)"
                        [style.background-color]="subscription.tier() === premiumTier ? theme.colors().primary : 'transparent'"
                        [style.color]="subscription.tier() === premiumTier ? 'white' : theme.colors().text"
                        [style.border]="'1px solid ' + (subscription.tier() === premiumTier ? theme.colors().primary : theme.colors().border)"
                        style="padding: 6px 10px; border-radius: var(--radius-pill); cursor: pointer;">
                  Premium ({{ subscription.crushLimitLabel(premiumTier) }})
                </button>
                <button (click)="subscription.upgrade(goldTier)"
                        [style.background-color]="subscription.tier() === goldTier ? theme.colors().primary : 'transparent'"
                        [style.color]="subscription.tier() === goldTier ? 'white' : theme.colors().text"
                        [style.border]="'1px solid ' + (subscription.tier() === goldTier ? theme.colors().primary : theme.colors().border)"
                        style="padding: 6px 10px; border-radius: var(--radius-pill); cursor: pointer;">
                  Gold ({{ subscription.crushLimitLabel(goldTier) }})
                </button>
              </div>
            </div>
          </div>
        }

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
             <h2 [style.color]="theme.colors().primary" class="dashboard-rolodex-mini-title">
               {{ showArchived() ? 'Archived' : 'Active Crushes' }}
             </h2>
             <button (click)="toggleArchived()"
                     [style.color]="theme.colors().textSecondary"
                     class="dashboard-component__s83">
               {{ showArchived() ? 'View Active' : 'View Archive' }}
             </button>
          </div>

        <div class="dashboard-component__s84">
          @for (crush of displayCrushes(); track crush.id) {
            <div [routerLink]="draggingId() ? null : ['/profile', crush.id]"
                 [attr.data-crush-id]="crush.id"
                 [style.background-color]="theme.colors().cardBg"
                 [style.border]="dragOverId() === crush.id ? '2px dashed ' + theme.colors().primary : '1px solid ' + theme.colors().border"
                 [style.opacity]="draggingId() === crush.id ? 0.5 : 1"
                 class="dashboard-component__s85">

              <!-- Shimmer Effect on Card (Light Mode) -->
              @if (theme.isPearl()) {
                <div class="dashboard-component__s86"></div>
              }

              <!-- Drag handle: press and drag to reorder crushes -->
              <button type="button"
                      class="dashboard-crush-drag-handle"
                      title="Drag to reorder"
                      aria-label="Drag to reorder this crush"
                      (pointerdown)="onDragHandlePointerDown($event, crush.id)"
                      (click)="$event.preventDefault(); $event.stopPropagation()">
                ⠿
              </button>

              <!-- Image Area -->
              <div class="dashboard-component__s87">
                <img [src]="crush.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop'"
                     [alt]="getCrushDisplayName(crush) + ' profile photo'"
                     class="dashboard-component__s88">
                <div class="dashboard-component__s89"></div>
                <div class="dashboard-component__s90">
                   <span [style.background-color]="'rgba(255,255,255,0.9)'"
                         [style.color]="theme.colors().primary"
                         class="dashboard-component__s91">
                     {{ crush.status }}
                   </span>
                   @if ((crush.redFlags || 0) > 0) {
                     <button type="button"
                             (click)="$event.stopPropagation(); showRedFlagReason(crush)"
                             class="dashboard-red-flag-chip dashboard-red-flag-chip-button">
                       🚩
                     </button>
                   }
                </div>
              </div>

              <!-- Content -->
              <div class="dashboard-component__s92">
                <h3 class="dashboard-component__s93">{{ getCrushDisplayName(crush) }}</h3>

                <div [style.color]="theme.colors().accent" class="dashboard-component__s94">
                  @for (star of [1,2,3,4,5]; track star) {
                     {{ (crush.rating || 0) >= star ? '★' : '☆' }}
                  }
                </div>

                <p [style.color]="theme.colors().textSecondary" class="dashboard-component__s95">
                  "{{ crush.bio || 'A crush waiting to be defined.' }}"
                </p>

                <div [style.border-top]="'1px solid ' + theme.colors().border" class="dashboard-component__s96">
                  <span [style.color]="theme.colors().textSecondary" class="dashboard-component__s97">Profile Active • {{ crush.lastInteraction | date:'MMM d' }}</span>
                </div>
              </div>
            </div>
          }

          @if (!showArchived() && displayCrushes().length > 0) {
            <button type="button"
                    (click)="openNewEntryModal()"
                    [style.border]="'2px dashed ' + theme.colors().border"
                    [style.color]="theme.colors().textSecondary"
                    class="dashboard-add-crush-ghost-card">
              <span class="dashboard-add-crush-ghost-icon" [style.color]="theme.colors().primary">✦ +</span>
              <span class="dashboard-add-crush-ghost-label">Add another crush</span>
            </button>
          }

          @if (displayCrushes().length === 0) {
            <div class="dashboard-empty-crushes">
              <span class="dashboard-empty-crushes-icon">💌</span>
              <h3 [style.color]="theme.colors().text" class="dashboard-empty-crushes-title">
                {{ showArchived() ? 'Nothing archived yet' : 'Your love life starts here' }}
              </h3>
              <p [style.color]="theme.colors().textSecondary" class="dashboard-empty-crushes-copy">
                {{ showArchived() ? 'Archived crushes will show up here.' : 'Add your first crush and start building your own little black book.' }}
              </p>
              @if (!showArchived()) {
                <button type="button"
                        (click)="openNewEntryModal()"
                        [style.background]="'linear-gradient(135deg, ' + theme.colors().primary + ', ' + theme.colors().accent + ')'"
                        class="dashboard-empty-crushes-cta">
                  ✦ Add Your First Crush
                </button>
              }
            </div>
          }
        </div>
      </main>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  getCrushDisplayName(crush: CrushProfile): string {
    return crush.displayName === 'fullName' && crush.fullName?.trim()
      ? crush.fullName
      : crush.nickname;
  }
  public dataService = inject(DataService);
  public security = inject(SecurityService);
  public theme = inject(ThemeService);
  public modal = inject(ModalService);
  public subscription = inject(SubscriptionService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private walkthrough = inject(WalkthroughService);
  private avatarRenderer = inject(AvatarRenderService);
  private friendsApi = inject(FriendsApiService);

  showNewEntryModal = signal(false);

  showArchived = signal(false);
  selectedFilter = signal<'All' | 'Dating' | 'Prospects'>('All');
  freeTier = SubscriptionTier.Free;
  premiumTier = SubscriptionTier.Premium;
  goldTier = SubscriptionTier.Gold;

  filteredCrushes = computed(() => {
    let crushes = this.dataService.visibleCrushes();
    crushes = this.sortByOrder(crushes);

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
      return crushes.filter((c: any) => c.status === CrushStatus.Crush || c.status === CrushStatus.Plotting);
    }

    return crushes;
  });

  private sortByOrder(crushes: any[]): any[] {
    return [...crushes].sort((a, b) => {
      const orderA = a.sortOrder ?? 0;
      const orderB = b.sortOrder ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return 0;
    });
  }

  // --- Drag-and-drop crush reordering ---
  draggingId = signal<string | null>(null);
  dragOverId = signal<string | null>(null);
  private orderedVisibleIds = signal<string[]>([]);
  private dragPointerId: number | null = null;
  private boundPointerMove = (e: PointerEvent) => this.onDragPointerMove(e);
  private boundPointerUp = (e: PointerEvent) => this.onDragPointerUp(e);

  /** While dragging, shows the live-reordered list; otherwise mirrors filteredCrushes(). */
  displayCrushes = computed(() => {
    const dragging = this.draggingId();
    if (!dragging) return this.filteredCrushes();

    const byId = new Map(this.filteredCrushes().map((c: any) => [c.id, c]));
    return this.orderedVisibleIds()
      .map((id) => byId.get(id))
      .filter((c): c is any => !!c);
  });

  onDragHandlePointerDown(event: PointerEvent, crushId: string): void {
    event.preventDefault();
    event.stopPropagation();

    this.dragPointerId = event.pointerId;
    this.orderedVisibleIds.set(this.filteredCrushes().map((c: any) => c.id));
    this.draggingId.set(crushId);
    this.dragOverId.set(crushId);

    window.addEventListener('pointermove', this.boundPointerMove);
    window.addEventListener('pointerup', this.boundPointerUp);
  }

  private onDragPointerMove(event: PointerEvent): void {
    if (event.pointerId !== this.dragPointerId) return;

    const target = document.elementFromPoint(event.clientX, event.clientY);
    const card = target?.closest('[data-crush-id]') as HTMLElement | null;
    if (!card) return;

    const overId = card.getAttribute('data-crush-id');
    const draggedId = this.draggingId();
    if (!overId || !draggedId || overId === draggedId) return;

    this.dragOverId.set(overId);

    const ids = [...this.orderedVisibleIds()];
    const fromIndex = ids.indexOf(draggedId);
    const toIndex = ids.indexOf(overId);
    if (fromIndex === -1 || toIndex === -1) return;

    ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, draggedId);
    this.orderedVisibleIds.set(ids);
  }

  private onDragPointerUp(event: PointerEvent): void {
    if (event.pointerId !== this.dragPointerId) return;

    window.removeEventListener('pointermove', this.boundPointerMove);
    window.removeEventListener('pointerup', this.boundPointerUp);
    this.dragPointerId = null;

    const finalVisibleOrder = this.orderedVisibleIds();
    const draggedId = this.draggingId();
    this.draggingId.set(null);
    this.dragOverId.set(null);

    if (!draggedId || finalVisibleOrder.length === 0) return;

    // Merge the new order of the *visible* (filtered) subset back into the
    // full crush list, preserving the relative position of any crushes not
    // currently shown (e.g. hidden by the Dating/Prospects filter or archive).
    const fullSorted = this.sortByOrder(this.dataService.getAllCrushes()());
    const visibleSet = new Set(finalVisibleOrder);
    const visiblePositions = fullSorted
      .map((c: any, index: number) => (visibleSet.has(c.id) ? index : -1))
      .filter((index) => index !== -1);

    const fullIds = fullSorted.map((c: any) => c.id);
    visiblePositions.forEach((position, i) => {
      fullIds[position] = finalVisibleOrder[i];
    });

    this.dataService.reorderCrushes(fullIds);
  }

  activeCrushCount = computed(() =>
    this.dataService.getAllCrushes()().filter((c: any) => c.status !== CrushStatus.Archived).length
  );
  archivedCrushCount = computed(() =>
    this.dataService.getAllCrushes()().filter((c: any) => c.status === CrushStatus.Archived).length
  );

  friends = signal<FriendSummary[]>([]);

  newCrush: CrushFormValue = emptyCrushFormValue();

  ngOnInit() {
    this.dataService.setViewer(null);
    void this.loadFriends();
    setTimeout(() => {
      void this.walkthrough.startFirstLogin();
    }, 150);

    // Lets other pages (e.g. the user's own profile page's "+ Add New
    // Crush" link) deep-link straight into this same New Crush modal
    // instead of just dropping the user on the dashboard and making them
    // find/click the button themselves.
    if (this.route.snapshot.queryParamMap.get('newCrush') === '1') {
      setTimeout(() => this.openNewEntryModal(), 0);
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { newCrush: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    }
  }

  private async loadFriends(): Promise<void> {
    if (!this.security.currentUserId()) {
      this.friends.set([]);
      return;
    }
    try {
      this.friends.set(await this.friendsApi.listFriends());
    } catch {
      this.friends.set([]);
    }
  }

  toggleArchived() {
    this.showArchived.update(v => !v);
  }

  goToFriends() {
    this.router.navigate(['/friends'], { queryParams: { tab: 'find' } });
  }

  showRedFlagReason(crush: any) {
    const reason = (crush.redFlagReason || '').trim();
    if (!reason) {
      this.modal.show('This crush has one red flag, but no reason was saved yet.');
      return;
    }

    this.modal.show(`Red flag reason: ${reason}`);
  }

  openNewEntryModal() {
    const crushLimit = this.subscription.getCrushLimit();
    if (!this.subscription.checkLimit(this.activeCrushCount())) {
      this.modal.show(`${this.subscription.tier()} tier allows up to ${this.subscription.crushLimitLabel()} active crushes. Archive one or upgrade to add more.`);
      return;
    }
    this.showNewEntryModal.set(true);
  }

  closeModal() {
    this.showNewEntryModal.set(false);
    this.resetForm();
  }

  async saveCrush() {
    const crushLimit = this.subscription.getCrushLimit();
    if (!this.subscription.checkLimit(this.activeCrushCount())) {
      this.modal.show(`${this.subscription.tier()} tier allows up to ${this.subscription.crushLimitLabel()} active crushes. Archive one or upgrade to add more.`);
      return;
    }

    if (!this.newCrush.nickname.trim()) {
      this.modal.show('Please enter a nickname at least!');
      return;
    }
    if (!crushFormTextFields(this.newCrush).every((text) => this.security.moderateContent(text))) {
      this.modal.show('Profile text flagged by AI moderation.');
      return;
    }

    if (!this.newCrush.avatarUrl) {
      // No picture chosen: give them a preset that stays stable for this nickname.
      this.newCrush.avatarConfig = this.avatarRenderer.presetFor(this.newCrush.nickname);
      this.newCrush.avatarUrl = await this.avatarRenderer.render(this.newCrush.avatarConfig, 256);
    }

    const createdCrush = this.dataService.addCrush({
      ...formValueToCrushPatch(this.newCrush),
      visibility: []
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

    // First crush ever: guide them through sharing it with a friend.
    if (this.dataService.getAllCrushes()().length === 1) {
      this.walkthrough.start(FIRST_CRUSH_SHARE_TOUR_KEY, FIRST_CRUSH_SHARE_TOUR);
    }
  }

  resetForm() {
    this.newCrush = emptyCrushFormValue();
  }
}
