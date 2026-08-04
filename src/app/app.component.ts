import { Component, signal, inject, OnInit, DestroyRef, computed } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SecurityService } from './core/services/security.service';
import { ThemeService } from './core/services/theme.service';
import { AlertModalComponent } from './core/components/alert-modal.component';

interface WalkthroughStep {
  title: string;
  details: string;
}

@Component({
  selector: 'app-root',
  styleUrl: './app.component.css',
  imports: [RouterOutlet, AlertModalComponent],
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

      <app-alert-modal></app-alert-modal>
    </div>
  `
})
export class AppComponent implements OnInit {
  protected security = inject(SecurityService);
  protected theme = inject(ThemeService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private dismissedHints = signal<Record<string, boolean>>(this.readDismissedHints());

  currentPath = signal(this.router.url || '/dashboard');
  activeHint = signal('');
  showRouteHint = signal(false);
  userWantsHint = signal(true);
  showWalkthrough = signal(false);
  walkthroughStepIndex = signal(0);
  activeWalkthroughStep = computed(() => this.walkthroughSteps[this.walkthroughStepIndex()] || this.walkthroughSteps[0]);
  isLastWalkthroughStep = computed(() => this.walkthroughStepIndex() >= this.walkthroughSteps.length - 1);
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
        this.maybeAutoShowWalkthrough();
      });

    this.refreshRouteHint();
    this.maybeAutoShowWalkthrough();
  }

  openWalkthrough() {
    this.walkthroughStepIndex.set(0);
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
      '/chat': 'Messages marked as shared notes are sent here. Type "secret" in a message to make it self-destruct and disappear.',
      '/vault': 'Vault is your private zone for sensitive content and locked-down entries.',
      '/lock': 'Enter your PIN to unlock, then tap Help & Tips any time for the walkthrough.'
    };
    return map[normalized] || 'Tap Help & Tips for a quick walkthrough of the app.';
  }

  private maybeAutoShowWalkthrough(): void {
    if (this.showWalkthrough()) return;
    if (!this.security.isLoggedIn() || this.security.isLocked()) return;

    const path = this.currentPath();
    if (path.startsWith('/login') || path.startsWith('/signup') || path.startsWith('/lock')) return;

    if (localStorage.getItem(this.getWalkthroughStorageKey()) === '1') return;

    this.walkthroughStepIndex.set(0);
    this.showWalkthrough.set(true);
  }

  private getWalkthroughStorageKey(): string {
    const username = this.security.currentUser() || localStorage.getItem('dexii_api_username') || 'guest';
    return `dexii_walkthrough_seen_${username}`;
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
