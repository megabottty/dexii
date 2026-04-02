import { Component, signal, inject, OnInit, DestroyRef } from '@angular/core';
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
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <button (click)="showRouteHint.set(false)"
                      aria-label="Hide hint"
                      [style.color]="theme.colors().textSecondary"
                      class="app-component__s6">✕</button>
              <button (click)="dismissHintForCurrentRoute()"
                      aria-label="Never show this hint again"
                      [style.color]="theme.colors().textSecondary"
                      style="font-size: 9px; opacity: 0.6; background: none; border: none; cursor: pointer; padding: 0;">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      }

      @if (currentPath().startsWith('/chat')) {
        <button (click)="showRouteHint.set(true)"
                aria-label="Show chat hint"
                [style.background-color]="theme.colors().primary"
                [style.color]="'#fff'"
                class="app-hint-toggle">💡</button>
      } @else {
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

            <h2 id="walkthrough-title" class="app-component__s11">How To Use Dexii</h2>
            <p id="walkthrough-description" [style.color]="theme.colors().textSecondary" class="app-component__s12">
              Start here, then use the route-specific hints while you explore.
            </p>

            <div class="app-component__s13">
              @for (step of walkthroughSteps; track step.title) {
                <div [style.border]="'1px solid ' + theme.colors().border"
                     [style.background-color]="theme.colors().bgSecondary"
                     class="app-component__s14">
                  <p [style.color]="theme.colors().primary"
                     class="app-component__s15">
                    {{ step.title }}
                  </p>
                  <p class="app-component__s16">{{ step.details }}</p>
                </div>
              }
            </div>

            <div class="app-component__s17">
              <button (click)="completeWalkthrough()"
                      [style.background-color]="theme.colors().primary"
                      class="app-component__s18">
                Got It
              </button>
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
  showRouteHint = signal(true);
  userWantsHint = signal(true);
  showWalkthrough = signal(this.shouldAutoShowWalkthrough());
  walkthroughSteps: WalkthroughStep[] = [
    {
      title: '1. Add Connections',
      details: 'From Dashboard, tap New Entry to create a crush profile. Free tier supports up to 5 crushes.'
    },
    {
      title: '2. Manage Friends',
      details: 'Open Friends (Inner Circle) to add people you trust. Friends are unlimited on all tiers.'
    },
    {
      title: '3. Control Sharing',
      details: 'Use Sharing Controls per friend to decide which crushes and notes they can see.'
    },
    {
      title: '4. Use Friend Bio',
      details: 'Open a friend Bio page to keep private/shared notes for that friend.'
    },
    {
      title: '5. Vault + Safety',
      details: 'Use Vault for private content and profile pages for safety check-ins and red-flag tracking.'
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
      });

    this.refreshRouteHint();
  }

  openWalkthrough() {
    this.showWalkthrough.set(true);
  }

  completeWalkthrough() {
    localStorage.setItem('dexii_walkthrough_seen', '1');
    this.showWalkthrough.set(false);
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
    const key = this.routeHintKey(this.currentPath());
    this.showRouteHint.set(Boolean(hint) && !this.dismissedHints()[key]);
  }

  private routeHintKey(path: string): string {
    if (path.startsWith('/friends/')) return '/friends/:id';
    if (path.startsWith('/profile/')) return '/profile/:id';
    return path.split('?')[0];
  }

  private getHintForPath(path: string): string {
    const normalized = this.routeHintKey(path);
    const map: Record<string, string> = {
      '/dashboard': 'Use New Entry to add a connection. Add a Connection Note and set it Private/Public.',
      '/friends': 'Use Bio for friend notes and Sharing Controls to choose which crushes/entries each friend can view.',
      '/friends/:id': 'Save private notes for yourself or shared notes that get sent to this friend.',
      '/profile/:id': 'Use Add Note, Vibe Log, Red Flags, and Safety buttons to track each connection.',
      '/chat': 'Messages marked as shared notes are sent here. Type "secret" in a message to make it self-destruct and disappear.',
      '/vault': 'Vault is your private zone for sensitive content and locked-down entries.',
      '/lock': 'Enter your PIN to unlock, then tap Help & Tips any time for the walkthrough.'
    };
    return map[normalized] || 'Tap Help & Tips for a quick walkthrough of the app.';
  }

  private shouldAutoShowWalkthrough(): boolean {
    return localStorage.getItem('dexii_walkthrough_seen') !== '1';
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
