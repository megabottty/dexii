import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PrivacyService } from '../../core/services/privacy.service';
import { ThemeService } from '../../core/services/theme.service';
import { CrushProfile } from '../../core/models/crush-profile.model';

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
              <div *ngIf="theme.mode() === 'light'" style="position: absolute; inset: 0; border: 15px solid rgba(255,255,255,0.1); pointer-events: none;"></div>
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
                <button [style.background-color]="theme.colors().primary"
                        style="color: white; border: none; padding: 14px 40px; border-radius: 0px; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 2px; shadow: 0 10px 20px rgba(219,39,119,0.2);">
                  Connect
                </button>
                <button [style.background-color]="'transparent'"
                        [style.color]="theme.colors().text"
                        [style.border]="'1px solid ' + theme.colors().text"
                        style="padding: 14px 40px; border-radius: 0px; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 2px;">
                  Share
                </button>
              </div>
            </div>
          </header>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 80px;">
            <!-- Left -->
            <div>
              <section style="margin-bottom: 60px;">
                <h3 [style.color]="theme.colors().textSecondary" style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 24px; border-bottom: 1px solid; padding-bottom: 8px;">The Narrative</h3>
                <p [style.color]="theme.colors().text" style="font-size: 20px; line-height: 1.8; margin: 0; font-style: italic; font-weight: 200;">
                  "{{ c.bio || 'A mysterious entry in the personal rolodex, awaiting further interaction and documentation.' }}"
                </p>
              </section>

              <section>
                <h3 [style.color]="theme.colors().textSecondary" style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 24px; border-bottom: 1px solid; padding-bottom: 8px;">History</h3>
                <div [style.border-left]="'1px solid ' + theme.colors().border" style="padding-left: 32px; margin-left: 4px;">
                   <div style="margin-bottom: 32px;">
                     <span [style.color]="theme.colors().primary" style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; display: block; margin-bottom: 8px;">Entry 01 • Today</span>
                     <p [style.color]="theme.colors().textSecondary" style="font-size: 14px; line-height: 1.6; margin: 0;">Profile officially archived in the Dexii collection. Initial impressions remain exceptionally high.</p>
                   </div>
                </div>
              </section>
            </div>

            <!-- Right -->
            <div style="display: flex; flex-direction: column; gap: 40px;">
              <div [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" style="padding: 40px; border-radius: 0px;">
                 <h4 [style.color]="theme.colors().textSecondary" style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 32px; text-align: center;">Vibe Analysis</h4>

                 <div style="text-align: center; margin-bottom: 40px;">
                   <p [style.color]="theme.colors().textSecondary" style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px;">Attraction Level</p>
                   <div [style.color]="theme.colors().accent" style="font-size: 24px; letter-spacing: 8px;">★★★★★</div>
                 </div>

                 <div style="text-align: center; margin-bottom: 40px;">
                   <p [style.color]="theme.colors().textSecondary" style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Last Documented</p>
                   <p style="font-size: 18px; font-weight: 200; margin: 0; text-transform: uppercase;">{{ c.lastInteraction | date:'MMMM d, y' }}</p>
                 </div>

                 <button style="width: 100%; background: transparent; color: #ef4444; border: 1px solid #ef4444; padding: 14px; border-radius: 0px; font-size: 10px; font-weight: 900; cursor: pointer; text-transform: uppercase; letter-spacing: 3px; transition: all 0.3s;">
                   Mark Cautionary Flag
                 </button>
              </div>

              <div [style.border]="'1px solid ' + theme.colors().border" style="padding: 32px; text-align: center; font-style: italic;">
                 <p [style.color]="theme.colors().textSecondary" style="font-size: 12px; line-height: 1.6; margin: 0;">"True glamour is the privacy of one's own thoughts and the exclusivity of one's own heart."</p>
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

  crushId = signal<string | null>(null);

  crush = computed(() => {
    const id = this.crushId();
    if (!id) return null;
    return this.privacy.visibleCrushes().find(c => c.id === id) || null;
  });

  constructor() {
    this.crushId.set(this.route.snapshot.paramMap.get('id'));
  }
}
