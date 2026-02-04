import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PrivacyService } from '../../core/services/privacy.service';
import { SecurityService } from '../../core/services/security.service';
import { ThemeService } from '../../core/services/theme.service';
import { CrushStatus } from '../../core/models/crush-profile.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div [style.background-color]="theme.colors().bg" [style.color]="theme.colors().text"
         style="min-height: 100vh; font-family: 'Times New Roman', serif; padding-bottom: 60px; transition: all 0.8s ease; position: relative; overflow-x: hidden;">

      <!-- New Entry Modal -->
      @if (showNewEntryModal()) {
        <div style="position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; backdrop-blur: 15px; padding: 20px;">
          <div [style.background-color]="theme.colors().bg"
               [style.border]="'1px solid ' + theme.colors().border"
               style="width: 100%; max-width: 500px; padding: 40px; border-radius: 0px; position: relative; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">

            <button (click)="closeModal()" [style.color]="theme.colors().textSecondary" style="position: absolute; top: 20px; right: 20px; background: none; border: none; font-size: 20px; cursor: pointer;">✕</button>

            <h3 style="font-size: 32px; font-weight: 200; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 32px; text-align: center;">New Connection</h3>

            <div style="display: flex; flex-direction: column; gap: 24px;">
              <div>
                <label [style.color]="theme.colors().textSecondary" style="display: block; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Nickname</label>
                <input [(ngModel)]="newCrush.nickname" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" style="width: 100%; padding: 12px; border-radius: 0px; outline: none; font-family: 'Times New Roman', serif;">
              </div>

              <div>
                <label [style.color]="theme.colors().textSecondary" style="display: block; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Full Name (Optional)</label>
                <input [(ngModel)]="newCrush.fullName" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" style="width: 100%; padding: 12px; border-radius: 0px; outline: none;">
              </div>

              <div>
                <label [style.color]="theme.colors().textSecondary" style="display: block; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Status</label>
                <select [(ngModel)]="newCrush.status" [style.background-color]="theme.colors().bgSecondary" [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" style="width: 100%; padding: 12px; border-radius: 0px; outline: none; appearance: none;">
                  <option [value]="statuses.Crush">Crush</option>
                  <option [value]="statuses.Dating">Dating</option>
                  <option [value]="statuses.Exclusive">Exclusive</option>
                </select>
              </div>

              <div>
                <label [style.color]="theme.colors().textSecondary" style="display: block; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Initial Vibe (1-5 Stars)</label>
                <div style="display: flex; gap: 8px; justify-content: center; font-size: 24px;">
                  @for (star of [1,2,3,4,5]; track star) {
                    <span (click)="newCrush.rating = star" [style.color]="newCrush.rating >= star ? theme.colors().accent : theme.colors().border" style="cursor: pointer;">★</span>
                  }
                </div>
              </div>

              <button (click)="saveCrush()" [style.background-color]="theme.colors().primary" style="color: white; border: none; padding: 16px; border-radius: 0px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; cursor: pointer; margin-top: 20px;">
                Secure Entry
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Digital Note Passing Overlay (Simulation) -->
      @if (isNotePassing()) {
        <div style="position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; backdrop-blur: 10px;">
           <div (click)="closeNote()"
                [style.background-color]="theme.colors().bgSecondary"
                [style.border]="'2px solid ' + theme.colors().primary"
                style="padding: 40px; max-width: 400px; transform: rotate(-2deg); shadow: 0 20px 50px rgba(0,0,0,0.5); cursor: pointer;">
              <span [style.color]="theme.colors().primary" style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 4px; display: block; margin-bottom: 20px;">Private Note Received</span>
              <p style="font-size: 18px; line-height: 1.6; font-style: italic;">"Wait until you hear what happened last night... tap to close."</p>
           </div>
        </div>
      }

      <!-- Glamour Decorative Elements -->
      @if (theme.mode() === 'light') {
        <div style="position: absolute; top: 0; right: 0; width: 600px; height: 600px; background: radial-gradient(circle, #fce7f3 0%, transparent 70%); opacity: 0.5; pointer-events: none;"></div>
      }

      <!-- Navigation -->
      <nav [style.background-color]="theme.colors().bgSecondary"
           [style.border-bottom]="'1px solid ' + theme.colors().border"
           style="padding: 24px 40px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 50; backdrop-blur: 10px;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <div [style.background]="'linear-gradient(135deg, ' + theme.colors().primary + ', ' + theme.colors().accent + ')'"
               style="width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-weight: 200; font-size: 24px; color: white; shadow: 0 4px 10px rgba(0,0,0,0.1);">D</div>
          <span style="font-size: 28px; font-weight: 200; letter-spacing: 4px; text-transform: uppercase;">Dexii</span>
        </div>

        <div style="display: flex; gap: 20px;">
          <button (click)="theme.toggleTheme()"
                  [style.background-color]="'transparent'"
                  [style.color]="theme.colors().text"
                  [style.border]="'1px solid ' + theme.colors().border"
                  style="padding: 10px 20px; border-radius: 9999px; font-size: 11px; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 2px;">
            {{ theme.mode() === 'dark' ? 'Pearl' : 'Onyx' }}
          </button>
          <button (click)="security.lockApp()"
                  [style.background-color]="theme.colors().primary"
                  style="color: white; border: none; padding: 10px 24px; border-radius: 9999px; font-size: 11px; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 2px; shadow: 0 4px 15px rgba(219, 39, 119, 0.3);">
            Vault
          </button>
        </div>
      </nav>

      <main style="max-width: 1200px; margin: 0 auto; padding: 60px 40px;">
        <!-- Hero Section -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 60px; flex-wrap: wrap; gap: 32px;">
          <div style="max-width: 600px;">
            <h2 style="font-size: 48px; font-weight: 200; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 2px;">The Rolodex</h2>
            <p [style.color]="theme.colors().textSecondary" style="margin: 0; font-size: 14px; letter-spacing: 1px; font-style: italic;">Curating {{ privacy.visibleCrushes().length }} exclusive connections.</p>
          </div>
          <div style="display: flex; gap: 16px;">
            <button (click)="simulateNote()"
                    [style.border]="'1px solid ' + theme.colors().border"
                    [style.color]="theme.colors().text"
                    style="background: transparent; padding: 14px 24px; border-radius: 0px; font-weight: 700; cursor: pointer; font-size: 11px; text-transform: uppercase; letter-spacing: 2px;">
               Spill Tea
            </button>
            <button (click)="openNewEntryModal()" [style.border]="'1px solid ' + theme.colors().primary"
                    [style.color]="theme.colors().primary"
                    style="background: transparent; padding: 14px 32px; border-radius: 0px; font-weight: 700; cursor: pointer; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; transition: all 0.3s;">
               + New Entry
            </button>
          </div>
        </div>

        <!-- Filter Chips -->
        <div style="display: flex; gap: 20px; margin-bottom: 48px; overflow-x: auto; padding-bottom: 12px;">
          <button [style.color]="theme.colors().primary" style="background: none; border: none; border-bottom: 2px solid; padding: 8px 0; font-size: 12px; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 2px;">All</button>
          <button [style.color]="theme.colors().textSecondary" style="background: none; border: none; padding: 8px 0; font-size: 12px; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 2px; opacity: 0.6;">Dating</button>
          <button [style.color]="theme.colors().textSecondary" style="background: none; border: none; padding: 8px 0; font-size: 12px; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 2px; opacity: 0.6;">Prospects</button>
        </div>

        <!-- Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 48px;">
          @for (crush of privacy.visibleCrushes(); track crush.id) {
            <div [routerLink]="['/profile', crush.id]"
                 [style.background-color]="theme.colors().cardBg"
                 [style.border]="'1px solid ' + theme.colors().border"
                 style="border-radius: 0px; overflow: hidden; cursor: pointer; transition: all 0.4s; position: relative;">

              <!-- Shimmer Effect on Card (Light Mode) -->
              @if (theme.mode() === 'light') {
                <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, transparent, #fbbf24, transparent); opacity: 0.3;"></div>
              }

              <!-- Image Area -->
              <div style="height: 240px; position: relative; overflow: hidden;">
                <img [src]="crush.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop'"
                     style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.8s ease;">
                <div style="position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.4));"></div>
                <div style="position: absolute; top: 20px; right: 20px; display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                   <span [style.background-color]="'rgba(255,255,255,0.9)'"
                         [style.color]="theme.colors().primary"
                         style="padding: 6px 14px; border-radius: 0px; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">
                     {{ crush.status }}
                   </span>
                   <span *ngIf="crush.redFlags > 0"
                         style="background-color: #ef4444; color: white; padding: 4px 8px; font-size: 8px; font-weight: 900; text-transform: uppercase;">
                     {{ crush.redFlags }} Flags
                   </span>
                </div>
              </div>

              <!-- Content -->
              <div style="padding: 32px; text-align: center;">
                <h3 style="font-size: 26px; font-weight: 200; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 2px;">{{ crush.nickname }}</h3>

                <div [style.color]="theme.colors().accent" style="font-size: 14px; margin-bottom: 20px; letter-spacing: 4px;">
                  @for (star of [1,2,3,4,5]; track star) {
                     {{ (crush.rating || 0) >= star ? '★' : '☆' }}
                  }
                </div>

                <p [style.color]="theme.colors().textSecondary" style="font-size: 13px; line-height: 1.8; margin: 0 0 28px 0; height: 48px; overflow: hidden; font-style: italic;">
                  "{{ crush.bio || 'A connection waiting to be defined.' }}"
                </p>

                <div [style.border-top]="'1px solid ' + theme.colors().border" style="display: flex; justify-content: center; align-items: center; padding-top: 20px;">
                  <span [style.color]="theme.colors().textSecondary" style="font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px;">Profile Active • {{ crush.lastInteraction | date:'MMM d' }}</span>
                </div>
              </div>
            </div>
          }
        </div>
      </main>
    </div>
  `
})
export class DashboardComponent {
  public privacy = inject(PrivacyService);
  public security = inject(SecurityService);
  public theme = inject(ThemeService);

  isNotePassing = signal(false);
  showNewEntryModal = signal(false);
  statuses = CrushStatus;

  newCrush = {
    nickname: '',
    fullName: '',
    status: CrushStatus.Crush,
    rating: 3,
    bio: '',
    visibility: [] as string[]
  };

  simulateNote() {
    this.isNotePassing.set(true);
  }

  closeNote() {
    this.isNotePassing.set(false);
  }

  openNewEntryModal() {
    this.showNewEntryModal.set(true);
  }

  closeModal() {
    this.showNewEntryModal.set(false);
    this.resetForm();
  }

  saveCrush() {
    if (!this.newCrush.nickname) {
      alert("Please enter a nickname at least!");
      return;
    }

    this.privacy.addCrush({
      nickname: this.newCrush.nickname,
      fullName: this.newCrush.fullName,
      status: this.newCrush.status,
      rating: this.newCrush.rating,
      bio: this.newCrush.bio,
      visibility: [],
      avatarUrl: `https://i.pravatar.cc/150?u=${this.newCrush.nickname}` // Mock avatar
    });

    this.closeModal();
    alert("Profile Secured in the Rolodex.");
  }

  resetForm() {
    this.newCrush = {
      nickname: '',
      fullName: '',
      status: CrushStatus.Crush,
      rating: 3,
      bio: '',
      visibility: []
    };
  }
}
