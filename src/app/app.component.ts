import { Component, signal, inject, OnInit, OnDestroy, DestroyRef, computed } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SecurityService } from './core/services/security.service';
import { ThemeService } from './core/services/theme.service';
import { AlertModalComponent } from './core/components/alert-modal.component';
import { WalkthroughComponent } from './core/components/walkthrough/walkthrough.component';
import { FriendsApiService } from './core/services/friends-api.service';
import { MessagingService } from './core/services/messaging.service';
import { UserSettingsService } from './core/services/user-settings.service';

interface WalkthroughStep {
  title: string;
  details: string;
}

@Component({
  selector: 'app-root',
  styleUrl: './app.component.css',
  imports: [RouterOutlet, AlertModalComponent, WalkthroughComponent],
  template: `
    <div [style.background-color]="theme.colors().bg"
         [class.is-chat-route]="currentPath().startsWith('/chat')"
         class="app-component__s1">
      <a href="#main-content" class="app-skip-link">Skip to main content</a>
      <main id="main-content">
      <router-outlet></router-outlet>
      </main>

      @if (activeHint() && showRouteHint()) {
        <div [style.background-color]="theme.colors().bgSecondary"
             [style.color]="theme.colors().text"
             [style.border]="'1px solid ' + theme.colors().border"
             role="status"
             aria-live="polite"
             class="app-component__s2">
          <div class="app-component__s3">
            <div>
              <p [style.color]="theme.colors().primary"
                 class="app-component__s4">Quick Hint</p>
              <p class="app-component__s5">{{ activeHint() }}</p>
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px; justify-content: center;">
              <button (click)="dismissHintForCurrentRoute()"
                      aria-label="Close hint"
                      [style.color]="theme.colors().textSecondary"
                      class="app-component__s6">✕</button>
            </div>
          </div>
        </div>
      }

      <button (click)="showRouteHint.set(!showRouteHint())"
              aria-label="Toggle route hint"
              [style.background-color]="theme.colors().primary"
              [style.color]="'#fff'"
              class="app-hint-toggle">💡</button>

      @if (!currentPath().startsWith('/chat')) {
        <button (click)="openWalkthrough()"
                aria-label="Open help and tips walkthrough"
                [style.background-color]="theme.colors().primary"
                class="app-component__s7">
          Help & Tips
        </button>
      }

      @if (showFriendRequestNotification()) {
        <div [style.background-color]="theme.colors().bgSecondary"
             [style.color]="theme.colors().text"
             [style.border]="'1px solid ' + theme.colors().accent"
             role="status"
             aria-live="polite"
             class="app-friend-request-notification">
          <button (click)="dismissFriendRequestNotification()"
                  aria-label="Dismiss friend request notification"
                  [style.color]="theme.colors().textSecondary"
                  class="app-component__s6 app-friend-request-notification__close">✕</button>
          <p [style.color]="theme.colors().primary" class="app-component__s4">Friend Request</p>
          <p class="app-component__s5">{{ friendRequestNotificationText() }}</p>
          <button (click)="openIncomingRequests()"
                  [style.background-color]="theme.colors().primary"
                  class="app-friend-request-notification__action">
            View Requests
          </button>
        </div>
      }

      @if (showChatNotification()) {
        <div [style.background-color]="theme.colors().bgSecondary"
             [style.color]="theme.colors().text"
             [style.border]="'1px solid ' + theme.colors().primary"
             role="status"
             aria-live="polite"
             class="app-chat-notification">
          <button (click)="dismissChatNotification()"
                  aria-label="Dismiss chat notification"
                  [style.color]="theme.colors().textSecondary"
                  class="app-component__s6 app-friend-request-notification__close">✕</button>
          <p [style.color]="theme.colors().primary" class="app-component__s4">New Message</p>
          <p class="app-component__s5">{{ chatNotificationText() }}</p>
          <button (click)="openChatNotification()"
                  [style.background-color]="theme.colors().primary"
                  class="app-friend-request-notification__action">
            Open Chat
          </button>
        </div>
      }

      @if (showWalkthrough()) {
        <div class="app-component__s8">
          <div [style.background-color]="theme.colors().bg"
               [style.border]="'1px solid ' + theme.colors().border"
               (keydown.escape)="showWalkthrough.set(false)"
               tabindex="-1"
               role="dialog"
               aria-modal="true"
               aria-labelledby="walkthrough-title"
               aria-describedby="walkthrough-description"
               class="app-component__s9">
            <button (click)="showWalkthrough.set(false)"
                    aria-label="Close walkthrough"
                    [style.color]="theme.colors().textSecondary"
                    class="app-component__s10">✕</button>

            <h2 id="walkthrough-title" class="app-component__s11">Dexii Walkthrough</h2>
            <p id="walkthrough-description" [style.color]="theme.colors().textSecondary" class="app-component__s12">
              Step {{ walkthroughStepIndex() + 1 }} of {{ walkthroughSteps.length }}
            </p>

            <div class="app-component__s13">
              <div [style.border]="'1px solid ' + theme.colors().border"
                   [style.background-color]="theme.colors().bgSecondary"
                   class="app-component__s14">
                <p [style.color]="theme.colors().primary"
                   class="app-component__s15">
                  {{ activeWalkthroughStep().title }}
                </p>
                <p class="app-component__s16">{{ activeWalkthroughStep().details }}</p>
              </div>
            </div>

            <div class="app-component__s17">
              <button (click)="previousWalkthroughStep()"
                      [disabled]="walkthroughStepIndex() === 0"
                      [style.border]="'1px solid ' + theme.colors().border"
                      [style.opacity]="walkthroughStepIndex() === 0 ? '0.45' : '1'"
                      class="app-component__s19">
                Back
              </button>
              @if (isLastWalkthroughStep()) {
                <button (click)="completeWalkthrough()"
                        [style.background-color]="theme.colors().primary"
                        class="app-component__s18">
                  Done
                </button>
              } @else {
                <button (click)="nextWalkthroughStep()"
                        [style.background-color]="theme.colors().primary"
                        class="app-component__s18">
                  Next
                </button>
              }
            </div>
          </div>
        </div>
      }

      @if (showNextSteps()) {
        <div class="app-component__s8">
          <div [style.background-color]="theme.colors().bg"
               [style.border]="'1px solid ' + theme.colors().border"
               tabindex="-1"
               role="dialog"
               aria-modal="true"
               aria-labelledby="next-steps-title"
               class="app-component__s9">
            <button (click)="dismissNextSteps()"
                    aria-label="Close next steps"
                    [style.color]="theme.colors().textSecondary"
                    class="app-component__s10">✕</button>

            <h2 id="next-steps-title" class="app-component__s11">Next Steps</h2>
            <p [style.color]="theme.colors().textSecondary" class="app-component__s12">
              You’ve finished the first tour. Now build your circle and unlock the friend feature tour.
            </p>

            <div class="app-component__s13">
              <div [style.border]="'1px solid ' + theme.colors().border"
                   [style.background-color]="theme.colors().bgSecondary"
                   class="app-component__s14">
                <p [style.color]="theme.colors().primary" class="app-component__s15">1. Add friends</p>
                <p class="app-component__s16">Go to Friends to invite people and create friendship profiles.</p>
              </div>
              <div [style.border]="'1px solid ' + theme.colors().border"
                   [style.background-color]="theme.colors().bgSecondary"
                   class="app-component__s14">
                <p [style.color]="theme.colors().primary" class="app-component__s15">2. Learn sharing</p>
                <p class="app-component__s16">Use Sharing Controls to choose exactly what each friend can see.</p>
              </div>
              <div [style.border]="'1px solid ' + theme.colors().border"
                   [style.background-color]="theme.colors().bgSecondary"
                   class="app-component__s14">
                <p [style.color]="theme.colors().primary" class="app-component__s15">3. Unlock the friend tour</p>
                <p class="app-component__s16">Once you’ve added at least one friend, Dexii can walk you through the friend tools.</p>
              </div>
            </div>

            <div class="app-component__s17">
              <button (click)="goToFriends()"
                      [style.border]="'1px solid ' + theme.colors().border"
                      [style.background-color]="'transparent'"
                      [style.color]="theme.colors().text"
                      class="app-component__s19">
                Go to Friends
              </button>
              <button (click)="startFriendFeatureTour()"
                      [style.background-color]="theme.colors().primary"
                      class="app-component__s18">
                @if (friendCount() > 0) { Start Friend Tour } @else { Add Friends First }
              </button>
            </div>
          </div>
        </div>
      }

      @if (showFriendTour()) {
        <div class="app-component__s8">
          <div [style.background-color]="theme.colors().bg"
               [style.border]="'1px solid ' + theme.colors().border"
               tabindex="-1"
               role="dialog"
               aria-modal="true"
               aria-labelledby="friend-tour-title"
               aria-describedby="friend-tour-description"
               class="app-component__s9">
            <button (click)="dismissFriendTour()"
                    aria-label="Close friend tour"
                    [style.color]="theme.colors().textSecondary"
                    class="app-component__s10">✕</button>

            <h2 id="friend-tour-title" class="app-component__s11">Friend Feature Tour</h2>
            <p id="friend-tour-description" [style.color]="theme.colors().textSecondary" class="app-component__s12">
              Step {{ friendTourStepIndex() + 1 }} of {{ friendTourSteps.length }}
            </p>

            <div class="app-component__s13">
              <div [style.border]="'1px solid ' + theme.colors().border"
                   [style.background-color]="theme.colors().bgSecondary"
                   class="app-component__s14">
                <p [style.color]="theme.colors().primary" class="app-component__s15">
                  {{ activeFriendTourStep().title }}
                </p>
                <p class="app-component__s16">{{ activeFriendTourStep().details }}</p>
              </div>
            </div>

            <div class="app-component__s17">
              <button (click)="previousFriendTourStep()"
                      [disabled]="friendTourStepIndex() === 0"
                      [style.border]="'1px solid ' + theme.colors().border"
                      [style.opacity]="friendTourStepIndex() === 0 ? '0.45' : '1'"
                      class="app-component__s19">
                Back
              </button>
              @if (isLastFriendTourStep()) {
                <button (click)="completeFriendTour()"
                        [style.background-color]="theme.colors().primary"
                        class="app-component__s18">
                  Done
                </button>
              } @else {
                <button (click)="nextFriendTourStep()"
                        [style.background-color]="theme.colors().primary"
                        class="app-component__s18">
                  Next
                </button>
              }
            </div>
          </div>
        </div>
      }

      <app-alert-modal></app-alert-modal>
      <app-walkthrough></app-walkthrough>
    </div>
  `
})
export class AppComponent implements OnInit, OnDestroy {
  protected security = inject(SecurityService);
  protected theme = inject(ThemeService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private friendsApi = inject(FriendsApiService);
  private messaging = inject(MessagingService);
  private userSettings = inject(UserSettingsService);
  private dismissedHints = signal<Record<string, boolean>>(this.readDismissedHints());
  private onboardingRefreshTimer: ReturnType<typeof setInterval> | null = null;

  currentPath = signal(this.router.url || '/dashboard');
  activeHint = signal('');
  showRouteHint = signal(false);
  userWantsHint = signal(true);
  showWalkthrough = signal(false);
  showNextSteps = signal(false);
  showFriendTour = signal(false);
  walkthroughStepIndex = signal(0);
  friendTourStepIndex = signal(0);
  friendCount = signal(0);
  incomingFriendRequestCount = signal(0);
  incomingFriendRequestNames = signal('');
  private incomingFriendRequestIds = signal<string[]>([]);
  private dismissedIncomingFriendRequestIds = signal<Set<string>>(this.readDismissedIncomingFriendRequestIds());
  dismissedChatMessageId = signal('');
  onboardingMode = signal<'intro' | 'friends'>('intro');
  activeWalkthroughStep = computed(() => this.walkthroughSteps[this.walkthroughStepIndex()] || this.walkthroughSteps[0]);
  isLastWalkthroughStep = computed(() => this.walkthroughStepIndex() >= this.walkthroughSteps.length - 1);
  activeFriendTourStep = computed(() => this.friendTourSteps[this.friendTourStepIndex()] || this.friendTourSteps[0]);
  isLastFriendTourStep = computed(() => this.friendTourStepIndex() >= this.friendTourSteps.length - 1);
  walkthroughSteps: WalkthroughStep[] = [
    {
      title: '1. Dashboard = Your Tea Timeline',
      details: 'Start on Dashboard. Tap New Entry to add a crush, then log notes, vibes, and updates over time.'
    },
    {
      title: '2. Crush Status vs Relationship Label',
      details: 'Crush Status is the main state (Crush, Dating, Archived). Relationship Label is extra context (situationship, heartbroken, etc.).'
    },
    {
      title: '3. Red Flags + Vibe Checks',
      details: 'Red Flag increments warning count. Vibe logs track how you feel each day (1 to 5 stars) with optional notes.'
    },
    {
      title: '4. Safety Check',
      details: 'Use the Safety Check button on a crush profile to pick trusted contacts, set interval, and send check-ins.'
    },
    {
      title: '5. Inner Circle + Sharing',
      details: 'Add friends, create a friendship profile, and invite them by email/SMS/WhatsApp/share link.'
    },
    {
      title: '6. Control What Friends See',
      details: 'Sharing is per friend. Use Sharing Controls to choose exactly which crushes and entries each friend can view.'
    },
    {
      title: '7. Vault + Quick Hints',
      details: 'Vault keeps sensitive content private. You can replay this walkthrough anytime with Help & Tips.'
    }
  ];
  friendTourSteps: WalkthroughStep[] = [
    {
      title: '1. Add Friend Basics',
      details: 'Use Friends > Add Friend to search, invite, and save a friendship profile before sharing anything.'
    },
    {
      title: '2. Friendship Profiles',
      details: 'Open View Friendship to keep notes about how you know them, trust level, and relationship context.'
    },
    {
      title: '3. Sharing Controls',
      details: 'On a friend profile, choose exactly which crushes and entries they can see, one person at a time.'
    },
    {
      title: '4. Chat + Shared History',
      details: 'Shared entries and notes show up in chat and audit history, so you can see what each friend received.'
    },
    {
      title: '5. Privacy Tools',
      details: 'Archive, unshare, delete requests, and toggle visibility whenever you want to trim your circle.'
    }
  ];
  protected readonly title = signal('dexii');

  ngOnInit() {
    console.log('AppComponent initialized, isLocked:', this.security.isLocked(), 'isLoggedIn:', this.security.isLoggedIn());

    // Initial routing logic based on auth/lock status
    if (this.router.url === '/' || this.router.url === '/dashboard') {
       if (!this.security.isLoggedIn()) {
         this.router.navigate(['/login']);
       } else if (this.security.isLocked()) {
         this.router.navigate(['/lock']);
       }
    }

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => {
        this.currentPath.set(event.urlAfterRedirects || event.url || '/dashboard');
        this.userWantsHint.set(false);
        this.refreshRouteHint();
        void this.refreshOnboardingState();
      });

    this.refreshRouteHint();
    void this.refreshOnboardingState();
    this.onboardingRefreshTimer = setInterval(() => {
      void this.refreshOnboardingState();
    }, 15000);
  }

  ngOnDestroy(): void {
    if (this.onboardingRefreshTimer) {
      clearInterval(this.onboardingRefreshTimer);
      this.onboardingRefreshTimer = null;
    }
  }

  openWalkthrough() {
    this.onboardingMode.set('intro');
    this.walkthroughStepIndex.set(0);
    this.showFriendTour.set(false);
    this.showNextSteps.set(false);
    this.showWalkthrough.set(true);
  }

  nextWalkthroughStep() {
    const next = Math.min(this.walkthroughStepIndex() + 1, this.walkthroughSteps.length - 1);
    this.walkthroughStepIndex.set(next);
  }

  previousWalkthroughStep() {
    const previous = Math.max(this.walkthroughStepIndex() - 1, 0);
    this.walkthroughStepIndex.set(previous);
  }

  completeWalkthrough() {
    localStorage.setItem(this.getWalkthroughStorageKey(), '1');
    this.showWalkthrough.set(false);
    this.walkthroughStepIndex.set(0);
    this.showNextSteps.set(true);
  }

  dismissNextSteps(): void {
    localStorage.setItem(this.getNextStepsStorageKey(), '1');
    this.showNextSteps.set(false);
  }

  goToFriends(): void {
    this.dismissNextSteps();
    this.router.navigate(['/friends']);
  }

  startFriendFeatureTour(): void {
    if (this.friendCount() === 0) {
      this.router.navigate(['/friends']);
      return;
    }

    this.dismissNextSteps();
    this.onboardingMode.set('friends');
    this.friendTourStepIndex.set(0);
    this.showWalkthrough.set(false);
    this.showFriendTour.set(true);
  }

  nextFriendTourStep(): void {
    const next = Math.min(this.friendTourStepIndex() + 1, this.friendTourSteps.length - 1);
    this.friendTourStepIndex.set(next);
  }

  previousFriendTourStep(): void {
    const previous = Math.max(this.friendTourStepIndex() - 1, 0);
    this.friendTourStepIndex.set(previous);
  }

  completeFriendTour(): void {
    localStorage.setItem(this.getFriendTourStorageKey(), '1');
    this.showFriendTour.set(false);
    this.friendTourStepIndex.set(0);
  }

  dismissFriendTour(): void {
    this.showFriendTour.set(false);
    this.friendTourStepIndex.set(0);
  }

  dismissHintForCurrentRoute() {
    const key = this.routeHintKey(this.currentPath());
    const next = { ...this.dismissedHints(), [key]: true };
    this.dismissedHints.set(next);
    localStorage.setItem('dexii_dismissed_hints', JSON.stringify(next));
    this.showRouteHint.set(false);
  }

  private refreshRouteHint() {
    const hint = this.getHintForPath(this.currentPath());
    this.activeHint.set(hint);
    this.showRouteHint.set(false);
  }

  private routeHintKey(path: string): string {
    if (path.startsWith('/friends/')) return '/friends/:id';
    if (path.startsWith('/profile/')) return '/profile/:id';
    return path.split('?')[0];
  }

  private getHintForPath(path: string): string {
    const normalized = this.routeHintKey(path);
    const map: Record<string, string> = {
      '/dashboard': 'Use New Entry to add a crush. Add a Crush Note and set it Private/Public.',
      '/friends': 'Use Bio for friend notes and Sharing Controls to choose which crushes/entries each friend can view.',
      '/friends/:id': 'Save private notes for yourself or shared notes that get sent to this friend.',
      '/profile/:id': 'Use Add Note, Vibe Log, Red Flags, and Safety buttons to track each crush.',
      '/chat': 'Messages marked as shared notes are sent here. Type "secret" in a message to make it self-destruct after it is opened.',
      '/vault': 'Vault is your private zone for sensitive content and locked-down entries.',
      '/lock': 'Enter your PIN to unlock, then tap Help & Tips any time for the walkthrough.'
    };
    return map[normalized] || 'Tap Help & Tips for a quick walkthrough of the app.';
  }

  private async refreshOnboardingState(): Promise<void> {
    await this.loadFriendCount();
    await this.loadIncomingFriendRequestNotification();
    await this.messaging.loadConversationSummaries();
    this.maybeAutoShowWalkthrough();
  }

  private async loadFriendCount(): Promise<void> {
    if (!this.friendsApi.isAuthenticated()) {
      this.friendCount.set(0);
      return;
    }
    try {
      const friends = await this.friendsApi.listFriends();
      this.friendCount.set(Array.isArray(friends) ? friends.length : 0);
    } catch {
      this.friendCount.set(0);
    }
  }

  private maybeAutoShowWalkthrough(): void {
    // Keep the walkthrough available from Help & Tips without interrupting users by default.
  }

  showFriendRequestNotification = computed(() => {
    if (!this.security.isLoggedIn() || this.security.isLocked()) return false;
    if (!this.userSettings.settings().notifyFriendRequests) return false;
    if (this.currentPath().startsWith('/friends')) return false;
    const dismissed = this.dismissedIncomingFriendRequestIds();
    return this.incomingFriendRequestIds().some((id) => !dismissed.has(id));
  });

  friendRequestNotificationText = computed(() => {
    const count = this.incomingFriendRequestCount();
    if (count === 1) {
      const name = this.incomingFriendRequestNames() || 'Someone';
      return `${name} wants to connect with you.`;
    }
    const names = this.incomingFriendRequestNames();
    return names
      ? `${count} people want to connect: ${names}.`
      : `You have ${count} friend requests.`;
  });

  openIncomingRequests(): void {
    this.router.navigate(['/friends'], { queryParams: { tab: 'incoming' } });
  }

  dismissFriendRequestNotification(): void {
    const next = new Set(this.dismissedIncomingFriendRequestIds());
    this.incomingFriendRequestIds().forEach((id) => next.add(id));
    this.dismissedIncomingFriendRequestIds.set(next);
    this.writeDismissedIncomingFriendRequestIds(next);
  }

  showChatNotification = computed(() => {
    if (!this.security.isLoggedIn() || this.security.isLocked()) return false;
    if (!this.userSettings.settings().notifyChatMessages) return false;
    const message = this.messaging.latestIncomingMessage();
    if (!message || message.id === this.dismissedChatMessageId()) return false;
    return this.activeChatFriendId() !== message.senderId;
  });

  chatNotificationText = computed(() => {
    const message = this.messaging.latestIncomingMessage();
    if (!message) return '';
    const preview = message.content.length > 80 ? `${message.content.slice(0, 80)}…` : message.content;
    return `You have a new message: ${preview}`;
  });

  openChatNotification(): void {
    const message = this.messaging.latestIncomingMessage();
    if (!message) return;
    this.dismissedChatMessageId.set(message.id);
    this.router.navigate(['/chat'], { queryParams: { friendId: message.senderId, friendName: message.senderId } });
  }

  private activeChatFriendId(): string {
    const path = this.currentPath();
    if (!path.startsWith('/chat')) return '';
    try {
      const url = new URL(path, window.location.origin);
      return url.searchParams.get('friendId') || url.searchParams.get('friend') || '';
    } catch {
      const query = path.split('?')[1] || '';
      return new URLSearchParams(query).get('friendId') || new URLSearchParams(query).get('friend') || '';
    }
  }

  dismissChatNotification(): void {
    const message = this.messaging.latestIncomingMessage();
    if (message) {
      this.dismissedChatMessageId.set(message.id);
    }
  }

  private async loadIncomingFriendRequestNotification(): Promise<void> {
    if (!this.friendsApi.isAuthenticated() || this.security.isLocked()) {
      this.incomingFriendRequestCount.set(0);
      this.incomingFriendRequestNames.set('');
      this.incomingFriendRequestIds.set([]);
      return;
    }

    try {
      const requests = await this.friendsApi.incomingRequests();
      this.incomingFriendRequestCount.set(requests.length);
      this.incomingFriendRequestIds.set(requests.map((request) => request.id));
      this.incomingFriendRequestNames.set(
        requests
          .slice(0, 3)
          .map((request) => request.from?.username || request.from?.id || 'Someone')
          .join(', ')
      );
    } catch {
      this.incomingFriendRequestCount.set(0);
      this.incomingFriendRequestNames.set('');
      this.incomingFriendRequestIds.set([]);
    }
  }

  private readDismissedIncomingFriendRequestIds(): Set<string> {
    try {
      const raw = localStorage.getItem('dexii_dismissed_incoming_request_notifications');
      const parsed = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []);
    } catch {
      return new Set<string>();
    }
  }

  private writeDismissedIncomingFriendRequestIds(ids: Set<string>): void {
    localStorage.setItem('dexii_dismissed_incoming_request_notifications', JSON.stringify(Array.from(ids)));
  }

  private getWalkthroughStorageKey(): string {
    const username = this.security.currentUser() || localStorage.getItem('dexii_api_username') || 'guest';
    return `dexii_walkthrough_seen_${username}`;
  }

  private getNextStepsStorageKey(): string {
    const username = this.security.currentUser() || localStorage.getItem('dexii_api_username') || 'guest';
    return `dexii_next_steps_seen_${username}`;
  }

  private getFriendTourStorageKey(): string {
    const username = this.security.currentUser() || localStorage.getItem('dexii_api_username') || 'guest';
    return `dexii_friend_tour_seen_${username}`;
  }

  private readDismissedHints(): Record<string, boolean> {
    try {
      const raw = localStorage.getItem('dexii_dismissed_hints');
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return {};
      return parsed as Record<string, boolean>;
    } catch {
      return {};
    }
  }
}
