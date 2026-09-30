import { Component, effect, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from '../../core/components/navbar/navbar.component';
import { ThemeService } from '../../core/services/theme.service';
import { ModalService } from '../../core/services/modal.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { FeatureGateService } from '../../core/services/feature-gate.service';
import { AdminApiService, SuperAdminSummary } from '../../core/services/admin-api.service';
import { SecurityService } from '../../core/services/security.service';
import { ACCESS_LABELS, ACCESS_LEVELS, AccessLevel, PREMIUM_FEATURES, PremiumFeatureKey, accessAllows } from '../../core/config/premium-features';

/** Super admin tools: who has access to what, and who else is a super admin. */
@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterModule, NavbarComponent],
  styleUrl: './admin.component.css',
  template: `
    <div [style.background-color]="theme.colors().bg" [style.color]="theme.colors().text" class="admin-page">
      <app-navbar></app-navbar>
      <main class="admin-main">
        <a routerLink="/settings" [style.color]="theme.colors().textSecondary" class="admin-back">← Back to Settings</a>
        <p [style.color]="theme.colors().textSecondary" class="admin-eyebrow">Super admin</p>
        <h1 class="admin-title">Admin tools</h1>
        <p [style.color]="theme.colors().textSecondary" class="admin-copy">
          You have <strong>Super admin</strong> access: everything in Gold plus these tools. The ladder is Free → Premium → Gold → Super admin.
        </p>

        <section [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" class="admin-card">
          <h2 class="admin-section-title">What each level unlocks</h2>
          <div class="admin-matrix" role="table" aria-label="What each tier unlocks">
            <div class="admin-matrix__row admin-matrix__row--head" role="row">
              <span role="columnheader">Feature</span>
              @for (level of accessLevels; track level) { <span role="columnheader" [attr.title]="label(level)">{{ shortLabel(level) }}</span> }
            </div>
            <div class="admin-matrix__row" role="row">
              <span role="cell">Active crushes</span>
              @for (level of accessLevels; track level) { <span role="cell" [attr.title]="subscription.crushLimitLabel(level) + ' crushes'">{{ subscription.crushLimitLabel(level) === 'Unlimited' ? '∞' : subscription.crushLimitLabel(level) }}</span> }
            </div>
            @for (feature of featureMatrix; track feature.key) {
              <div class="admin-matrix__row" role="row">
                <span role="cell">{{ feature.title }}@if (!feature.enabled) { <em [style.color]="theme.colors().textSecondary"> (not gated yet)</em> }</span>
                @for (level of accessLevels; track level) {
                  <span role="cell" [style.color]="feature.allowed(level) ? theme.colors().primary : theme.colors().textSecondary">{{ feature.allowed(level) ? '✓' : '—' }}</span>
                }
              </div>
            }
          </div>
          <p [style.color]="theme.colors().textSecondary" class="admin-hint">
            Gates are defined in one file (premium-features.ts, mirrored on the server). Change a feature's level there and every screen follows.
          </p>
        </section>

        <section [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" class="admin-card">
          <h2 class="admin-section-title">Super admins</h2>
          <p [style.color]="theme.colors().textSecondary" class="admin-copy">Promote a Dexii account to super admin. Admins set by the server configuration can't be removed here.</p>
          <div class="admin-add">
            <input [value]="draft()"
                   (input)="draft.set($any($event.target).value)"
                   (keyup.enter)="add()"
                   [style.background-color]="theme.colors().bg"
                   [style.border]="'1px solid ' + theme.colors().border"
                   [style.color]="theme.colors().text"
                   class="admin-input"
                   placeholder="@username to promote">
            <button type="button"
                    (click)="add()"
                    [disabled]="busy() || !draft().trim()"
                    [style.background-color]="theme.colors().primary"
                    class="admin-btn admin-btn--primary">
              {{ busy() ? 'Working…' : 'Make super admin' }}
            </button>
          </div>
          @if (admins().length) {
            <ul class="admin-list">
              @for (admin of admins(); track admin.id) {
                <li [style.border]="'1px solid ' + theme.colors().border" class="admin-row">
                  <span class="admin-name">
                    <strong>@{{ admin.username }}</strong>
                    @if (admin.firstName || admin.lastName) { <span [style.color]="theme.colors().textSecondary">{{ admin.firstName }} {{ admin.lastName }}</span> }
                    @if (admin.seeded) { <span [style.color]="theme.colors().textSecondary" class="admin-tag">set by server</span> }
                  </span>
                  @if (!admin.seeded && admin.username !== me()) {
                    <button type="button"
                            (click)="remove(admin)"
                            [disabled]="busy()"
                            [style.border]="'1px solid ' + theme.colors().border"
                            [style.color]="theme.colors().textSecondary"
                            class="admin-btn">Remove</button>
                  }
                </li>
              }
            </ul>
          } @else if (loaded()) {
            <p [style.color]="theme.colors().textSecondary" class="admin-copy">No super admins found yet.</p>
          }
        </section>
      </main>
    </div>
  `
})
export class AdminComponent {
  protected theme = inject(ThemeService);
  protected subscription = inject(SubscriptionService);
  private gate = inject(FeatureGateService);
  private adminApi = inject(AdminApiService);
  private modal = inject(ModalService);
  private security = inject(SecurityService);

  readonly accessLevels = ACCESS_LEVELS;
  readonly featureMatrix = (Object.keys(PREMIUM_FEATURES) as PremiumFeatureKey[]).map((key) => ({
    key,
    title: PREMIUM_FEATURES[key].title,
    enabled: PREMIUM_FEATURES[key].enabled,
    allowed: (level: AccessLevel) => accessAllows(level, key)
  }));

  admins = signal<SuperAdminSummary[]>([]);
  loaded = signal(false);
  draft = signal('');
  busy = signal(false);
  me = signal(this.security.currentUser() || localStorage.getItem('dexii_api_username') || '');

  private loader = effect(() => {
    if (this.gate.canManageSuperAdmins()) void this.load();
  });

  label(level: AccessLevel): string { return ACCESS_LABELS[level]; }
  shortLabel(level: AccessLevel): string { return level === 'SuperAdmin' ? 'Admin' : ACCESS_LABELS[level]; }

  async load(): Promise<void> {
    try { this.admins.set(await this.adminApi.listSuperAdmins()); }
    catch { this.admins.set([]); }
    finally { this.loaded.set(true); }
  }

  async add(): Promise<void> {
    const username = this.draft().trim().replace(/^@/, '');
    if (!username) return;
    this.busy.set(true);
    try {
      await this.adminApi.addSuperAdmin(username);
      this.draft.set('');
      await this.load();
      this.modal.show(`@${username} is now a super admin and has every premium feature.`);
    } catch (err: any) {
      this.modal.show(err?.message || 'Unable to add super admin.');
    } finally {
      this.busy.set(false);
    }
  }

  remove(admin: SuperAdminSummary): void {
    this.modal.confirm(`Remove @${admin.username} as a super admin?`, async () => {
      this.busy.set(true);
      try { await this.adminApi.removeSuperAdmin(admin.username); await this.load(); }
      catch (err: any) { this.modal.show(err?.message || 'Unable to remove super admin.'); }
      finally { this.busy.set(false); }
    });
  }
}
